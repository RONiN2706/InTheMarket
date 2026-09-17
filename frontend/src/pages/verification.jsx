import { useState } from "react"
import { useNavigate } from "react-router-dom"


function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        <a href="/">IntheMarket</a>
      </div>

      <ul className="nav-links">

        <li><a href="/">Browse</a></li>
        <li><a href="/sell">Sell</a></li>
        <li><a href="/messages">Messages</a></li>
        <li><a href="/saved">❤️ Saved</a></li>
        <li><a href="/profile">Profile</a></li>

      </ul>

    </nav>
  )
}


function Verification() {

  const navigate = useNavigate()

  const [video, setVideo] = useState(null)


  function handleVideoChange(event) {

    const file = event.target.files[0]

    if (file) {
      setVideo(file)
    }
  }


  function startVerification() {

    if (!video) {
      return
    }

    navigate("/verification-status", {
      state: {
        fileName: video.name
      }
    })
  }


  return (
    <>

      <Navbar />


      <main className="verification-page">


        <div className="verification-header">

          <div className="verification-badge">
            DEVICE VERIFICATION
          </div>

          <h1>
            Prove Your Tech.
            <br />
            <span>Build Trust.</span>
          </h1>

          <p>
            Upload a short video of your device.
            Our verification system will analyze it
            and generate a Trust Rating.
          </p>

        </div>



        <div className="verification-card">


          <div className="verification-step">

            <span>
              01
            </span>

            <div>
              <h2>
                Upload your video
              </h2>

              <p>
                Show the device from multiple angles.
                Make sure the product is clearly visible.
              </p>
            </div>

          </div>



          {!video ? (

            <label
              htmlFor="verification-video"
              className="video-dropzone"
            >

              <div className="upload-icon">
                ↑
              </div>

              <h3>
                Drop your verification video here
              </h3>

              <p>
                or click to browse your files
              </p>

              <span>
                MP4, MOV or WebM
              </span>

              <input
                id="verification-video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                style={{ display: "none" }}
              />

            </label>

          ) : (

            <div className="video-selected">

              <div className="selected-icon">
                ✓
              </div>

              <div className="selected-info">

                <strong>
                  Video ready
                </strong>

                <p>
                  {video.name}
                </p>

              </div>

              <label
                htmlFor="verification-video-change"
                className="change-video"
              >
                Change
              </label>

              <input
                id="verification-video-change"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                style={{ display: "none" }}
              />

            </div>

          )}



          <div className="verification-tips">

            <h3>
              What should the video show?
            </h3>

            <div className="tip-grid">

              <div>
                <span>01</span>
                <p>Front and back of the device</p>
              </div>

              <div>
                <span>02</span>
                <p>Sides and physical condition</p>
              </div>

              <div>
                <span>03</span>
                <p>Important identifying details</p>
              </div>

            </div>

          </div>



          <button
            className="start-verification"
            onClick={startVerification}
            disabled={!video}
          >
            Start Verification →
          </button>


          <p className="verification-note">
            Your video is analyzed to verify the listing information.
          </p>

        </div>

      </main>

    </>
  )
}


export default Verification