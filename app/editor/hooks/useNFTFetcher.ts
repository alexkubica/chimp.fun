import { UserNFT, NFTApiResponse } from "../types";
import { isValidEthereumAddress, looksLikeENS } from "../utils";

/**
 * Custom hook for fetching NFTs from wallets with pagination support
 * Handles both user wallets and external wallet browsing
 */
export class NFTFetcher {
  private supportedCollections: Set<string>;
  
  constructor(supportedCollections: Set<string>) {
    this.supportedCollections = supportedCollections;
  }

  /**
   * Resolves ENS name to Ethereum address
   */
  async resolveENS(ensName: string): Promise<string | null> {
    if (!looksLikeENS(ensName)) {
      return null;
    }

    try {
      // Try primary ENS resolver API
      const response = await fetch(
        `https://api.ensideas.com/ens/resolve/${ensName}`,
      );
      if (response.ok) {
        const data = await response.json();
        return data.address || null;
      }

      // Fallback: try alternative ENS API
      const fallbackResponse = await fetch(
        `https://api.web3.bio/profile/${ensName}`,
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        return fallbackData.address || null;
      }

      return null;
    } catch (error) {
      console.error("ENS resolution failed:", error);
      return null;
    }
  }

  /**
   * Fetches all NFTs from a wallet address with auto-pagination
   */
  async fetchAllNFTs(walletAddress: string): Promise<{
    nfts: UserNFT[];
    provider: string | null;
    providerName: string | null;
    error?: string;
  }> {
    let resolvedAddress = walletAddress.trim();

    // Handle ENS resolution
    if (looksLikeENS(resolvedAddress)) {
      const resolved = await this.resolveENS(resolvedAddress);
      if (!resolved) {
        return {
          nfts: [],
          provider: null,
          providerName: null,
          error: `Could not resolve ENS name: ${resolvedAddress}`,
        };
      }
      resolvedAddress = resolved;
    } else if (!isValidEthereumAddress(resolvedAddress)) {
      return {
        nfts: [],
        provider: null,
        providerName: null,
        error: "Invalid wallet address",
      };
    }

    try {
      let allNFTs: UserNFT[] = [];
      let nextCursor: string | null = null;
      let provider: string | null = null;
      let providerName: string | null = null;
      let pageCount = 0;

      do {
        pageCount++;
        let url = `/fetchUserNFTs?wallet=${resolvedAddress}&limit=100`;

        if (nextCursor) {
          url += `&next=${encodeURIComponent(nextCursor)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            errorData.error || `Failed to fetch NFTs: ${response.status}`,
          );
        }

        const data: NFTApiResponse = await response.json();

        // Filter NFTs to only show supported collections
        const filteredNFTs = data.nfts.filter((nft) =>
          this.supportedCollections.has(nft.contract.toLowerCase()),
        );

        allNFTs = [...allNFTs, ...filteredNFTs];
        nextCursor = data.next || null;

        // Store provider info from first response
        if (pageCount === 1) {
          provider = data.provider || null;
          providerName = data.providerName || null;
        }

        // Add a small delay between requests to be nice to the API
        if (nextCursor) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } while (nextCursor);

      console.log(
        `Fetched ${allNFTs.length} supported NFTs across ${pageCount} pages`,
      );

      return {
        nfts: allNFTs,
        provider,
        providerName,
      };
    } catch (err) {
      console.error("Error fetching all NFTs:", err);
      return {
        nfts: [],
        provider: null,
        providerName: null,
        error: err instanceof Error ? err.message : "Failed to fetch NFTs",
      };
    }
  }

  /**
   * Fetches NFTs with manual pagination (for external wallets)
   */
  async fetchNFTsWithPagination(
    walletAddress: string,
    cursor?: string,
  ): Promise<{
    nfts: UserNFT[];
    nextCursor: string | null;
    hasMore: boolean;
    provider: string | null;
    providerName: string | null;
    error?: string;
  }> {
    let resolvedAddress = walletAddress.trim();

    // Handle ENS resolution
    if (looksLikeENS(resolvedAddress)) {
      const resolved = await this.resolveENS(resolvedAddress);
      if (!resolved) {
        return {
          nfts: [],
          nextCursor: null,
          hasMore: false,
          provider: null,
          providerName: null,
          error: `Could not resolve ENS name: ${resolvedAddress}`,
        };
      }
      resolvedAddress = resolved;
    } else if (!isValidEthereumAddress(resolvedAddress)) {
      return {
        nfts: [],
        nextCursor: null,
        hasMore: false,
        provider: null,
        providerName: null,
        error: "Invalid wallet address",
      };
    }

    try {
      let url = `/fetchUserNFTs?wallet=${resolvedAddress}&limit=50`;

      if (cursor) {
        url += `&next=${encodeURIComponent(cursor)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `Failed to fetch NFTs: ${response.status}`,
        );
      }

      const data: NFTApiResponse = await response.json();

      // Filter NFTs to only show supported collections
      const filteredNFTs = data.nfts.filter((nft) =>
        this.supportedCollections.has(nft.contract.toLowerCase()),
      );

      return {
        nfts: filteredNFTs,
        nextCursor: data.next || null,
        hasMore: !!data.next,
        provider: data.provider || null,
        providerName: data.providerName || null,
      };
    } catch (err) {
      console.error("Error fetching NFTs with pagination:", err);
      return {
        nfts: [],
        nextCursor: null,
        hasMore: false,
        provider: null,
        providerName: null,
        error: err instanceof Error ? err.message : "Failed to fetch NFTs",
      };
    }
  }
}