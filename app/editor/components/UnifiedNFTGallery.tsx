"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedNFTGalleryProps } from "../types";
import { middleEllipsis } from "../utils";

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
  if (error) {
    return (
      <div className="text-center text-red-500 p-4 border rounded-md">
        {error}
      </div>
    );
  }

  if (loading && nfts.length === 0 && showLoadingState) {
    return (
      <div className="p-4 border rounded-md">
        <div className="text-center mb-4">
          <div className="text-sm font-medium mb-2">{title}</div>
          <div className="text-xs text-muted-foreground">
            Loading NFTs...
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (nfts.length === 0 && !loading) {
    return (
      <div className="text-center text-muted-foreground p-4 border rounded-md">
        No supported NFTs found in this wallet
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md">
      <div className="text-center mb-4">
        <div className="text-sm font-medium mb-2">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
        {providerName && (
          <div className="text-xs text-muted-foreground">
            Powered by {providerName}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        {nfts.map((nft) => (
          <div
            key={nft.identifier}
            className="aspect-square rounded-md border cursor-pointer hover:shadow-md transition-shadow bg-muted/50 flex items-center justify-center overflow-hidden"
            onClick={() => onSelectNFT(nft.contract, nft.identifier, nft.image_url || "")}
          >
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={nft.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="text-xs text-muted-foreground text-center p-2">
                {nft.name || "No Image"}
              </div>
            )}
          </div>
        ))}
        
        {/* Loading skeletons for pagination */}
        {loading && nfts.length > 0 && (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`loading-${index}`} className="aspect-square rounded-md" />
          ))
        )}
      </div>

      {/* Pagination controls */}
      {(hasMore || onLoadAll) && (
        <div className="flex gap-2 justify-center">
          {hasMore && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          )}
          {onLoadAll && hasMore && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLoadAll}
              disabled={loading}
            >
              Load All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}