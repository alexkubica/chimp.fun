"use client";

import { Button } from "@/components/ui/button";
import { Skeleton, Spinner } from "@/components/ui/skeleton";
import { PreviewPanelProps } from "../types";
import { ReactionOverlayDraggable } from "./ReactionOverlayDraggable";
import { reactionsMap } from "@/consts";
import { dataURLtoBlob } from "../utils";
import {
  AiOutlineCopy,
  AiOutlineDownload,
  AiOutlineLink,
} from "react-icons/ai";

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
  
  function handleCopy() {
    if (isGIF && !playAnimation && staticGifFrameUrl) {
      // Copy PNG from staticGifFrameUrl
      const blob = dataURLtoBlob(staticGifFrameUrl);
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blob })])
        .then(() => {
          // Handle success - this will be managed by parent
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          // Handle error - this will be managed by parent
        });
      return;
    }
    onCopy();
  }

  const copyUrlToClipboard = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      // Success handled by parent
    } catch (err) {
      console.error("Failed to copy URL:", err);
      // Error handled by parent
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50 mt-2 w-full">
      <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
        {loading ? (
          isFirstRender ? (
            <Skeleton className="w-full h-full rounded-lg" />
          ) : finalResult ? (
            <div className="relative w-full h-full">
              {isGIF && !playAnimation && staticGifFrameUrl ? (
                <img
                  src={staticGifFrameUrl}
                  alt="Preview (static frame)"
                  className="object-contain w-full h-full rounded-lg opacity-80"
                  style={{
                    background: "transparent",
                    filter: "brightness(0.7) grayscale(0.3)",
                  }}
                />
              ) : (
                <img
                  src={finalResult}
                  alt="Preview"
                  className="object-contain w-full h-full rounded-lg opacity-80"
                  style={{
                    background: "transparent",
                    filter: "brightness(0.7) grayscale(0.3)",
                  }}
                />
              )}
              {/* Draggable overlay for reaction, always shown if finalResult */}
              <ReactionOverlayDraggable
                x={x}
                y={y}
                scale={scale}
                imageUrl={`/reactions/${reactionsMap[overlayNumber - 1].filename}`}
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
              {isGIF && !playAnimation && staticGifFrameUrl ? (
                <img
                  src={staticGifFrameUrl}
                  alt="Preview (static frame)"
                  className="object-contain w-full h-full rounded-lg"
                  style={{ background: "transparent" }}
                />
              ) : (
                <img
                  src={finalResult}
                  alt="Preview"
                  className="object-contain w-full h-full rounded-lg"
                  style={{ background: "transparent" }}
                />
              )}
              {/* Draggable overlay for reaction */}
              <ReactionOverlayDraggable
                x={x}
                y={y}
                scale={scale}
                imageUrl={`/reactions/${reactionsMap[overlayNumber - 1].filename}`}
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
      
      <div className="flex flex-col md:flex-row gap-2 w-full mt-2">
        <Button
          onClick={onDownload}
          className="w-full md:w-auto"
          aria-label="Download"
        >
          <AiOutlineDownload />
        </Button>
        <Button
          variant="secondary"
          onClick={handleCopy}
          className="w-full md:w-auto"
          aria-label="Copy"
        >
          <AiOutlineCopy />
        </Button>
        <Button
          variant="outline"
          onClick={copyUrlToClipboard}
          className="w-full md:w-auto"
          aria-label="Share Template"
        >
          <AiOutlineLink />
        </Button>
      </div>
      
      {copyStatus && (
        <div className="text-sm mt-1 text-center text-muted-foreground">
          {copyStatus}
        </div>
      )}
      
      {/* GIF Copy Modal */}
      {showGifCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
            <div className="mb-4 text-center">
              <div className="font-semibold mb-2">
                Copy GIF as static image?
              </div>
              <div className="text-sm text-muted-foreground">
                Copying GIFs isn&apos;t supported by your browser.
                Would you like to copy a static image instead?
              </div>
            </div>
            <div className="flex gap-2 w-full justify-center">
              <Button
                onClick={onGifCopyConfirm}
                className="flex-1"
              >
                Copy PNG
              </Button>
              <Button
                variant="secondary"
                onClick={onGifCopyCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}