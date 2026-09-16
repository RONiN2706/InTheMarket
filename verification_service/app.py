"""
app.py
------
Flask service for the "Verify" step of the InTheMarket sell flow:

  1. POST /api/listings          — seller's form fields come in, a pending
                                    listing is created, a verify_url comes back.
  2. GET  /verify/<listing_id>   — the verification page: record a video scan.
  3. POST /api/verify/<listing_id> — the recorded video comes in; OpenCV pulls
                                    key frames, a vision model analyzes them,
                                    and a verification_metadata JSON file is
                                    written to storage/verification_metadata/.
  4. GET  /api/verification/<listing_id> — re-fetch a listing's saved result.

Run it with:
    pip install -r requirements.txt
    python app.py
Then create a pending listing (see README.md) and open the verify_url it
returns in a browser — camera access requires http://localhost or https://.
"""

from __future__ import annotations

import datetime
import json
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request, send_from_directory

import listings_store as store
from vision_pipeline import (
    VideoProcessingError,
    VisionAPIError,
    analyze_frames_with_vision_api,
    build_comparison,
    extract_key_frames,
)

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
FRAMES_DIR = STORAGE_DIR / "frames"
META_DIR = STORAGE_DIR / "verification_metadata"
for d in (UPLOADS_DIR, FRAMES_DIR, META_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Kept identical to the CATEGORIES/CONDITIONS in the InTheMarket front end's
# script.js, so vision output can be compared against the same vocabulary.
CATEGORIES = [
    "Smartphones & Tablets",
    "Laptops",
    "Desktops & PCs",
    "Computer Parts & Components",
    "TVs & Monitors",
    "Gaming Consoles",
    "Other Electronics",
]
CONDITIONS = [
    {"value": "like-new", "label": "Like New"},
    {"value": "good", "label": "Good"},
    {"value": "fair", "label": "Fair"},
    {"value": "parts", "label": "For Parts / Not Working"},
]
CONDITION_LABELS = {c["value"]: c["label"] for c in CONDITIONS}

MAX_UPLOAD_MB = 100

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024


@app.after_request
def allow_frontend_requests(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/api/listings", methods=["POST"])
def create_listing():
    """Accepts the seller's form fields and returns where to verify them."""
    data = request.get_json(force=True, silent=True) or {}

    required = ["productType", "productName", "condition", "price", "description"]
    missing = [f for f in required if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if data["productType"] not in CATEGORIES:
        return jsonify({"error": f"Unknown productType: {data['productType']}"}), 400
    if data["condition"] not in CONDITION_LABELS:
        return jsonify({"error": f"Unknown condition: {data['condition']}"}), 400

    listing = store.create_pending_listing(data)
    return (
        jsonify({"listing_id": listing["id"], "verify_url": f"/verify/{listing['id']}"}),
        201,
    )


@app.route("/api/listings/<listing_id>")
def get_listing(listing_id: str):
    listing = store.get_listing(listing_id)
    if not listing:
        return jsonify({"error": "No listing found with that id."}), 404
    return jsonify(listing)


@app.route("/verify/<listing_id>")
def verify_page(listing_id: str):
    listing = store.get_listing(listing_id)
    if not listing:
        abort(404, description="No pending listing found with that id.")
    return render_template(
        "verify.html",
        listing=listing,
        condition_label=CONDITION_LABELS.get(listing["condition"], listing["condition"]),
        return_url=request.args.get("return_url", ""),
    )


@app.route("/api/verify/<listing_id>", methods=["POST"])
def submit_verification(listing_id: str):
    listing = store.get_listing(listing_id)
    if not listing:
        return jsonify({"error": "No pending listing found with that id."}), 404

    video = request.files.get("video")
    if not video or video.filename == "":
        return jsonify({"error": "No video was uploaded."}), 400

    ext = Path(video.filename).suffix or ".webm"
    video_path = UPLOADS_DIR / f"{listing_id}{ext}"
    video.save(video_path)

    frame_dir = FRAMES_DIR / listing_id
    try:
        frames = extract_key_frames(video_path, frame_dir)
    except VideoProcessingError as exc:
        return jsonify({"error": str(exc)}), 422

    claimed = {
        "product_name": listing["productName"],
        "product_type": listing["productType"],
        "condition": listing["condition"],
    }

    try:
        detected, provider = analyze_frames_with_vision_api(
            [f["path"] for f in frames], claimed, CATEGORIES, CONDITIONS
        )
    except VisionAPIError as exc:
        return jsonify({"error": str(exc)}), 502

    comparison = build_comparison(claimed, detected)

    metadata = {
        "listing_id": listing_id,
        "verified_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "video": {"filename": video_path.name, "frames_sampled": len(frames)},
        "frames_analyzed": [
            {"file": f["file"], "timestamp_seconds": f["timestamp_seconds"], "sharpness": f["sharpness"]}
            for f in frames
        ],
        "claimed": claimed,
        "vision_analysis": {"provider": provider, **detected},
        "comparison": comparison,
        "status": comparison["status"],
        "status_reason": comparison["status_reason"],
    }

    meta_path = META_DIR / f"{listing_id}.json"
    meta_path.write_text(json.dumps(metadata, indent=2))

    store.update_listing(
        listing_id,
        status=comparison["status"],
        verification_metadata_path=str(meta_path.relative_to(BASE_DIR)),
    )

    return jsonify(metadata)


@app.route("/frames/<listing_id>/<filename>")
def get_frame(listing_id: str, filename: str):
    """Serves a single extracted key frame — used by the results frame strip."""
    return send_from_directory(FRAMES_DIR / listing_id, filename)


@app.route("/api/verification/<listing_id>")
def get_verification(listing_id: str):
    meta_path = META_DIR / f"{listing_id}.json"
    if not meta_path.exists():
        return jsonify({"error": "No verification on file for this listing yet."}), 404
    return jsonify(json.loads(meta_path.read_text()))


if __name__ == "__main__":
    app.run(debug=True, port=5001)
