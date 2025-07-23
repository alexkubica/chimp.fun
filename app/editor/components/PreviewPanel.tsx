"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton, Spinner } from "@/components/ui/skeleton";
import {
  AiOutlineCopy,
  AiOutlineDownload,
  AiOutlineLink,
} from "react-icons/ai";
import { ReactionOverlayDraggable } from "./ReactionOverlayDraggable";
import { PreviewPanelProps } from "../types";
import { reactionsMap } from "@/consts";

/**
 * Preview Panel Component
 * Displays the NFT preview with reaction overlay and controls
 */
export function PreviewPanel({
  loading,
  isFirstRender,
  finalResult,
  isGIF,
  playAnimation,
  staticGifFrameUrl,
  x,
  y,
  scale,
  overlayNumber,
  onOverlayChange,
  dragging,
  setDragging,
  resizing,
  setResizing,
  onDragEnd,
  onResizeEnd,
  onDownload,
  onCopy,
  copyStatus,
  showGifCopyModal,
  onGifCopyConfirm,
  onGifCopyCancel,
}: PreviewPanelProps) {
  // Get reaction overlay image URL
  const getReactionImageUrl = () => {
    const reaction = reactionsMap[overlayNumber - 1];
    if (reaction?.isCustom) {
      // For custom reactions, return a placeholder or handle differently
      return `/reactions/${reaction.filename}`;
    }
    return `/reactions/${reaction.filename}`;
  };

  const getImageSrc = () => {
    if (isGIF && !playAnimation && staticGifFrameUrl) {
      return staticGifFrameUrl;
    }
    return finalResult || "";
  };

  const getImageAlt = () => {
    if (isGIF && !playAnimation && staticGifFrameUrl) {
      return "Preview (static frame)";
    }
    return "Preview";
  };

  const getImageStyle = () => {
    const baseStyle = {
      background: "transparent",
    };

    if (loading) {
      return {
        ...baseStyle,
        filter: "brightness(0.7) grayscale(0.3)",
      };
    }

    return baseStyle;
  };

  return (
    <div className="flex flex-col items-center w-full p-4 border rounded-lg bg-muted/50 mt-2">
      {/* Preview Area */}
      <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
        {loading ? (
          isFirstRender ? (
            <Skeleton className="w-full h-full rounded-lg" />
          ) : finalResult ? (
            <div className="relative w-full h-full">
              <img
                src={getImageSrc()}
                alt={getImageAlt()}
                className="object-contain w-full h-full rounded-lg opacity-80"
                style={getImageStyle()}
              />
              {/* Draggable overlay for reaction, always shown if finalResult */}
              <ReactionOverlayDraggable
                x={x}
                y={y}
                scale={scale}
                imageUrl={getReactionImageUrl()}
                onChange={onOverlayChange}
                containerSize={320}
                setDragging={setDragging}
                dragging={dragging}
                setResizing={setResizing}
                resizing={resizing}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
                disabled={loading}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </div>
            </div>
          ) : (
            <Skeleton className="w-full h-full rounded-lg" />
          )
        ) : (
          finalResult && (
            <>
              <img
                src={getImageSrc()}
                alt={getImageAlt()}
                className="object-contain w-full h-full rounded-lg"
                style={getImageStyle()}
              />
              {/* Draggable overlay for reaction */}
              <ReactionOverlayDraggable
                x={x}
                y={y}
                scale={scale}
                imageUrl={getReactionImageUrl()}
                onChange={onOverlayChange}
                containerSize={320}
                setDragging={setDragging}
                dragging={dragging}
                setResizing={setResizing}
                resizing={resizing}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
                disabled={loading}
              />
            </>
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-row gap-2 mt-2 justify-center w-full">
        <Button size="sm" onClick={onDownload} aria-label="Download">
          <AiOutlineDownload />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onCopy}
          aria-label="Copy"
        >
          <AiOutlineCopy />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {}} // This should be passed as a prop
          aria-label="Share Template"
        >
          <AiOutlineLink />
        </Button>
      </div>

      {/* Copy Status */}
      {copyStatus && (
        <div className="mt-2 text-sm text-center text-muted-foreground">
          {copyStatus}
        </div>
      )}

      {/* GIF Copy Modal */}
      {showGifCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">
              Copy GIF as Static Image?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Animated GIFs cannot be copied to clipboard. Would you like to
              copy the first frame as a static image instead?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onGifCopyCancel}>
                Cancel
              </Button>
              <Button onClick={onGifCopyConfirm}>Copy Static Image</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
