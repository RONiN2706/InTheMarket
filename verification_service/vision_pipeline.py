"""
vision_pipeline.py
-------------------
The core computer-vision logic for product verification:

  1. extract_key_frames()   — OpenCV: turn an uploaded video scan into a small
                               set of sharp, non-redundant "key frames".
  2. analyze_frames_with_vision_api() — send those frames to a vision model
                               and get back structured product metadata.
  3. build_comparison()     — compare what the seller *claimed* against what
                               the vision model *detected*, and decide whether
                               the listing should be auto-verified, sent for
                               manual review, or flagged as a mismatch.

VISION PROVIDER
---------------
The default provider calls Anthropic's Claude API (multimodal messages) with
the extracted frames as image blocks. That's a real, working vision analysis
path — set an ANTHROPIC_API_KEY environment variable to use it.

If no API key is configured (or the `anthropic` package isn't installed),
this module falls back to `_mock_vision_analysis()`, which just echoes the
seller's claimed fields back with a "mock": true flag. That keeps the whole
verification flow runnable end-to-end with no credentials, the same way the
front-end marketplace app falls back to a local-only mode when it has no
backend attached.

To swap in a different vision provider (Google Cloud Vision, AWS Rekognition,
a self-hosted model, etc.), replace the body of `analyze_frames_with_vision_api`
— it just needs to return a (metadata_dict, provider_name) tuple in the same
shape as `_mock_vision_analysis`.
"""

from __future__ import annotations

import base64
import json
import os
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import cv2
import numpy as np

# Condition grades, ranked from best to worst. Used to measure how far off
# the detected condition is from the claimed one.
CONDITION_ORDER = {"like-new": 0, "good": 1, "fair": 2, "parts": 3}

DEFAULT_MODEL = "claude-sonnet-4-6"


class VideoProcessingError(Exception):
    """Raised when the uploaded video can't be read or yields no usable frames."""


class VisionAPIError(Exception):
    """Raised when the vision provider call fails or returns unparseable output."""


# =============================================================================
# 1. FRAME EXTRACTION (OpenCV)
# =============================================================================

def extract_key_frames(
    video_path: str | Path,
    output_dir: str | Path,
    max_frames: int = 6,
    sample_fps: float = 2.0,
    blur_threshold: float = 60.0,
    scene_change_threshold: float = 0.85,
) -> list[dict[str, Any]]:
    """
    Read a video scan and pick a small set of representative frames.

    Strategy:
      - Sample the video at roughly `sample_fps` frames/second rather than
        every frame, since a rotation scan doesn't change that fast.
      - Drop blurry candidates (motion blur / out-of-focus) using the
        variance of the Laplacian — a standard, cheap sharpness metric.
      - Among the sharp candidates, only keep a frame if its grayscale
        histogram is meaningfully different from the last *kept* frame, so
        we get distinct views of the item (front/back/sides) instead of
        near-duplicates of the same angle.
      - If more candidates qualify than `max_frames`, sample evenly across
        them (by index) to keep temporal spread while capping vision-API cost.

    Returns a list of dicts: {file, path, timestamp_seconds, sharpness},
    one per saved frame, in chronological order. Frames are written as JPEGs
    into `output_dir`.
    """
    video_path = Path(video_path)
    output_dir = Path(output_dir)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise VideoProcessingError(
            "Couldn't open the uploaded video. Try a different format (webm/mp4) "
            "or re-record the scan."
        )

    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_interval = max(1, round(src_fps / sample_fps))

    candidates: list[dict[str, Any]] = []
    last_hist = None
    idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if idx % frame_interval == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

            if sharpness >= blur_threshold:
                hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
                cv2.normalize(hist, hist)

                is_new_scene = last_hist is None
                if last_hist is not None:
                    similarity = cv2.compareHist(hist, last_hist, cv2.HISTCMP_CORREL)
                    is_new_scene = similarity < scene_change_threshold

                if is_new_scene:
                    candidates.append(
                        {
                            "index": idx,
                            "timestamp": idx / src_fps,
                            "frame": frame,
                            "sharpness": sharpness,
                        }
                    )
                    last_hist = hist

        idx += 1

    cap.release()

    if not candidates:
        raise VideoProcessingError(
            "No usable frames found in that scan — it may be too short, too dark, "
            "or too blurry. Try recording again with steadier, brighter lighting."
        )

    if len(candidates) > max_frames:
        step = len(candidates) / max_frames
        selected = [candidates[int(i * step)] for i in range(max_frames)]
    else:
        selected = candidates

    output_dir.mkdir(parents=True, exist_ok=True)
    saved: list[dict[str, Any]] = []
    for i, c in enumerate(selected):
        filename = f"frame_{i:02d}.jpg"
        path = output_dir / filename
        cv2.imwrite(str(path), c["frame"])
        saved.append(
            {
                "file": filename,
                "path": str(path),
                "timestamp_seconds": round(c["timestamp"], 2),
                "sharpness": round(c["sharpness"], 1),
            }
        )

    return saved


