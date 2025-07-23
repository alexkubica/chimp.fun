"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollagePreview } from "./CollagePreview";
import {
  fetchRandomNFTs,
  getDefaultCollageSettings,
} from "../utils/collageUtils";
import { CollageNFT, CollageSettings } from "../types";
import { AiOutlineDownload } from "react-icons/ai";

interface CollageTabProps {
  watermarkEnabled: boolean;
  watermarkStyle: string;
  watermarkScale: number;
  watermarkPaddingX: number;
  watermarkPaddingY: number;
  currentCollectionContract?: string;
}

export function CollageTab({
  watermarkEnabled,
  watermarkStyle,
  watermarkScale,
  watermarkPaddingX,
  watermarkPaddingY,
  currentCollectionContract,
}: CollageTabProps) {
  const [settings, setSettings] = useState<CollageSettings>(
    getDefaultCollageSettings(),
  );
  const [nfts, setNfts] = useState<CollageNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("CollageTab initialized with settings:", settings);
    console.log("Current collection contract:", currentCollectionContract);
    console.log("Watermark scale:", watermarkScale);
  }, [settings, currentCollectionContract, watermarkScale]);

  // Reset settings when collection changes
  useEffect(() => {
    if (currentCollectionContract) {
      console.log("Collection changed, resetting settings to default");
      setSettings(getDefaultCollageSettings());
    }
  }, [currentCollectionContract]);

  const handleGenerateCollage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const requiredNFTCount = settings.rows * settings.columns;
      console.log(`Fetching ${requiredNFTCount} random NFTs...`);

      const randomNFTs = await fetchRandomNFTs(
        requiredNFTCount,
        currentCollectionContract,
      );
      setNfts(randomNFTs);

      console.log(`Successfully fetched ${randomNFTs.length} NFTs`);
    } catch (err) {
      console.error("Error generating collage:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate collage",
      );
    } finally {
      setLoading(false);
    }
  }, [settings.rows, settings.columns, currentCollectionContract]);

  const handleDownload = useCallback(() => {
    // Create a temporary canvas to generate the final image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || nfts.length === 0) return;

    const { rows, columns, spacing, backgroundColor, borderRadius } = settings;
    const cellWidth = 200;
    const cellHeight = 200;

    const canvasWidth = columns * cellWidth + (columns - 1) * spacing;
    const canvasHeight = rows * cellHeight + (rows - 1) * spacing;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Load and draw all images
    Promise.all(
      nfts.slice(0, rows * columns).map((nft, index) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = col * (cellWidth + spacing);
            const y = row * (cellHeight + spacing);

            if (borderRadius > 0) {
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

            ctx.drawImage(img, x, y, cellWidth, cellHeight);

            if (borderRadius > 0) {
              ctx.restore();
            }
            resolve();
          };
          img.onerror = () => {
            // Draw placeholder for failed images
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = col * (cellWidth + spacing);
            const y = row * (cellHeight + spacing);

            ctx.fillStyle = "#f0f0f0";
            ctx.fillRect(x, y, cellWidth, cellHeight);
            resolve();
          };
          img.src = nft.imageUrl;
        });
      }),
    ).then(() => {
      // Add watermark if enabled
      if (watermarkEnabled) {
        const watermarkPath =
          watermarkStyle === "oneline" ? "/credit-oneline.png" : "/credit.png";
        const watermarkImg = new Image();
        watermarkImg.onload = () => {
          const watermarkWidth = watermarkImg.width * watermarkScale;
          const watermarkHeight = watermarkImg.height * watermarkScale;
          const watermarkX = canvasWidth - watermarkWidth - watermarkPaddingX;
          const watermarkY = canvasHeight - watermarkHeight - watermarkPaddingY;

          ctx.globalAlpha = 0.8;
          ctx.drawImage(
            watermarkImg,
            watermarkX,
            watermarkY,
            watermarkWidth,
            watermarkHeight,
          );
          ctx.globalAlpha = 1.0;

          // Download the image
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nft-collage-${settings.rows}x${settings.columns}-${Date.now()}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }, "image/png");
        };
        watermarkImg.src = watermarkPath;
      } else {
        // Download without watermark
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `nft-collage-${settings.rows}x${settings.columns}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, "image/png");
      }
    });
  }, [
    nfts,
    settings,
    watermarkEnabled,
    watermarkStyle,
    watermarkScale,
    watermarkPaddingX,
    watermarkPaddingY,
  ]);

  const updateSettings = (updates: Partial<CollageSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-6">
      {/* Settings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Collage Settings</h3>

        {/* Grid Size Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rows">Rows: {settings.rows}</Label>
            <Slider
              id="rows"
              min={1}
              max={20}
              step={1}
              value={[settings.rows]}
              onValueChange={([value]) => updateSettings({ rows: value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="columns">Columns: {settings.columns}</Label>
            <Slider
              id="columns"
              min={1}
              max={20}
              step={1}
              value={[settings.columns]}
              onValueChange={([value]) => updateSettings({ columns: value })}
            />
          </div>
        </div>

        {/* Additional Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="spacing">Spacing: {settings.spacing}px</Label>
            <Slider
              id="spacing"
              min={0}
              max={20}
              step={1}
              value={[settings.spacing]}
              onValueChange={([value]) => updateSettings({ spacing: value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="borderRadius">
              Border Radius: {settings.borderRadius}px
            </Label>
            <Slider
              id="borderRadius"
              min={0}
              max={20}
              step={1}
              value={[settings.borderRadius]}
              onValueChange={([value]) =>
                updateSettings({ borderRadius: value })
              }
            />
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <Label htmlFor="backgroundColor">Background Color</Label>
          <div className="flex gap-2">
            <Input
              id="backgroundColor"
              type="color"
              value={settings.backgroundColor}
              onChange={(e) =>
                updateSettings({ backgroundColor: e.target.value })
              }
              className="w-16 h-10"
            />
            <Input
              type="text"
              value={settings.backgroundColor}
              onChange={(e) =>
                updateSettings({ backgroundColor: e.target.value })
              }
              placeholder="#ffffff"
              className="flex-1"
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateCollage}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Generating..." : "Generate Collage"}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preview</h3>
          {nfts.length > 0 && (
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <AiOutlineDownload className="w-4 h-4" />
              Download
            </Button>
          )}
        </div>

        <div className="flex justify-center">
          <CollagePreview
            nfts={nfts}
            settings={settings}
            watermarkEnabled={watermarkEnabled}
            watermarkStyle={watermarkStyle}
            watermarkScale={watermarkScale}
            watermarkPaddingX={watermarkPaddingX}
            watermarkPaddingY={watermarkPaddingY}
            loading={loading}
          />
        </div>

        {nfts.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Grid: {settings.rows} × {settings.columns} ({nfts.length} NFTs)
            </p>
            <p>
              Collections: {new Set(nfts.map((nft) => nft.collectionName)).size}{" "}
              different collections
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
