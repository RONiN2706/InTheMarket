import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

const STORAGE_KEY = "inthemarket-listings"

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

const demoProducts = [
  {
    id: "1",
    name: "iPhone 15",
    price: "₹48,000",
    condition: "Excellent",
    location: "Vellore",
    description: "Excellent condition iPhone 15."
  },
  {
    id: "2",
    name: "RTX 3060 Gaming PC",
    price: "₹52,000",
    condition: "Good",
    location: "Vellore",
    description: "Gaming PC with RTX 3060."
  },
  {
    id: "3",
    name: "Sony WH-1000XM5",
    price: "₹18,000",
    condition: "Like New",
    location: "Katpadi",
    description: "Premium noise cancelling headphones."
  },
  {
    id: "4",
    name: "PS5 Slim",
    price: "₹38,000",
    condition: "Excellent",
    location: "Vellore",
    description: "PS5 Slim in excellent condition."
  }
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

function ProductDetails() {

  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)

  useEffect(() => {

    const publishedListings =
      getPublishedListings()

    const publishedProduct =
      publishedListings.find(
        (item) => String(item.id) === String(id)
      )

    if (publishedProduct) {
      setProduct(publishedProduct)
      return
    }

    const demoProduct =
      demoProducts.find(
        (item) => String(item.id) === String(id)
      )

    setProduct(demoProduct || null)

  }, [id])

  if (!product) {

    return (
      <>
        <Navbar />

        <main
          style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >

          <h1>
            Product Not Found
          </h1>

          <p>
            This product does not exist.
          </p>

          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: "20px",
              padding: "12px 20px",
              cursor: "pointer",
            }}
          >
            ← Back to Browse
          </button>

        </main>
      </>
    )
  }

  const name =
    product.productName || product.name

  const price =
    typeof product.price === "number"
      ? `₹${product.price.toLocaleString("en-IN")}`
      : product.price

  const condition =
    product.condition === "like-new"
      ? "Like New"
      : product.condition === "good"
        ? "Good"
        : product.condition === "fair"
          ? "Fair"
          : product.condition === "parts"
            ? "For Parts / Not Working"
            : product.condition

  const images =
    product.images || []

  const isVerified =
    product.verification?.status === "verified"

  return (
    <>
      <Navbar />

      <main
        style={{
          maxWidth: "1100px",
          margin: "60px auto",
          padding: "0 24px",
        }}
      >

        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "30px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "40px",
          }}
        >

          {/* PHOTOS */}

          <div>

            {images.length > 0 ? (

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    images.length === 1
                      ? "1fr"
                      : "repeat(2, 1fr)",
                  gap: "14px",
                }}
              >

                {images.map((image, index) => (

                  <img
                    key={index}
                    src={
                      typeof image === "string"
                        ? image
                        : image.data
                    }
                    alt={`${name} ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "280px",
                      objectFit: "cover",
                      borderRadius: "16px",
                      display: "block",
                    }}
                  />

                ))}

              </div>

            ) : (

              <div
                style={{
                  height: "450px",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "rgba(255,255,255,0.04)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  fontSize: "60px",
                }}
              >
                📦
              </div>

            )}

          </div>


          {/* PRODUCT INFO */}

          <div>

            {isVerified && (

              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: "20px",
                  marginBottom: "18px",
                  background:
                    "rgba(120, 70, 255, 0.15)",
                  border:
                    "1px solid rgba(140, 90, 255, 0.4)",
                  color: "#b99cff",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                ✓ AI VERIFIED
              </div>

            )}

            <h1>
              {name}
            </h1>

            <div
              style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: "20px 0",
              }}
            >
              {price}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "25px",
              }}
            >

              <span>
                {condition}
              </span>

              <span>
                📍 {product.location || "Vellore"}
              </span>

            </div>


            {/* VERIFICATION */}

            {isVerified && (

              <div
                style={{
                  padding: "18px",
                  marginBottom: "25px",
                  borderRadius: "14px",
                  background:
                    "rgba(100, 255, 170, 0.06)",
                  border:
                    "1px solid rgba(100, 255, 170, 0.2)",
                }}
              >

                <strong>
                  🛡️ CameraVision Verified
                </strong>

                <p>
                  This listing has passed AI-powered
                  device verification.
                </p>

                {product.verification
                  ?.conditionConfidence !== null &&
                  product.verification
                    ?.conditionConfidence !== undefined && (

                    <p>
                      Condition confidence:{" "}
                      {Math.round(
                        product.verification
                          .conditionConfidence * 100
                      )}
                      %
                    </p>

                  )}

              </div>

            )}


            {/* DESCRIPTION */}

            <h3>
              Description
            </h3>

            <p
              style={{
                lineHeight: "1.7",
                opacity: 0.8,
              }}
            >
              {product.description ||
                "No description provided."}
            </p>


            {/* ACTION */}

            <button
              style={{
                width: "100%",
                marginTop: "30px",
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Contact Seller
            </button>

          </div>

        </div>

      </main>
    </>
  )
}

export default ProductDetails