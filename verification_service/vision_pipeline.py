"""
vision_pipeline.py
------------------

The core computer-vision logic for product verification:

1. extract_key_frames() — OpenCV: turn an uploaded video scan into a small
   set of sharp, non-redundant "key frames".

2. analyze_frames_with_vision_api() — send those frames to Gemini Vision
   and get back structured product metadata.

3. build_comparison() — compare what the seller claimed against what
   the vision model detected, and decide whether the listing should be
   auto-verified, sent for manual review, or flagged as a mismatch.
"""

from __future__ import annotations

import base64
import json
import os
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from dotenv import load_dotenv


# Load variables from verification_service/.env
load_dotenv()


# =============================================================================
# CONFIGURATION
# =============================================================================

# Condition grades, ranked from best to worst.
CONDITION_ORDER = {
    "like-new": 0,
    "good": 1,
    "fair": 2,
    "parts": 3,
}

# Gemini vision model.
DEFAULT_MODEL = "gemini-2.5-flash"


# =============================================================================
# EXCEPTIONS
# =============================================================================

class VideoProcessingError(Exception):
    """Raised when the uploaded video can't be read or yields no usable frames."""


class VisionAPIError(Exception):
    """Raised when the vision provider call fails or returns unparseable output."""


# =============================================================================
# 1. FRAME EXTRACTION
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
        every frame.
      - Drop blurry candidates using the variance of the Laplacian.
      - Only keep a frame if its grayscale histogram is meaningfully
        different from the last kept frame.
      - If more candidates qualify than `max_frames`, sample evenly.
    """

    video_path = Path(video_path)
    output_dir = Path(output_dir)

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise VideoProcessingError(
            "Couldn't open the uploaded video. Try a different format "
            "(webm/mp4) or re-record the scan."
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

            sharpness = float(
                cv2.Laplacian(gray, cv2.CV_64F).var()
            )

            if sharpness >= blur_threshold:
                hist = cv2.calcHist(
                    [gray],
                    [0],
                    None,
                    [64],
                    [0, 256],
                )

                cv2.normalize(hist, hist)

                is_new_scene = last_hist is None

                if last_hist is not None:
                    similarity = cv2.compareHist(
                        hist,
                        last_hist,
                        cv2.HISTCMP_CORREL,
                    )

                    is_new_scene = (
                        similarity < scene_change_threshold
                    )

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
            "No usable frames found in that scan — it may be too short, "
            "too dark, or too blurry. Try recording again with steadier, "
            "brighter lighting."
        )

    if len(candidates) > max_frames:
        step = len(candidates) / max_frames

        selected = [
            candidates[int(i * step)]
            for i in range(max_frames)
        ]

    else:
        selected = candidates

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    saved: list[dict[str, Any]] = []

    for i, candidate in enumerate(selected):
        filename = f"frame_{i:02d}.jpg"
        path = output_dir / filename

        cv2.imwrite(
            str(path),
            candidate["frame"],
        )

        saved.append(
            {
                "file": filename,
                "path": str(path),
                "timestamp_seconds": round(
                    candidate["timestamp"],
                    2,
                ),
                "sharpness": round(
                    candidate["sharpness"],
                    1,
                ),
            }
        )

    return saved


# =============================================================================
# 2. VISION API ANALYSIS
# =============================================================================

def _build_prompt(
    claimed: dict,
    categories: list[str],
    conditions: list[dict],
) -> str:

    category_list = ", ".join(
        f'"{c}"'
        for c in categories
    )

    condition_list = ", ".join(
        f'"{c["value"]}"'
        for c in conditions
    )

    return f"""
You are a product-condition inspector for a secondhand electronics marketplace.

You are given still frames extracted from a short video scan the seller
recorded of the physical item, showing it from multiple angles.

The seller listed the item as:

- product name: {claimed.get("product_name") or "(not provided)"}
- category: {claimed.get("product_type") or "(not provided)"}
- claimed condition: {claimed.get("condition") or "(not provided)"}

Look only at what's actually visible in the frames.

Do NOT assume the seller's claims are correct.

Identify the item, assess its physical condition, and grade it independently.

Look for visible:

- scratches
- cracks
- dents
- screen damage
- broken components
- missing parts
- unusual wear
- casing damage
- visible ports or buttons that appear damaged
- other obvious physical defects

Respond with ONLY a single JSON object.

Do not include markdown.

Use exactly this structure:

{{
    "product_name": "<specific product name/model you can identify, or best guess>",
    "product_type": "<one of: {category_list}>",
    "condition": "<one of: {condition_list}>",
    "condition_confidence": <number between 0 and 1>,
    "condition_notes": "<1-3 sentences describing visible wear/damage and why you picked this grade>",
    "detected_defects": [
        "<short phrase>",
        "..."
    ]
}}

Use an empty array for detected_defects if you see no visible damage.

Important:

