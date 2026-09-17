import { useNavigate, useSearchParams } from "react-router-dom"


const products = [
  {
    id: 1,
    name: "iPhone 15",
    price: 48000,
    priceDisplay: "₹48,000",
    condition: "Excellent",
    location: "Vellore",
    trust: "96%",
    keywords: ["iphone", "phone", "apple", "ios"]
  },

  {
    id: 2,
    name: "RTX 3060 Gaming PC",
    price: 52000,
    priceDisplay: "₹52,000",
    condition: "Good",
    location: "Vellore",
    trust: "91%",
    keywords: ["rtx", "3060", "gaming", "pc", "computer", "nvidia"]
  },

  {
    id: 3,
    name: "Sony WH-1000XM5",
    price: 18000,
    priceDisplay: "₹18,000",
    condition: "Like New",
    location: "Katpadi",
    trust: "98%",
    keywords: ["sony", "headphones", "audio", "noise", "cancelling"]
  },

  {
    id: 4,
    name: "PS5 Slim",
    price: 38000,
    priceDisplay: "₹38,000",
    condition: "Excellent",
    location: "Vellore",
    trust: "95%",
    keywords: ["ps5", "playstation", "gaming", "console"]
  },

  {
    id: 5,
    name: "ASUS TUF Gaming F15",
    price: 68000,
    priceDisplay: "₹68,000",
    condition: "Excellent",
    location: "Vellore",
    trust: "94%",
    keywords: ["asus", "tuf", "gaming", "laptop", "notebook"]
  },

  {
    id: 6,
    name: "Samsung Galaxy S24",
    price: 55000,
    priceDisplay: "₹55,000",
    condition: "Excellent",
    location: "Chennai",
    trust: "97%",
    keywords: ["samsung", "galaxy", "s24", "phone", "android"]
  }
]


function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        <a href="/">IntheMarket</a>
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


function SearchResults() {

  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get("q") || ""


  function handleSearch(event) {

    event.preventDefault()

    const newQuery = event.target.search.value.trim()

    setSearchParams(
      newQuery
        ? { q: newQuery }
        : {}
    )
  }


  function openProduct(id) {

    navigate(`/product/${id}`)

  }


  /*
    Temporary frontend matching.

    Later:
    Replace this section with Pranav's Search API.
  */

  const searchText = query.toLowerCase()


  let filteredProducts = products


  if (searchText) {

    filteredProducts = products.filter((product) => {

      return product.keywords.some((keyword) =>
        searchText.includes(keyword)
      )

    })

  }


  /*
    If nothing matches, show all products for now.
    This prevents the demo from looking broken.
  */

  if (filteredProducts.length === 0) {
    filteredProducts = products
  }


  return (
    <>

      <Navbar />

      <main className="results-page">


        {/* HEADER */}

        <div className="results-header">

          <h1>
            Find Your Next Device
          </h1>


          <form
            className="results-search"
            onSubmit={handleSearch}
          >

            <input
              name="search"
              type="text"
              defaultValue={query}
              placeholder="Describe what you're looking for..."
            />

            <button type="submit">
              →
            </button>

          </form>


          <p>

            {query
              ? `Results for "${query}"`
              : "Showing products matched to your search"
            }

          </p>

        </div>



        <div className="results-layout">


          {/* FILTERS */}

          <aside className="filters">

            <h2>
              Filters
            </h2>


            <div className="filter-group">

              <h3>
                Category
              </h3>

              <label>
                <input type="checkbox" />
                Phones
              </label>

              <label>
                <input type="checkbox" />
                Laptops
              </label>

              <label>
                <input type="checkbox" />
                Gaming
              </label>

              <label>
                <input type="checkbox" />
                Audio
              </label>

            </div>


            <div className="filter-group">

              <h3>
                Condition
              </h3>

              <label>
                <input type="checkbox" />
                Like New
              </label>

              <label>
                <input type="checkbox" />
                Excellent
              </label>

              <label>
                <input type="checkbox" />
                Good
              </label>

            </div>


            <div className="filter-group">

              <h3>
                Price
              </h3>

              <label>
                <input type="checkbox" />
                Under ₹20k
              </label>

              <label>
                <input type="checkbox" />
                ₹20k – ₹50k
              </label>

              <label>
                <input type="checkbox" />
                ₹50k+
              </label>

            </div>

          </aside>



          {/* RESULTS */}

          <section>

            <div className="results-top">

              <h2>
                {filteredProducts.length} Results
              </h2>


              <select>

                <option>
                  Recommended
                </option>

                <option>
                  Price: Low to High
                </option>

                <option>
                  Price: High to Low
                </option>

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

                    {product.name}

                  </div>



                  <div className="result-info">

                    <h3>
                      {product.name}
                    </h3>


                    <h2>
                      {product.priceDisplay}
                    </h2>


                    <p>
                      {product.condition}
                    </p>


                    <p>
                      📍 {product.location}
                    </p>


                    <div className="trust">

                      🛡 Trust Rating: {product.trust}

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


export default SearchResults