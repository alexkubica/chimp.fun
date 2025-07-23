"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { CollagePreviewProps } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

export function CollagePreview({
  nfts,
  loadingSlots = [],
  settings,
  watermarkEnabled,
  watermarkStyle,
  watermarkScale,
  watermarkPaddingX,
  watermarkPaddingY,
  loading = false,
}: CollagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadedImages, setLoadedImages] = useState<
    Map<number, HTMLImageElement>
  >(new Map());

  // Debug logging
  useEffect(() => {
    console.log("CollagePreview props:", {
      settings,
      watermarkEnabled,
      watermarkScale,
      nftsCount: nfts.length,
      loadingSlotsCount: loadingSlots.length,
    });
  }, [
    settings,
    watermarkEnabled,
    watermarkScale,
    nfts.length,
    loadingSlots.length,
  ]);

  // Preload images as NFTs become available
  useEffect(() => {
    const loadImage = async (nft: any, index: number) => {
      if (!nft || loadedImages.has(index)) return;

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = nft.imageUrl;
        });

        setLoadedImages((prev) => new Map(prev).set(index, img));
      } catch (error) {
        console.error(`Failed to load image for slot ${index}:`, error);
      }
    };

    nfts.forEach((nft, index) => {
      if (nft && !loadedImages.has(index)) {
        loadImage(nft, index);
      }
    });
  }, [nfts, loadedImages]);

  const generateCollage = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { rows, columns, spacing, backgroundColor, borderRadius } = settings;
    const cellWidth = 200; // Base cell size
    const cellHeight = 200;

    // Calculate canvas size
    const canvasWidth = columns * cellWidth + (columns - 1) * spacing;
    const canvasHeight = rows * cellHeight + (rows - 1) * spacing;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    try {
      // Draw NFT images in grid
      for (let index = 0; index < rows * columns; index++) {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = col * (cellWidth + spacing);
        const y = row * (cellHeight + spacing);

        const nft = nfts[index];
        const img = loadedImages.get(index);
        const isLoading = loadingSlots[index];

        if (borderRadius > 0) {
          // Draw rounded rectangle
          ctx.save();
          ctx.beginPath();
          // Use roundRect if available, otherwise fall back to regular rect
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(x, y, cellWidth, cellHeight, borderRadius);
          } else {
            // Fallback for browsers that don't support roundRect
            ctx.rect(x, y, cellWidth, cellHeight);
          }
          ctx.clip();
        }

        if (img && nft && !isLoading) {
          // Draw the loaded image
          ctx.drawImage(img, x, y, cellWidth, cellHeight);
        } else if (isLoading || (!nft && loading)) {
          // Draw loading placeholder
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(x, y, cellWidth, cellHeight);

          // Add loading animation effect
          const gradient = ctx.createLinearGradient(x, y, x + cellWidth, y);
          gradient.addColorStop(0, "#f3f4f6");
          gradient.addColorStop(0.5, "#e5e7eb");
          gradient.addColorStop(1, "#f3f4f6");
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, cellWidth, cellHeight);

          // Add loading text
          ctx.fillStyle = "#9ca3af";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Loading...", x + cellWidth / 2, y + cellHeight / 2);
        } else {
          // Draw empty placeholder
          ctx.fillStyle = "#f9fafb";
          ctx.fillRect(x, y, cellWidth, cellHeight);
          ctx.strokeStyle = "#e5e7eb";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellWidth, cellHeight);

          // Add placeholder text
          ctx.fillStyle = "#6b7280";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Empty", x + cellWidth / 2, y + cellHeight / 2);
        }

        if (borderRadius > 0) {
          ctx.restore();
        }
      }

      // Add watermark if enabled and we have some NFTs loaded
      if (watermarkEnabled && nfts.some((nft) => nft !== null)) {
        const watermarkPath =
          watermarkStyle === "oneline" ? "/credit-oneline.png" : "/credit.png";
        const watermarkImg = new Image();
        watermarkImg.crossOrigin = "anonymous";

        await new Promise<void>((resolve) => {
          watermarkImg.onload = () => {
            const watermarkWidth = watermarkImg.width * watermarkScale;
            const watermarkHeight = watermarkImg.height * watermarkScale;
            console.log("CollagePreview watermark scaling:", {
              originalWidth: watermarkImg.width,
              originalHeight: watermarkImg.height,
              watermarkScale,
              finalWidth: watermarkWidth,
              finalHeight: watermarkHeight,
            });
            const watermarkX = canvasWidth - watermarkWidth - watermarkPaddingX;
            const watermarkY =
              canvasHeight - watermarkHeight - watermarkPaddingY;

            ctx.globalAlpha = 0.8;
            ctx.drawImage(
              watermarkImg,
              watermarkX,
              watermarkY,
              watermarkWidth,
              watermarkHeight,
            );
            ctx.globalAlpha = 1.0;
            resolve();
          };
          watermarkImg.onerror = () => resolve(); // Continue without watermark if it fails
          watermarkImg.src = watermarkPath;
        });
      }

      // Convert canvas to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          // Clean up previous URL
          if (finalImageUrl) {
            URL.revokeObjectURL(finalImageUrl);
          }
          setFinalImageUrl(url);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error generating collage:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    nfts,
    loadingSlots,
    loadedImages,
    settings,
    watermarkEnabled,
    watermarkStyle,
    watermarkScale,
    watermarkPaddingX,
    watermarkPaddingY,
    loading,
    finalImageUrl,
  ]);

  // Generate collage when dependencies change
  useEffect(() => {
    // Only regenerate if we have some content to show or are actively loading
    if (nfts.length > 0 || loading) {
      generateCollage();
    }
  }, [generateCollage, nfts.length, loading]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (finalImageUrl) {
        URL.revokeObjectURL(finalImageUrl);
      }
    };
  }, [finalImageUrl]);

  if (loading && nfts.length === 0) {
    return (
      <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {finalImageUrl ? (
        <img
          src={finalImageUrl}
          alt="NFT Collage Preview"
          className="object-contain w-full h-full rounded-lg"
          style={{ background: "transparent" }}
        />
      ) : (
        <span className="text-muted-foreground">
          Generate collage to preview
        </span>
      )}
    </div>
  );
}
