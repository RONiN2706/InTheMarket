"""
Unit tests for vision_pipeline.py.

Generates a small synthetic video (no camera/network needed) to exercise
extract_key_frames() for real, and drives analyze_frames_with_vision_api()
in mock mode (no ANTHROPIC_API_KEY) to check the full JSON shape and the
comparison logic end to end.
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vision_pipeline import (  # noqa: E402
    VideoProcessingError,
    analyze_frames_with_vision_api,
    build_comparison,
    extract_key_frames,
)

CATEGORIES = ["Smartphones & Tablets", "Laptops"]
CONDITIONS = [
    {"value": "like-new", "label": "Like New"},
    {"value": "good", "label": "Good"},
    {"value": "fair", "label": "Fair"},
    {"value": "parts", "label": "For Parts / Not Working"},
]


def make_synthetic_video(path: Path, seconds: float = 6.0, fps: int = 15, size=(320, 240), n_views: int = 4):
    """
    Stands in for a real "rotate the item" scan: cycles through `n_views`
    distinctly-colored, checkerboard-textured frames (simulating different
    sides of an object) with a little noise for realistic sharpness values.
    Real rotation footage varies at least this much between angles, so this
    is enough to exercise both the blur filter and the scene-change logic.
    """
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(path), fourcc, fps, size)
    n_frames = int(seconds * fps)
    rng = np.random.default_rng(0)
    views = [(60, 140, 60), (150, 60, 60), (60, 60, 150), (140, 140, 40), (120, 80, 160)][:n_views]

    for i in range(n_frames):
        view_idx = min(int(i / n_frames * len(views)), len(views) - 1)
        base = views[view_idx]
        frame = np.full((size[1], size[0], 3), base, dtype=np.uint8)
        for gx in range(0, size[0], 24):
            for gy in range(0, size[1], 24):
                if (gx // 24 + gy // 24) % 2 == 0:
                    cv2.rectangle(frame, (gx, gy), (gx + 24, gy + 24), tuple(min(255, c + 40) for c in base), -1)
        cv2.putText(frame, f"view{view_idx}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        noise = rng.normal(0, 5, frame.shape).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        writer.write(frame)
    writer.release()


class TestExtractKeyFrames(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.video_path = Path(self.tmpdir.name) / "scan.mp4"
        self.frames_dir = Path(self.tmpdir.name) / "frames"
        make_synthetic_video(self.video_path)

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_extracts_at_least_one_frame(self):
        frames = extract_key_frames(self.video_path, self.frames_dir, max_frames=6)
        self.assertGreater(len(frames), 0)
        self.assertLessEqual(len(frames), 6)
        for f in frames:
            self.assertTrue(Path(f["path"]).exists())
            self.assertGreater(f["sharpness"], 0)

    def test_distinct_views_yield_multiple_frames(self):
        # The synthetic video cycles through 4 visually distinct "views" —
        # the scene-change logic should pick up on more than just the first one.
        frames = extract_key_frames(self.video_path, self.frames_dir, max_frames=6)
        self.assertGreaterEqual(len(frames), 3)

    def test_frames_are_chronological(self):
        frames = extract_key_frames(self.video_path, self.frames_dir, max_frames=6)
        timestamps = [f["timestamp_seconds"] for f in frames]
        self.assertEqual(timestamps, sorted(timestamps))

    def test_missing_video_raises(self):
        with self.assertRaises(VideoProcessingError):
            extract_key_frames(Path(self.tmpdir.name) / "nope.mp4", self.frames_dir)

    def test_blank_video_raises(self):
        blank_path = Path(self.tmpdir.name) / "blank.mp4"
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(blank_path), fourcc, 10, (100, 100))
        for _ in range(20):
            writer.write(np.full((100, 100, 3), 128, dtype=np.uint8))
        writer.release()
        with self.assertRaises(VideoProcessingError):
            extract_key_frames(blank_path, self.frames_dir, blur_threshold=1e9)


class TestMockVisionAnalysis(unittest.TestCase):
    def setUp(self):
        os.environ.pop("ANTHROPIC_API_KEY", None)

    def test_mock_mode_echoes_claimed_fields(self):
        claimed = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "good"}
        detected, provider = analyze_frames_with_vision_api([], claimed, CATEGORIES, CONDITIONS)
        self.assertEqual(provider, "mock")
        self.assertTrue(detected["mock"])
        self.assertEqual(detected["product_name"], claimed["product_name"])
        self.assertEqual(detected["condition"], claimed["condition"])


class TestBuildComparison(unittest.TestCase):
    def test_exact_match_is_verified(self):
        claimed = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "good"}
        detected = dict(claimed)
        result = build_comparison(claimed, detected)
        self.assertEqual(result["status"], "verified")

    def test_wrong_category_is_mismatch(self):
        claimed = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "good"}
        detected = {"product_name": "iPhone 13 Pro", "product_type": "Laptops", "condition": "good"}
        result = build_comparison(claimed, detected)
        self.assertEqual(result["status"], "mismatch")

    def test_big_condition_gap_is_mismatch(self):
        claimed = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "like-new"}
        detected = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "parts"}
        result = build_comparison(claimed, detected)
        self.assertEqual(result["status"], "mismatch")

    def test_one_grade_gap_needs_review(self):
        claimed = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "good"}
        detected = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "fair"}
        result = build_comparison(claimed, detected)
        self.assertEqual(result["status"], "needs_review")


class TestFullPipelineJSONShape(unittest.TestCase):
    """Runs extraction + mock analysis + comparison together, like app.py does,
    and checks the resulting metadata is valid, complete JSON."""

    def test_end_to_end_metadata_shape(self):
        os.environ.pop("ANTHROPIC_API_KEY", None)
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "scan.mp4"
            frames_dir = Path(tmp) / "frames"
            make_synthetic_video(video_path)

            frames = extract_key_frames(video_path, frames_dir)
            claimed = {"product_name": "iPhone 13 Pro", "product_type": "Smartphones & Tablets", "condition": "good"}
            detected, provider = analyze_frames_with_vision_api(
                [f["path"] for f in frames], claimed, CATEGORIES, CONDITIONS
            )
            comparison = build_comparison(claimed, detected)

            metadata = {
                "listing_id": "test123",
                "frames_analyzed": frames,
                "claimed": claimed,
                "vision_analysis": {"provider": provider, **detected},
                "comparison": comparison,
                "status": comparison["status"],
            }
            # Must be JSON-serializable (this is what gets written to disk).
            serialized = json.dumps(metadata)
            reloaded = json.loads(serialized)
            self.assertEqual(reloaded["status"], "verified")
            self.assertIn("product_name", reloaded["vision_analysis"])


if __name__ == "__main__":
    unittest.main()
