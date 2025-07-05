"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TokenIdInputProps } from "../types";

export function TokenIdInput({
  tokenId,
  tempTokenId,
  minTokenId,
  maxTokenId,
  errorMessage,
  onTokenIdChange,
  onRandomClick,
  collectionMetadata,
}: TokenIdInputProps) {
  
  function handleTokenIdInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const tokenIdNum = Number(value);
    
    if (
      !isNaN(tokenIdNum) &&
      tokenIdNum >= minTokenId &&
      tokenIdNum <= maxTokenId
    ) {
      onTokenIdChange(tokenIdNum);
    } else {
      onTokenIdChange(value); // Keep the temp value for display
    }
  }

  // Generate OpenSea link
  const generateOpenSeaLink = () => {
    const contract = collectionMetadata.contract;
    const chain = collectionMetadata.chain;
    const tokenIdNum = Number(tempTokenId);
    const validTokenId =
      !isNaN(tokenIdNum) &&
      tokenIdNum >= minTokenId &&
      tokenIdNum <= maxTokenId;
    
    let openseaChainSegment = "";
    if (chain === "ape") {
      openseaChainSegment = "ape_chain";
    } else if (chain === "polygon") {
      openseaChainSegment = "polygon";
    } else {
      openseaChainSegment = "ethereum";
    }
    
    if (validTokenId && contract && openseaChainSegment) {
      return `https://opensea.io/assets/${openseaChainSegment}/${contract}/${tokenIdNum}`;
    }
    return null;
  };

  const openSeaLink = generateOpenSeaLink();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="tokenId">
        Token ID ({minTokenId}-{maxTokenId})
      </Label>
      <div className="flex gap-2">
        <Input
          id="tokenId"
          min={minTokenId}
          max={maxTokenId}
          value={tempTokenId}
          onChange={handleTokenIdInput}
          type="number"
          className="flex-1 min-w-0"
          style={{ minWidth: 0 }}
        />
        <Button variant="secondary" onClick={onRandomClick}>
          🎲
        </Button>
      </div>
      {errorMessage && (
        <div className="text-destructive text-sm mt-1">
          {errorMessage}
        </div>
      )}
      {/* OpenSea link */}
      {openSeaLink && (
        <a
          href={openSeaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm mt-1"
          style={{ wordBreak: "break-all" }}
        >
          View on OpenSea
        </a>
      )}
    </div>
  );
}