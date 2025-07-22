import {
  UserNFT,
  NFTApiResponse,
  WatchedWallet,
  WalletNFTData,
  UseWatchlistResult,
} from "../types";
import {
  isValidEthereumAddress,
  looksLikeENS,
  getWatchedWallets,
  saveWatchedWallets,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistLabel,
  clearWatchlist as clearWatchlistStorage,
} from "../utils";
import { useState, useEffect, useCallback, useMemo } from "react";

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

/**
 * Custom hook for managing watchlist functionality
 */
export function useWatchlist(
  supportedCollections: Set<string>,
): UseWatchlistResult {
  const [watchedWallets, setWatchedWallets] = useState<WatchedWallet[]>([]);
  const [walletData, setWalletData] = useState<Map<string, WalletNFTData>>(
    new Map(),
  );

  const nftFetcher = useMemo(
    () => new NFTFetcher(supportedCollections),
    [supportedCollections],
  );

  // Load watched wallets from localStorage on mount
  useEffect(() => {
    const savedWallets = getWatchedWallets();
    setWatchedWallets(savedWallets);

    // Initialize wallet data map
    const initialWalletData = new Map<string, WalletNFTData>();
    savedWallets.forEach((wallet) => {
      initialWalletData.set(wallet.address, {
        wallet,
        nfts: [],
        loading: false,
        error: null,
        hasMore: false,
        nextCursor: null,
        provider: null,
        providerName: null,
      });
    });
    setWalletData(initialWalletData);
  }, []);

  // Add wallet to watchlist
  const addWallet = useCallback(
    async (
      address: string,
      label?: string,
      ensName?: string,
    ): Promise<boolean> => {
      try {
        // Resolve ENS if needed
        let resolvedAddress = address.trim();
        let finalEnsName = ensName;

        if (looksLikeENS(resolvedAddress)) {
          const resolved = await nftFetcher.resolveENS(resolvedAddress);
          if (!resolved) {
            return false;
          }
          finalEnsName = resolvedAddress;
          resolvedAddress = resolved;
        } else if (!isValidEthereumAddress(resolvedAddress)) {
          return false;
        }

        const success = addToWatchlist(resolvedAddress, label, finalEnsName);
        if (success) {
          const newWallet: WatchedWallet = {
            address: resolvedAddress.toLowerCase(),
            label:
              label ||
              finalEnsName ||
              `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`,
            addedAt: Date.now(),
            isEns: !!finalEnsName,
            ensName: finalEnsName,
          };

          setWatchedWallets((prev) => [newWallet, ...prev]);
          setWalletData((prev) => {
            const newData = new Map(prev);
            newData.set(resolvedAddress.toLowerCase(), {
              wallet: newWallet,
              nfts: [],
              loading: false,
              error: null,
              hasMore: false,
              nextCursor: null,
              provider: null,
              providerName: null,
            });
            return newData;
          });
        }
        return success;
      } catch (error) {
        console.error("Failed to add wallet:", error);
        return false;
      }
    },
    [nftFetcher],
  );

  // Remove wallet from watchlist
  const removeWallet = useCallback((address: string): boolean => {
    const success = removeFromWatchlist(address);
    if (success) {
      const normalizedAddress = address.toLowerCase();
      setWatchedWallets((prev) =>
        prev.filter((w) => w.address !== normalizedAddress),
      );
      setWalletData((prev) => {
        const newData = new Map(prev);
        newData.delete(normalizedAddress);
        return newData;
      });
    }
    return success;
  }, []);

  // Update wallet label
  const updateWalletLabel = useCallback(
    (address: string, label: string): boolean => {
      const success = updateWatchlistLabel(address, label);
      if (success) {
        const normalizedAddress = address.toLowerCase();
        setWatchedWallets((prev) =>
          prev.map((w) =>
            w.address === normalizedAddress ? { ...w, label } : w,
          ),
        );
        setWalletData((prev) => {
          const newData = new Map(prev);
          const existing = newData.get(normalizedAddress);
          if (existing) {
            newData.set(normalizedAddress, {
              ...existing,
              wallet: { ...existing.wallet, label },
            });
          }
          return newData;
        });
      }
      return success;
    },
    [],
  );

  // Load NFTs for a specific wallet
  const loadWalletNFTs = useCallback(
    async (address: string): Promise<void> => {
      const normalizedAddress = address.toLowerCase();

      setWalletData((prev) => {
        const newData = new Map(prev);
        const existing = newData.get(normalizedAddress);
        if (existing) {
          newData.set(normalizedAddress, {
            ...existing,
            loading: true,
            error: null,
          });
        }
        return newData;
      });

      try {
        const result = await nftFetcher.fetchAllNFTs(address);

        setWalletData((prev) => {
          const newData = new Map(prev);
          const existing = newData.get(normalizedAddress);
          if (existing) {
            newData.set(normalizedAddress, {
              ...existing,
              loading: false,
              nfts: result.nfts,
              error: result.error || null,
              provider: result.provider,
              providerName: result.providerName,
              hasMore: false, // We fetched all NFTs
              nextCursor: null,
              lastFetched: Date.now(),
            });
          }
          return newData;
        });
      } catch (error) {
        setWalletData((prev) => {
          const newData = new Map(prev);
          const existing = newData.get(normalizedAddress);
          if (existing) {
            newData.set(normalizedAddress, {
              ...existing,
              loading: false,
              error:
                error instanceof Error ? error.message : "Failed to fetch NFTs",
            });
          }
          return newData;
        });
      }
    },
    [nftFetcher],
  );

  // Load more NFTs for pagination (if needed)
  const loadMoreNFTs = useCallback(
    async (address: string): Promise<void> => {
      const normalizedAddress = address.toLowerCase();
      const existingData = walletData.get(normalizedAddress);

      if (!existingData || !existingData.hasMore || existingData.loading) {
        return;
      }

      setWalletData((prev) => {
        const newData = new Map(prev);
        const existing = newData.get(normalizedAddress);
        if (existing) {
          newData.set(normalizedAddress, { ...existing, loading: true });
        }
        return newData;
      });

      try {
        const result = await nftFetcher.fetchNFTsWithPagination(
          address,
          existingData.nextCursor || undefined,
        );

        setWalletData((prev) => {
          const newData = new Map(prev);
          const existing = newData.get(normalizedAddress);
          if (existing) {
            newData.set(normalizedAddress, {
              ...existing,
              loading: false,
              nfts: [...existing.nfts, ...result.nfts],
              error: result.error || null,
              hasMore: result.hasMore,
              nextCursor: result.nextCursor,
              lastFetched: Date.now(),
            });
          }
          return newData;
        });
      } catch (error) {
        setWalletData((prev) => {
          const newData = new Map(prev);
          const existing = newData.get(normalizedAddress);
          if (existing) {
            newData.set(normalizedAddress, {
              ...existing,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to load more NFTs",
            });
          }
          return newData;
        });
      }
    },
    [walletData, nftFetcher],
  );

  // Clear watchlist
  const clearWatchlist = useCallback(() => {
    clearWatchlistStorage();
    setWatchedWallets([]);
    setWalletData(new Map());
  }, []);

  // Refresh wallet NFTs
  const refreshWallet = useCallback(
    async (address: string): Promise<void> => {
      await loadWalletNFTs(address);
    },
    [loadWalletNFTs],
  );

  // Check if wallet is in watchlist
  const isInWatchlist = useCallback(
    (address: string): boolean => {
      const normalizedAddress = address.toLowerCase();
      return watchedWallets.some((w) => w.address === normalizedAddress);
    },
    [watchedWallets],
  );

  return {
    watchedWallets,
    walletData,
    addWallet,
    removeWallet,
    updateWalletLabel,
    loadWalletNFTs,
    loadMoreNFTs,
    clearWatchlist,
    refreshWallet,
    isInWatchlist,
  };
}
