"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WatchedWallet,
  WalletNFTData,
  UserNFT,
  UseWatchlistResult,
} from "../types";
import { middleEllipsis } from "../utils";
import { collectionsMetadata } from "@/consts";
import {
  AiOutlinePlus,
  AiOutlineClose,
  AiOutlineEdit,
  AiOutlineCheck,
  AiOutlineReload,
  AiOutlineDelete,
} from "react-icons/ai";
import { debounce } from "lodash";

interface WatchlistManagerProps {
  watchlist: UseWatchlistResult;
  supportedCollections: Set<string>;
  onSelectNFT: (
    contract: string,
    tokenId: string,
    imageUrl: string,
    walletAddress: string,
    walletLabel: string,
  ) => void;
  isResolvingENS?: boolean;
}

interface WalletCardProps {
  wallet: WatchedWallet;
  data: WalletNFTData;
  onRemove: (address: string) => void;
  onUpdateLabel: (address: string, label: string) => void;
  onLoadNFTs: (address: string) => void;
  onRefresh: (address: string) => void;
  onSelectNFT: (
    contract: string,
    tokenId: string,
    imageUrl: string,
    walletAddress: string,
    walletLabel: string,
  ) => void;
  supportedCollections: Set<string>;
}

function WalletCard({
  wallet,
  data,
  onRemove,
  onUpdateLabel,
  onLoadNFTs,
  onRefresh,
  onSelectNFT,
  supportedCollections,
}: WalletCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(wallet.label || "");
  const [showAllNFTs, setShowAllNFTs] = useState(false);

  const handleSaveLabel = () => {
    if (editLabel.trim() !== wallet.label) {
      onUpdateLabel(wallet.address, editLabel.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditLabel(wallet.label || "");
    setIsEditing(false);
  };

  const displayedNFTs = showAllNFTs ? data.nfts : data.nfts.slice(0, 6);
  const hasMoreNFTs = data.nfts.length > 6;

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Wallet Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="text-sm"
                placeholder="Wallet label"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveLabel();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveLabel}>
                <AiOutlineCheck className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <AiOutlineClose className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {wallet.label}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {wallet.isEns && wallet.ensName
                    ? wallet.ensName
                    : middleEllipsis(wallet.address, 20)}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
              >
                <AiOutlineEdit className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRefresh(wallet.address)}
            disabled={data.loading}
            title="Refresh NFTs"
          >
            <AiOutlineReload
              className={`h-4 w-4 ${data.loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(wallet.address)}
            title="Remove from watchlist"
          >
            <AiOutlineDelete className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* NFT Count and Load Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {data.loading ? (
            "Loading NFTs..."
          ) : data.error ? (
            <span className="text-destructive">{data.error}</span>
          ) : data.nfts.length > 0 ? (
            `${data.nfts.length} NFTs found`
          ) : data.lastFetched ? (
            "No supported NFTs found"
          ) : (
            "Click to load NFTs"
          )}
        </div>
        {!data.lastFetched && !data.loading && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onLoadNFTs(wallet.address)}
          >
            Load NFTs
          </Button>
        )}
      </div>

      {/* NFT Grid */}
      {data.loading && !data.lastFetched ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : data.nfts.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {displayedNFTs.map((nft) => {
              const collectionObj = collectionsMetadata.find(
                (c) => c.contract?.toLowerCase() === nft.contract.toLowerCase(),
              );
              const collectionName =
                collectionObj?.name || nft.collection || "Unknown";

              return (
                <button
                  key={`${nft.contract}-${nft.identifier}`}
                  onClick={() =>
                    onSelectNFT(
                      nft.contract,
                      nft.identifier,
                      nft.image_url || "",
                      wallet.address,
                      wallet.label || "",
                    )
                  }
                  className="group relative rounded-md overflow-hidden border hover:border-primary transition-colors bg-muted/50 aspect-square"
                >
                  {nft.image_url ? (
                    <img
                      src={nft.image_url}
                      alt={nft.name || `NFT ${nft.identifier}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* Collection and Token ID overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                    <div className="text-xs text-white font-semibold truncate">
                      {middleEllipsis(collectionName, 12)}
                    </div>
                    <div className="text-xs text-white/80 font-mono">
                      #{nft.identifier}
                    </div>
                  </div>

                  {/* OpenSea link */}
                  <div className="absolute top-1 right-1 z-10">
                    {(() => {
                      const collectionObj = collectionsMetadata.find(
                        (c) =>
                          c.contract?.toLowerCase() ===
                          nft.contract.toLowerCase(),
                      );
                      const chain = collectionObj?.chain || "ethereum";
                      let openseaChainSegment = "";
                      if (chain === "ape") {
                        openseaChainSegment = "ape_chain";
                      } else if (chain === "polygon") {
                        openseaChainSegment = "polygon";
                      } else {
                        openseaChainSegment = "ethereum";
                      }
                      const url = `https://opensea.io/assets/${openseaChainSegment}/${nft.contract}/${nft.identifier}`;
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-black/70 hover:bg-black/90 text-white text-xs px-1.5 py-0.5 rounded pointer-events-auto transition-colors"
                          title="View NFT on OpenSea"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🌊
                        </a>
                      );
                    })()}
                  </div>
                </button>
              );
            })}
          </div>
          {hasMoreNFTs && (
            <div className="mt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNFTs(!showAllNFTs)}
              >
                {showAllNFTs
                  ? "Show Less"
                  : `Show All ${data.nfts.length} NFTs`}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export function WatchlistManager({
  watchlist,
  supportedCollections,
  onSelectNFT,
  isResolvingENS = false,
}: WatchlistManagerProps) {
  const [walletInput, setWalletInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Debounced wallet input validation
  const debouncedWalletValidation = useMemo(
    () =>
      debounce((input: string) => {
        // Here you could add validation logic, ENS resolution, etc.
        console.log("Validating wallet input:", input);
      }, 300),
    [],
  );

  // Handle wallet input changes with debouncing
  const handleWalletInputChange = useCallback(
    (value: string) => {
      setWalletInput(value);
      debouncedWalletValidation(value);
    },
    [debouncedWalletValidation],
  );

  const handleAddWallet = useCallback(async () => {
    if (!walletInput.trim()) return;

    setIsAdding(true);
    try {
      const success = await watchlist.addWallet(
        walletInput.trim(),
        labelInput.trim() || undefined,
      );
      if (success) {
        setWalletInput("");
        setLabelInput("");
      } else {
        // Handle error - wallet might already exist or be invalid
      }
    } catch (error) {
      console.error("Failed to add wallet:", error);
    } finally {
      setIsAdding(false);
    }
  }, [walletInput, labelInput, watchlist]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedWalletValidation.cancel();
    };
  }, [debouncedWalletValidation]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setWalletInput(text.trim());
      }
    } catch (err) {
      console.error("Failed to read from clipboard:", err);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAdding && walletInput.trim()) {
      handleAddWallet();
    }
  };

  if (watchlist.watchedWallets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label>Wallet Watchlist</Label>
          <div className="text-sm text-muted-foreground">
            Add wallets to your watchlist to quickly browse their NFTs
          </div>
        </div>

        {/* Add Wallet Form */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="space-y-3">
            <div>
              <Label htmlFor="walletAddress">Wallet Address or ENS</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="walletAddress"
                  placeholder="0x... or vitalik.eth"
                  value={walletInput}
                  onChange={(e) => handleWalletInputChange(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  onKeyDown={handleKeyDown}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePasteFromClipboard}
                  title="Paste from clipboard"
                >
                  📋
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="walletLabel">Label (optional)</Label>
              <Input
                id="walletLabel"
                placeholder="My favorite collection holder"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                className="mt-1"
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button
              onClick={handleAddWallet}
              disabled={!walletInput.trim() || isAdding || isResolvingENS}
              className="w-full"
            >
              {isAdding || isResolvingENS ? (
                "Adding..."
              ) : (
                <>
                  <AiOutlinePlus className="mr-2 h-4 w-4" />
                  Add to Watchlist
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Wallet Watchlist</Label>
          <div className="text-sm text-muted-foreground">
            {watchlist.watchedWallets.length} wallet
            {watchlist.watchedWallets.length !== 1 ? "s" : ""} watched
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (
              confirm("Are you sure you want to clear all watched wallets?")
            ) {
              watchlist.clearWatchlist();
            }
          }}
        >
          Clear All
        </Button>
      </div>

      {/* Add Wallet Form */}
      <div className="border rounded-lg p-3 bg-muted/50">
        <div className="flex gap-2">
          <Input
            placeholder="0x... or vitalik.eth"
            value={walletInput}
            onChange={(e) => handleWalletInputChange(e.target.value)}
            className="flex-1 font-mono text-sm"
            onKeyDown={handleKeyDown}
          />
          <Input
            placeholder="Label"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            className="w-32"
            onKeyDown={handleKeyDown}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handlePasteFromClipboard}
            title="Paste from clipboard"
          >
            📋
          </Button>
          <Button
            onClick={handleAddWallet}
            disabled={!walletInput.trim() || isAdding || isResolvingENS}
          >
            {isAdding || isResolvingENS ? "..." : <AiOutlinePlus />}
          </Button>
        </div>
      </div>

      {/* Wallet Cards */}
      <div className="grid gap-4">
        {watchlist.watchedWallets.map((wallet) => {
          const data = watchlist.walletData.get(wallet.address);
          if (!data) return null;

          return (
            <WalletCard
              key={wallet.address}
              wallet={wallet}
              data={data}
              onRemove={watchlist.removeWallet}
              onUpdateLabel={watchlist.updateWalletLabel}
              onLoadNFTs={watchlist.loadWalletNFTs}
              onRefresh={watchlist.refreshWallet}
              onSelectNFT={onSelectNFT}
              supportedCollections={supportedCollections}
            />
          );
        })}
      </div>
    </div>
  );
}
