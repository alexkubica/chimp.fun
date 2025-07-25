import { collectionsMetadata } from "@/consts";
import {
  fetchTokenMetadata,
  getEtherscanProvider,
  getTokenImageUrl,
} from "@/utils";
import { NextRequest, NextResponse } from "next/server";

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
    console.log("Fetching metadata from contract");
    console.debug("initialize ethers provider", collectionMetadata.chain);
    let provider = getEtherscanProvider(collectionMetadata.chain);

    const tokenMetadata = await fetchTokenMetadata(
      provider,
      collectionMetadata,
      tokenId,
      req.nextUrl.origin,
    );

    return NextResponse.json({
      imageUrl: getTokenImageUrl(tokenMetadata),
    });
  } catch (error) {
    console.error("Error fetching nft image URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
