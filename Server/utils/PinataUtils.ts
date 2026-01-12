
import fetch from "node-fetch";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

interface PinataResult {
  data: {
    id: string;
    name: string;
    cid: string;
    size: number;
    number_of_files: number;
    mime_type: string;
    group_id: null | string;
  };
}

export async function uploadToPinata(fileBuffer, fileName, mimeType) {
  try {
    const formData = new FormData();

    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, fileName);
    formData.append("network", "public");

    const request = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!request.ok) {
      throw new Error(`Pinata upload failed: ${request.statusText}`);
    }

    const response  = await request.json() as unknown as PinataResult;

    // Return the IPFS URL using the CID
    const cid = response.data.cid;
    return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
  } catch (error) {
    console.error("Pinata upload error:", error);
    throw new Error("Failed to upload to IPFS");
  }
}

// Optional: Delete file from Pinata
export async function deleteFromPinata(fileId) {
  try {
    const request = await fetch(`https://api.pinata.cloud/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    });

    if (!request.ok) {
      throw new Error(`Pinata delete failed: ${request.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Pinata delete error:", error);
    return false;
  }
}

// Helper to extract file ID from IPFS URL if needed
export function extractCidFromUrl(url) {
  if (!url || !url.includes("/ipfs/")) return null;
  return url.split("/ipfs/")[1];
}
