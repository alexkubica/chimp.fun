"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Skeleton, Spinner } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import {
  AiOutlineCopy,
  AiOutlineDownload,
  AiOutlineLink,
} from "react-icons/ai";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchRandomNFTs } from "../editor/utils/collageUtils";
import { CollageNFT } from "../editor/types";

interface CollageSettings {
  dimensions: number; // Combined rows and columns (square)
  collection: string;
}

function CollagePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Settings
  const [settings, setSettings] = useState<CollageSettings>({
    dimensions: 2, // Default to 2x2
    collection: "all", // Default to all collections
  });

  // State
  const [nfts, setNfts] = useState<CollageNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Parse URL parameters
  const parseUrlParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);

    const dimensionsParam = params.get("dimensions");
    if (dimensionsParam && !isNaN(Number(dimensionsParam))) {
      setSettings((prev) => ({ ...prev, dimensions: Number(dimensionsParam) }));
    }

    const collectionParam = params.get("collection");
    if (collectionParam) {
      setSettings((prev) => ({ ...prev, collection: collectionParam }));
    }
  }, []);

  // Update URL parameters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("dimensions", settings.dimensions.toString());
    params.set("collection", settings.collection);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [settings]);

  // Copy URL to clipboard
  const copyUrlToClipboard = useCallback(async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopyStatus("URL copied to clipboard!");
      setTimeout(() => setCopyStatus(null), 3000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      setCopyStatus("Failed to copy URL. Please try again.");
      setTimeout(() => setCopyStatus(null), 3000);
    }
  }, []);

  // Generate collage
  const generateCollage = useCallback(async () => {
    setLoading(true);
    setGenerating(true);
    setError(null);

    try {
      const requiredNFTCount = settings.dimensions * settings.dimensions;
      console.log(`Fetching ${requiredNFTCount} random NFTs...`);

      const collectionContract =
        settings.collection === "all" ? undefined : settings.collection;
      const randomNFTs = await fetchRandomNFTs(
        requiredNFTCount,
        collectionContract,
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
      setGenerating(false);
    }
  }, [settings]);

  // Generate collage with watermarks
  const generateCollageWithWatermarks = useCallback(async () => {
    if (nfts.length === 0) return;

    setGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      const cellSize = 400; // Larger cells for better quality
      const spacing = 4;
      const { dimensions } = settings;

      const canvasWidth = dimensions * cellSize + (dimensions - 1) * spacing;
      const canvasHeight = dimensions * cellSize + (dimensions - 1) * spacing;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Set background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Load all NFT images and add watermarks
      const imagePromises = nfts
        .slice(0, dimensions * dimensions)
        .map(async (nft, index) => {
          return new Promise<void>(async (resolve) => {
            try {
              // Load NFT image
              const nftImg = new Image();
              nftImg.crossOrigin = "anonymous";

              await new Promise<void>((resolveImg) => {
                nftImg.onload = () => resolveImg();
                nftImg.onerror = () => resolveImg(); // Continue even if image fails
                nftImg.src = nft.imageUrl;
              });

              // Load watermark
              const watermarkImg = new Image();
              watermarkImg.crossOrigin = "anonymous";

              await new Promise<void>((resolveWatermark) => {
                watermarkImg.onload = () => resolveWatermark();
                watermarkImg.onerror = () => resolveWatermark(); // Continue without watermark
                watermarkImg.src = "/credit.png";
              });

              // Calculate position
              const row = Math.floor(index / dimensions);
              const col = index % dimensions;
              const x = col * (cellSize + spacing);
              const y = row * (cellSize + spacing);

              // Draw NFT image
              if (nftImg.complete && nftImg.naturalWidth > 0) {
                ctx.drawImage(nftImg, x, y, cellSize, cellSize);
              } else {
                // Draw placeholder
                ctx.fillStyle = "#f0f0f0";
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.fillStyle = "#999";
                ctx.font = "16px Arial";
                ctx.textAlign = "center";
                ctx.fillText("No Image", x + cellSize / 2, y + cellSize / 2);
              }

              // Add watermark (smaller scale for collage)
              if (watermarkImg.complete && watermarkImg.naturalWidth > 0) {
                const watermarkScale = 0.5; // Smaller watermark for collage
                const watermarkWidth = watermarkImg.width * watermarkScale;
                const watermarkHeight = watermarkImg.height * watermarkScale;
                const watermarkX = x + cellSize - watermarkWidth - 10;
                const watermarkY = y + cellSize - watermarkHeight - 10;

                ctx.globalAlpha = 0.8;
                ctx.drawImage(
                  watermarkImg,
                  watermarkX,
                  watermarkY,
                  watermarkWidth,
                  watermarkHeight,
                );
                ctx.globalAlpha = 1.0;
              }

              resolve();
            } catch (error) {
              console.error(`Error processing NFT ${index}:`, error);
              resolve(); // Continue even if this NFT fails
            }
          });
        });

      await Promise.all(imagePromises);

      // Convert canvas to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setFinalImageUrl(url);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error generating collage with watermarks:", error);
      setError("Failed to generate collage with watermarks");
    } finally {
      setGenerating(false);
    }
  }, [nfts, settings]);

  // Download collage
  const handleDownload = useCallback(() => {
    if (!finalImageUrl) return;

    const a = document.createElement("a");
    a.href = finalImageUrl;
    a.download = `nft-collage-${settings.dimensions}x${settings.dimensions}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [finalImageUrl, settings.dimensions]);

  // Parse URL params on mount
  useEffect(() => {
    parseUrlParams();
  }, [parseUrlParams]);

  // Update URL when settings change
  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  // Generate collage on page load and when settings change
  useEffect(() => {
    generateCollage();
  }, [generateCollage]);

  // Generate watermarked collage when NFTs are loaded
  useEffect(() => {
    if (nfts.length > 0 && !loading) {
      generateCollageWithWatermarks();
    }
  }, [nfts, loading, generateCollageWithWatermarks]);

  // Collection options
  const collectionOptions = useMemo(() => {
    return [
      { value: "all", label: "All Collections" },
      ...collectionsMetadata
        .map((collection) => ({
          value: collection.contract || "",
          label: collection.name,
        }))
        .filter((option) => option.value),
    ];
  }, []);

  const selectedCollectionName = useMemo(() => {
    if (settings.collection === "all") return "All Collections";
    const collection = collectionsMetadata.find(
      (c) => c.contract === settings.collection,
    );
    return collection?.name || "Unknown Collection";
  }, [settings.collection]);

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            <a href="/" className="text-inherit no-underline">
              CHIMP.FUN
            </a>
          </h1>
          <p className="text-lg font-medium mb-2">Collage Generator</p>
        </header>

        {/* Preview */}
        <div className="flex flex-col items-center w-full p-4 border rounded-lg bg-muted/50 mt-2">
          <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
            {generating || loading ? (
              <div className="relative w-full h-full">
                {/* Skeleton grid matching the dimensions */}
                <div
                  className="grid gap-1 w-full h-full p-2"
                  style={{
                    gridTemplateColumns: `repeat(${settings.dimensions}, 1fr)`,
                    gridTemplateRows: `repeat(${settings.dimensions}, 1fr)`,
                  }}
                >
                  {Array.from({
                    length: settings.dimensions * settings.dimensions,
                  }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-full rounded" />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner />
                </div>
              </div>
            ) : finalImageUrl ? (
              <img
                src={finalImageUrl}
                alt="NFT Collage"
                className="object-contain w-full h-full rounded-lg"
                style={{ background: "transparent" }}
              />
            ) : error ? (
              <div className="text-center p-4">
                <p className="text-destructive font-medium mb-2">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : (
              <span className="text-muted-foreground">
                Generate collage to preview
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row gap-2 mt-2 justify-center w-full">
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={!finalImageUrl || generating}
              aria-label="Download"
            >
              {generating ? <Spinner /> : <AiOutlineDownload />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyUrlToClipboard}
              aria-label="Copy Link"
            >
              <AiOutlineLink />
            </Button>
          </div>

          {copyStatus && (
            <div className="text-sm text-green-600 mt-2">{copyStatus}</div>
          )}
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-4 mt-6">
          {/* Dimensions Slider */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="dimensions">
              Dimensions: {settings.dimensions}x{settings.dimensions}
            </Label>
            <Slider
              id="dimensions"
              min={1}
              max={10}
              step={1}
              value={[settings.dimensions]}
              onValueChange={([value]) =>
                setSettings((prev) => ({ ...prev, dimensions: value }))
              }
            />
          </div>

          {/* Collection Selection */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="collection">Collection</Label>
            <div className="flex gap-2">
              <Select
                value={settings.collection}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, collection: value }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collectionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={() => {
                  const randomCollection =
                    collectionOptions[
                      Math.floor(Math.random() * collectionOptions.length)
                    ];
                  setSettings((prev) => ({
                    ...prev,
                    collection: randomCollection.value,
                  }));
                }}
              >
                🎲
              </Button>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateCollage}
            disabled={loading || generating}
            className="w-full"
            size="lg"
          >
            {loading || generating ? "Generating..." : "Generate New Collage"}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Info */}
        {nfts.length > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-md">
            <p>
              Generated: {settings.dimensions}×{settings.dimensions} grid with{" "}
              {nfts.length} NFTs
            </p>
            <p>Collection: {selectedCollectionName}</p>
            <p>Each NFT includes watermark from preview</p>
          </div>
        )}
      </div>
    </main>
  );
}

function CollagePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollagePageContent />
    </Suspense>
  );
}

export default CollagePage;
