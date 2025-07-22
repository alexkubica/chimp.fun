"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { NFTPaginationProps } from "../types";
import { middleEllipsis } from "../utils";
import { collectionsMetadata } from "@/consts";
import {
  AiOutlineLeft,
  AiOutlineRight,
  AiOutlineDoubleLeft,
  AiOutlineDoubleRight,
} from "react-icons/ai";

export function NFTPagination({
  nfts,
  itemsPerPage,
  currentPage,
  onPageChange,
  onSelectNFT,
  supportedCollections,
  loading = false,
  sources = {},
}: NFTPaginationProps) {
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(nfts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, nfts.length);
    const currentNFTs = nfts.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      currentNFTs,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }, [nfts, itemsPerPage, currentPage]);

  const sourcesSummary = useMemo(() => {
    const summary = Object.entries(sources).map(([address, data]) => ({
      address,
      ...data,
    }));
    return summary.slice(0, 3); // Show only first 3 sources
  }, [sources]);

  if (loading && nfts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label>All NFTs</Label>
          <div className="text-sm text-muted-foreground">Loading NFTs...</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label>All NFTs</Label>
          <div className="text-sm text-muted-foreground">
            No supported NFTs found in watched wallets
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/50">
          <div>Add wallets to your watchlist to see their NFTs here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and sources */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Label>All NFTs</Label>
          <div className="text-sm text-muted-foreground">
            {nfts.length} NFTs found
            {Object.keys(sources).length > 0 && (
              <span className="ml-1">
                from {Object.keys(sources).length} wallet
                {Object.keys(sources).length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {sourcesSummary.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {sourcesSummary.map((source, index) => (
                <span key={source.address}>
                  {index > 0 && ", "}
                  {source.label} ({source.count})
                </span>
              ))}
              {Object.keys(sources).length > 3 && (
                <span>, and {Object.keys(sources).length - 3} more</span>
              )}
            </div>
          )}
        </div>

        {/* Page info */}
        {paginationData.totalPages > 1 && (
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {paginationData.totalPages}
          </div>
        )}
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {paginationData.currentNFTs.map((nft) => {
          const collectionObj = collectionsMetadata.find(
            (c) => c.contract?.toLowerCase() === nft.contract.toLowerCase(),
          );
          const collectionName =
            collectionObj?.name || nft.collection || "Unknown";

          return (
            <button
              key={`${nft.contract}-${nft.identifier}`}
              onClick={() =>
                onSelectNFT(nft.contract, nft.identifier, nft.image_url || "")
              }
              className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors bg-muted/50 aspect-square"
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

              {/* Collection name at top */}
              <div className="absolute top-1 left-1 right-1">
                <div className="text-xs text-white bg-black/70 rounded px-1 py-0.5 leading-tight font-semibold text-center truncate">
                  {middleEllipsis(collectionName, 14)}
                </div>
              </div>

              {/* Token ID at bottom */}
              <div className="absolute bottom-1 left-1 right-1">
                <div className="text-xs text-white bg-black/70 rounded px-1 py-0.5 leading-tight font-mono text-center">
                  #{nft.identifier}
                </div>
              </div>

              {/* OpenSea link */}
              <div className="absolute top-1 right-1 z-10">
                {(() => {
                  const collectionObj = collectionsMetadata.find(
                    (c) =>
                      c.contract?.toLowerCase() === nft.contract.toLowerCase(),
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

      {/* Pagination Controls */}
      {paginationData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginationData.startIndex + 1}-{paginationData.endIndex} of{" "}
            {nfts.length} NFTs
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={!paginationData.hasPrev}
              title="First page"
            >
              <AiOutlineDoubleLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!paginationData.hasPrev}
              title="Previous page"
            >
              <AiOutlineLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, paginationData.totalPages) })
                .map((_, i) => {
                  let pageNum;
                  if (paginationData.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= paginationData.totalPages - 2) {
                    pageNum = paginationData.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return pageNum;
                })
                .map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!paginationData.hasNext}
              title="Next page"
            >
              <AiOutlineRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(paginationData.totalPages)}
              disabled={!paginationData.hasNext}
              title="Last page"
            >
              <AiOutlineDoubleRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-muted-foreground">
          Loading more NFTs...
        </div>
      )}
    </div>
  );
}
