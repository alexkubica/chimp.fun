"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CollectionData {
  name: string;
  contractAddress: string;
  floorPriceETH: number | null;
  floorPriceUSD: number | null;
  volume24h: number | null;
  owners: number | null;
  totalSupply: number | null;
  twitterFollowers: number | null;
  discordMembers: number | null;
  loading: boolean;
  error: string | null;
}

const COLLECTIONS = [
  {
    name: "Chimpers",
    contractAddress: "0x80336ad7a747236ef41f47ed2c7641828a480baa",
    twitterHandle: "ChimpersNFT",
    discordInvite: "chimpers",
  },
  {
    name: "Pudgy Penguins",
    contractAddress: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8",
    twitterHandle: "pudgypenguins",
    discordInvite: "pudgypenguins",
  },
  {
    name: "Sappy Seals",
    contractAddress: "0x364C828eE171616a39897688A831c2499aD972ec",
    twitterHandle: "SappySealsNFT",
    discordInvite: "sappyseals",
  },
  {
    name: "Azuki",
    contractAddress: "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
    twitterHandle: "AzukiZen",
    discordInvite: "azuki",
  },
  {
    name: "Doodles",
    contractAddress: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e",
    twitterHandle: "doodles",
    discordInvite: "doodles",
  },
];

export default function RafaStatsPage() {
  const [collections, setCollections] = useState<CollectionData[]>(
    COLLECTIONS.map((col) => ({
      name: col.name,
      contractAddress: col.contractAddress,
      floorPriceETH: null,
      floorPriceUSD: null,
      volume24h: null,
      owners: null,
      totalSupply: null,
      twitterFollowers: null,
      discordMembers: null,
      loading: true,
      error: null,
    })),
  );

  const [ethPrice, setEthPrice] = useState<number>(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch ETH price first
      const ethPriceResponse = await fetch("/api/eth-price");
      const ethPriceData = await ethPriceResponse.json();
      setEthPrice(ethPriceData.price || 3500); // fallback to $3500

      // Fetch data for each collection
      const updatedCollections = await Promise.all(
        COLLECTIONS.map(async (col, index) => {
          try {
            const nftResponse = await fetch(
              `/api/nft-stats?contract=${col.contractAddress}`,
            );
            const nftData = await nftResponse.json();

            const socialResponse = await fetch(
              `/api/social-stats?twitter=${col.twitterHandle}&discord=${col.discordInvite}`,
            );
            const socialData = await socialResponse.json();

            return {
              name: col.name,
              contractAddress: col.contractAddress,
              floorPriceETH: nftData.floorPriceETH || 0,
              floorPriceUSD: nftData.floorPriceETH
                ? nftData.floorPriceETH * ethPriceData.price
                : 0,
              volume24h: nftData.volume24h || 0,
              owners: nftData.owners || 0,
              totalSupply: nftData.totalSupply || 0,
              twitterFollowers: socialData.twitterFollowers || 0,
              discordMembers: socialData.discordMembers || 0,
              loading: false,
              error: null,
            };
          } catch (error) {
            return {
              name: col.name,
              contractAddress: col.contractAddress,
              floorPriceETH: null,
              floorPriceUSD: null,
              volume24h: null,
              owners: null,
              totalSupply: null,
              twitterFollowers: null,
              discordMembers: null,
              loading: false,
              error: "Failed to fetch data",
            };
          }
        }),
      );

      setCollections(updatedCollections);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const formatNumber = (num: number | null): string => {
    if (num === null) return "N/A";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return price.toFixed(4);
  };

  const formatUSD = (price: number | null): string => {
    if (price === null) return "N/A";
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <main className="min-h-screen bg-[#f8fbff] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#222] mb-4">
            🐧 Rafa Stats Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Live NFT collection stats including floor prices and social media
            data
          </p>
          <div className="mt-4 text-sm text-gray-500">
            ETH Price: ${ethPrice.toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {collections.map((collection, index) => (
            <Card
              key={collection.name}
              className="bg-white shadow-lg hover:shadow-xl transition-shadow"
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-[#222] flex items-center justify-between">
                  {collection.name}
                  {collection.loading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#8DC7FF]"></div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {collection.error ? (
                  <div className="text-red-500 text-sm">{collection.error}</div>
                ) : (
                  <>
                    {/* Floor Price Section */}
                    <div className="bg-[#8DC7FF]/10 rounded-lg p-4">
                      <h3 className="font-semibold text-[#222] mb-2">
                        Floor Price
                      </h3>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-[#222]">
                          {formatPrice(collection.floorPriceETH)} ETH
                        </div>
                        <div className="text-lg text-gray-600">
                          {formatUSD(collection.floorPriceUSD)}
                        </div>
                      </div>
                    </div>

                    {/* Collection Stats */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-[#222] mb-2">
                        Collection Stats
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">24h Volume:</span>
                          <div className="font-medium">
                            {formatPrice(collection.volume24h)} ETH
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Owners:</span>
                          <div className="font-medium">
                            {formatNumber(collection.owners)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Supply:</span>
                          <div className="font-medium">
                            {formatNumber(collection.totalSupply)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social Media Stats */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-[#222] mb-2">
                        Social Media
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Twitter Followers:
                          </span>
                          <span className="font-medium">
                            {formatNumber(collection.twitterFollowers)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Discord Members:
                          </span>
                          <span className="font-medium">
                            {formatNumber(collection.discordMembers)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contract Address */}
                    <div className="text-xs text-gray-400 mt-4">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {collection.contractAddress.slice(0, 6)}...
                        {collection.contractAddress.slice(-4)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={fetchAllData}
            className="bg-[#8DC7FF] hover:bg-[#5bb0f7] text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Refresh Data
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Data updates every few minutes. Last updated:{" "}
            {new Date().toLocaleTimeString()}
          </p>
          <p className="mt-2">Built with ❤️ for the NFT community</p>
        </div>
      </div>
    </main>
  );
}
