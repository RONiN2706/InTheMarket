import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "./ProductDetails.css"

const STORAGE_KEY = "inthemarket-listings"

const demoProducts = [
  {
    id: "1",
    name: "iPhone 15",
    price: "₹48,000",
    condition: "Excellent",
    location: "Vellore",
    description: "Excellent condition iPhone 15.",
  },
  {
    id: "2",
    name: "RTX 3060 Gaming PC",
    price: "₹52,000",
    condition: "Good",
    location: "Vellore",
    description: "Gaming PC with RTX 3060.",
  },
  {
    id: "3",
    name: "Sony WH-1000XM5",
    price: "₹18,000",
    condition: "Like New",
    location: "Katpadi",
    description: "Premium noise cancelling headphones.",
  },
  {
    id: "4",
    name: "PS5 Slim",
    price: "₹38,000",
    condition: "Excellent",
    location: "Vellore",
    description: "PS5 Slim in excellent condition.",
  },
]

function getPublishedListings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return []
    }

    return JSON.parse(saved)
  } catch (error) {
    console.error("Could not load listings:", error)
    return []
  }
}

function formatCondition(value) {
  if (!value) return "Unknown"

  const conditions = {
    "like-new": "Like New",
    good: "Good",
    fair: "Fair",
    parts: "For Parts / Not Working",
    excellent: "Excellent",
  }

  return conditions[value] || value
}

function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    const listings = getPublishedListings()

    const publishedProduct = listings.find(
      (item) => String(item.id) === String(id)
    )

    if (publishedProduct) {
      setProduct(publishedProduct)
      return
    }

    const demoProduct = demoProducts.find(
      (item) => String(item.id) === String(id)
    )

    setProduct(demoProduct || null)
  }, [id])

  if (!product) {
    return (
      <div className="pd-page">
        <div className="pd-not-found">
          <div className="pd-not-found-icon">⌕</div>

          <h1>Product Not Found</h1>

          <p>
            This listing may have been removed or no longer exists.
          </p>

          <button
            className="pd-back-button"
            onClick={() => navigate("/")}
          >
            ← Back to Browse
          </button>
        </div>
      </div>
    )
  }

  const name =
    product.productName ||
    product.name ||
    "Unknown Product"

  const price =
    typeof product.price === "number"
      ? `₹${product.price.toLocaleString("en-IN")}`
      : product.price || "Price unavailable"

  const condition = formatCondition(product.condition)

  const location = product.location || "Vellore"

  const images = Array.isArray(product.images)
    ? product.images
    : []

  const verification = product.verification || {}

  const isVerified =
    verification.status === "verified"

  const confidence =
    verification.conditionConfidence

  const confidencePercent =
    confidence !== null &&
    confidence !== undefined &&
    !Number.isNaN(Number(confidence))
      ? Math.round(Number(confidence) * 100)
      : null

  const aiCondition =
    verification.detectedCondition ||
    verification.detected_condition ||
    verification.condition ||
    product.condition

  const aiRemark =
    verification.conditionNotes ||
    verification.condition_notes ||
    "CameraVision analyzed the provided images and found no additional condition details."

  const defects =
    verification.detectedDefects ||
    verification.detected_defects ||
    []

  const currentImage =
    images[selectedImage]

  const currentImageSrc =
    typeof currentImage === "string"
      ? currentImage
      : currentImage?.data

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: name,
          text: `Check out this ${name} on IntheMarket`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        )

        alert("Link copied!")
      }
    } catch {
      // User cancelled sharing.
    }
  }

  return (
    <div className="pd-page">

      {/* BACK BUTTON */}

      <button
        className="pd-back-button"
        onClick={() => navigate(-1)}
      >
        <span>←</span>
        Back
      </button>


      {/* MAIN PRODUCT LAYOUT */}

      <div className="pd-layout">

        {/* ==================================================
            LEFT — PRODUCT IMAGE
        ================================================== */}

        <div className="pd-gallery">

          <div className="pd-main-image">

            {currentImageSrc ? (
              <img
                src={currentImageSrc}
                alt={name}
              />
            ) : (
              <div className="pd-image-placeholder">
                <span>📦</span>
                <p>No image available</p>
              </div>
            )}

            {isVerified && (
              <div className="pd-image-badge">
                <span className="pd-check">
                  ✓
                </span>

                AI VERIFIED
              </div>
            )}

          </div>


          {/* IMAGE THUMBNAILS */}

          {images.length > 1 && (
            <div className="pd-thumbnails">

              {images.map((image, index) => {

                const src =
                  typeof image === "string"
                    ? image
                    : image?.data

                return (
                  <button
                    key={index}
                    className={
                      selectedImage === index
                        ? "pd-thumbnail pd-thumbnail-active"
                        : "pd-thumbnail"
                    }
                    onClick={() =>
                      setSelectedImage(index)
                    }
                  >
                    <img
                      src={src}
                      alt={`${name} ${index + 1}`}
                    />
                  </button>
                )
              })}

            </div>
          )}

        </div>


        {/* ==================================================
            RIGHT — PRODUCT INFORMATION
        ================================================== */}

        <div className="pd-info">

          {/* CATEGORY */}

          <div className="pd-category">
            {product.category ||
              product.productType ||
              "ELECTRONICS"}
          </div>


          {/* TITLE + ACTIONS */}

          <div className="pd-title-row">

            <h1 className="pd-title">
              {name}
            </h1>

            <div className="pd-actions">

              <button
                className="pd-small-button"
                onClick={() =>
                  console.log(
                    "Save listing:",
                    product.id
                  )
                }
              >
                ♡ Save
              </button>

              <button
                className="pd-small-button"
                onClick={handleShare}
              >
                ↗ Share
              </button>

            </div>

          </div>


          {/* PRICE */}

          <div className="pd-price">
            {price}
          </div>


          {/* CONDITION + LOCATION */}

          <div className="pd-meta">

            <span className="pd-condition">
              {condition}
            </span>

            <span className="pd-separator">
              •
            </span>

            <span className="pd-location">
              📍 {location}
            </span>

          </div>


          {/* ==================================================
              CAMERAVISION VERIFICATION
          ================================================== */}

          {isVerified && (
            <section className="pd-verification">

              {/* HEADER */}

              <div className="pd-verification-header">

                <div className="pd-camera-brand">

                  <div className="pd-camera-icon">
                    ✦
                  </div>

                  <div>

                    <div className="pd-camera-title">
                      CameraVision
                    </div>

                    <div className="pd-camera-subtitle">
                      AI device verification
                    </div>

                  </div>

                </div>

                <span className="pd-verified-pill">
                  VERIFIED
                </span>

              </div>


              {/* VERIFICATION CHECKS */}

              <div className="pd-check-grid">

                <div className="pd-check-card">
                  <span>✓</span>
                  Device matched
                </div>

                <div className="pd-check-card">
                  <span>✓</span>
                  Visual scan passed
                </div>

              </div>


              {/* CONFIDENCE */}

              {confidencePercent !== null && (
                <div className="pd-confidence">

                  <div className="pd-confidence-top">

                    <span>
                      Condition confidence
                    </span>

                    <strong>
                      {confidencePercent}%
                    </strong>

                  </div>

                  <div className="pd-confidence-track">

                    <div
                      className="pd-confidence-fill"
                      style={{
                        width: `${confidencePercent}%`,
                      }}
                    />

                  </div>

                </div>
              )}


              {/* ==================================================
                  AI CONDITION + AI REMARK
              ================================================== */}

              <div className="pd-ai-inspection">

                <div className="pd-ai-section">

                  <div className="pd-label">
                    AI DETECTED CONDITION
                  </div>

                  <div className="pd-ai-condition">
                    {formatCondition(aiCondition)}
                  </div>

                </div>


                <div className="pd-vertical-line" />


                <div className="pd-ai-section">

                  <div className="pd-label">
                    AI REMARK
                  </div>

                  <p className="pd-remark">
                    {aiRemark}
                  </p>

                </div>

              </div>


              {/* ==================================================
                  DETECTED DEFECTS
              ================================================== */}

              <div className="pd-defects">

                <div className="pd-label">
                  DETECTED DEFECTS
                </div>

                {Array.isArray(defects) &&
                defects.length > 0 ? (

                  <div className="pd-defect-list">

                    {defects.map(
                      (defect, index) => (
                        <div
                          className="pd-defect"
                          key={index}
                        >
                          <span>!</span>
                          {defect}
                        </div>
                      )
                    )}

                  </div>

                ) : (

                  <div className="pd-no-defects">

                    <span>✓</span>

                    No visible defects detected

                  </div>

                )}

              </div>

            </section>
          )}


          {/* ==================================================
              DESCRIPTION
          ================================================== */}

          <section className="pd-description">

            <div className="pd-section-title">
              DESCRIPTION
            </div>

            <p>
              {product.description ||
                "No description provided."}
            </p>

          </section>


          {/* CONTACT SELLER */}

          <button
            className="pd-contact-button"
            onClick={() =>
              console.log(
                "Contact seller:",
                product.id
              )
            }
          >
            Contact Seller
          </button>


          {/* FOOTER */}

          {isVerified && (
            <div className="pd-footer">

              <span>✦</span>

              Visually analyzed by
              CameraVision AI

            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default ProductDetails