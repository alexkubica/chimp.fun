import { EtherscanProvider } from "ethers";
import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");

  if (
    !tokenId ||
    isNaN(Number(tokenId)) ||
    Number(tokenId) < 1 ||
    Number(tokenId) > 5555
  ) {
    return NextResponse.json({ error: "Invalid Token ID" }, { status: 400 });
  }

  const contractAddress = "0x80336ad7a747236ef41f47ed2c7641828a480baa";

  const abi = [
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
  ];

  try {
    // Use EtherscanProvider from ethers.js
    const provider = new EtherscanProvider(
      "mainnet",
      process.env.ETHERSCAN_API_KEY,
    );

    const contract = new ethers.Contract(contractAddress, abi, provider);

    const tokenURI = await contract.tokenURI(Number(tokenId));
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
