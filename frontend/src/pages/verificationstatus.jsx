import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"

import { publishListing } from "../data/listings"

const VERIFICATION_SERVICE_URL = "http://localhost:5001"

const CONDITION_LABELS = {
  "like-new": "Like New",
  good: "Good",
  fair: "Fair",
  parts: "For Parts / Not Working",
}

/* =========================================
   INDEXED DB
   ========================================= */

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      "InTheMarketImages",
      1
    )

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


async function getImagesFromDatabase(listingId) {
  const db = await openImageDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "images",
      "readonly"
    )

    const store =
      transaction.objectStore("images")

    const request =
      store.get(listingId)

    request.onsuccess = () => {
      db.close()

      resolve(request.result || [])
    }

    request.onerror = () => {
      db.close()

      reject(request.error)
    }
  })
}


/* =========================================
   NAVBAR
   ========================================= */

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        <a href="/">
          IntheMarket
        </a>
      </div>

      <ul className="nav-links">

        <li>
          <a href="/">Browse</a>
        </li>

        <li>
          <a href="/sell">Sell</a>
        </li>

        <li>
          <a href="/messages">Messages</a>
        </li>

        <li>
          <a href="/saved">
            ❤️ Saved
          </a>
        </li>

        <li>
          <a href="/profile">
            Profile
          </a>
        </li>

      </ul>

    </nav>
  )
}


/* =========================================
   VERIFICATION STATUS
   ========================================= */

