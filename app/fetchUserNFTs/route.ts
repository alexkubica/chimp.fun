import { NextRequest, NextResponse } from "next/server";

// NFT Provider configurations
const NFT_PROVIDERS = {
  alchemy: {
    name: "Alchemy",
    baseUrl: "https://eth-mainnet.g.alchemy.com/nft/v3",
    requiresApiKey: true,
    envKey: "ALCHEMY_API_KEY",
    chains: {
      ethereum: "eth-mainnet",
      polygon: "polygon-mainnet",
      arbitrum: "arb-mainnet",
      optimism: "opt-mainnet",
    },
  },
  opensea: {
    name: "OpenSea", 
    baseUrl: "https://api.opensea.io/api/v2",
    requiresApiKey: true,
    envKey: "OPENSEA_API_KEY",
    chains: {
      ethereum: "ethereum",
      polygon: "matic",
    },
  },
  moralis: {
    name: "Moralis",
    baseUrl: "https://deep-index.moralis.io/api/v2.2",
    requiresApiKey: true,
    envKey: "MORALIS_API_KEY",
    chains: {
      ethereum: "eth",
      polygon: "polygon",
      bsc: "bsc",
    },
  },
  // Simple free option using basic blockchain RPC (limited functionality)
  simple: {
    name: "Simple",
    baseUrl: "",
    requiresApiKey: false,
    envKey: null,
    chains: {},
  },
};

// Try providers in order of preference
const PROVIDER_PRIORITY = ["alchemy", "moralis", "opensea"];

async function fetchFromAlchemy(wallet: string, chain: string, limit: string, pageKey?: string, apiKey?: string) {
  const alchemyChain = NFT_PROVIDERS.alchemy.chains[chain as keyof typeof NFT_PROVIDERS.alchemy.chains] || "eth-mainnet";
  
  let url = `https://${alchemyChain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`;
  const params = new URLSearchParams({
    owner: wallet,
    pageSize: limit,
    withMetadata: "true",
  });
  
  if (pageKey) {
    params.append("pageKey", pageKey);
  }
  
  url += `?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform Alchemy response to our standard format
  return {
    nfts: data.ownedNfts?.map((nft: any) => ({
      identifier: nft.tokenId,
      collection: nft.contract?.name || "Unknown",
      contract: nft.contract?.address?.toLowerCase(),
      token_standard: nft.tokenType || "ERC721",
      name: nft.name || nft.title || `#${nft.tokenId}`,
      description: nft.description || nft.contract?.name,
      image_url: nft.image?.originalUrl || nft.image?.cachedUrl || nft.media?.[0]?.gateway,
      metadata_url: nft.tokenUri?.gateway || nft.tokenUri?.raw,
      opensea_url: nft.contract?.address ? `https://opensea.io/assets/ethereum/${nft.contract.address}/${nft.tokenId}` : undefined,
      updated_at: null,
      is_disabled: false,
      is_nsfw: false,
    })) || [],
    next: data.pageKey || null,
  };
}

async function fetchFromOpenSea(wallet: string, chain: string, limit: string, next?: string, apiKey?: string) {
  const openseaChain = NFT_PROVIDERS.opensea.chains[chain as keyof typeof NFT_PROVIDERS.opensea.chains] || "ethereum";
  
  let url = `https://api.opensea.io/api/v2/chain/${openseaChain}/account/${wallet}/nfts?limit=${limit}`;
  
  if (next) {
    url += `&next=${next}`;
  }

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    headers["X-API-KEY"] = apiKey;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`OpenSea API error: ${response.status}`);
  }

  return await response.json();
}

async function fetchFromMoralis(wallet: string, chain: string, limit: string, cursor?: string, apiKey?: string) {
  const moralisChain = NFT_PROVIDERS.moralis.chains[chain as keyof typeof NFT_PROVIDERS.moralis.chains] || "eth";
  
  let url = `https://deep-index.moralis.io/api/v2.2/${wallet}/nft?chain=${moralisChain}&format=decimal&limit=${limit}&media_items=true`;
  
  if (cursor) {
    url += `&cursor=${cursor}`;
  }

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "X-API-Key": apiKey || "",
    },
  });

  if (!response.ok) {
    throw new Error(`Moralis API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform Moralis response to our standard format
  return {
    nfts: data.result?.map((nft: any) => ({
      identifier: nft.token_id,
      collection: nft.name || "Unknown",
      contract: nft.token_address?.toLowerCase(),
      token_standard: nft.contract_type || "ERC721",
      name: nft.metadata?.name || `#${nft.token_id}`,
      description: nft.metadata?.description,
      image_url: nft.metadata?.image,
      metadata_url: nft.token_uri,
      opensea_url: `https://opensea.io/assets/ethereum/${nft.token_address}/${nft.token_id}`,
      updated_at: nft.synced_at,
      is_disabled: false,
      is_nsfw: false,
    })) || [],
    next: data.cursor || null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("wallet");
  const chain = searchParams.get("chain") || "ethereum";
  const limit = searchParams.get("limit") || "50";
  const next = searchParams.get("next");
  const provider = searchParams.get("provider") || "auto"; // Allow manual provider selection

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  // Determine which provider to use
  let selectedProvider = null;
  
  if (provider !== "auto" && provider in NFT_PROVIDERS) {
    selectedProvider = provider;
  } else {
    // Auto-select first available provider with API key
    for (const providerName of PROVIDER_PRIORITY) {
      const providerConfig = NFT_PROVIDERS[providerName as keyof typeof NFT_PROVIDERS];
      if (!providerConfig.requiresApiKey || process.env[providerConfig.envKey!]) {
        selectedProvider = providerName;
        break;
      }
    }
  }

  if (!selectedProvider) {
    return NextResponse.json(
      { 
        error: "No NFT provider available. Please configure at least one API key: ALCHEMY_API_KEY, MORALIS_API_KEY, or OPENSEA_API_KEY",
        availableProviders: Object.keys(NFT_PROVIDERS),
      },
      { status: 500 }
    );
  }

  const providerConfig = NFT_PROVIDERS[selectedProvider as keyof typeof NFT_PROVIDERS];
  const apiKey = providerConfig.envKey ? process.env[providerConfig.envKey] : null;

  try {
    let data;
    
    switch (selectedProvider) {
      case "alchemy":
        data = await fetchFromAlchemy(walletAddress, chain, limit, next, apiKey || undefined);
        break;
      case "opensea":
        data = await fetchFromOpenSea(walletAddress, chain, limit, next, apiKey || undefined);
        break;
      case "moralis":
        data = await fetchFromMoralis(walletAddress, chain, limit, next, apiKey || undefined);
        break;
      default:
        throw new Error(`Unsupported provider: ${selectedProvider}`);
    }

    return NextResponse.json({
      ...data,
      provider: selectedProvider,
      providerName: providerConfig.name,
    });
  } catch (error) {
    console.error(`Error fetching NFTs from ${selectedProvider}:`, error);
    return NextResponse.json(
      { 
        error: `${providerConfig.name} API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: selectedProvider,
      },
      { status: 500 }
    );
  }
}