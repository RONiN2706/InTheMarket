import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="InTheMarket Listing API", version="1.0.0")

# Enable CORS for frontend integration (Ashbel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific origin in production (e.g., http://localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- PYDANTIC SCHEMAS ---

class ListingCreate(BaseModel):
    seller_id: str
    title: str
    description: str | None = None
    category: str
    condition: str
    price: float
    status: str | None = "active"


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    condition: str | None = None
    price: float | None = None
    status: str | None = None


# --- API ENDPOINTS ---

# 1. CREATE Listing
@app.post("/listings", status_code=status.HTTP_201_CREATED)
def create_listing(listing: ListingCreate):
    try:
        data = listing.model_dump(exclude_unset=True)
        response = supabase.table("InTheMarket").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# 2. READ Active Listings
@app.get("/listings")
def get_active_listings():
    try:
        response = supabase.table("InTheMarket") \
            .select("*") \
            .eq("status", "active") \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# 3. READ Single Listing by ID
@app.get("/listings/{listing_id}")
def get_listing_by_id(listing_id: str):
    try:
        response = supabase.table("InTheMarket") \
            .select("*") \
            .eq("id", listing_id) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )

        return response.data[0]

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# 4. UPDATE Listing (Partial Update / Soft Delete)
@app.patch("/listings/{listing_id}")
def update_listing(listing_id: str, listing: ListingUpdate):
    try:
        update_data = listing.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update"
            )

        response = supabase.table("InTheMarket") \
            .update(update_data) \
            .eq("id", listing_id) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )

        return response.data[0]

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )