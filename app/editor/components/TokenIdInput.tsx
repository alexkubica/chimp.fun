"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TokenIdInputProps } from "../types";

/**
 * Token ID Input Component
 * Handles token ID input with validation and random selection
 */
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onTokenIdChange(val);
  };

  const handleInputBlur = () => {
    const val = Number(tempTokenId);
    if (!isNaN(val) && val >= minTokenId && val <= maxTokenId) {
      onTokenIdChange(val);
    } else {
      onTokenIdChange(tokenId); // Reset to last valid value
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="tokenId">
        Token ID ({minTokenId}-{maxTokenId})
      </Label>
      <div className="flex gap-2">
        <Input
          id="tokenId"
          placeholder={`${minTokenId}-${maxTokenId}`}
          value={tempTokenId}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button variant="secondary" onClick={onRandomClick}>
          🎲
        </Button>
      </div>
      {errorMessage && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
          {errorMessage}
        </div>
      )}
      {collectionMetadata.description && (
        <div className="text-xs text-muted-foreground">
          {collectionMetadata.description}
        </div>
      )}
    </div>
  );
}
