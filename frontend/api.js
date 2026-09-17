const API_URL = import.meta.env.VITE_API_URL;
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadListingImage(files, listingId) {
  if (!files || files.length === 0) return null;

  // Takes the first image uploaded by the seller
  const file = files[0];
  const fileExt = file.name.split(".").pop();
  const filePath = `${listingId}/${Date.now()}.${fileExt}`;

  // 1. Upload to 'listing-images' bucket
  const { error } = await supabase.storage
    .from("InTheMarket")
    .upload(filePath, file);

  if (error) throw error;

  // 2. Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from("InTheMarket")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl; // Single URL string
}
export const fetchListings = async () => {
    const response = await fetch(`${API_URL}/listings`);

    if (!response.ok) {
        throw new Error("Failed to fetch listings");
    }

    return await response.json();
};

export const createListing = async (listingData) => {
    const response = await fetch(`${API_URL}/listings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(listingData),
    });

    if (!response.ok) {
        throw new Error("Failed to create listing");
    }

    return await response.json();
};

