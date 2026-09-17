function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <a href="/">InTheMarket</a>
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

export default Navbar