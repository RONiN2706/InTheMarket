import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {createListing} from "../api";
import { createListing, uploadListingImage } from "../api";

const VERIFICATION_SERVICE_URL = "http://localhost:5001"


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


/* =========================================
   INDEXED DB
   ========================================= */

function openImageDatabase() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(
      "InTheMarketImages",
      1
    )

    request.onupgradeneeded = () => {

      const db = request.result

      if (!db.objectStoreNames.contains("images")) {

        db.createObjectStore("images")

      }

    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }

  })

}


async function saveImagesToDatabase(
  listingId,
  files
) {

  const db = await openImageDatabase()

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "images",
        "readwrite"
      )

    const store =
      transaction.objectStore("images")

    store.put(
      files,
      listingId
    )

    transaction.oncomplete = () => {

      db.close()

      resolve()

    }

    transaction.onerror = () => {

      db.close()

      reject(transaction.error)

    }

  })

}


/* =========================================
   SELL
   ========================================= */

function Sell() {

  const [loading, setLoading] =useState(false)

  const [error, setError] = useState("")
  const [images, setImages] =
    useState([])

  const [imagePreviews, setImagePreviews] =
    useState([])
  
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "Used-Good",
    price: "",
  });
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg("");

    const payload = {
      seller_id: "eb41dc9d-1d0e-4a4e-8bcc-177d90cc26d0", // Replace with actual seller Id
      title: formData.title,
      description: formData.description,
      category: formData.category,
      condition: formData.condition,
      price: Number(formData.price),
      status: "active",
    };

    try {
      await createListing(payload);

      setSuccessMsg("Listing created successfully!");
      setFormData({
        title: "",
        description: "",
        category: "",
        condition: "Used-Good",
        price: "",
      });

      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  /* =========================================
     IMAGE SELECTION
     ========================================= */

  function handleImageChange(event) {

    const files =
      Array.from(event.target.files)

    if (files.length > 6) {

      setError(
        "You can upload a maximum of 6 photos."
      )

      return
    }

    setError("")

    setImages(files)

    const previews =
      files.map((file) =>
        URL.createObjectURL(file)
      )

    setImagePreviews(previews)
  }


  /* =========================================
     REMOVE IMAGE
     ========================================= */

  function removeImage(index) {

    const newImages =
      images.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )

    const newPreviews =
      imagePreviews.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )

    setImages(newImages)

    setImagePreviews(newPreviews)
  }


  /* =========================================
     SUBMIT
     ========================================= */

  async function handleSubmit(event) {

    event.preventDefault()

    setLoading(true)
    setError("")

    const form =
      event.target

      if (!images || images.length === 0) {
      setError("Please upload at least one product photo.");
      setLoading(false);
      return;
    }

    try {
      // 2. Build initial listing payload for FastAPI
      const initialPayload = {
        seller_id: "PASTE_VALID_USER_UUID_HERE", // Replace with actual seller UUID
        title: formData.productName.trim(),
        description: formData.description.trim(),
        category: formData.productType,
        condition: formData.condition,
        price: Number(formData.price),
        status: "active",
        image_url: "", // Set placeholder until image is uploaded
      };

      // 3. Create initial listing record in backend database
      const createdListing = await createListing(initialPayload);

      // 4. Upload photo to Supabase Storage bucket
      const photoUrl = await uploadListingImage(images, createdListing.id);

      // 5. Update row in Supabase with the returned image_url
      const { error: updateError } = await supabase
        .from("listings")
        .update({ image_url: photoUrl })
        .eq("id", createdListing.id);

      if (updateError) throw updateError;

      // 6. Handle UI success state
      setSuccessMsg("Listing created successfully!");
      setLoading(false);
    } catch (err) {
      console.error("Listing creation failed:", err);
      setError(err.message || "Failed to create listing.");
      setLoading(false);
    }
  }
  
    if (images.length === 0) {

      setError(
        "Please upload at least one product photo."
      )

      setLoading(false)

      return
    }


    const listing = {

      productType:
        form.productType.value,

      productName:
        form.productName.value.trim(),

      condition:
        form.condition.value,

      price:
        Number(form.price.value),

      description:
        form.description.value.trim(),

      images: [],

      createdAt:
        Date.now(),

    }


    const location =
      form.location.value.trim()


    try {

      /* =========================================
         CREATE CAMERAVISION LISTING
         ========================================= */

      const response =
        await fetch(
          `${VERIFICATION_SERVICE_URL}/api/listings`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(listing),
          }
        )


      const data =
        await response
          .json()
          .catch(() => ({}))


      if (
        !response.ok ||
        !data.verify_url
      ) {

        throw new Error(
          data.error ||
          "Could not start verification."
        )

      }


      /* =========================================
         SAVE LOCATION
         ========================================= */

      sessionStorage.setItem(
        `pending-location-${data.listing_id}`,
        location
      )


      /* =========================================
         SAVE ACTUAL IMAGE FILES
         ========================================= */

      await saveImagesToDatabase(
        data.listing_id,
        images
      )


      /* =========================================
         CREATE VERIFICATION URL
         ========================================= */

      const verificationUrl =
        new URL(
          data.verify_url,
          VERIFICATION_SERVICE_URL
        )


      verificationUrl.searchParams.set(
        "return_url",
        `${window.location.origin}/verification-status`
      )


      /* =========================================
         SEND TO CAMERAVISION
         ========================================= */

      window.location.href =
        verificationUrl.href

    } catch (err) {

      console.error(err)

      setError(
        err.message ||
        "Something went wrong while starting verification."
      )

      setLoading(false)

    }

  }


  return (

    <>
      <Navbar />

      <main className="sell-page">

        <div className="sell-header">

          <div className="sell-badge">
            SELL WITH CONFIDENCE
          </div>

          <h1>
            Turn Your Tech
            <br />
            Into <span>Value.</span>
          </h1>

          <p>
            List your device, verify its condition,
            and let buyers shop with confidence.
          </p>

        </div>


        <form
          className="listing-form"
          onSubmit={handleSubmit}
        >

          <div className="form-section">

            <div className="section-number">
              01
            </div>


            <div className="section-content">

              <h2>
                Product Information
              </h2>

              <p className="section-description">
                Tell buyers what you're selling.
              </p>


              <div className="form-grid">


                {/* PRODUCT NAME */}

                <div className="form-field full-width">

                  <label>
                    Product Name
                  </label>

                  <input
                    name="productName"
                    type="text"
                    placeholder="e.g. ASUS TUF Gaming F15"
                    required
                  />

                </div>


                {/* PHOTOS */}

                <div className="form-field full-width">

                  <label>
                    Product Photos
                  </label>

                  <input
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={
                      handleImageChange
                    }
                  />

                  <p
                    style={{
                      marginTop: "8px",
                      opacity: 0.6,
                      fontSize: "14px",
                    }}
                  >
                    Upload 1–6 clear photos
                    of your device.
                  </p>


                  {/* PREVIEWS */}

                  {imagePreviews.length > 0 && (

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(150px, 1fr))",
                        gap: "14px",
                        marginTop: "18px",
                      }}
                    >

                      {imagePreviews.map(
                        (preview, index) => (

                          <div
                            key={index}
                            style={{
                              position:
                                "relative",
                              borderRadius:
                                "12px",
                              overflow:
                                "hidden",
                              border:
                                "1px solid rgba(255,255,255,0.1)",
                              background:
                                "rgba(255,255,255,0.03)",
                            }}
                          >

                            <img
                              src={preview}
                              alt={
                                `Product ${index + 1}`
                              }
                              style={{
                                width: "100%",
                                height: "150px",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />


                            <button
                              type="button"
                              onClick={() =>
                                removeImage(
                                  index
                                )
                              }
                              style={{
                                position:
                                  "absolute",
                                top: "8px",
                                right: "8px",
                                width: "30px",
                                height: "30px",
                                borderRadius:
                                  "50%",
                                border: "none",
                                background:
                                  "rgba(0,0,0,0.75)",
                                color:
                                  "white",
                                cursor:
                                  "pointer",
                                fontSize:
                                  "16px",
                              }}
                            >
                              ×
                            </button>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>


                {/* CATEGORY */}

                <div className="form-field">

                  <label>
                    Category
                  </label>

                  <select
                    name="productType"
                    required
                  >

                    <option value="">
                      Select category
                    </option>

                    <option value="Smartphones & Tablets">
                      Smartphones & Tablets
                    </option>

                    <option value="Laptops">
                      Laptops
                    </option>

                    <option value="Desktops & PCs">
                      Desktops & PCs
                    </option>

                    <option value="Computer Parts & Components">
                      Computer Parts & Components
                    </option>

                    <option value="TVs & Monitors">
                      TVs & Monitors
                    </option>

                    <option value="Gaming Consoles">
                      Gaming Consoles
                    </option>

                    <option value="Other Electronics">
                      Other Electronics
                    </option>

                  </select>

                </div>


                {/* PRICE */}

                <div className="form-field">

                  <label>
                    Price
                  </label>

                  <input
                    name="price"
                    type="number"
                    min="1"
                    placeholder="₹ 50,000"
                    required
                  />

                </div>


                {/* CONDITION */}

                <div className="form-field">

                  <label>
                    Condition
                  </label>

                  <select
                    name="condition"
                    required
                  >

                    <option value="">
                      Select condition
                    </option>

                    <option value="like-new">
                      Like New
                    </option>

                    <option value="good">
                      Good
                    </option>

                    <option value="fair">
                      Fair
                    </option>

                    <option value="parts">
                      For Parts / Not Working
                    </option>

                  </select>

                </div>


                {/* LOCATION */}

                <div className="form-field">

                  <label>
                    Location
                  </label>

                  <input
                    name="location"
                    type="text"
                    placeholder="e.g. Vellore"
                    required
                  />

                </div>


                {/* DESCRIPTION */}

                <div className="form-field full-width">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    placeholder="Describe the condition, usage, accessories included, etc."
                    required
                  />

                </div>

              </div>

            </div>

          </div>


          {/* VERIFICATION */}

          <div className="verification-preview">

            <div className="preview-icon">
              🛡️
            </div>

            <div>

              <h3>
                Device Verification Required
              </h3>

              <p>
                You'll record a short live video
                of your device before publishing.
              </p>

            </div>

            <span>
              STEP 02 →
            </span>

          </div>


          {/* ERROR */}

          {error && (

            <div
              style={{
                marginTop: "20px",
                padding: "14px 16px",
                borderRadius: "10px",
                background:
                  "rgba(255, 70, 70, 0.1)",
                border:
                  "1px solid rgba(255, 70, 70, 0.3)",
                color: "#ff7777",
              }}
            >
              {error}
            </div>

          )}


          {/* SUBMIT */}

          <div className="listing-submit">

            <button
              type="submit"
              className="listing-button"
              disabled={loading}
            >

              {loading
                ? "Starting Verification..."
                : "Continue to Verification →"}

            </button>

            <p>
              Verification helps buyers trust your listing.
            </p>

          </div>

        </form>

      </main>
    </>
  )
}

export default Sell