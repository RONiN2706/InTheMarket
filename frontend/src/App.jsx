import techHero from "./assets/tech-hero.png"
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import { useEffect, useState } from "react";

import { getPublishedListings } from "./data/listings";

import SearchResults from "./pages/SearchResults";
import ProductDetails from "./pages/ProductDetails";
import Sell from "./pages/Sell";
import Profile from "./pages/Profile";
import Verification from "./pages/verification";
import VerificationStatus from "./pages/verificationstatus";

import "./App.css";


/* =========================================================
   ICONS
   ========================================================= */

function Icon({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Icon>
  );
}

function HeartIcon() {
  return (
    <Icon>
      <path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z" />
    </Icon>
  );
}

function MessageIcon() {
  return (
    <Icon>
      <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.4 8.4 0 0 1-3.5-.8L4 20l1.5-4A7.3 7.3 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />
      <path d="M17 9h.01M12 9h.01M7 9h.01" />
    </Icon>
  );
}

function PinIcon() {
  return (
    <Icon size={17}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  );
}

function ArrowIcon() {
  return (
    <Icon size={21}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon size={17}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function LaptopIcon() {
  return (
    <Icon size={27}>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 19h20" />
    </Icon>
  );
}

function PhoneIcon() {
  return (
    <Icon size={27}>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </Icon>
  );
}

function CpuIcon() {
  return (
    <Icon size={27}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M18 9h4M2 15h4M18 15h4" />
    </Icon>
  );
}

function GameIcon() {
  return (
    <Icon size={27}>
      <path d="M7 8h10a5 5 0 0 1 4.7 6.7l-1.1 3a2.5 2.5 0 0 1-4.5.5L15 16H9l-1.1 2.2a2.5 2.5 0 0 1-4.5-.5l-1.1-3A5 5 0 0 1 7 8Z" />
      <path d="M8 11v4M6 13h4M16 12h.01M19 14h.01" />
    </Icon>
  );
}

function HeadphoneIcon() {
  return (
    <Icon size={27}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" />
    </Icon>
  );
}

function CameraIcon() {
  return (
    <Icon size={27}>
      <path d="M4 8h4l1.5-2h5L16 8h4v11H4V8Z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </Icon>
  );
}

function MonitorIcon() {
  return (
    <Icon size={27}>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21h8M12 17v4" />
    </Icon>
  );
}

function MouseIcon() {
  return (
    <Icon size={27}>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <path d="M12 3v6M12 6h.01" />
    </Icon>
  );
}

function HomeIcon() {
  return (
    <Icon size={27}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </Icon>
  );
}


/* =========================================================
   NAVBAR
   ========================================================= */

function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="market-navbar">

      <button
        className="brand"
        onClick={() => navigate("/")}
      >
        <span className="brand-name">
          In<span>The</span>Market
        </span>

        <span className="brand-subtitle">
          Pre-owned. Next level.
        </span>
      </button>


      <div className="nav-links">

        <button onClick={() => navigate("/")}>
          Browse
        </button>

        <button onClick={() => navigate("/how-it-works")}>
          How it works
        </button>

        <button onClick={() => navigate("/why-inthemarket")}>
          Why InTheMarket
        </button>

        <button onClick={() => navigate("/support")}>
          Support
        </button>

      </div>


      <div className="nav-actions">

        <button className="nav-location">
          <PinIcon />
          <span>Vellore, 632014</span>
          <span className="tiny-chevron">⌄</span>
        </button>

        <button className="nav-icon">
          <HeartIcon />
        </button>

        <button className="nav-icon message-nav">
          <MessageIcon />
          <span className="notification">2</span>
        </button>

        <button
          className="profile-avatar"
          onClick={() => navigate("/profile")}
        >
          A
        </button>

        <button
          className="sell-nav-button"
          onClick={() => navigate("/sell")}
        >
          <PlusIcon />
          Sell
        </button>

      </div>

    </nav>
  );
}


/* =========================================================
   SEARCH BAR
   ========================================================= */

