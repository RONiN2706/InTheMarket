import { useNavigate, useSearchParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { fetchListings } from "../api";

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

function SearchResults() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get("q") || ""

  // State to hold live listings fetched from your FastAPI backend
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch real database records on component mount
  useEffect(() => {
    fetchListings()
      .then((data) => {
        setProducts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching live listings:", err)
        setLoading(false)
      })
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const newQuery = event.target.search.value.trim()
    setSearchParams(newQuery ? { q: newQuery } : {})
  }

  function openProduct(id) {
    navigate(`/product/${id}`)
  }

  const searchText = query.toLowerCase()

  // Filter listings based on the search term matching title or category
  let filteredProducts = products.filter((product) => {
    if (!searchText) return true;
    const titleMatch = product.title?.toLowerCase().includes(searchText);
    const categoryMatch = product.category?.toLowerCase().includes(searchText);
    return titleMatch || categoryMatch;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="results-page">
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Loading listings from server...</h2>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="results-page">
        {/* HEADER */}
        <div className="results-header">
          <h1>Find Your Next Device</h1>

          <form className="results-search" onSubmit={handleSearch}>
            <input
              name="search"
              type="text"
              defaultValue={query}
              placeholder="Describe what you're looking for..."
            />
            <button type="submit">→</button>
          </form>

          <p>
            {query
              ? `Results for "${query}"`
              : "Showing products matched to your search"}
          </p>
        </div>

        <div className="results-layout">
          {/* FILTERS */}
          <aside className="filters">
            <h2>Filters</h2>

            <div className="filter-group">
              <h3>Category</h3>
              <label><input type="checkbox" /> Phones</label>
              <label><input type="checkbox" /> Laptops</label>
              <label><input type="checkbox" /> Gaming</label>
              <label><input type="checkbox" /> Audio</label>
            </div>

            <div className="filter-group">
              <h3>Condition</h3>
              <label><input type="checkbox" /> Like New</label>
              <label><input type="checkbox" /> Excellent</label>
              <label><input type="checkbox" /> Good</label>
            </div>

            <div className="filter-group">
              <h3>Price</h3>
              <label><input type="checkbox" /> Under ₹20k</label>
              <label><input type="checkbox" /> ₹20k – ₹50k</label>
              <label><input type="checkbox" /> ₹50k+</label>
            </div>
          </aside>

          {/* RESULTS */}
          <section>
            <div className="results-top">
              <h2>{filteredProducts.length} Results</h2>

              <select>
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>

            <div className="results-grid">
              {filteredProducts.map((product) => (
                <div
                  className="result-card"
                  key={product.id}
                  onClick={() => openProduct(product.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="product-image">
                    {product.title}
                  </div>

                  <div className="result-info">
                    <h3>{product.title}</h3>

                    <h2>₹{product.price?.toLocaleString('en-IN')}</h2>

                    <p>{product.condition}</p>

                    <p>📍 {product.location || "Vellore"}</p>

                    <div className="trust">
                      🛡 Trust Rating: {product.trust || "95%"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

export default SearchResults;