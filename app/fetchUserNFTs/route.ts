import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("wallet");
  const chain = searchParams.get("chain") || "ethereum";
  const limit = searchParams.get("limit") || "50";
  const next = searchParams.get("next");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenSea API key not configured" },
      { status: 500 }
    );
  }

  try {
    let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts?limit=${limit}`;
    
    if (next) {
      url += `&next=${next}`;
    }

    const response = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`OpenSea API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `OpenSea API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}