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
 * Attempts to fetch a single NFT with retry logic
 */
async function fetchSingleNFTWithRetry(
  availableCollections: any[],
  usedNFTs: Set<string>,
  maxAttempts: number = 10,
): Promise<CollageNFT | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomCollection =
      availableCollections[
        Math.floor(Math.random() * availableCollections.length)
      ];

    const tokenId = getRandomTokenId(randomCollection);
    const nftKey = `${randomCollection.contract}-${tokenId}`;

    // Skip if we already have this NFT
    if (usedNFTs.has(nftKey)) {
      continue;
    }

    try {
      let imageUrl: string;

      // Check if collection has a custom gif override
      if (randomCollection.gifOverride) {
        imageUrl = randomCollection.gifOverride(tokenId);
      } else {
        // Use the NFT image fetching API
        const response = await fetch(
          `/fetchNFTImage?contract=${randomCollection.contract}&tokenId=${tokenId}&chain=${randomCollection.chain || "ethereum"}`,
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        if (!data.imageUrl) {
          continue;
        }

        imageUrl = data.imageUrl;
      }

      // Validate that the image actually loads
      const imageValid = await validateImageUrl(imageUrl);
      if (!imageValid) {
        continue;
      }

      const collageNFT: CollageNFT = {
        id: nftKey,
        imageUrl,
        contract: randomCollection.contract,
        tokenId,
        collectionName: randomCollection.name,
      };

      usedNFTs.add(nftKey);
      return collageNFT;
    } catch (error) {
      console.error(`Error fetching NFT ${nftKey}:`, error);
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
    availableCollections = availableCollections.filter(
      (collection) =>
        collection.contract &&
        collectionContracts.some(
          (contract) =>
            collection.contract?.toLowerCase() === contract.toLowerCase(),
        ),
    );
    console.log("Filtered to specific collections:", collectionContracts);
    console.log(
      "Available collections after filtering:",
      availableCollections.length,
    );
  } else {
    console.log(
      "No specific collections requested or 'all' selected, using all available collections",
    );
  }

  if (availableCollections.length === 0) {
    throw new Error("No available collections found");
  }

  // Fetch NFTs progressively with sequential requests for better user experience
  for (let i = 0; i < count; i++) {
    const nft = await fetchSingleNFTWithRetry(availableCollections, usedNFTs);

    if (nft) {
      nfts.push(nft);
      // Call progress callback if provided
      if (onProgress) {
        onProgress(nft, i);
      }
    } else {
      // Create placeholder if all retries failed
      console.warn(`Could not find NFT for slot ${i}, adding placeholder`);
      const placeholderCollection = availableCollections[0];
      const placeholderTokenId = getRandomTokenId(placeholderCollection);

      const placeholder: CollageNFT = {
        id: `placeholder-${i}`,
        imageUrl: `/api/placeholder?text=NFT+${i + 1}`,
        contract: placeholderCollection.contract,
        tokenId: placeholderTokenId,
        collectionName: placeholderCollection.name,
      };

      nfts.push(placeholder);

      if (onProgress) {
        onProgress(placeholder, i);
      }
    }
  }

  return nfts;
}

/**
 * Validates if an image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentType = response.headers.get("content-type");
    return response.ok && (contentType?.startsWith("image/") || false);
  } catch {
    return false;
  }
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
