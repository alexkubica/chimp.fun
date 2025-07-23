"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedNFTGalleryProps, UserNFT } from "../types";
import { collectionsMetadata } from "@/consts";
import { middleEllipsis } from "@/lib/utils";

/**
 * Unified NFT Gallery Component for displaying NFTs with lazy loading
 * Includes horizontal scrolling gallery with navigation arrows
 */
export function UnifiedNFTGallery({
  onSelectNFT,
  supportedCollections,
  nfts,
  loading,
  error,
  hasMore,
  providerName,
  onLoadMore,
  onLoadAll,
  title,
  subtitle,
  showLoadingState = true,
}: UnifiedNFTGalleryProps) {
  // Lazy load state
  const [visibleCount, setVisibleCount] = useState(100);

  useEffect(() => {
    setVisibleCount(100); // Reset when nfts change
  }, [nfts]);

  const visibleNFTs = nfts.slice(0, visibleCount);
  const canLoadMore = nfts.length > visibleCount;

  if (loading && nfts.length === 0 && showLoadingState) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{title}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="w-full aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{title}</Label>
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <div className="font-medium mb-1">Failed to load NFTs</div>
          <div className="text-xs">{error}</div>
          <div className="text-xs mt-2 opacity-75">
            Try ENS names like &quot;vitalik.eth&quot; or paste a wallet address
          </div>
        </div>
      </div>
    );
  }

  if (nfts.length === 0 && !loading) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{title}</Label>
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md text-center">
          <div>{subtitle || "No supported NFTs found"}</div>
          {providerName && (
            <div className="text-xs mt-1 opacity-75">
              Using {providerName} API
            </div>
          )}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return null; // Don't show anything if no NFTs and not loading
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{title}</Label>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
          )}
        </div>
        {providerName && (
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            via {providerName}
          </div>
        )}
      </div>
      {/* NFT horizontal scroll gallery */}
      <div className="relative">
        {/* Left arrow */}
        {visibleNFTs.length > 2 && (
          <button
            type="button"
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white border rounded-full shadow p-1 flex items-center justify-center"
            style={{ display: "flex" }}
            onClick={() => {
              const el = document.getElementById("nft-scroll-gallery");
              if (el) el.scrollBy({ left: -160, behavior: "smooth" });
            }}
          >
            <span style={{ fontSize: 24, fontWeight: "bold" }}>{"<"}</span>
          </button>
        )}
        {/* Right arrow */}
        {visibleNFTs.length > 2 && (
          <button
            type="button"
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white border rounded-full shadow p-1 flex items-center justify-center"
            style={{ display: "flex" }}
            onClick={() => {
              const el = document.getElementById("nft-scroll-gallery");
              if (el) el.scrollBy({ left: 160, behavior: "smooth" });
            }}
          >
            <span style={{ fontSize: 24, fontWeight: "bold" }}>{">"}</span>
          </button>
        )}
        <div
          id="nft-scroll-gallery"
          className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 py-2 px-1"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {visibleNFTs.map((nft) => {
            // Find collection name for this NFT
            const collectionObj = collectionsMetadata.find(
              (c) => c.contract?.toLowerCase() === nft.contract.toLowerCase(),
            );
            const collectionName =
              collectionObj?.name || nft.collection || "Unknown";
            const truncatedCollection = middleEllipsis(collectionName, 32);
            return (
              <button
                key={`${nft.contract}-${nft.identifier}`}
                onClick={() =>
                  onSelectNFT(nft.contract, nft.identifier, nft.image_url || "")
                }
                className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors bg-muted/50 flex-shrink-0"
                style={{
                  width: 132,
                  height: 132,
                  scrollSnapAlign: "start",
                  display: "block",
                }}
              >
                {/* Collection name at top, with tooltip */}
                <div className="absolute top-0 left-0 w-full px-1 pt-1 z-10 flex flex-col items-center pointer-events-none">
                  <div
                    className="max-w-full text-xs text-white bg-black/70 rounded px-1 py-0.5 leading-tight font-semibold text-center line-clamp-2 middle-ellipsis-tooltip"
                    style={{
                      WebkitLineClamp: 2,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-all",
                      cursor: "pointer",
                    }}
                    tabIndex={0}
                  >
                    {truncatedCollection}
                    <span className="middle-ellipsis-tooltip-content">
                      {collectionName}
                    </span>
                  </div>
                </div>
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
                {/* NFT ID at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex flex-col items-center">
                  <div className="text-xs text-white/80 font-mono">
                    ID: {nft.identifier}
                  </div>
                </div>
                {/* OpenSea link */}
                <div className="absolute top-6 right-1 z-10">
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
      </div>
      {(hasMore || canLoadMore) && (
        <div className="flex gap-2">
          {canLoadMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((c) => c + 100)}
              disabled={loading}
              className="flex-1"
            >
              {loading
                ? "Loading..."
                : `Load More (${visibleCount + 1}-${Math.min(visibleCount + 100, nfts.length)} of ${nfts.length})`}
            </Button>
          )}
          {onLoadAll && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadAll}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Loading..." : "Load All"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
