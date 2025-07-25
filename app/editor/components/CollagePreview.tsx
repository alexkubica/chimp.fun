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
  const [loadedImages, setLoadedImages] = useState<
    Map<string, HTMLImageElement>
  >(new Map());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Debug logging
  useEffect(() => {
    console.log("CollagePreview props:", {
      settings,
      watermarkEnabled,
      watermarkScale,
      nftsCount: nfts.length,
    });
  }, [settings, watermarkEnabled, watermarkScale, nfts.length]);

  // Load individual image with retry logic
  const loadImageWithRetry = useCallback(
    async (nft: any, maxRetries = 3): Promise<HTMLImageElement | null> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";

          const loadPromise = new Promise<HTMLImageElement>(
            (resolve, reject) => {
              img.onload = () => resolve(img);
              img.onerror = () =>
                reject(new Error(`Failed to load image: ${nft.imageUrl}`));
              img.src = nft.imageUrl;
            },
          );

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Image load timeout")), 10000); // 10 second timeout
          });

          return await Promise.race([loadPromise, timeoutPromise]);
        } catch (error) {
          console.warn(
            `Attempt ${attempt + 1} failed for image ${nft.id}:`,
            error,
          );
          if (attempt === maxRetries - 1) {
            setFailedImages((prev) => new Set([...prev, nft.id]));
            return null;
          }
          // Wait a bit before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
      return null;
    },
    [],
  );

  // Progressive image loading
  useEffect(() => {
    if (nfts.length === 0) return;

    const loadImagesProgressively = async () => {
      setLoadedImages(new Map());
      setFailedImages(new Set());

      // Load images one by one for progressive rendering
      for (const nft of nfts) {
        const img = await loadImageWithRetry(nft);
        if (img) {
          setLoadedImages((prev) => new Map([...prev, [nft.id, img]]));
        }
      }
    };

    loadImagesProgressively();
  }, [nfts, loadImageWithRetry]);

  // Redraw canvas when images are loaded
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || loadedImages.size === 0) return;

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

    // Draw NFT images in grid
    nfts.slice(0, rows * columns).forEach((nft, index) => {
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

      const img = loadedImages.get(nft.id);
      if (img) {
        // Draw the loaded image
        ctx.drawImage(img, x, y, cellWidth, cellHeight);
      } else if (failedImages.has(nft.id)) {
        // Draw error placeholder
        ctx.fillStyle = "#ffebee";
        ctx.fillRect(x, y, cellWidth, cellHeight);
        ctx.fillStyle = "#f44336";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "Failed to load",
          x + cellWidth / 2,
          y + cellHeight / 2 - 5,
        );
        ctx.fillText("Retrying...", x + cellWidth / 2, y + cellHeight / 2 + 15);
      } else {
        // Draw loading placeholder
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(x, y, cellWidth, cellHeight);
        ctx.fillStyle = "#999";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Loading...", x + cellWidth / 2, y + cellHeight / 2);
      }

      if (borderRadius > 0) {
        ctx.restore();
      }
    });
  }, [loadedImages, failedImages, nfts, settings]);

  // Redraw canvas when images change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const generateCollage = useCallback(async () => {
    if (!canvasRef.current || loadedImages.size === 0) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      // Redraw the canvas with current state
      redrawCanvas();

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
            const watermarkX =
              canvas.width - watermarkWidth - watermarkPaddingX;
            const watermarkY =
              canvas.height - watermarkHeight - watermarkPaddingY;

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
    loadedImages,
    settings,
    watermarkEnabled,
    watermarkStyle,
    watermarkScale,
    watermarkPaddingX,
    watermarkPaddingY,
    redrawCanvas,
  ]);

  // Generate collage when images are loaded
  useEffect(() => {
    if (loadedImages.size > 0 && !loading) {
      generateCollage();
    }
  }, [generateCollage, loadedImages.size, loading]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (finalImageUrl) {
        URL.revokeObjectURL(finalImageUrl);
      }
    };
  }, [finalImageUrl]);

  if (loading || (isGenerating && loadedImages.size === 0)) {
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
      ) : loadedImages.size > 0 ? (
        <div className="text-center p-4">
          <span className="text-muted-foreground">
            Rendering collage... ({loadedImages.size}/{nfts.length} images
            loaded)
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground">
          Generate collage to preview
        </span>
      )}
    </div>
  );
}