- Base your analysis primarily on the images.
- Do not simply repeat the seller's claims.
- Do not invent defects.
- If something cannot be determined visually, say so.
- Do not claim that internal components were verified.
- Do not claim battery health was verified.
- Do not claim authenticity was verified.
- Do not claim functionality was verified unless there is visible evidence.
- condition_confidence must be between 0 and 1.
"""


def _extract_json(text: str) -> dict:
    """
    Extract JSON from model output.

    Handles both pure JSON and JSON accidentally wrapped
    in markdown code fences.
    """

    cleaned = text.strip()

    cleaned = re.sub(
        r"^```(?:json)?",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()

    cleaned = re.sub(
        r"```$",
        "",
        cleaned,
    ).strip()

    return json.loads(cleaned)


def _mock_vision_analysis(
    claimed: dict,
    categories: list[str],
    conditions: list[dict],
) -> dict:
    """
    Fallback analysis used only when Gemini isn't available.

    This keeps the verification flow functional during development,
    but clearly marks the result as mock.
    """

    fallback_condition = (
        conditions[0]["value"]
        if conditions
        else "good"
    )

    fallback_category = (
        categories[0]
        if categories
        else "Other Electronics"
    )

    return {
        "product_name": (
            claimed.get("product_name")
            or "Unidentified item"
        ),
        "product_type": (
            claimed.get("product_type")
            or fallback_category
        ),
        "condition": (
            claimed.get("condition")
            or fallback_condition
        ),
        "condition_confidence": 0.75,
        "condition_notes": (
            "Mock analysis — Gemini could not be used, "
            "so this result echoes the seller's claimed fields."
        ),
        "detected_defects": [],
        "mock": True,
    }


def analyze_frames_with_vision_api(
    frame_paths: list[str],
    claimed: dict,
    categories: list[str],
    conditions: list[dict],
    model: str = DEFAULT_MODEL,
) -> tuple[dict, str]:
    """
    Send extracted frames to Gemini Vision and return:

        (parsed_metadata_dict, provider_name)

    Uses GEMINI_API_KEY from the environment/.env file.
    """

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return (
            _mock_vision_analysis(
                claimed,
                categories,
                conditions,
            ),
            "mock",
        )

    try:
        from google import genai
        from google.genai import types

    except ImportError:
        return (
            _mock_vision_analysis(
                claimed,
                categories,
                conditions,
            ),
            "mock",
        )

    try:
        client = genai.Client(
            api_key=api_key
        )

        prompt = _build_prompt(
            claimed,
            categories,
            conditions,
        )

        contents: list[Any] = [prompt]

        # Add every extracted frame to the Gemini request.
        for frame_path in frame_paths:

            frame_bytes = Path(
                frame_path
            ).read_bytes()

            contents.append(
                types.Part.from_bytes(
                    data=frame_bytes,
                    mime_type="image/jpeg",
                )
            )

        response_schema = {
            "type": "object",
            "properties": {
                "product_name": {
                    "type": "string",
                },

                "product_type": {
                    "type": "string",
                },

                "condition": {
                    "type": "string",
                },

                "condition_confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                },

                "condition_notes": {
                    "type": "string",
                },

                "detected_defects": {
                    "type": "array",
                    "items": {
                        "type": "string",
                    },
                },
            },

            "required": [
                "product_name",
                "product_type",
                "condition",
                "condition_confidence",
                "condition_notes",
                "detected_defects",
            ],
        }

        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )

    except Exception as exc:

        raise VisionAPIError(
            f"Gemini Vision API request failed: {exc}"
        ) from exc

    text = response.text or ""

    try:

        parsed = _extract_json(text)

    except (
        json.JSONDecodeError,
        ValueError,
    ) as exc:

        raise VisionAPIError(
            "Gemini returned output that couldn't "
            f"be parsed as JSON: {text[:500]!r}"
        ) from exc

    parsed.setdefault(
        "detected_defects",
        [],
    )

    return parsed, "gemini"


# =============================================================================
# 3. CLAIMED vs. DETECTED COMPARISON
# =============================================================================

def build_comparison(
    claimed: dict,
    detected: dict,
) -> dict:
    """
    Compare the seller's claimed fields against what
    the vision model detected.

    Possible statuses:

      mismatch
        Wrong category or condition is significantly different.

      needs_review
        The result is close but isn't clean enough
        for automatic verification.

      verified
        Detected fields line up with the listing.
    """

    claimed_name = (
        claimed.get("product_name")
        or ""
    ).strip().lower()

    detected_name = (
        detected.get("product_name")
        or ""
    ).strip().lower()

    name_similarity = (
        SequenceMatcher(
            None,
            claimed_name,
            detected_name,
        ).ratio()
        if claimed_name and detected_name
        else 0.0
    )

    claimed_type = (
        claimed.get("product_type")
        or ""
    ).strip().lower()

    detected_type = (
        detected.get("product_type")
        or ""
    ).strip().lower()

    type_match = (
        bool(claimed_type)
        and claimed_type == detected_type
    )

    claimed_rank = CONDITION_ORDER.get(
        claimed.get("condition")
    )

    detected_rank = CONDITION_ORDER.get(
        detected.get("condition")
    )

    condition_delta = (
        abs(
            claimed_rank - detected_rank
        )
        if (
            claimed_rank is not None
            and detected_rank is not None
        )
        else None
    )

    if not type_match:

        status = "mismatch"

        reason = (
            "The detected product category doesn't "
            "match the listed category."
        )

    elif (
        condition_delta is not None
        and condition_delta >= 2
    ):

        status = "mismatch"

        reason = (
            "The detected condition is significantly "
            "different from the listed condition."
        )

    elif name_similarity < 0.3:

        status = "needs_review"

        reason = (
            "The detected product name looks quite "
            "different from the listing title."
        )

    elif condition_delta == 1:

        status = "needs_review"

        reason = (
            "The detected condition is one grade "
            "off from the listed condition."
        )

    else:

        status = "verified"

        reason = (
            "The scan is consistent with the listing details."
        )

    return {
        "product_name_similarity": round(
            name_similarity,
            2,
        ),

        "product_type_match": type_match,

        "condition_delta": condition_delta,

        "status": status,

        "status_reason": reason,
    }