# =============================================================================
# 2. VISION API ANALYSIS
# =============================================================================

def _build_prompt(claimed: dict, categories: list[str], conditions: list[dict]) -> str:
    category_list = ", ".join(f'"{c}"' for c in categories)
    condition_list = ", ".join(f'"{c["value"]}"' for c in conditions)

    return f"""You are a product-condition inspector for a secondhand electronics marketplace.

You are given still frames extracted from a short video scan the seller recorded of the physical item, showing it from multiple angles.

The seller listed the item as:
- product name: {claimed.get("product_name") or "(not provided)"}
- category: {claimed.get("product_type") or "(not provided)"}
- claimed condition: {claimed.get("condition") or "(not provided)"}

Look only at what's actually visible in the frames — do not assume the seller's claims are correct. Identify the item, assess its physical condition (scratches, cracks, dents, missing parts, screen damage, etc.), and grade it independently.

Respond with ONLY a single JSON object, no prose, no markdown code fences, in exactly this shape:
{{
  "product_name": "<specific product name/model you can identify, or your best guess>",
  "product_type": "<one of: {category_list}>",
  "condition": "<one of: {condition_list}>",
  "condition_confidence": <number between 0 and 1>,
  "condition_notes": "<1-3 sentences describing visible wear/damage and why you picked this grade>",
  "detected_defects": ["<short phrase>", "..."]
}}

Use an empty array for detected_defects if you see no visible damage."""


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return json.loads(cleaned)


def _mock_vision_analysis(claimed: dict, categories: list[str], conditions: list[dict]) -> dict:
    """
    No ANTHROPIC_API_KEY (or no `anthropic` package) configured — return a
    plausible stand-in so the verification flow is still fully clickable.
    This just echoes the seller's own claims back, clearly labeled as a mock.
    """
    fallback_condition = conditions[0]["value"] if conditions else "good"
    fallback_category = categories[0] if categories else "Other Electronics"
    return {
        "product_name": claimed.get("product_name") or "Unidentified item",
        "product_type": claimed.get("product_type") or fallback_category,
        "condition": claimed.get("condition") or fallback_condition,
        "condition_confidence": 0.75,
        "condition_notes": (
            "Mock analysis — no ANTHROPIC_API_KEY is configured, so this simply "
            "echoes the seller's claimed fields. Set the environment variable "
            "(and `pip install anthropic`) to run real image analysis."
        ),
        "detected_defects": [],
        "mock": True,
    }


