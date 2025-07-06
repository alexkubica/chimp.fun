"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton, Spinner } from "@/components/ui/skeleton";
import { 
  AiOutlineCopy, 
  AiOutlineDownload, 
  AiOutlineLink 
} from "react-icons/ai";
import { ReactionOverlayDraggable } from "./ReactionOverlayDraggable";

interface EditorPreviewProps {
  loading: boolean;
  isFirstRender: boolean;
  finalResult: string | null;
  isGIF: boolean;
  playAnimation: boolean;
  staticGifFrameUrl: string | null;
  x: number;
  y: number;
  scale: number;
  overlayNumber: number;
  customSpeechBubbleDataUrl: string | null;
  reactionsMap: any[];
  dragging: boolean;
  resizing: boolean;
  onPositionChange: (x: number, y: number, scale: number) => void;
  onDragEnd: () => void;
  onResizeEnd: () => void;
  setDragging: (dragging: boolean) => void;
  setResizing: (resizing: boolean) => void;
  onDownload: () => void;
  onCopy: () => void;
  onCopyUrl: () => void;
  copyStatus: string | null;
  showGifCopyModal: boolean;
  onGifCopyConfirm: () => void;
  onGifCopyCancel: () => void;
}

export const EditorPreview = memo(function EditorPreview({
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
  customSpeechBubbleDataUrl,
  reactionsMap,
  dragging,
  resizing,
  onPositionChange,
  onDragEnd,
  onResizeEnd,
  setDragging,
  setResizing,
  onDownload,
  onCopy,
  onCopyUrl,
  copyStatus,
  showGifCopyModal,
  onGifCopyConfirm,
  onGifCopyCancel,
}: EditorPreviewProps) {
  const handlePositionChange = useCallback(
    ({ x: newX, y: newY, scale: newScale }: { x: number; y: number; scale: number }) => {
      onPositionChange(newX, newY, newScale);
    },
    [onPositionChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(false);
    onDragEnd();
  }, [setDragging, onDragEnd]);

  const handleResizeEnd = useCallback(() => {
    setResizing(false);
    onResizeEnd();
  }, [setResizing, onResizeEnd]);

  const getReactionImageUrl = useCallback(() => {
    const reaction = reactionsMap[overlayNumber - 1];
    return reaction?.isCustom 
      ? customSpeechBubbleDataUrl || ""
      : `/reactions/${reaction?.filename}`;
  }, [overlayNumber, customSpeechBubbleDataUrl, reactionsMap]);

  const renderPreviewContent = () => {
    if (loading) {
      if (isFirstRender) {
        return <Skeleton className="w-full h-full rounded-lg" />;
      }
      
      if (finalResult) {
        return (
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
            <ReactionOverlayDraggable
              x={x}
              y={y}
              scale={scale}
              imageUrl={getReactionImageUrl()}
              onChange={handlePositionChange}
              containerSize={320}
              setDragging={setDragging}
              dragging={dragging}
              setResizing={setResizing}
              resizing={resizing}
              onDragEnd={handleDragEnd}
              onResizeEnd={handleResizeEnd}
              disabled={loading}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </div>
          </div>
        );
      }
      
      return <Skeleton className="w-full h-full rounded-lg" />;
    }

    if (finalResult) {
      return (
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
          <ReactionOverlayDraggable
            x={x}
            y={y}
            scale={scale}
            imageUrl={getReactionImageUrl()}
            onChange={handlePositionChange}
            containerSize={320}
            setDragging={setDragging}
            dragging={dragging}
            setResizing={setResizing}
            resizing={resizing}
            onDragEnd={handleDragEnd}
            onResizeEnd={handleResizeEnd}
            disabled={loading}
          />
        </>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50 mt-2 w-full">
      <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
        {renderPreviewContent()}
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
          onClick={onCopy}
          className="w-full md:w-auto"
          aria-label="Copy"
        >
          <AiOutlineCopy />
        </Button>
        
        <Button
          variant="outline"
          onClick={onCopyUrl}
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
});