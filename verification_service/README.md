# InTheMarket — listing verification service

A small Python (Flask) service implementing the "scan to verify" step of the
sell flow: a seller records a short video of the item, OpenCV pulls a handful
of sharp, distinct key frames out of it, a vision model looks at those frames
and reports what it sees, and the result is compared against what the seller
claimed and saved as `verification_metadata`.

```
verification_service/
├── app.py                 Flask routes
├── vision_pipeline.py     OpenCV frame extraction + vision API call + comparison logic
├── listings_store.py      JSON-file listing persistence
├── templates/verify.html  the verification page itself
├── static/css/verify.css  styling (matches the InTheMarket front end)
├── static/js/verify.js    camera recording, upload, results rendering
├── tests/test_pipeline.py unit tests for the CV + comparison logic
└── storage/               listings.json, uploads/, frames/, verification_metadata/
```

## Setup

```bash
cd verification_service
pip install -r requirements.txt

# Optional: enables real vision analysis instead of mock mode
export ANTHROPIC_API_KEY=sk-ant-...

python app.py    # runs on http://localhost:5001
```

Camera access requires a "secure context" — `http://localhost` is fine,
but a plain `http://<lan-ip>` won't get permission from the browser.

## Trying it end to end

1. Create a pending listing (normally your Sell form would POST this):

   ```bash
   curl -X POST http://localhost:5001/api/listings \
     -H "Content-Type: application/json" \
     -d '{
       "productType": "Smartphones & Tablets",
       "productName": "iPhone 13 Pro, 256GB",
       "condition": "good",
       "price": 480,
       "description": "Light scuffing on the frame, screen is perfect. Includes case."
     }'
   ```

   The response includes `"verify_url": "/verify/<listing_id>"`.

2. Open `http://localhost:5001/verify/<listing_id>` in a browser, allow
   camera access, record a scan, and submit it.

3. The result is written to
   `storage/verification_metadata/<listing_id>.json` and shown on the page.
   Re-fetch it any time with `GET /api/verification/<listing_id>`.

## How the CV pipeline works (`vision_pipeline.py`)

- **`extract_key_frames`** samples the video at ~2 frames/sec, drops blurry
  candidates (variance-of-Laplacian sharpness check), and keeps a frame only
  when its grayscale histogram differs enough from the last kept frame — so
  you get distinct angles of the item instead of near-duplicate frames. It
  caps the result at 6 frames (evenly sampled if more candidates qualify) to
  keep vision-API calls small.
- **`analyze_frames_with_vision_api`** sends those frames plus the seller's
  claimed fields to Claude as a multimodal message, asking for a single JSON
  object back (product name, category, condition, confidence, notes,
  defects). If no `ANTHROPIC_API_KEY` is set (or the `anthropic` package
  isn't installed), it falls back to a clearly-labeled mock that just echoes
  the claimed fields, so the whole flow stays clickable without credentials.
- **`build_comparison`** checks the detected fields against the claim:
  category mismatch or a 2+ grade condition gap → `"mismatch"`; a 1-grade gap
  or a very different product name → `"needs_review"`; otherwise
  `"verified"`.

## Swapping the vision provider

`analyze_frames_with_vision_api` is the one seam to change — it just needs to
keep returning `(metadata_dict, provider_name)` in the same shape. Point it
at Google Cloud Vision, AWS Rekognition, a self-hosted model, whatever you
want to run in production.

## Wiring this into the InTheMarket front end

The included Sell form now follows this sequence:

1. Validate the form and upload the listing photos.
2. POST the form fields and photos to this service's `/api/listings`.
3. Redirect the seller to the returned `verify_url` to record and submit a scan.
4. Show a `Publish verified listing` action only when the result is `verified`.
5. Return to the front end, fetch `/api/listings/<listing_id>`, and publish the
  listing to the marketplace store.

The listing remains `pending_verification` in this service until the scan is
complete, and the front end does not call its marketplace save function before
the verified return handoff.

## Notes / limitations

- `listings_store.py` is a flat JSON file, fine for local development, not
  for concurrent production use — swap it for a real database.
- Uploaded videos and extracted frames are kept under `storage/` for
  debugging; add cleanup/expiry before shipping this for real.
- The condition/category vocabulary here is hardcoded to match the front
  end's `CATEGORIES`/`CONDITIONS` — keep the two in sync if either changes.
