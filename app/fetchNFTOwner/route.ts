import { collectionsMetadata, ownerOfABI } from "@/consts";
import { getEtherscanProvider } from "@/utils";
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const contract = searchParams.get("contract");

  if (!tokenId) {
    return NextResponse.json(
      { error: "tokenId not provided" },
      { status: 400 },
    );
  }

  if (!contract) {
    return NextResponse.json(
      { error: "contract not provided" },
      { status: 400 },
    );
  }

  const collectionMetadata = collectionsMetadata.find(
    (c) => c.contract === contract,
  );

  if (!collectionMetadata) {
    return NextResponse.json(
      { error: "collection not found" },
      { status: 404 },
    );
  }

  try {
    console.log("Fetching NFT owner from contract");
    console.debug("initialize ethers provider", collectionMetadata.chain);
    const provider = getEtherscanProvider(collectionMetadata.chain);

    const ethersContract = new ethers.Contract(
      collectionMetadata.contract,
      ownerOfABI,
      provider,
    );

    console.log("Contract initialized, calling ownerOf");
    const owner = await ethersContract.ownerOf(tokenId);
    console.log("Owner received:", owner);

    return NextResponse.json({
      owner: owner.toLowerCase(), // Normalize to lowercase
      tokenId,
      contract,
    });
  } catch (error) {
    console.error("Error fetching NFT owner:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFT owner" },
      { status: 500 },
    );
  }
}
