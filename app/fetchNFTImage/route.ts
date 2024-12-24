import { EtherscanProvider } from "ethers";
import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { CollectionNames } from "../types";
import { collectionsMetadata } from "../collectionsMetadata";

const tokenURIABI = [
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const collection = searchParams.get("collection") as CollectionNames;
  if (!collection) {
    return NextResponse.json(
      { error: "Collection not provided" },
      { status: 400 },
    );
  }
  const collectionMetadata = collectionsMetadata[collection];

  if (
    !tokenId ||
    isNaN(Number(tokenId)) ||
    Number(tokenId) < 1 ||
    Number(tokenId) > collectionMetadata.total
  ) {
    return NextResponse.json({ error: "Invalid Token ID" }, { status: 400 });
  }

  const tokenIdNumber = Number(tokenId);

  // Construct the absolute URL for the static file
  const localMetadataUrl = `${req.nextUrl.origin}/${collectionMetadata.cachePath}/${tokenIdNumber}.json`;

  try {
    // Attempt to fetch metadata from the public directory
    const localResponse = await fetch(localMetadataUrl);

    if (localResponse.ok) {
      const metadata = await localResponse.json();

      if (!metadata.image) {
        throw new Error("Image field not found in cached metadata.");
      }

      return NextResponse.json({ imageUrl: metadata.image });
    } else {
      console.log(`Local metadata not found for Token ID ${tokenId}`);
    }
  } catch (error) {
    console.log(
      `Error fetching local metadata for Token ID ${tokenId}:`,
      error,
    );
  }

  try {
    // Use EtherscanProvider from ethers.js
    const provider = new EtherscanProvider(
      "mainnet",
      process.env.ETHERSCAN_API_KEY,
    );

    const contract = new ethers.Contract(
      collectionMetadata.contract,
      tokenURIABI,
      provider,
    );

    const tokenURI = await contract.tokenURI(tokenIdNumber);
    const response = await fetch(tokenURI);

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();

    if (!metadata.image) {
      throw new Error("Image field not found in metadata.");
    }

    return NextResponse.json({ imageUrl: metadata.image });
  } catch (error) {
    console.error("Error fetching Chimpers image URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
