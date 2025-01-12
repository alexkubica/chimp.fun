import { EtherscanProvider, ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { CollectionNames } from "../types";
import { collectionsMetadata } from "../collectionsMetadata";
import { AbstractProvider } from "ethers";

let lastUsedIpfsProviderIndex = -1; // Start with -1 to ensure the first provider is used initially

const ipfsProviders = [
  (ipfs: string) => {
    return `https://ipfs.io/ipfs/${ipfs.slice(7)}`;
  },
  (ipfs: string) => {
    return `https://gateway.pinata.cloud/ipfs/${ipfs.slice(7)}`;
  },
  (ipfs: string) => {
    const ipfsParts = ipfs.slice(7).split("/");
    return `https://${ipfsParts[0]}.ipfs.w3s.link/${ipfsParts[1]}`;
  },
];

const getNextIpfsProviderURL = (ipfs: string) => {
  // Rotate to the next provider
  lastUsedIpfsProviderIndex =
    (lastUsedIpfsProviderIndex + 1) % ipfsProviders.length;
  return ipfsProviders[lastUsedIpfsProviderIndex](ipfs);
};

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
    console.log("Fetching metadata from contract");
    console.debug("initialize ethers provider");
    let provider: AbstractProvider;

    if (collectionMetadata.chain === "polygon") {
      // Use EtherscanProvider for the Polygon network
      provider = new ethers.EtherscanProvider(
        "matic",
        process.env.POLYGONSCAN_API_KEY,
      );
    } else if (collectionMetadata.chain === "ethereum") {
      // Use EtherscanProvider from ethers.js
      provider = new EtherscanProvider(
        "mainnet",
        process.env.ETHERSCAN_API_KEY,
      );
    } else {
      throw new Error("Invalid chain");
    }

    console.debug("load contract ABI");
    const contract = new ethers.Contract(
      collectionMetadata.contract,
      tokenURIABI,
      provider,
    );

    console.log("fetch tokenURI");
    let tokenURI = await contract.tokenURI(tokenIdNumber);
    console.log("tokenURI", tokenURI);

    if (tokenURI.startsWith("ipfs://")) {
      tokenURI = getNextIpfsProviderURL(tokenURI);
      console.log(
        "IPFS URI detected, fetching from IPFS gateway using ipfs.io",
        tokenURI,
      );
    }

    console.log("fetch metadata from tokenURI", tokenURI);
    const response = await fetch(tokenURI);
    console.log("response", response);

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();
    console.log("NFT metadata", metadata);

    let image = metadata.image;
    if (!image) {
      throw new Error("Image field not found in metadata.");
    }

    if (image.startsWith("ipfs://")) {
      image = getNextIpfsProviderURL(image);
      console.log(
        "IPFS image detected, fetching from IPFS gateway using ipfs.io",
        image,
      );
    }

    return NextResponse.json({ imageUrl: image });
  } catch (error) {
    console.error("Error fetching nft image URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
