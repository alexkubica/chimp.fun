import { tokenURIABI } from "@/consts";
import { Chain, CollectionMetadata } from "@/types";
import { EtherscanPlugin } from "ethers";
import { EtherscanProvider } from "ethers";
import { Network } from "ethers";
import { AbstractProvider, ethers } from "ethers";

export const getCachePath = (
  collection: CollectionMetadata,
  type: "filesystem" | "API" = "filesystem",
) => {
  return `${type === "filesystem" ? "public/" : ""}metadata/${collection.name}`;
};

export const getCacheUrlPath = (collection: CollectionMetadata) => {
  return `metadata/${collection.name}`;
};

export const getEtherscanProvider = (chain: Chain) => {
  let provider: AbstractProvider;

  console.log("Creating provider for chain:", chain);

  if (chain === "polygon") {
    provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    );
  } else if (chain === "ape") {
    const apeNetwork = new Network(
      "apechain", // Network name
      33139, // Chain ID
    );

    const apeEtherscanPlugin = new EtherscanPlugin("https://api.apescan.io/");
    apeNetwork.attachPlugin(apeEtherscanPlugin);

    provider = new EtherscanProvider(apeNetwork, process.env.APESCAN_API_KEY);
  } else if (chain === "ethereum") {
    console.log("Creating Ethereum mainnet provider");
    // Use JsonRpcProvider for Ethereum mainnet
    provider = new ethers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    );
    console.log("Provider created:", !!provider);
  } else {
    throw new Error("Invalid chain");
  }

  return provider;
};

export const isIpfs = (potentiallyCid: any) => {
  return (
    typeof potentiallyCid === "string" && potentiallyCid.startsWith("ipfs://")
  );
};

export const getIpfsUrl = (cid: string) => {
  console.log("calculate IPFS URL", cid);
  if (cid.startsWith("ipfs://")) {
    cid = cid.substring(7);
  }

  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
  console.log("IPFS URL", ipfsUrl);
  return ipfsUrl;
};

export const fetchTokenMetadata = async (
  provider: AbstractProvider,
  collection: CollectionMetadata,
  tokenId: string | number,
  baseUrl?: string,
) => {
  if (baseUrl) {
    try {
      console.log("Fetching cached metadata");
      const cachedTokenMetadataUrl = `${baseUrl}/${getCachePath(collection, "API")}/${tokenId}.json`;
      console.log("Cached metadata URL", cachedTokenMetadataUrl);
      const cachedTokenMetadataResponse = await fetch(cachedTokenMetadataUrl);

      if (cachedTokenMetadataResponse.ok) {
        console.log("Cached metadata found");
        return await cachedTokenMetadataResponse.json();
      }
    } catch (error) {
      console.log("Cached metadata not found");
    }
  }

  console.log("Fetching metadata from contract");
  try {
    const ethersContract = new ethers.Contract(
      collection.contract,
      tokenURIABI,
      provider,
    );
    console.log("Contract initialized, calling tokenURI");
    let tokenURI = await ethersContract.tokenURI(tokenId);
    console.log("TokenURI received:", tokenURI);

    console.log("Fetching metadata from tokenURI", tokenURI);

    if (isIpfs(tokenURI)) {
      tokenURI = getIpfsUrl(tokenURI);
    }
    const tokenUriResponse = await fetch(tokenURI);
    if (!tokenUriResponse.ok) {
      throw new Error(
        `Failed to fetch metadata: ${tokenUriResponse.statusText}`,
      );
    }

    const tokenMetadata = await tokenUriResponse.json();
    console.log("Fetched token metadata", tokenMetadata);
    return tokenMetadata;
  } catch (error) {
    console.error("Error in fetchTokenMetadata:", error);
    throw error;
  }
};

export const getTokenImageUrl = (tokenMetadata: any) => {
  let image = tokenMetadata.image;
  if (!image) {
    throw new Error("Image field not found in metadata.");
  }

  if (isIpfs(image)) {
    image = getIpfsUrl(image);
  }

  return image;
};

/**
 * Shortens a wallet address for display, e.g., 0x1234...abcd
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
