"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { CollagePreviewProps } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

export function CollagePreview({
  nfts,
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

  // Debug logging
  useEffect(() => {
    console.log("CollagePreview props:", {
      settings,
      watermarkEnabled,
      watermarkScale,
      nftsCount: nfts.length,
    });
  }, [settings, watermarkEnabled, watermarkScale, nfts.length]);

  const generateCollage = useCallback(async () => {
    if (!canvasRef.current || nfts.length === 0) return;

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
      // Load all NFT images
      const imagePromises = nfts.slice(0, rows * columns).map((nft) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => {
            // Create a placeholder if image fails to load
            const placeholder = new Image();
            placeholder.width = cellWidth;
            placeholder.height = cellHeight;
            resolve(placeholder);
          };
          img.src = nft.imageUrl;
        });
      });

      const images = await Promise.all(imagePromises);

      // Draw NFT images in grid
      images.forEach((img, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = col * (cellWidth + spacing);
        const y = row * (cellHeight + spacing);

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

        // Draw the image
        if (img.src) {
          ctx.drawImage(img, x, y, cellWidth, cellHeight);
        } else {
          // Draw placeholder
          ctx.fillStyle = "#f0f0f0";
          ctx.fillRect(x, y, cellWidth, cellHeight);
          ctx.fillStyle = "#999";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText("No Image", x + cellWidth / 2, y + cellHeight / 2);
        }

        if (borderRadius > 0) {
          ctx.restore();
        }
      });

      // Add watermark if enabled
      if (watermarkEnabled) {
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
    settings,
    watermarkEnabled,
    watermarkStyle,
    watermarkScale,
    watermarkPaddingX,
    watermarkPaddingY,
  ]);

  // Generate collage when dependencies change
  useEffect(() => {
    if (nfts.length > 0 && !loading) {
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

  if (loading || isGenerating) {
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
