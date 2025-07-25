import { CollageNFT } from "../types";
import { collectionsMetadata } from "@/consts";

/**
 * Generates a random token ID for a given collection
 */
function getRandomTokenId(collection: any): string {
  if (collection.total) {
    return Math.floor(Math.random() * collection.total).toString();
  }
  // Fallback to a random number between 1 and 10000
  return Math.floor(Math.random() * 10000 + 1).toString();
}

/**
 * Fetches the actual image URL from the API
 */
async function fetchImageUrl(
  contract: string,
  tokenId: string,
  abortSignal?: AbortSignal,
): Promise<string | null> {
  try {
    const apiUrl = `/api/fetchNFTImage?contract=${contract}&tokenId=${tokenId}`;
    const response = await fetch(apiUrl, {
      signal: abortSignal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status}`);
    }

    const data = await response.json();
    return data.imageUrl || null;
  } catch (error) {
    console.warn(
      `Failed to fetch image URL for ${contract}:${tokenId}:`,
      error,
    );
    return null;
  }
}

/**
 * Validates that an image URL is accessible and is actually an image
 */
export async function validateImageUrl(
  url: string,
  abortSignal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: abortSignal,
      headers: {
        Accept: "image/*",
      },
    });
    const contentType = response.headers.get("content-type");
    return response.ok && (contentType?.startsWith("image/") || false);
  } catch {
    return false;
  }
}

/**
 * Attempts to fetch a single NFT with retry logic
 */
async function fetchSingleNFTWithRetry(
  availableCollections: any[],
  usedNFTs: Set<string>,
  maxAttempts: number = 10,
  abortSignal?: AbortSignal,
): Promise<CollageNFT | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if operation was cancelled
    if (abortSignal?.aborted) {
      throw new Error("Operation cancelled");
    }

    if (availableCollections.length === 0) {
      console.warn("No available collections to fetch from");
      return null;
    }

    const randomCollection =
      availableCollections[
        Math.floor(Math.random() * availableCollections.length)
      ];
    const tokenId = getRandomTokenId(randomCollection);
    const nftKey = `${randomCollection.contract}:${tokenId}`;

    // Skip if already used
    if (usedNFTs.has(nftKey)) continue;

    try {
      // Add to used set immediately to prevent duplicates
      usedNFTs.add(nftKey);

      // Fetch the actual image URL from the API
      const imageUrl = await fetchImageUrl(
        randomCollection.contract,
        tokenId,
        abortSignal,
      );

      if (!imageUrl) {
        usedNFTs.delete(nftKey); // Remove from used set if no image URL
        continue;
      }

      // Validate image URL
      const isValid = await validateImageUrl(imageUrl, abortSignal);
      if (!isValid) {
        usedNFTs.delete(nftKey); // Remove from used set if invalid
        continue;
      }

      return {
        id: nftKey,
        imageUrl,
        contract: randomCollection.contract,
        tokenId,
        collectionName: randomCollection.name,
      };
    } catch (error) {
      usedNFTs.delete(nftKey); // Remove from used set on error
      console.warn(`Attempt ${attempt + 1} failed for ${nftKey}:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Fetches a random selection of NFTs from various collections or a specific collection
 * with progressive loading and retry logic
 */
export async function fetchRandomNFTs(
  count: number,
  collectionContracts?: string[],
  onProgress?: (nft: CollageNFT, index: number) => void,
  abortSignal?: AbortSignal,
): Promise<CollageNFT[]> {
  const nfts: CollageNFT[] = [];
  const usedNFTs = new Set<string>(); // Track used NFTs to avoid duplicates

  console.log("fetchRandomNFTs called with:", { count, collectionContracts });

  // Filter collections that have image URLs or can generate them
  let availableCollections = collectionsMetadata.filter(
    (collection) => collection.contract && collection.total,
  );

  // If specific collections are requested, filter to only those collections
  if (
    collectionContracts &&
    collectionContracts.length > 0 &&
    !collectionContracts.includes("all")
  ) {
    availableCollections = availableCollections.filter((collection) =>
      collectionContracts.includes(collection.contract),
    );
  }

  if (availableCollections.length === 0) {
    console.warn("No available collections found");
    return [];
  }

  // Fetch NFTs progressively with controlled concurrency
  const maxConcurrent = 3; // Reduce concurrent requests to avoid overwhelming APIs
  const batches: Promise<void>[] = [];

  for (let i = 0; i < count; i += maxConcurrent) {
    const batch = Array.from(
      { length: Math.min(maxConcurrent, count - i) },
      async (_, batchIndex) => {
        const index = i + batchIndex;

        const nft = await fetchSingleNFTWithRetry(
          availableCollections,
          usedNFTs,
          5,
          abortSignal,
        );

        if (nft) {
          nfts[index] = nft;
          // Call progress callback if provided
          if (onProgress) {
            onProgress(nft, index);
          }
        } else {
          // Create placeholder if all retries failed
          console.warn(
            `Could not find NFT for slot ${index}, adding placeholder`,
          );
          const placeholderCollection = availableCollections[0];
          const placeholderTokenId = getRandomTokenId(placeholderCollection);

          const placeholder: CollageNFT = {
            id: `placeholder-${index}`,
            imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" fill="#f0f0f0"/>
              <text x="256" y="256" text-anchor="middle" dy="0.35em" font-family="Arial" font-size="24" fill="#666">
                NFT #${placeholderTokenId}
              </text>
              <text x="256" y="300" text-anchor="middle" dy="0.35em" font-family="Arial" font-size="16" fill="#999">
                ${placeholderCollection.name}
              </text>
            </svg>
          `)}`,
            contract: placeholderCollection.contract,
            tokenId: placeholderTokenId,
            collectionName: placeholderCollection.name,
          };

          nfts[index] = placeholder;
          if (onProgress) {
            onProgress(placeholder, index);
          }
        }
      },
    );

    batches.push(...batch);
  }

  // Wait for all batches to complete
  await Promise.allSettled(batches);

  // Filter out undefined entries and return
  return nfts.filter((nft) => nft !== undefined);
}

/**
 * Fetches a single replacement NFT for a specific slot
 */
export async function fetchReplacementNFT(
  collections: string[],
  usedNFTs: Set<string>,
  abortSignal?: AbortSignal,
): Promise<CollageNFT | null> {
  let availableCollections = collectionsMetadata.filter(
    (collection) => collection.contract && collection.total,
  );

  if (collections && collections.length > 0 && !collections.includes("all")) {
    availableCollections = availableCollections.filter((collection) =>
      collections.includes(collection.contract),
    );
  }

  return await fetchSingleNFTWithRetry(
    availableCollections,
    usedNFTs,
    10,
    abortSignal,
  );
}

/**
 * Generates default collage settings
 */
export function getDefaultCollageSettings() {
  const settings = {
    rows: 2,
    columns: 2,
    spacing: 2,
    backgroundColor: "#ffffff",
    borderRadius: 4,
  };
  console.log("getDefaultCollageSettings called, returning:", settings);
  return settings;
}
