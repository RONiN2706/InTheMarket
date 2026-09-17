function Profile() {
  const listings = [
    {
      id: 1,
      name: "iPhone 15",
      price: "₹48,000",
      status: "Active"
    },
    {
      id: 2,
      name: "Sony WH-1000XM5",
      price: "₹18,000",
      status: "Sold"
    }
  ]

  return (
    <div>
      <nav className="navbar">
        <div className="logo">
          <a href="/">InTheMarket</a>
        </div>

        <ul className="nav-links">
          <li><a href="/">Browse</a></li>
          <li><a href="/">Sell</a></li>
          <li><a href="/">Messages</a></li>
          <li><a href="/">❤️ Saved</a></li>
          <li><a href="/">Profile</a></li>
        </ul>
      </nav>

      <main className="profile-page">

        <section className="profile-header">
          <div className="profile-avatar">
            A
          </div>

          <div>
            <h1>Ashbel</h1>
            <p>Vellore</p>
            <span>Verified Member</span>
          </div>
        </section>


        <section className="profile-section">

          <div className="section-heading">
            <h2>My Listings</h2>
            <button>+ Sell Something</button>
          </div>

          <div className="profile-listings">

            {listings.map((listing) => (
              <div
                className="profile-listing"
                key={listing.id}
              >
                <div className="mini-image">
                  Product
                </div>

                <div>
                  <h3>{listing.name}</h3>
                  <p>{listing.price}</p>
                </div>

                <span>{listing.status}</span>
              </div>
            ))}

          </div>

        </section>


        <section className="profile-section">

          <h2>Saved Products</h2>

          <div className="empty-state">
            <p>
              Products you save will appear here.
            </p>
          </div>

        </section>

      </main>
    </div>
  )
}

export default Profile