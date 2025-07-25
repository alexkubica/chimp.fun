import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from CoinGecko (free API)
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      const ethPrice = data.ethereum?.usd;

      if (ethPrice) {
        return NextResponse.json({
          price: ethPrice,
          currency: "USD",
          source: "CoinGecko",
          success: true,
        });
      }
    }

    // Fallback to a reasonable default if API fails
    return NextResponse.json({
      price: 3500, // Fallback price
      currency: "USD",
      source: "fallback",
      success: false,
      note: "Using fallback price due to API failure",
    });
  } catch (error) {
    console.error("Error fetching ETH price:", error);

    // Return fallback price on error
    return NextResponse.json({
      price: 3500,
      currency: "USD",
      source: "fallback",
      success: false,
      error: "Failed to fetch ETH price",
    });
  }
}
