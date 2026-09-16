import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
load_dotenv()

SUPERBASE_URL = os.getenv("SUPABASE_URL")
SUPERBASE_KEY = os.getenv("SUPABASE_KEY")

supabase : Client = create_client(SUPERBASE_URL,SUPERBASE_KEY)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ListingCreate(BaseModel):
    seller_id : str
    title: str
    description: str | None=None
    category: str
    condition: str
    price: float
    status: str | None = "active"

class ListingUpdate(BaseModel):
    title: str | None=None
    description: str | None=None
    category: str | None=None
    condition: str | None=None
    price: float | None=None
    status: str | None=None

@app.post("/listings", status_code=status.HTTP_201_CREATED)
def create_listing(listing: ListingCreate):
    try:
        payload = listing.model_dump()
        response = supabase.table("InTheMarket").insert(payload).execute()
        return response.data[0]

    except Exception as e:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = str(e)
        )



@app.get("/listings")
def get_active_listings():
    try:

        response = supabase.table("InTheMarket")\
        .select("*")\
        .eq("status", "active")\
        .order("created_at", desc = True)\
        .execute()

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = str(e)
        )


@app.get("/listings/{listing_id}")
def get_listing_by_id(listing_id : str):
    try:

        response = supabase.table("InTheMarket")\
            .select("*")\
            .eq("id", listing_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = "Listing not found"
            )

        return response.data[0]

    except HTTPException as http_ex:
        raise http_ex

    except Exception as e:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = str(e)
        )

@app.patch("/listings/{listing_id}")
def update_listing(listing_id: str, listing: ListingUpdate):

    try:
        update_data = listing.model_dump(exclude_unset = True)
        if not update_data:
            raise HTTPException(
                status_code = status.HTTP_400_BAD_REQUEST,
                detail = "No fields provided for update"
            )

        response = supabase.table("InTheMarket")\
            .update(update_data)\
            .eq("id", listing_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code = status.HTTP_404_NOT_FOUND,
                detail = "Listing not found"
            )

        return response.data[0]

    except HTTPException as http_ex:
        raise http_ex

    except Exception as e:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = str(e)
        )
    