function VerificationStatus() {

  const [searchParams] =
    useSearchParams()

  const navigate =
    useNavigate()

  const listingId =
    searchParams.get(
      "verified_listing"
    )

  const [result, setResult] =
    useState(null)

  const [listing, setListing] =
    useState(null)

  const [published, setPublished] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")


  /* =========================================
     PROCESS VERIFICATION
     ========================================= */

  useEffect(() => {

    if (!listingId) {

      setError(
        "No verified listing was provided."
      )

      setLoading(false)

      return
    }


    async function processVerification() {

      try {

        /*
         * Get CameraVision result
         */
        const verificationResponse =
          await fetch(
            `${VERIFICATION_SERVICE_URL}/api/verification/${encodeURIComponent(
              listingId
            )}`
          )


        const verificationData =
          await verificationResponse
            .json()
            .catch(() => ({}))


        if (!verificationResponse.ok) {

          throw new Error(
            verificationData.error ||
            "Could not retrieve verification result."
          )

        }


        /*
         * Get original listing
         */
        const listingResponse =
          await fetch(
            `${VERIFICATION_SERVICE_URL}/api/listings/${encodeURIComponent(
              listingId
            )}`
          )


        const listingData =
          await listingResponse
            .json()
            .catch(() => ({}))


        if (!listingResponse.ok) {

          throw new Error(
            listingData.error ||
            "Could not retrieve listing."
          )

        }


        setResult(
          verificationData
        )

        setListing(
          listingData
        )


        /* =========================================
           ONLY PUBLISH WHEN VERIFIED
           ========================================= */

        if (
          verificationData.status ===
          "verified"
        ) {

          /*
           * Get location
           */
          const location =
            sessionStorage.getItem(
              `pending-location-${listingId}`
            ) || "Vellore"


          /*
           * Get actual product images
           * from IndexedDB
           */
          let productImages = []


          try {

            const imageFiles =
              await getImagesFromDatabase(
                listingId
              )


            /*
             * Convert File objects into
             * data URLs so they can be stored
             * with the listing.
             */
            productImages =
              await Promise.all(

                imageFiles.map(
                  (file) => {

                    return new Promise(
                      (resolve, reject) => {

                        const reader =
                          new FileReader()

                        reader.onload =
                          () => {

                            resolve({
                              name:
                                file.name,

                              type:
                                file.type,

                              data:
                                reader.result,
                            })

                          }

                        reader.onerror =
                          () => {

                            reject(
                              new Error(
                                `Could not read ${file.name}`
                              )
                            )

                          }

                        reader.readAsDataURL(
                          file
                        )

                      }
                    )

                  }
                )

              )

          } catch (imageError) {

            console.error(
              "Could not retrieve product images:",
              imageError
            )

          }


          /*
           * AI analysis
           */
          const analysis =
            verificationData
              .vision_analysis || {}


          /*
           * Create final marketplace listing
           */
          const publishedListing = {

            id:
              listingId,

            productType:
              listingData.productType,

            productName:
              listingData.productName,

            condition:
              listingData.condition,

            price:
              Number(
                listingData.price
              ),

            description:
              listingData.description,

            /*
             * ACTUAL SELLER PHOTOS
             */
            images:
              productImages,

            location:
              location,

            createdAt:
              listingData.createdAt ||
              Date.now(),

            /*
             * AI VERIFICATION
             */
            verification: {

              listingId:

                listingId,

              status:

                verificationData.status,

              conditionConfidence:

                analysis.condition_confidence ??
                null,

              detectedCondition:

                analysis.condition ||
                null,

              productDetected:

                analysis.product_name ||
                null,

              categoryDetected:

                analysis.product_type ||
                null,

              provider:

                analysis.provider ||
                null,

            },

          }


          /*
           * Save listing
           */
          publishListing(
            publishedListing
          )


          setPublished(
            true
          )


          /*
           * Clean temporary storage
           */
          sessionStorage.removeItem(
            `pending-location-${listingId}`
          )

        }

      } catch (err) {

        console.error(err)

        setError(
          err.message ||
          "Something went wrong while processing verification."
        )

      } finally {

        setLoading(false)

      }

    }


    processVerification()

  }, [listingId])


  /* =========================================
     LOADING
     ========================================= */

  if (loading) {

    return (
      <>
        <Navbar />

        <main className="verification-result-page">

          <div className="result-loading-card">

            <div className="result-spinner" />

            <div className="result-badge">
              VERIFICATION COMPLETE
            </div>

            <h1>
              Publishing Your Listing
            </h1>

            <p>
              We're retrieving the CameraVision
              result and preparing your listing.
            </p>

          </div>

        </main>
      </>
    )

  }


  /* =========================================
     ERROR
     ========================================= */

  if (
    error ||
    !result
  ) {

    return (
      <>
        <Navbar />

        <main className="verification-result-page">

          <div className="result-error-card">

            <div className="result-error-icon">
              !
            </div>

            <div className="result-badge error">
              VERIFICATION ERROR
            </div>

            <h1>
              We Couldn't Publish
              the Listing
            </h1>

            <p>
              {error ||
                "No verification result was found."}
            </p>

            <button
              className="result-primary-button"
              onClick={() =>
                navigate("/sell")
              }
            >
              Return to Selling →
            </button>

          </div>

        </main>
      </>
    )

  }


  /* =========================================
     AI DATA
     ========================================= */

  const analysis =
    result.vision_analysis || {}


  const isVerified =
    result.status ===
    "verified"


  const isReview =
    result.status ===
    "needs_review"


  const confidence =
    typeof analysis.condition_confidence ===
    "number"
      ? Math.round(
          analysis.condition_confidence *
          100
        )
      : null


  /* =========================================
     PAGE
     ========================================= */

  return (
    <>
      <Navbar />

      <main className="verification-result-page">

        <div className="verification-result-header">

          <div className="result-badge">
            AI DEVICE VERIFICATION
          </div>

          <h1>

            Verification
            <br />

            <span>
              {published
                ? "Published."
                : "Complete."}
            </span>

          </h1>

          <p>
            CameraVision analyzed your device
            and compared it against the information
            you provided.
          </p>

        </div>


        <div className="verification-result-card">


          {/* PUBLISHED */}

          {published && (

            <div
              className=
                "verification-status-banner verified"
            >

              <div
                className=
                  "verification-status-icon"
              >
                ✓
              </div>

              <div>

                <strong>
                  Listing Published
                </strong>

                <p>
                  Your verified device is now
                  live on the InTheMarket marketplace.
                </p>

              </div>

            </div>

          )}


          {/* STATUS */}

          {!published && (

            <div
              className={`verification-status-banner ${
                isVerified
                  ? "verified"
                  : isReview
                    ? "review"
                    : "mismatch"
              }`}
            >

              <div
                className=
                  "verification-status-icon"
              >

                {isVerified
                  ? "✓"
                  : isReview
                    ? "!"
                    : "×"}

              </div>

              <div>

                <strong>

                  {isVerified
                    ? "Listing Verified"
                    : isReview
                      ? "Needs Review"
                      : "Mismatch Found"}

                </strong>

                <p>
                  {result.status_reason}
                </p>

              </div>

            </div>

          )}


          {/* CONFIDENCE */}

          <div
            className=
              "trust-score-section"
          >

            <div
              className=
                "trust-score-label"
            >
              CONDITION CONFIDENCE
            </div>

            <div
              className=
                "trust-score"
            >

              {confidence !== null
                ? `${confidence}%`
                : "—"}

            </div>

            <p>
              Confidence from the vision analysis
            </p>

          </div>


          {/* ANALYSIS */}

          <div className="analysis-grid">

            <div className="analysis-item">

              <span>
                LISTING
              </span>

              <strong>
                {listing?.productName ||
                  "—"}
              </strong>

            </div>


            <div className="analysis-item">

              <span>
                DETECTED PRODUCT
              </span>

              <strong>
                {analysis.product_name ||
                  "—"}
              </strong>

            </div>


            <div className="analysis-item">

              <span>
                DETECTED CATEGORY
              </span>

              <strong>
                {analysis.product_type ||
                  "—"}
              </strong>

            </div>


            <div className="analysis-item">

              <span>
                AI CONDITION
              </span>

              <strong>
                {CONDITION_LABELS[
                  analysis.condition
                ] ||
                  analysis.condition ||
                  "—"}
              </strong>

            </div>

          </div>


          {/* AI NOTES */}

          {analysis.condition_notes && (

            <div className="analysis-notes">

              <span>
                AI ANALYSIS
              </span>

              <p>
                {analysis.condition_notes}
              </p>

            </div>

          )}


          {/* DEFECTS */}

          {analysis.detected_defects?.length >
            0 && (

            <div className="detected-defects">

              <span>
                VISIBLE ISSUES
              </span>

              <ul>

                {analysis.detected_defects.map(
                  (defect, index) => (

                    <li key={index}>
                      {defect}
                    </li>

                  )
                )}

              </ul>

            </div>

          )}


          {/* CAMERAVISION FRAMES */}

          {result.frames_analyzed?.length >
            0 && (

            <div className="verification-frames">

              <span>
                FRAMES ANALYZED
              </span>

              <div className="frame-list">

                {result.frames_analyzed.map(
                  (frame, index) => (

                    <img
                      key={index}
                      src={
                        `${VERIFICATION_SERVICE_URL}/frames/${encodeURIComponent(
                          listingId
                        )}/${encodeURIComponent(
                          frame.file
                        )}`
                      }
                      alt={
                        `Analyzed frame ${
                          index + 1
                        }`
                      }
                    />

                  )
                )}

              </div>

            </div>

          )}


          {/* SELLER PHOTOS */}

          {published &&
            listing?.images?.length > 0 && (

            <div
              style={{
                marginTop: "30px",
              }}
            >

              <span
                style={{
                  display: "block",
                  marginBottom: "14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  opacity: 0.7,
                }}
              >
                PRODUCT PHOTOS
              </span>


              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "12px",
                }}
              >

                {listing.images.map(
                  (image, index) => (

                    <img
                      key={index}
                      src={
                        typeof image ===
                        "string"
                          ? image
                          : image.data
                      }
                      alt={
                        `Product ${index + 1}`
                      }
                      style={{
                        width: "100%",
                        height: "160px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        display: "block",
                      }}
                    />

                  )
                )}

              </div>

            </div>

          )}


          {/* ACTIONS */}

          <div
            className=
              "verification-actions"
          >

            {published ? (

              <>

                <button
                  className=
                    "result-primary-button"
                  onClick={() =>
                    navigate("/")
                  }
                >
                  View My Listing →
                </button>


                <button
                  className=
                    "result-secondary-button"
                  onClick={() =>
                    navigate(
                      `/search?q=${encodeURIComponent(
                        listing?.productName ||
                        ""
                      )}`
                    )
                  }
                >
                  Search Marketplace
                </button>

              </>

            ) : (

              <>

                <button
                  className=
                    "result-primary-button"
                  onClick={() =>
                    navigate("/sell")
                  }
                >
                  Try Verification Again →
                </button>


                <button
                  className=
                    "result-secondary-button"
                  onClick={() =>
                    navigate("/")
                  }
                >
                  Back to Marketplace
                </button>

              </>

            )}

          </div>

        </div>

      </main>
    </>
  )
}

export default VerificationStatus