import { useState, useEffect, useCallback, useMemo } from "react";
import { collectionsMetadata } from "@/consts";
import { NFTFetcher } from "./useNFTFetcher";
import { UserNFT } from "../types";

export function useNFTManager() {
  // Create supported collections set for filtering
  const supportedCollections = useMemo(() => {
    return new Set(
      collectionsMetadata.map((c) => c.contract?.toLowerCase()).filter(Boolean),
    );
  }, []);

  // NFT fetcher instance
  const nftFetcher = useMemo(() => new NFTFetcher(supportedCollections), [supportedCollections]);

  // State for NFT management
  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);

  // Function to fetch ALL NFTs from user's connected wallet (auto-paginate)
  const fetchAllUserNFTs = useCallback(
    async (walletAddress: string) => {
      setNftLoading(true);
      setNftError(null);
      setNfts([]); // Clear previous results
      setIsResolvingENS(true);

      try {
        const result = await nftFetcher.fetchAllNFTs(walletAddress);
        
        if (result.error) {
          setNftError(result.error);
        } else {
          setNfts(result.nfts);
          setProvider(result.provider);
          setProviderName(result.providerName);
          setActiveWallet(walletAddress);
          setHasMore(false); // All NFTs loaded
          setNextCursor(null);
        }
      } catch (err) {
        console.error("Error fetching all user NFTs:", err);
        setNftError(err instanceof Error ? err.message : "Failed to fetch NFTs");
      } finally {
        setNftLoading(false);
        setIsResolvingENS(false);
      }
    },
    [nftFetcher],
  );

  // Function to fetch NFTs from external wallets (manual pagination)
  const fetchWalletNFTs = useCallback(
    async (walletAddress: string, cursor?: string) => {
      setNftLoading(true);
      setNftError(null);
      setIsResolvingENS(true);

      try {
        const result = await nftFetcher.fetchNFTsWithPagination(walletAddress, cursor);
        
        if (result.error) {
          setNftError(result.error);
        } else {
          if (cursor) {
            setNfts((prev) => [...prev, ...result.nfts]);
          } else {
            setNfts(result.nfts);
            setActiveWallet(walletAddress); // Set the active wallet
          }

          setNextCursor(result.nextCursor);
          setHasMore(result.hasMore);
          setProvider(result.provider);
          setProviderName(result.providerName);
        }
      } catch (err) {
        console.error("Error fetching wallet NFTs:", err);
        setNftError(err instanceof Error ? err.message : "Failed to fetch NFTs");
      } finally {
        setNftLoading(false);
        setIsResolvingENS(false);
      }
    },
    [nftFetcher],
  );

  // Function to load more NFTs (pagination)
  const loadMoreNFTs = useCallback(() => {
    if (nextCursor && !nftLoading && activeWallet) {
      fetchWalletNFTs(activeWallet, nextCursor);
    }
  }, [nextCursor, nftLoading, activeWallet, fetchWalletNFTs]);

  // Function to load all remaining NFTs
  const loadAllNFTs = useCallback(async () => {
    if (!activeWallet || nftLoading) return;

    setNftLoading(true);
    try {
      const result = await nftFetcher.fetchAllNFTs(activeWallet);
      
      if (result.error) {
        setNftError(result.error);
      } else {
        setNfts(result.nfts);
        setProvider(result.provider);
        setProviderName(result.providerName);
        setHasMore(false);
        setNextCursor(null);
      }
    } catch (err) {
      console.error("Error loading all NFTs:", err);
      setNftError(err instanceof Error ? err.message : "Failed to load all NFTs");
    } finally {
      setNftLoading(false);
    }
  }, [activeWallet, nftLoading, nftFetcher]);

  // Reset NFT state
  const resetNFTs = useCallback(() => {
    setNfts([]);
    setNftError(null);
    setHasMore(false);
    setNextCursor(null);
    setProvider(null);
    setProviderName(null);
    setActiveWallet(null);
  }, []);

  return useMemo(() => ({
    // State
    nfts,
    nftLoading,
    nftError,
    hasMore,
    nextCursor,
    provider,
    providerName,
    activeWallet,
    isResolvingENS,
    supportedCollections,
    
    // Functions
    fetchAllUserNFTs,
    fetchWalletNFTs,
    loadMoreNFTs,
    loadAllNFTs,
    resetNFTs,
  }), [
    nfts, nftLoading, nftError, hasMore, nextCursor, provider, providerName,
    activeWallet, isResolvingENS, supportedCollections,
    fetchAllUserNFTs, fetchWalletNFTs, loadMoreNFTs, loadAllNFTs, resetNFTs
  ]);
}