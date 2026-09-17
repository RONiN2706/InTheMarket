const STORAGE_KEY = "inthemarket-listings"

export function getPublishedListings() {
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

export function publishListing(listing) {
  const existing = getPublishedListings()

  // Prevent the same CameraVision listing from being published twice
  const alreadyPublished = existing.some(
    (item) => item.verification?.listingId === listing.verification?.listingId
  )

  if (alreadyPublished) {
    return existing
  }

  const updated = [
    listing,
    ...existing
  ]

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated)
  )

  // Tell other parts of the React app that listings changed
  window.dispatchEvent(new Event("listings-updated"))

  return updated
}