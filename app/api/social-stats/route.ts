import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const twitterHandle = searchParams.get("twitter");
    const discordInvite = searchParams.get("discord");

    if (!twitterHandle) {
      return NextResponse.json(
        { error: "Twitter handle is required" },
        { status: 400 },
      );
    }

    let twitterFollowers = null;
    let discordMembers = null;

    // For now, we'll use mock data since free social media APIs are limited
    // In production, you would use paid APIs like:
    // - Twitter API v2 (requires paid subscription for follower counts)
    // - Discord API (requires bot tokens and permissions)
    // - Third-party services like SocialData, TwitterAPI.io, etc.

    const socialData = getMockSocialData(twitterHandle);
    twitterFollowers = socialData.twitterFollowers;
    discordMembers = socialData.discordMembers;

    return NextResponse.json({
      twitterHandle,
      discordInvite,
      twitterFollowers,
      discordMembers,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching social stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch social stats",
        twitterHandle: request.nextUrl.searchParams.get("twitter"),
      },
      { status: 500 },
    );
  }
}

function getMockSocialData(twitterHandle: string) {
  // Mock data based on approximate real follower counts
  // In production, you would replace this with real API calls
  const socialDataMap: { [key: string]: any } = {
    ChimpersNFT: {
      twitterFollowers: 25000,
      discordMembers: 12000,
    },
    pudgypenguins: {
      twitterFollowers: 1900000, // ~1.9M from the image
      discordMembers: 280000,
    },
    SappySealsNFT: {
      twitterFollowers: 95000,
      discordMembers: 45000,
    },
    AzukiZen: {
      twitterFollowers: 850000,
      discordMembers: 120000,
    },
    doodles: {
      twitterFollowers: 950000,
      discordMembers: 180000,
    },
  };

  return (
    socialDataMap[twitterHandle] || {
      twitterFollowers: 10000,
      discordMembers: 5000,
    }
  );
}