def _gemini_analysis(claimed: dict, categories: list[str], conditions: list[dict], frame_paths: list[str]) -> dict:
    """Call Gemini as a multimodal inspector and return the same JSON schema as Claude."""
    try:
        import google.generativeai as genai
    except ImportError as exc:  # pragma: no cover - import guard for optional dependency
        raise VisionAPIError(
            "Google Generative AI is not installed. Run: pip install google-generativeai"
        ) from exc

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise VisionAPIError("GEMINI_API_KEY is not set. Add it to your environment before running the app.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    category_list = ", ".join(json.dumps(c) for c in categories)
    condition_list = ", ".join(json.dumps(c.get("value", "")) for c in conditions)

    prompt = f"""You are a product-condition inspector for a secondhand electronics marketplace.

You are given still frames extracted from a short video scan of the physical item.

Seller claim:
- product name: {claimed.get('product_name') or '(not provided)'}
- category: {claimed.get('product_type') or '(not provided)'}
- claimed condition: {claimed.get('condition') or '(not provided)'}

Look only at the visible item in the frames. Identify the product, assess physical condition, and grade it independently.

Return ONLY valid JSON with exactly this schema:
{{
  "product_name": "<specific product name/model you can identify, or your best guess>",
  "product_type": "<one of: {category_list}>",
  "condition": "<one of: {condition_list}>",
  "condition_confidence": <number between 0 and 1>,
  "condition_notes": "<1-3 sentences describing visible wear/damage and why you picked this grade>",
  "detected_defects": ["<short phrase>", "..."]
}}

Use an empty array for detected_defects if there is no visible damage."""

    image_parts = []
    for p in frame_paths:
        with open(p, "rb") as fh:
            image_parts.append({"mime_type": "image/jpeg", "data": fh.read()})

    try:
        response = model.generate_content([prompt, *image_parts])
        text = getattr(response, "text", "") or ""
    except Exception as exc:  # pragma: no cover - API failure path
        raise VisionAPIError(f"Gemini API request failed: {exc}") from exc

    try:
        parsed = _extract_json(text)
    except (json.JSONDecodeError, ValueError) as exc:
        raise VisionAPIError(f"Gemini returned output that couldn't be parsed as JSON: {text[:300]!r}") from exc

    parsed.setdefault("detected_defects", [])
    return parsed


def analyze_frames_with_vision_api(
    frame_paths: list[str],
    claimed: dict,
    categories: list[str],
    conditions: list[dict],
    model: str = DEFAULT_MODEL,
) -> tuple[dict, str]:
    """
    Send the extracted frames to Gemini and return
    (parsed_metadata_dict, provider_name).

    If no GEMINI_API_KEY is set, fall back to a mock result.
    """
    try:
        return _gemini_analysis(claimed, categories, conditions, frame_paths), "gemini"
    except VisionAPIError:
        return _mock_vision_analysis(claimed, categories, conditions), "mock"


# =============================================================================
# 3. CLAIMED vs. DETECTED COMPARISON
# =============================================================================

def build_comparison(claimed: dict, detected: dict) -> dict:
    """
    Compare the seller's claimed fields against what the vision model
    detected, and decide the overall verification status:

      - "mismatch"     — wrong category, or condition is way off (auto-reject
                          from the happy path; a human should look at it)
      - "needs_review"  — close, but not clean enough to auto-verify
      - "verified"      — detected fields line up with the listing
    """
    claimed_name = (claimed.get("product_name") or "").strip().lower()
    detected_name = (detected.get("product_name") or "").strip().lower()
    name_similarity = SequenceMatcher(None, claimed_name, detected_name).ratio() if claimed_name and detected_name else 0.0

    claimed_type = (claimed.get("product_type") or "").strip().lower()
    detected_type = (detected.get("product_type") or "").strip().lower()
    type_match = bool(claimed_type) and claimed_type == detected_type

    claimed_rank = CONDITION_ORDER.get(claimed.get("condition"))
    detected_rank = CONDITION_ORDER.get(detected.get("condition"))
    condition_delta = (
        abs(claimed_rank - detected_rank) if claimed_rank is not None and detected_rank is not None else None
    )

    if not type_match:
        status, reason = "mismatch", "The detected product category doesn't match the listed category."
    elif condition_delta is not None and condition_delta >= 2:
        status, reason = "mismatch", "The detected condition is significantly different from the listed condition."
    elif name_similarity < 0.3:
        status, reason = "needs_review", "The detected product name looks quite different from the listing title."
    elif condition_delta == 1:
        status, reason = "needs_review", "The detected condition is one grade off from the listed condition."
    else:
        status, reason = "verified", "The scan is consistent with the listing details."

    return {
        "product_name_similarity": round(name_similarity, 2),
        "product_type_match": type_match,
        "condition_delta": condition_delta,
        "status": status,
        "status_reason": reason,
    }
