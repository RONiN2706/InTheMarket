import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

const VERIFICATION_SERVICE_URL = "http://localhost:5001"

const MAX_RECORD_SECONDS = 20
const MIN_RECORD_SECONDS = 2

const CONDITION_LABELS = {
  "like-new": "Like New",
  good: "Good",
  fair: "Fair",
  parts: "For Parts / Not Working",
}


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
          <a href="/saved">❤️ Saved</a>
        </li>

        <li>
          <a href="/profile">Profile</a>
        </li>

      </ul>

    </nav>
  )
}


/* =========================================================
   VERIFICATION PAGE
   ========================================================= */

function Verification() {

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const listingId =
    searchParams.get("listing_id")


  /* =======================================================
     STATE
     ======================================================= */

  const [listing, setListing] =
    useState(null)

  const [cameraReady, setCameraReady] =
    useState(false)

  const [recording, setRecording] =
    useState(false)

  const [elapsed, setElapsed] =
    useState(0)

  const [recordedBlob, setRecordedBlob] =
    useState(null)

  const [recordedUrl, setRecordedUrl] =
    useState("")

  const [uploading, setUploading] =
    useState(false)

  const [error, setError] =
    useState("")

  const [cameraError, setCameraError] =
    useState("")


  /* =======================================================
     REFS
     ======================================================= */

  const liveVideoRef =
    useRef(null)

  const mediaRecorderRef =
    useRef(null)

  const streamRef =
    useRef(null)

  const chunksRef =
    useRef([])

  const timerRef =
    useRef(null)

  const autoStopRef =
    useRef(null)

  const startedAtRef =
    useRef(0)


  /* =======================================================
     GET LISTING
     ======================================================= */

  useEffect(() => {

    if (!listingId) {

      setError(
        "No listing was provided for verification."
      )

      return
    }


    async function getListing() {

      try {

        const response =
          await fetch(
            `${VERIFICATION_SERVICE_URL}/api/listings/${encodeURIComponent(
              listingId
            )}`
          )


        const data =
          await response
            .json()
            .catch(() => ({}))


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Could not retrieve your listing."
          )

        }


        setListing(data)

      } catch (err) {

        console.error(err)

        setError(
          err.message ||
          "Could not load the listing."
        )

      }

    }


    getListing()

  }, [listingId])


  /* =======================================================
     CAMERA SETUP
     ======================================================= */

  useEffect(() => {

    let cancelled = false


    async function initCamera() {

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        setCameraError(
          "This browser does not support camera access."
        )

        return
      }


      try {

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: "environment",
              },
            },
            audio: false,
          })


        if (cancelled) {

          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            )

          return
        }


        streamRef.current = stream

        if (liveVideoRef.current) {

          liveVideoRef.current.srcObject =
            stream

        }


        setCameraReady(true)

        setCameraError("")

      } catch (err) {

        console.error(err)

        setCameraReady(false)

        if (
          err?.name ===
          "NotAllowedError"
        ) {

          setCameraError(
            "Camera permission was denied. Allow camera access and reload the page."
          )

        } else {

          setCameraError(
            "Could not access your camera on this device."
          )

        }

      }

    }


    initCamera()


    return () => {

      cancelled = true

      clearInterval(timerRef.current)

      clearTimeout(autoStopRef.current)


      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {

        mediaRecorderRef.current.stop()

      }


      if (streamRef.current) {

        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          )

      }

    }

  }, [])


  /* =======================================================
     CLEAN OBJECT URL
     ======================================================= */

  useEffect(() => {

    return () => {

      if (recordedUrl) {

        URL.revokeObjectURL(
          recordedUrl
        )

      }

    }

  }, [recordedUrl])


  /* =======================================================
     MIME TYPE
     ======================================================= */

  function pickMimeType() {

    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ]


    if (
      typeof MediaRecorder ===
      "undefined"
    ) {

      return ""

    }


    for (const type of candidates) {

      if (
        !MediaRecorder.isTypeSupported ||
        MediaRecorder.isTypeSupported(type)
      ) {

        return type

      }

    }


    return ""

  }


  /* =======================================================
     START RECORDING
     ======================================================= */

  function startRecording() {

    if (!streamRef.current) {

      setCameraError(
        "Camera is not ready yet."
      )

      return

    }


    if (
      typeof MediaRecorder ===
      "undefined"
    ) {

      setCameraError(
        "Video recording is not supported in this browser."
      )

      return

    }


    setError("")

    setCameraError("")

    setRecordedBlob(null)


    if (recordedUrl) {

      URL.revokeObjectURL(
        recordedUrl
      )

      setRecordedUrl("")

    }


    const mimeType =
      pickMimeType()


    let recorder


    try {

      recorder =
        mimeType
          ? new MediaRecorder(
              streamRef.current,
              {
                mimeType,
              }
            )
          : new MediaRecorder(
              streamRef.current
            )

    } catch (err) {

      setCameraError(
        "Recording could not be started."
      )

      return

    }


    chunksRef.current = []

    mediaRecorderRef.current =
      recorder


    recorder.ondataavailable =
      (event) => {

        if (
          event.data &&
          event.data.size > 0
        ) {

          chunksRef.current.push(
            event.data
          )

        }

      }


    recorder.onstop =
      () => {

        const actualMimeType =
          recorder.mimeType ||
          mimeType ||
          "video/webm"


        const blob =
          new Blob(
            chunksRef.current,
            {
              type:
                actualMimeType.split(";")[0],
            }
          )


        const url =
          URL.createObjectURL(
            blob
          )


        setRecordedBlob(blob)

        setRecordedUrl(url)

        setRecording(false)

        clearInterval(
          timerRef.current
        )

        clearTimeout(
          autoStopRef.current
        )


        const duration =
          (
            Date.now() -
            startedAtRef.current
          ) / 1000


        if (
          duration <
          MIN_RECORD_SECONDS
        ) {

          setCameraError(
            "That scan was very short. A couple more seconds gives the AI a better result."
          )

        }

      }


    recorder.start()


    startedAtRef.current =
      Date.now()


    setElapsed(0)

    setRecording(true)


    timerRef.current =
      setInterval(() => {

        const seconds =
          (
            Date.now() -
            startedAtRef.current
          ) / 1000


        setElapsed(seconds)

      }, 250)


    autoStopRef.current =
      setTimeout(() => {

        stopRecording()

      }, MAX_RECORD_SECONDS * 1000)

  }


  /* =======================================================
     STOP RECORDING
     ======================================================= */

  function stopRecording() {

    const recorder =
      mediaRecorderRef.current


    if (
      recorder &&
      recorder.state !==
        "inactive"
    ) {

      recorder.stop()

    }


    clearInterval(
      timerRef.current
    )

    clearTimeout(
      autoStopRef.current
    )

    setRecording(false)

  }


  /* =======================================================
     RE-RECORD
     ======================================================= */

  function resetRecording() {

    if (recordedUrl) {

      URL.revokeObjectURL(
        recordedUrl
      )

    }


    setRecordedUrl("")

    setRecordedBlob(null)

    setElapsed(0)

    setCameraError("")

    setError("")

  }


  /* =======================================================
     SUBMIT TO CAMERAVISION
     ======================================================= */

  async function submitVerification() {

    if (!recordedBlob) {

      return

    }


    if (!listingId) {

      setError(
        "No listing ID was provided."
      )

      return

    }


    setUploading(true)

    setError("")

    setCameraError("")


    const formData =
      new FormData()


    const extension =
      recordedBlob.type.includes("mp4")
        ? ".mp4"
        : ".webm"


    formData.append(
      "video",
      recordedBlob,
      `scan${extension}`
    )


    try {

      const response =
        await fetch(
          `${VERIFICATION_SERVICE_URL}/api/verify/${encodeURIComponent(
            listingId
          )}`,
          {
            method: "POST",
            body: formData,
          }
        )


      const data =
        await response
          .json()
          .catch(() => ({}))


      if (!response.ok) {

        throw new Error(
          data.error ||
          `Verification failed (${response.status}).`
        )

      }


      /*
       * CameraVision has now:
       *
       * 1. Saved the video
       * 2. Extracted frames
       * 3. Run the AI analysis
       * 4. Built the comparison
       * 5. Saved verification metadata
       *
       * Send the seller to our existing
       * React verification result page.
       */

      navigate(
        `/verification-status?verified_listing=${encodeURIComponent(
          listingId
        )}`
      )

    } catch (err) {

      console.error(err)

      setError(
        err.message ||
        "Could not submit the verification."
      )

      setUploading(false)

    }

  }


  /* =======================================================
     FORMAT TIME
     ======================================================= */

  function formatTime(seconds) {

    const total =
      Math.floor(seconds)


    const minutes =
      Math.floor(total / 60)


    const secs =
      total % 60


    return (
      `${minutes}:${String(secs).padStart(
        2,
        "0"
      )}`
    )

  }


  /* =======================================================
     ERROR
     ======================================================= */

  if (error && !listing) {

    return (
      <div className="camera-verification-page">

        <Navbar />

        <main className="camera-verification-main">

          <div className="verification-error-screen">

            <div className="verification-error-icon">
              !
            </div>

            <h1>
              Verification couldn't start
            </h1>

            <p>
              {error}
            </p>

            <button
              onClick={() =>
                navigate("/sell")
              }
            >
              Return to Selling →
            </button>

          </div>

        </main>

      </div>
    )

  }


  /* =======================================================
     PAGE
     ======================================================= */

  return (

    <div className="camera-verification-page">

      <Navbar />


      <main className="camera-verification-main">


        {/* HEADER */}

        <div className="camera-verification-header">

          <div className="camera-step-label">
            STEP 2 OF 2 — VERIFY YOUR ITEM
          </div>

          <h1>
            Scan your item to{" "}
            <span>
              verify the listing.
            </span>
          </h1>

          <p>
            Record a short video slowly turning
            your device. Our AI will analyze the
            scan and compare it with your listing.
          </p>

          <div className="secure-pill">
            <span>✓</span>
            Safe &amp; Secure
          </div>

        </div>


        {/* LISTING SUMMARY */}

        {listing && (

          <div className="verification-listing-summary">

            <div className="summary-product">

              <div className="summary-icon">
                ✦
              </div>

              <div>

                <span>
                  YOUR LISTING
                </span>

                <strong>
                  {listing.productName}
                </strong>

                <p>
                  {listing.productType}
                </p>

              </div>

            </div>


            <div className="summary-details">

              <div>

                <span>
                  CONDITION
                </span>

                <strong>
                  {CONDITION_LABELS[
                    listing.condition
                  ] ||
                    listing.condition}
                </strong>

              </div>

              <div>

                <span>
                  PRICE
                </span>

                <strong>
                  ₹
                  {Number(
                    listing.price
                  ).toLocaleString("en-IN")}
                </strong>

              </div>

              <div>

                <span>
                  LISTING ID
                </span>

                <strong>
                  {listingId}
                </strong>

              </div>

            </div>

          </div>

        )}


        {/* MAIN GRID */}

        <div className="camera-verification-layout">


          {/* =================================================
             CAMERA
             ================================================= */}

          <section className="camera-panel">


            <div className="camera-panel-top">

              <div>

                <span className="panel-eyebrow">
                  CAMERA VERIFICATION
                </span>

                <h2>
                  Show us your device
                </h2>

              </div>


              <div className="camera-status">

                <span
                  className={
                    recording
                      ? "status-dot recording-dot"
                      : "status-dot"
                  }
                />

                {recording
                  ? "Recording"
                  : cameraReady
                    ? "Camera ready"
                    : "Connecting..."}

              </div>

            </div>


            {/* CAMERA AREA */}

            <div className="camera-preview">


              <div className="camera-preview-glow" />


              <video
                ref={liveVideoRef}
                className={
                  recordedUrl
                    ? "live-camera-video hidden-video"
                    : "live-camera-video"
                }
                autoPlay
                playsInline
                muted
              />


              {!cameraReady &&
                !recordedUrl && (

                <div className="camera-placeholder">

                  <div className="camera-icon">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >

                      <path
                        d="M15 10l4.55-2.73A1 1 0 0121 8.12v7.76a1 1 0 01-1.45.89L15 14"
                      />

                      <rect
                        x="3"
                        y="6"
                        width="12"
                        height="12"
                        rx="2"
                      />

                    </svg>

                  </div>

                  <h3>
                    Camera Preview
                  </h3>

                  <p>
                    {cameraError ||
                      "Requesting camera access..."}
                  </p>

                </div>

              )}


              {recordedUrl && (

                <div className="recorded-video-wrapper">

                  <video
                    src={recordedUrl}
                    controls
                    playsInline
                    className="recorded-video"
                  />

                </div>

              )}


              {recording && (

                <div className="recording-overlay">

                  <div className="recording-pill">

                    <span className="recording-dot" />

                    RECORDING

                    <strong>
                      {formatTime(elapsed)}
                    </strong>

                  </div>

                </div>

              )}

            </div>


            {/* CAMERA ERROR */}

            {(cameraError ||
              error) && (

              <div className="camera-inline-error">

                <span>
                  !
                </span>

                {cameraError ||
                  error}

              </div>

            )}


            {/* FOOTER */}

            <div className="camera-panel-footer">

              <div>
                <span className="footer-dot green" />
                Device visible
              </div>

              <div>
                <span className="footer-dot" />
                Good lighting recommended
              </div>

              <div>
                <span className="footer-dot" />
                Keep device steady
              </div>

            </div>


            {/* CONTROLS */}

            <div className="camera-controls">

              {!recordedBlob &&
                !recording && (

                <button
                  className="camera-start-button"
                  onClick={startRecording}
                  disabled={!cameraReady}
                >

                  <span>
                    Start Recording
                  </span>

                  <strong>
                    →
                  </strong>

                </button>

              )}


              {recording && (

                <button
                  className="camera-stop-button"
                  onClick={stopRecording}
                >

                  <span className="stop-square" />

                  Stop Recording

                </button>

              )}


              {recordedBlob &&
                !recording && (

                <div className="recording-actions">

                  <button
                    className="camera-secondary-button"
                    onClick={resetRecording}
                    disabled={uploading}
                  >
                    Re-record
                  </button>

                  <button
                    className="camera-start-button"
                    onClick={submitVerification}
                    disabled={uploading}
                  >

                    <span>
                      {uploading
                        ? "Analyzing..."
                        : "Submit for Verification"}
                    </span>

                    <strong>
                      →
                    </strong>

                  </button>

                </div>

              )}

            </div>


            <p className="recording-note">
              Recording stops automatically after 20 seconds.
            </p>

          </section>


          {/* =================================================
             INSTRUCTIONS
             ================================================= */}

          <aside className="camera-instructions">


            <div className="instructions-card">

              <div className="instructions-heading">

                <span className="instructions-number">
                  01
                </span>

                <div>

                  <span>
                    VERIFICATION GUIDE
                  </span>

                  <h2>
                    How to scan it
                  </h2>

                </div>

              </div>


              <div className="scan-checks">


                <div className="scan-check">

                  <div className="check-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Show the front
                    </strong>

                    <p>
                      Keep the entire device clearly visible.
                    </p>

                  </div>

                </div>


                <div className="scan-check">

                  <div className="check-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Show the back
                    </strong>

                    <p>
                      Slowly turn the device around.
                    </p>

                  </div>

                </div>


                <div className="scan-check">

                  <div className="check-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Show all sides
                    </strong>

                    <p>
                      Capture the edges and physical condition.
                    </p>

                  </div>

                </div>


                <div className="scan-check">

                  <div className="check-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Show identifying details
                    </strong>

                    <p>
                      Include ports, labels and visible details.
                    </p>

                  </div>

                </div>


              </div>

            </div>


            {/* LIGHTING */}

            <div className="lighting-card">

              <div className="lighting-icon">
                ✦
              </div>

              <div>

                <span>
                  PRO TIP
                </span>

                <h3>
                  Good lighting makes
                  <br />
                  a big difference.
                </h3>

                <p>
                  Avoid dark rooms and harsh reflections.
                  Even lighting gives the AI a clearer view.
                </p>

              </div>

            </div>


            {/* PRIVACY */}

            <div className="privacy-note">

              <span>
                🔒
              </span>

              <p>
                Your video is sent to CameraVision only
                when you submit it for verification.
              </p>

            </div>


          </aside>


        </div>


      </main>


      <div className="verification-orb orb-one" />
      <div className="verification-orb orb-two" />

    </div>

  )

}


export default Verification