function SearchBar() {
  const navigate = useNavigate();

  function handleSearch(event) {
    event.preventDefault();

    const query =
      event.target.search.value.trim();

    if (!query) {
      navigate("/search");
      return;
    }

    navigate(
      `/search?q=${encodeURIComponent(query)}`
    );
  }

  return (
    <form
      className="ai-search"
      onSubmit={handleSearch}
    >

      <div className="search-symbol">
        <SearchIcon />
      </div>

      <input
        name="search"
        type="text"
        placeholder='Try "gaming laptop under 50k near me"'
        autoComplete="off"
      />

      <div className="search-location">
        <PinIcon />
        <span>Vellore, 632014</span>
        <span>⌄</span>
      </div>

      <button
        className="search-submit"
        type="submit"
      >
        <ArrowIcon />
      </button>

    </form>
  );
}


/* =========================================================
   SUGGESTIONS
   ========================================================= */

function Suggestions() {
  const navigate = useNavigate();

  const suggestions = [
    "iPhone under 30k",
    "RTX 3060 near me",
    "PS5 in good condition",
    "Monitor for editing",
    "Noise cancelling headphones",
  ];

  return (
    <div className="suggestion-row">

      <span className="try-label">
        Try these:
      </span>

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

    </div>
  );
}


/* =========================================================
   CATEGORIES
   ========================================================= */

function Categories() {
  const navigate = useNavigate();

  const categories = [
    ["all", "All", <div className="category-grid-icon">▦</div>],
    ["laptops", "Laptops", <LaptopIcon />],
    ["phones", "Phones", <PhoneIcon />],
    ["pc-components", "PC Components", <CpuIcon />],
    ["gaming", "Gaming", <GameIcon />],
    ["audio", "Audio", <HeadphoneIcon />],
    ["cameras", "Cameras", <CameraIcon />],
    ["monitors", "Monitors", <MonitorIcon />],
    ["accessories", "Accessories", <MouseIcon />],
    ["smart-home", "Smart Home", <HomeIcon />],
  ];

  return (
    <div className="categories">

      {categories.map(([value, label, icon], index) => (

        <button
          key={value}
          className={`category-card ${
            index === 0 ? "active" : ""
          }`}
          onClick={() =>
            navigate(
              `/search?q=${encodeURIComponent(label)}`
            )
          }
        >

          <span className="category-icon">
            {icon}
          </span>

          <span className="category-label">
            {label}
          </span>

        </button>

      ))}

    </div>
  );
}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({ product }) {

  const navigate = useNavigate();

  const name =
    product.productName ||
    product.name ||
    "Electronics";

  const price =
    typeof product.price === "number"
      ? `₹${product.price.toLocaleString("en-IN")}`
      : product.price || "₹0";

  const image =
    product.images?.length > 0
      ? typeof product.images[0] === "string"
        ? product.images[0]
        : product.images[0]?.data
      : null;

  const condition =
    product.condition === "like-new"
      ? "Like New"
      : product.condition === "good"
        ? "Good Condition"
        : product.condition === "fair"
          ? "Fair"
          : product.condition === "parts"
            ? "For Parts"
            : product.condition || "Used";

  const verified =
    product.verification?.status === "verified";

  return (
    <article
      className="market-product-card"
      onClick={() =>
        navigate(`/product/${product.id}`)
      }
    >

      <div className="market-product-image">

        {image ? (
          <img
            src={image}
            alt={name}
          />
        ) : (
          <div className="image-placeholder">
            <span>TECH</span>
          </div>
        )}

        <button
          className="product-heart"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <HeartIcon size={19} />
        </button>

        <span className="condition-badge">
          {condition}
        </span>

        {verified && (
          <span className="verified-badge">
            ✓ AI VERIFIED
          </span>
        )}

      </div>


      <div className="market-product-info">

        <h3>{name}</h3>

        <div className="market-product-price">
          {price}
        </div>

        <div className="market-product-meta">
          <span>
            <PinIcon size={12} />
            {product.location || "Vellore"}
          </span>

          <span>•</span>

          <span>
            {product.timeAgo || "Recently"}
          </span>
        </div>

      </div>

    </article>
  );
}


/* =========================================================
   PRODUCTS
   ========================================================= */

