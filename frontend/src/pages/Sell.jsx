import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import sellHero from "../assets/sell-hero.png"

const VERIFICATION_SERVICE_URL = "http://localhost:5001"

/* =========================================================
   NAVBAR
   ========================================================= */

function Navbar() {
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <button
        type="button"
        className="logo"
        onClick={() => navigate("/")}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
        }}
      >
        IntheMarket
      </button>

      <ul className="nav-links">
        <li>
          <button type="button" onClick={() => navigate("/")}>
            Browse
          </button>
        </li>

        <li>
          <button type="button" onClick={() => navigate("/sell")}>
            Sell
          </button>
        </li>

        <li>
          <button type="button" onClick={() => navigate("/messages")}>
            Messages
          </button>
        </li>

        <li>
          <button type="button" onClick={() => navigate("/saved")}>
            ♡ Saved
          </button>
        </li>

        <li>
          <button type="button" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </li>
      </ul>
    </nav>
  )
}

/* =========================================================
   INDEXED DB
   ========================================================= */

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("InTheMarketImages", 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images")
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

async function saveImagesToDatabase(listingId, files) {
  const db = await openImageDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("images", "readwrite")
    const store = transaction.objectStore("images")

    store.put(files, listingId)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

/* =========================================================
   ICONS
   ========================================================= */

function UploadIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

/* =========================================================
   SELL PAGE
   ========================================================= */

function Sell() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  const fileInputRef = useRef(null)

  /* =======================================================
     CLEAN PREVIEWS ON UNMOUNT
     ======================================================= */

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        URL.revokeObjectURL(preview)
      })
    }
  }, [imagePreviews])

  /* =======================================================
     ADD IMAGES
     ======================================================= */

  function addImages(files) {
    const selectedFiles = Array.from(files || [])

    if (selectedFiles.length === 0) {
      return
    }

    const remainingSlots = 6 - images.length

    if (remainingSlots <= 0) {
      setError("You already have the maximum of 6 photos.")
      return
    }

    if (selectedFiles.length > remainingSlots) {
      setError(
        `You can add ${remainingSlots} more photo${
          remainingSlots === 1 ? "" : "s"
        }. Maximum is 6.`
      )
      return
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.type.startsWith("image/")
    )

    if (invalidFile) {
      setError("Please upload image files only.")
      return
    }

    setError("")

    const newPreviews = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    )

    setImages((previous) => [
      ...previous,
      ...selectedFiles,
    ])

    setImagePreviews((previous) => [
      ...previous,
      ...newPreviews,
    ])
  }

  /* =======================================================
     FILE INPUT
     ======================================================= */

  function handleImageChange(event) {
    addImages(event.target.files)

    /*
     * Reset the input so selecting the same file again
     * still triggers onChange.
     */
    event.target.value = ""
  }

  /* =======================================================
     DRAG & DROP
     ======================================================= */

  function handleDragOver(event) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDrop(event) {
    event.preventDefault()
    event.stopPropagation()

    addImages(event.dataTransfer.files)
  }

  /* =======================================================
     REMOVE IMAGE
     ======================================================= */

  function removeImage(index) {
    const preview = imagePreviews[index]

    if (preview) {
      URL.revokeObjectURL(preview)
    }

    setImages((previous) =>
      previous.filter(
        (_, imageIndex) => imageIndex !== index
      )
    )

    setImagePreviews((previous) =>
      previous.filter(
        (_, imageIndex) => imageIndex !== index
      )
    )

    setError("")
  }

  /* =======================================================
     SUBMIT
     ======================================================= */

  async function handleSubmit(event) {
    event.preventDefault()

    if (loading) {
      return
    }

    setLoading(true)
    setError("")

    const form = event.target

    /* =====================================================
       VALIDATION
       ===================================================== */

    if (images.length === 0) {
      setError(
        "Please upload at least one clear photo of your device."
      )
      setLoading(false)
      return
    }

    if (images.length > 6) {
      setError("You can upload a maximum of 6 photos.")
      setLoading(false)
      return
    }

    const productName =
      form.productName.value.trim()

    const productType =
      form.productType.value

    const condition =
      form.condition.value

    const price =
      Number(form.price.value)

    const location =
      form.location.value.trim()

    const description =
      form.description.value.trim()

    if (!productName) {
      setError("Please enter a product name.")
      setLoading(false)
      return
    }

    if (!productType) {
      setError("Please select a category.")
      setLoading(false)
      return
    }

    if (!price || price <= 0) {
      setError("Please enter a valid price.")
      setLoading(false)
      return
    }

    if (!condition) {
      setError("Please select the condition.")
      setLoading(false)
      return
    }

    if (!location) {
      setError("Please enter your location.")
      setLoading(false)
      return
    }

    if (!description) {
      setError("Please add a description.")
      setLoading(false)
      return
    }

    /* =====================================================
       LISTING OBJECT
       ===================================================== */

    const listing = {
      productType,
      productName,
      condition,
      price,
      description,
      images: [],
      createdAt: Date.now(),
    }

    try {
      /* ===================================================
         CREATE CAMERAVISION LISTING
         =================================================== */

      const response = await fetch(
        `${VERIFICATION_SERVICE_URL}/api/listings`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(listing),
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not create your listing."
        )
      }

      if (!data.listing_id) {
        throw new Error(
          "CameraVision did not return a listing ID."
        )
      }

      /* ===================================================
         SAVE LOCATION
         =================================================== */

      sessionStorage.setItem(
        `pending-location-${data.listing_id}`,
        location
      )

      /* ===================================================
         SAVE ACTUAL IMAGE FILES
         =================================================== */

      await saveImagesToDatabase(
        data.listing_id,
        images
      )

      /* ===================================================
         MOVE TO VERIFICATION
         =================================================== */

      navigate(
        `/verification?listing_id=${encodeURIComponent(
          data.listing_id
        )}`
      )
    } catch (err) {
      console.error(
        "Listing creation error:",
        err
      )

      setError(
        err.message ||
          "Something went wrong while starting verification."
      )

      setLoading(false)
    }
  }

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <div className="imt-sell-page">

      {/* ===================================================
          NAVBAR
          =================================================== */}

      <Navbar />

      {/* ===================================================
          PAGE STYLES
          =================================================== */}

      <style>{`
        .imt-sell-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(92, 74, 180, 0.12),
              transparent 38%
            ),
            #05070b;
          color: #f5f7ff;
          padding-bottom: 100px;
        }

        .imt-sell-page *,
        .imt-sell-page *::before,
        .imt-sell-page *::after {
          box-sizing: border-box;
        }

        /* HERO */

        .imt-sell-hero {
          position: relative;
          width: 100%;
          min-height: 500px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .imt-sell-hero-image {
          position: absolute;
          inset: 0;
          background-image: url("${sellHero}");
          background-position: center center;
          background-size: cover;
          background-repeat: no-repeat;
          transform: scale(1.01);
        }

        .imt-sell-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(3,5,9,0.92) 0%,
              rgba(3,5,9,0.62) 38%,
              rgba(3,5,9,0.35) 70%,
              rgba(3,5,9,0.72) 100%
            ),
            linear-gradient(
              0deg,
              #05070b 0%,
              transparent 42%,
              rgba(3,5,9,0.15) 100%
            );
        }

        .imt-sell-hero-content {
          position: relative;
          z-index: 2;
          width: min(1180px, calc(100% - 48px));
          padding: 100px 20px 80px;
        }

        .imt-sell-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border-radius: 999px;
          background: rgba(142, 111, 255, 0.12);
          border: 1px solid rgba(155, 130, 255, 0.3);
          color: #bca9ff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 22px;
          backdrop-filter: blur(10px);
        }

        .imt-sell-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9d7cff;
          box-shadow: 0 0 12px rgba(157,124,255,0.9);
        }

        .imt-sell-title {
          max-width: 720px;
          margin: 0;
          font-size: clamp(54px, 7vw, 92px);
          line-height: 0.95;
          letter-spacing: -0.055em;
          font-weight: 850;
        }

        .imt-sell-title span {
          background: linear-gradient(
            100deg,
            #668cff,
            #9c75ff,
            #d18bff
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .imt-sell-description {
          max-width: 610px;
          margin: 28px 0 0;
          color: #aeb9cf;
          font-size: 18px;
          line-height: 1.65;
        }

        .imt-sell-hero-points {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 30px;
        }

        .imt-hero-point {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          background: rgba(10,13,20,0.55);
          backdrop-filter: blur(10px);
          color: #cbd4e7;
          font-size: 13px;
        }

        .imt-hero-point svg {
          color: #9d83ff;
        }

        /* FORM WRAPPER */

        .imt-form-wrapper {
          width: min(1120px, calc(100% - 40px));
          margin: -55px auto 0;
          position: relative;
          z-index: 5;
        }

        .imt-form-card {
          background:
            linear-gradient(
              145deg,
              rgba(16,21,31,0.98),
              rgba(8,11,17,0.98)
            );
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          box-shadow:
            0 30px 100px rgba(0,0,0,0.45),
            0 0 0 1px rgba(122,91,255,0.03);
          overflow: hidden;
        }

        /* FORM TOP */

        .imt-form-top {
          padding: 30px 38px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .imt-form-top-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .imt-step-circle {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(132,103,255,0.12);
          border: 1px solid rgba(147,119,255,0.22);
          color: #a98cff;
          font-weight: 800;
          font-size: 13px;
        }

        .imt-form-top h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: -0.02em;
        }

        .imt-form-top p {
          margin: 4px 0 0;
          color: #77839a;
          font-size: 13px;
        }

        .imt-photo-count {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
          color: #8e9bb1;
          font-size: 12px;
          font-weight: 700;
        }

        /* FORM BODY */

        .imt-form-body {
          padding: 38px;
        }

        .imt-section {
          margin-bottom: 42px;
        }

        .imt-section:last-child {
          margin-bottom: 0;
        }

        .imt-section-heading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 24px;
        }

        .imt-section-number {
          color: #9b7cff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding-top: 4px;
        }

        .imt-section-heading h3 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .imt-section-heading p {
          margin: 5px 0 0;
          color: #758197;
          font-size: 13px;
        }

        .imt-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .imt-field {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .imt-field.full {
          grid-column: 1 / -1;
        }

        .imt-field label {
          color: #d8deea;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .imt-field input,
        .imt-field select,
        .imt-field textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(3,6,11,0.72);
          color: #edf1fa;
          border-radius: 12px;
          padding: 15px 16px;
          font: inherit;
          font-size: 14px;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .imt-field input,
        .imt-field select {
          height: 52px;
        }

        .imt-field textarea {
          min-height: 130px;
          resize: vertical;
          line-height: 1.55;
        }

        .imt-field input::placeholder,
        .imt-field textarea::placeholder {
          color: #526078;
        }

        .imt-field input:focus,
        .imt-field select:focus,
        .imt-field textarea:focus {
          border-color: rgba(145,115,255,0.62);
          background: rgba(7,10,17,0.95);
          box-shadow: 0 0 0 4px rgba(129,98,255,0.08);
        }

        .imt-field select {
          appearance: auto;
        }

        /* PHOTO UPLOAD */

        .imt-upload-area {
          position: relative;
          min-height: 190px;
          border: 1px dashed rgba(147,119,255,0.35);
          border-radius: 17px;
          background:
            radial-gradient(
              circle at center,
              rgba(119,91,255,0.075),
              transparent 58%
            ),
            rgba(4,7,12,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
          overflow: hidden;
        }

        .imt-upload-area:hover {
          border-color: rgba(157,129,255,0.7);
          background:
            radial-gradient(
              circle at center,
              rgba(119,91,255,0.12),
              transparent 60%
            ),
            rgba(5,8,14,0.9);
        }

        .imt-upload-area.dragging {
          border-color: #a58bff;
          background: rgba(112,83,255,0.12);
          transform: scale(1.005);
        }

        .imt-upload-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .imt-upload-content {
          pointer-events: none;
          padding: 25px;
        }

        .imt-upload-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 13px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #a88cff;
          background: rgba(137,106,255,0.1);
          border: 1px solid rgba(148,119,255,0.2);
        }

        .imt-upload-content strong {
          display: block;
          color: #e9edf6;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .imt-upload-content span {
          display: block;
          color: #68758b;
          font-size: 12px;
        }

        .imt-upload-content em {
          color: #a88cff;
          font-style: normal;
        }

        /* PREVIEWS */

        .imt-preview-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .imt-preview-card {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 13px;
          background: #090d14;
          border: 1px solid rgba(255,255,255,0.09);
        }

        .imt-preview-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .imt-preview-number {
          position: absolute;
          left: 8px;
          bottom: 8px;
          padding: 5px 8px;
          border-radius: 7px;
          background: rgba(0,0,0,0.7);
          color: #dce2ed;
          font-size: 10px;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        .imt-remove-photo {
          position: absolute;
          right: 8px;
          top: 8px;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 50%;
          background: rgba(0,0,0,0.72);
          color: white;
          cursor: pointer;
          font-size: 17px;
          line-height: 1;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .imt-remove-photo:hover {
          background: rgba(220,60,80,0.85);
          transform: scale(1.08);
        }

        /* VERIFICATION CARD */

        .imt-verification-card {
          margin-top: 32px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid rgba(130,105,255,0.2);
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              rgba(115,86,255,0.08),
              rgba(75,105,255,0.035)
            );
        }

        .imt-verification-icon {
          flex: 0 0 auto;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #a992ff;
          background: rgba(134,104,255,0.12);
          border: 1px solid rgba(150,125,255,0.2);
        }

        .imt-verification-card h3 {
          margin: 0 0 5px;
          font-size: 14px;
        }

        .imt-verification-card p {
          margin: 0;
          color: #758198;
          font-size: 12px;
          line-height: 1.5;
        }

        .imt-verification-step {
          margin-left: auto;
          white-space: nowrap;
          color: #a58cff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        /* ERROR */

        .imt-error {
          margin-top: 22px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 11px;
          border: 1px solid rgba(255,75,95,0.25);
          background: rgba(255,65,85,0.07);
          color: #ff929f;
          font-size: 13px;
        }

        .imt-error-symbol {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,75,95,0.15);
          font-weight: 800;
        }

        /* SUBMIT */

        .imt-submit-area {
          margin-top: 34px;
          padding-top: 30px;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .imt-submit-info {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #66738a;
          font-size: 12px;
          line-height: 1.45;
        }

        .imt-submit-info svg {
          flex: 0 0 auto;
          color: #8d75ff;
        }

        .imt-submit-button {
          min-width: 250px;
          height: 54px;
          border: 0;
          border-radius: 12px;
          background:
            linear-gradient(
              100deg,
              #536fff,
              #8866ff
            );
          color: white;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 10px 30px rgba(91,76,255,0.2);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
        }

        .imt-submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 14px 35px rgba(91,76,255,0.32);
        }

        .imt-submit-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* RESPONSIVE */

        @media (max-width: 800px) {
          .imt-sell-hero {
            min-height: 450px;
          }

          .imt-sell-hero-content {
            width: calc(100% - 28px);
            padding: 80px 12px 70px;
          }

          .imt-sell-title {
            font-size: 54px;
          }

          .imt-form-wrapper {
            width: calc(100% - 22px);
            margin-top: -35px;
          }

          .imt-form-top,
          .imt-form-body {
            padding: 24px;
          }

          .imt-fields {
            grid-template-columns: 1fr;
          }

          .imt-field.full {
            grid-column: auto;
          }

          .imt-preview-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .imt-submit-area {
            flex-direction: column;
            align-items: stretch;
          }

          .imt-submit-button {
            width: 100%;
          }

          .imt-submit-info {
            justify-content: center;
          }
        }

        @media (max-width: 560px) {
          .imt-sell-title {
            font-size: 45px;
          }

          .imt-sell-description {
            font-size: 15px;
          }

          .imt-hero-point {
            font-size: 11px;
          }

          .imt-form-top {
            align-items: flex-start;
          }

          .imt-photo-count {
            display: none;
          }

          .imt-form-body {
            padding: 20px;
          }

          .imt-preview-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .imt-verification-card {
            align-items: flex-start;
          }

          .imt-verification-step {
            display: none;
          }
        }
      `}</style>

      {/* =================================================
          HERO
          ================================================= */}

      <section className="imt-sell-hero">

        <div className="imt-sell-hero-image" />

        <div className="imt-sell-hero-overlay" />

        <div className="imt-sell-hero-content">

          <div className="imt-sell-eyebrow">
            <span className="imt-sell-eyebrow-dot" />
            SELL WITH CONFIDENCE
          </div>

          <h1 className="imt-sell-title">
            Turn Your Tech
            <br />
            Into <span>Value.</span>
          </h1>

          <p className="imt-sell-description">
            List your device, verify its condition,
            and let buyers shop with confidence.
            Every listing gets an AI-powered verification
            before it goes live.
          </p>

          <div className="imt-sell-hero-points">

            <div className="imt-hero-point">
              <CheckIcon />
              AI Verified
            </div>

            <div className="imt-hero-point">
              <CheckIcon />
              Trusted Listings
            </div>

            <div className="imt-hero-point">
              <CheckIcon />
              Local Buyers
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          FORM
          ================================================= */}

      <div className="imt-form-wrapper">

        <div className="imt-form-card">

          {/* FORM HEADER */}

          <div className="imt-form-top">

            <div className="imt-form-top-left">

              <div className="imt-step-circle">
                01
              </div>

              <div>
                <h2>
                  Create your listing
                </h2>

                <p>
                  Give buyers everything they need to know.
                </p>
              </div>

            </div>

            <div className="imt-photo-count">
              {images.length}/6 PHOTOS
            </div>

          </div>

          <form
            onSubmit={handleSubmit}
            className="imt-form-body"
          >

            {/* =================================================
                BASIC INFORMATION
                ================================================= */}

            <section className="imt-section">

              <div className="imt-section-heading">

                <div className="imt-section-number">
                  01
                </div>

                <div>
                  <h3>
                    Product information
                  </h3>

                  <p>
                    Tell buyers what you're selling.
                  </p>
                </div>

              </div>

              <div className="imt-fields">

                {/* PRODUCT NAME */}

                <div className="imt-field full">

                  <label htmlFor="productName">
                    Product name
                  </label>

                  <input
                    id="productName"
                    name="productName"
                    type="text"
                    placeholder="e.g. ASUS TUF Gaming F15"
                    autoComplete="off"
                    required
                  />

                </div>

                {/* CATEGORY */}

                <div className="imt-field">

                  <label htmlFor="productType">
                    Category
                  </label>

                  <select
                    id="productType"
                    name="productType"
                    required
                    defaultValue=""
                  >

                    <option value="" disabled>
                      Select category
                    </option>

                    <option value="Smartphones & Tablets">
                      Smartphones & Tablets
                    </option>

                    <option value="Laptops">
                      Laptops
                    </option>

                    <option value="Desktops & PCs">
                      Desktops & PCs
                    </option>

                    <option value="Computer Parts & Components">
                      Computer Parts & Components
                    </option>

                    <option value="TVs & Monitors">
                      TVs & Monitors
                    </option>

                    <option value="Gaming Consoles">
                      Gaming Consoles
                    </option>

                    <option value="Other Electronics">
                      Other Electronics
                    </option>

                  </select>

                </div>

                {/* PRICE */}

                <div className="imt-field">

                  <label htmlFor="price">
                    Asking price
                  </label>

                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="₹ 50,000"
                    required
                  />

                </div>

              </div>

            </section>

            {/* =================================================
                PHOTOS
                ================================================= */}

            <section className="imt-section">

              <div className="imt-section-heading">

                <div className="imt-section-number">
                  02
                </div>

                <div>
                  <h3>
                    Product photos
                  </h3>

                  <p>
                    Clear photos help our AI verify your device.
                  </p>
                </div>

              </div>

              <div
                className="imt-upload-area"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >

                <input
                  ref={fileInputRef}
                  className="imt-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= 6}
                />

                <div className="imt-upload-content">

                  <div className="imt-upload-icon">
                    <UploadIcon />
                  </div>

                  {images.length >= 6 ? (
                    <>
                      <strong>
                        Maximum photos added
                      </strong>

                      <span>
                        Remove a photo to upload another.
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>
                        Add photos of your device
                      </strong>

                      <span>
                        Drag & drop or{" "}
                        <em>click to browse</em>
                      </span>

                      <span style={{ marginTop: "7px" }}>
                        JPG, PNG or WEBP · Up to 6 photos
                      </span>
                    </>
                  )}

                </div>

              </div>

              {/* PHOTO PREVIEWS */}

              {imagePreviews.length > 0 && (

                <div className="imt-preview-grid">

                  {imagePreviews.map(
                    (preview, index) => (

                      <div
                        className="imt-preview-card"
                        key={`${preview}-${index}`}
                      >

                        <img
                          src={preview}
                          alt={`Product photo ${index + 1}`}
                        />

                        <span className="imt-preview-number">
                          PHOTO {index + 1}
                        </span>

                        <button
                          type="button"
                          className="imt-remove-photo"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeImage(index)
                          }}
                          aria-label={`Remove photo ${
                            index + 1
                          }`}
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

            {/* =================================================
                CONDITION + LOCATION
                ================================================= */}

            <section className="imt-section">

              <div className="imt-section-heading">

                <div className="imt-section-number">
                  03
                </div>

                <div>
                  <h3>
                    Condition & details
                  </h3>

                  <p>
                    Be accurate — buyers will see this information.
                  </p>
                </div>

              </div>

              <div className="imt-fields">

                {/* CONDITION */}

                <div className="imt-field">

                  <label htmlFor="condition">
                    Condition
                  </label>

                  <select
                    id="condition"
                    name="condition"
                    required
                    defaultValue=""
                  >

                    <option value="" disabled>
                      Select condition
                    </option>

                    <option value="like-new">
                      Like New
                    </option>

                    <option value="good">
                      Good
                    </option>

                    <option value="fair">
                      Fair
                    </option>

                    <option value="parts">
                      For Parts / Not Working
                    </option>

                  </select>

                </div>

                {/* LOCATION */}

                <div className="imt-field">

                  <label htmlFor="location">
                    Location
                  </label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="e.g. Vellore"
                    required
                  />

                </div>

                {/* DESCRIPTION */}

                <div className="imt-field full">

                  <label htmlFor="description">
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe the condition, usage, accessories included, warranty, upgrades, or anything else buyers should know..."
                    required
                  />

                </div>

              </div>

            </section>

            {/* =================================================
                VERIFICATION
                ================================================= */}

            <div className="imt-verification-card">

              <div className="imt-verification-icon">
                <ShieldIcon />
              </div>

              <div>

                <h3>
                  AI verification is required
                </h3>

                <p>
                  After creating your listing, you'll record
                  a short live video of the device. CameraVision
                  will analyze it before you can publish.
                </p>

              </div>

              <span className="imt-verification-step">
                STEP 02 →
              </span>

            </div>

            {/* =================================================
                ERROR
                ================================================= */}

            {error && (

              <div
                className="imt-error"
                role="alert"
              >

                <span className="imt-error-symbol">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>

            )}

            {/* =================================================
                SUBMIT
                ================================================= */}

            <div className="imt-submit-area">

              <div className="imt-submit-info">

                <ShieldIcon />

                <span>
                  Your listing will be verified
                  <br />
                  before it becomes visible to buyers.
                </span>

              </div>

              <button
                type="submit"
                className="imt-submit-button"
                disabled={loading}
              >
                {loading
                  ? "Creating Listing..."
                  : "Continue to Verification →"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  )
}

export default Sell