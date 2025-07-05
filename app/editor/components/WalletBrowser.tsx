"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WalletBrowserProps } from "../types";
import { UnifiedNFTGallery } from "./UnifiedNFTGallery";
import { middleEllipsis } from "../utils";

export function WalletBrowser({
  walletInput,
  onWalletInputChange,
  onWalletLoad,
  onPasteFromClipboard,
  isLoading,
  isResolvingENS,
  nfts,
  error,
  hasMore,
  providerName,
  onLoadMore,
  onLoadAll,
  onSelectNFT,
  supportedCollections,
  activeWallet,
  primaryWalletAddress,
}: WalletBrowserProps) {
  
  const handleWalletInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onWalletLoad();
    }
  };

  const getGalleryInfo = () => {
    if (!activeWallet || activeWallet === primaryWalletAddress) {
      return {
        title: "Your NFTs",
        subtitle: nfts.length > 0 ? `${nfts.length} NFTs found in your connected wallet` : undefined,
      };
    }
    
    const title = `Browse ${middleEllipsis(activeWallet, 20)}`;
    const subtitle = nfts.length > 0 ? `${nfts.length} NFTs found` : undefined;
    
    return { title, subtitle };
  };

  const galleryInfo = getGalleryInfo();

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="walletInput">
          Enter wallet address or ENS name
        </Label>
        <div className="flex gap-2">
          <Input
            id="walletInput"
            placeholder="0x... or vitalik.eth"
            value={walletInput}
            onChange={(e) => onWalletInputChange(e.target.value)}
            className="flex-1 min-w-0 font-mono text-sm"
            onKeyDown={handleWalletInputKeyDown}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onPasteFromClipboard}
            title="Paste from clipboard"
          >
            📋
          </Button>
          <Button
            variant="outline"
            onClick={onWalletLoad}
            disabled={isLoading || isResolvingENS || !walletInput.trim()}
          >
            {isLoading || isResolvingENS ? "Loading..." : "Load NFTs"}
          </Button>
        </div>
      </div>

      {/* External Wallet NFT Gallery */}
      {activeWallet &&
        activeWallet !== primaryWalletAddress &&
        (nfts.length > 0 || isLoading || error) && (
          <UnifiedNFTGallery
            onSelectNFT={onSelectNFT}
            supportedCollections={supportedCollections}
            nfts={nfts}
            loading={isLoading}
            error={error}
            hasMore={hasMore}
            providerName={providerName}
            onLoadMore={onLoadMore}
            onLoadAll={onLoadAll}
            title={galleryInfo.title}
            subtitle={galleryInfo.subtitle}
            showLoadingState={true}
          />
        )}
    </div>
  );
}