const defaultProducts = [
  {
    id: "demo-1",
    name: "MacBook Air M1",
    price: "₹52,000",
    condition: "good",
    location: "Vellore",
  },
  {
    id: "demo-2",
    name: "iPhone 13 (128GB)",
    price: "₹28,000",
    condition: "like-new",
    location: "Vellore",
  },
  {
    id: "demo-3",
    name: "NVIDIA RTX 3060 (12GB)",
    price: "₹20,000",
    condition: "good",
    location: "Vellore",
  },
  {
    id: "demo-4",
    name: "Sony WH-1000XM4",
    price: "₹12,500",
    condition: "good",
    location: "Vellore",
  },
  {
    id: "demo-5",
    name: 'LG 27" 144Hz Monitor',
    price: "₹18,000",
    condition: "like-new",
    location: "Vellore",
  },
  {
    id: "demo-6",
    name: "PlayStation 5 (Disc)",
    price: "₹32,000",
    condition: "good",
    location: "Vellore",
  },
];


function ProductSection() {

  const [publishedListings, setPublishedListings] =
    useState([]);

  useEffect(() => {

    function loadListings() {
      setPublishedListings(
        getPublishedListings()
      );
    }

    loadListings();

    window.addEventListener(
      "listings-updated",
      loadListings
    );

    return () => {
      window.removeEventListener(
        "listings-updated",
        loadListings
      );
    };

  }, []);


  const allProducts = [
    ...publishedListings,
    ...defaultProducts,
  ];


  return (
    <section className="products-section">

      <div className="section-heading">

        <div>
          <div className="section-title">
            <span className="section-marker">—</span>
            <h2>Fresh Tech Near You</h2>
          </div>

          <p>
            AI-matched listings from people in Vellore
          </p>
        </div>

        <button
          className="see-all"
          onClick={() => navigateToSearch()}
        >
          See all
          <ArrowIcon size={16} />
        </button>

      </div>


      <div className="product-grid">

        {allProducts
          .slice(0, 6)
          .map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}

      </div>

    </section>
  );
}


function navigateToSearch() {
  window.location.href = "/search";
}


/* =========================================================
   SELL CTA
   ========================================================= */

function SellCTA() {

  const navigate = useNavigate();

  return (
    <section className="sell-cta">

      <div className="sell-cta-main">

        <div>
          <h2>
            Turn your unused tech
            <br />
            into someone's next upgrade.
          </h2>
        </div>

        <button
          className="cta-sell-button"
          onClick={() => navigate("/sell")}
        >
          List Your Item
          <ArrowIcon size={17} />
        </button>

      </div>


      <div className="cta-features">

        <div className="cta-feature">
          <div className="cta-feature-icon">◷</div>

          <div>
            <strong>Easy Listing</strong>
            <small>Post in minutes</small>
          </div>
        </div>


        <div className="cta-feature">
          <div className="cta-feature-icon">♢</div>

          <div>
            <strong>Safe & Local</strong>
            <small>Chat, verify, meet</small>
          </div>
        </div>


        <div className="cta-feature">
          <div className="cta-feature-icon">✦</div>

          <div>
            <strong>AI Powered</strong>
            <small>Smarter matches</small>
          </div>
        </div>


        <div className="cta-feature">
          <div className="cta-feature-icon">⌁</div>

          <div>
            <strong>Greener Future</strong>
            <small>Give tech a longer life</small>
          </div>
        </div>

      </div>

    </section>
  );
}


/* =========================================================
   HERO
   ========================================================= */

function Hero() {

  return (
    <section
  className="hero"
  style={{
    backgroundImage: `url(${techHero})`,
  }}
>

      <div className="hero-glow" />

      <div className="hero-content">

        <div className="hero-tag">
          BUY&nbsp; • &nbsp;SELL&nbsp; • &nbsp;UPGRADE
        </div>


        <h1>
          Great Tech
          <br />
          Finds{" "}
          <span className="gradient-text">
            a New Home
          </span>
        </h1>


        <p className="hero-description">
          <strong>
            What are you InTheMarket for?
          </strong>

          <br />

          Our AI finds the closest matching
          pre-owned electronics near you.
        </p>


        <SearchBar />

        <Suggestions />

      </div>


      <Categories />

    </section>
  );
}


/* =========================================================
   HOME
   ========================================================= */

function Home() {

  return (
    <div className="marketplace-home">

      <Navbar />

      <Hero />

      <ProductSection />

      <SellCTA />

    </div>
  );
}


/* =========================================================
   APP / ROUTES
   ========================================================= */

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
  );
}


export default App;