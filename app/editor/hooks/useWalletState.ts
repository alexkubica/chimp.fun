import { useState, useCallback } from 'react';
import { UserNFT } from '../types';

export interface WalletState {
  walletInput: string;
  activeWallet: string | null;
  nfts: UserNFT[];
  nftLoading: boolean;
  nftError: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  provider: string | null;
  providerName: string | null;
  isResolvingENS: boolean;
  activeTab: "connected" | "input";
}

export const useWalletState = () => {
  const [state, setState] = useState<WalletState>({
    walletInput: "",
    activeWallet: null,
    nfts: [],
    nftLoading: false,
    nftError: null,
    hasMore: false,
    nextCursor: null,
    provider: null,
    providerName: null,
    isResolvingENS: false,
    activeTab: "connected",
  });

  const updateWalletState = useCallback((updates: Partial<WalletState>) => {
    setState((prev: WalletState) => ({ ...prev, ...updates }));
  }, []);

  const setNFTLoading = useCallback((loading: boolean) => {
    setState((prev: WalletState) => ({ ...prev, nftLoading: loading }));
  }, []);

  const setNFTError = useCallback((error: string | null) => {
    setState((prev: WalletState) => ({ ...prev, nftError: error }));
  }, []);

  const setActiveWallet = useCallback((wallet: string | null) => {
    setState((prev: WalletState) => ({ ...prev, activeWallet: wallet }));
  }, []);

  const clearNFTs = useCallback(() => {
    setState((prev: WalletState) => ({ ...prev, nfts: [], hasMore: false, nextCursor: null }));
  }, []);

  const addNFTs = useCallback((newNFTs: UserNFT[], hasMore: boolean, nextCursor: string | null) => {
    setState((prev: WalletState) => ({
      ...prev,
      nfts: [...prev.nfts, ...newNFTs],
      hasMore,
      nextCursor,
    }));
  }, []);

  const setNFTs = useCallback((nfts: UserNFT[], hasMore: boolean, nextCursor: string | null) => {
    setState((prev: WalletState) => ({
      ...prev,
      nfts,
      hasMore,
      nextCursor,
    }));
  }, []);

  return {
    state,
    updateWalletState,
    setNFTLoading,
    setNFTError,
    setActiveWallet,
    clearNFTs,
    addNFTs,
    setNFTs,
  };
};