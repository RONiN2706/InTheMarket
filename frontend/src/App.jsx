import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate
} from "react-router-dom"

import { useEffect, useState } from "react"

import { getPublishedListings } from "./data/listings"

import SearchResults from "./pages/SearchResults"
import ProductDetails from "./pages/ProductDetails"
import Sell from "./pages/Sell"
import Profile from "./pages/Profile"
import Verification from "./pages/verification"
import VerificationStatus from "./pages/verificationstatus"


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


function SearchBar() {

  const navigate = useNavigate()


  function handleSearch(event) {

    event.preventDefault()

    const query =
      event.target.search.value.trim()


    if (!query) {

      navigate("/search")

      return

    }


    navigate(
      `/search?q=${encodeURIComponent(query)}`
    )

  }


  return (
    <form
      className="search-bar"
      onSubmit={handleSearch}
    >

      <input
        name="search"
        type="text"
        placeholder="Describe what you're looking for..."
      />

      <button type="submit">
        →
      </button>

    </form>
  )
}


function Suggestions() {

  const navigate = useNavigate()


  const suggestions = [
    "iPhone under ₹30k",
    "RTX 3060 near me",
    "PS5 in good condition",
    "Monitor for editing",
    "Noise cancelling headphones"
  ]


  return (
    <div className="suggestions">

      {suggestions.map((suggestion) => (

        <button
          key={suggestion}
          onClick={() =>
            navigate(
              `/search?q=${encodeURIComponent(suggestion)}`
            )
          }
        >
          {suggestion}
        </button>

      ))}

    </div>
  )
}


function Categories() {

  const navigate = useNavigate()


  const categories = [
    "All",
    "Laptops",
    "Phones",
    "PC Components",
    "Gaming",
    "Audio",
    "Cameras",
    "Monitors",
    "Accessories",
    "Smart Home"
  ]


  return (
    <div className="categories">

      {categories.map((category) => (

        <button
          key={category}
          onClick={() =>
            navigate(
              `/search?q=${encodeURIComponent(category)}`
            )
          }
        >
          {category}
        </button>

      ))}

    </div>
  )
}


const products = [
  {
    id: 1,
    name: "iPhone 15",
    price: "₹48,000",
    condition: "Excellent",
    location: "Vellore"
  },
  {
    id: 2,
    name: "RTX 3060 Gaming PC",
    price: "₹52,000",
    condition: "Good",
    location: "Vellore"
  },
  {
    id: 3,
    name: "Sony WH-1000XM5",
    price: "₹18,000",
    condition: "Like New",
    location: "Katpadi"
  },
  {
    id: 4,
    name: "PS5 Slim",
    price: "₹38,000",
    condition: "Excellent",
    location: "Vellore"
  }
]


function ProductCard({ product }) {

  const navigate = useNavigate()

  const name =
    product.productName || product.name

  const price =
    typeof product.price === "number"
      ? `₹${product.price.toLocaleString("en-IN")}`
      : product.price

  const sellerCondition =
    product.condition === "like-new"
      ? "Like New"
      : product.condition === "good"
        ? "Good"
        : product.condition === "fair"
          ? "Fair"
          : product.condition === "parts"
            ? "For Parts"
            : product.condition

  const aiCondition =
    product.verification?.detectedCondition

  const aiConditionLabel =
    aiCondition === "like-new"
      ? "Like New"
      : aiCondition === "good"
        ? "Good"
        : aiCondition === "fair"
          ? "Fair"
          : aiCondition === "parts"
            ? "For Parts"
            : aiCondition

  const confidence =
    product.verification?.conditionConfidence

  const confidencePercent =
    typeof confidence === "number"
      ? Math.round(confidence * 100)
      : null

  const image =
    product.images?.length > 0
      ? typeof product.images[0] === "string"
        ? product.images[0]
        : product.images[0].data
      : null

  const isVerified =
    product.verification?.status === "verified"

  return (
    <div
      className="product-card"
      onClick={() =>
        navigate(`/product/${product.id}`)
      }
    >

      {/* IMAGE */}

      <div className="product-image-container">

        {image ? (
          <img
            src={image}
            alt={name}
            className="product-image"
          />
        ) : (
          <div className="product-image-placeholder">
            <span>📦</span>
          </div>
        )}

        {isVerified && (
          <div className="ai-verified-badge">
            <span>✓</span>
            AI VERIFIED
          </div>
        )}

      </div>


      {/* PRODUCT INFO */}

      <div className="product-card-content">

        <div className="product-location">
          📍 {product.location || "Vellore"}
        </div>

        <h3 className="product-name">
          {name}
        </h3>

        <div className="product-price">
          {price}
        </div>


        {/* SELLER CONDITION */}

        <div className="seller-condition">

          <span className="condition-label">
            Seller condition
          </span>

          <span className="condition-value">
            {sellerCondition}
          </span>

        </div>


        {/* AI CONDITION */}

        {isVerified && aiConditionLabel && (

          <div className="ai-condition-box">

            <div className="ai-condition-header">

              <span className="ai-spark">
                ✦
              </span>

              <span>
                AI CONDITION
              </span>

            </div>

            <div className="ai-condition-main">

              <strong>
                {aiConditionLabel}
              </strong>

              {confidencePercent !== null && (
                <span className="ai-confidence">
                  {confidencePercent}%
                </span>
              )}

            </div>

            {confidencePercent !== null && (

              <div className="confidence-bar">

                <div
                  className="confidence-fill"
                  style={{
                    width: `${confidencePercent}%`
                  }}
                />

              </div>

            )}

          </div>

        )}

      </div>

    </div>
  )
}

function ProductSection() {

  const [publishedListings, setPublishedListings] =
    useState([])

  useEffect(() => {

    function loadListings() {
      setPublishedListings(
        getPublishedListings()
      )
    }

    loadListings()

    window.addEventListener(
      "listings-updated",
      loadListings
    )

    return () => {
      window.removeEventListener(
        "listings-updated",
        loadListings
      )
    }

  }, [])

  const allProducts = [
    ...publishedListings,
    ...products
  ]

  return (
    <section className="product-section">

      <h2>
        Fresh Tech Near You
      </h2>

      <div className="product-grid">

        {allProducts.map((product) => (

          <ProductCard
            key={product.id}
            product={product}
          />

        ))}

      </div>

    </section>
  )
}


function Hero() {

  return (
    <div className="hero">

      <div className="hero-tag">
        BUY • SELL • UPGRADE
      </div>

      <h1>
        Great Tech
        <br />
        Finds a New Home
      </h1>

      <p>
        Describe what you are looking for
        and we will find it for you.
      </p>

      <SearchBar />

      <Suggestions />

      <Categories />

    </div>
  )
}


function Home() {

  return (
    <div>

      <Navbar />

      <Hero />

      <ProductSection />

    </div>
  )
}


function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/search"
          element={<SearchResults />}
        />

        <Route
          path="/product/:id"
          element={<ProductDetails />}
        />

        <Route
          path="/sell"
          element={<Sell />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/verification"
          element={<Verification />}
        />

        <Route
          path="/verification-status"
          element={<VerificationStatus />}
        />

      </Routes>

    </BrowserRouter>
  )
}


export default App