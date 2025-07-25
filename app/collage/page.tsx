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
import { MultiSearchableSelect } from "@/components/ui/MultiSearchableSelect";
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
import { debounce } from "lodash";

interface CollageSettings {
  dimensions: number; // Combined rows and columns (square)
  collections: string[];
}

function CollagePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Settings
  const [settings, setSettings] = useState<CollageSettings>({
    dimensions: 2, // Default to 2x2
    collections: ["all"], // Default to all collections
  });

  // State
  const [nfts, setNfts] = useState<CollageNFT[]>([]);
  const [progressiveNfts, setProgressiveNfts] = useState<CollageNFT[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
  }>({ loaded: 0, total: 0 });
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

    const collectionsParam = params.get("collections");
    if (collectionsParam) {
      const collections = collectionsParam.split(",").filter(Boolean);
      setSettings((prev) => ({ ...prev, collections }));
    }
  }, []);

  // Update URL parameters (debounced)
  const debouncedUpdateUrlParams = useMemo(
    () =>
      debounce(() => {
        const params = new URLSearchParams();
        params.set("dimensions", settings.dimensions.toString());
        params.set("collections", settings.collections.join(","));

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
      }, 500),
    [settings],
  );

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

  // Progress callback for incremental rendering
  const handleNFTProgress = useCallback((nft: CollageNFT, index: number) => {
    setProgressiveNfts((prev) => {
      const newArray = [...prev];
      newArray[index] = nft;
      return newArray;
    });
    setLoadingProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }));
  }, []);

  // Generate collage
  const generateCollage = useCallback(async () => {
    setLoading(true);
    setGenerating(true);
    setError(null);
    setProgressiveNfts([]);

    try {
      const requiredNFTCount = settings.dimensions * settings.dimensions;
      setLoadingProgress({ loaded: 0, total: requiredNFTCount });
      console.log(`Fetching ${requiredNFTCount} random NFTs...`);

      const collectionContracts = settings.collections.includes("all")
        ? undefined
        : settings.collections;

      const randomNFTs = await fetchRandomNFTs(
        requiredNFTCount,
        collectionContracts,
        handleNFTProgress,
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
  }, [settings, handleNFTProgress]);

  // Generate collage with watermarks
  const generateCollageWithWatermarks = useCallback(async () => {
    const activeNfts = progressiveNfts.filter((nft) => nft !== undefined);
    if (activeNfts.length === 0) return;

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
      const imagePromises = activeNfts
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
                ctx.fillText("Loading...", x + cellSize / 2, y + cellSize / 2);
              }

              resolve();
            } catch (error) {
              console.error(`Error processing NFT ${index}:`, error);
              resolve(); // Continue even if this NFT fails
            }
          });
        });

      await Promise.all(imagePromises);

      // Add single watermark to the whole collage (same size as in editor)
      const watermarkImg = new Image();
      watermarkImg.crossOrigin = "anonymous";

      await new Promise<void>((resolveWatermark) => {
        watermarkImg.onload = () => {
          // Apply watermark with same scale as editor (3)
          const watermarkScale = 3;
          const watermarkWidth = watermarkImg.width * watermarkScale;
          const watermarkHeight = watermarkImg.height * watermarkScale;

          // Position watermark at bottom-right of entire collage
          const watermarkX = canvasWidth - watermarkWidth - 20;
          const watermarkY = canvasHeight - watermarkHeight - 20;

          ctx.globalAlpha = 0.8;
          ctx.drawImage(
            watermarkImg,
            watermarkX,
            watermarkY,
            watermarkWidth,
            watermarkHeight,
          );
          ctx.globalAlpha = 1.0;
          resolveWatermark();
        };
        watermarkImg.onerror = () => {
          console.warn("Failed to load watermark, continuing without it");
          resolveWatermark();
        };
        watermarkImg.src = "/credit.png";
      });

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
  }, [progressiveNfts, settings]);

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

  // Update URL when settings change (debounced)
  useEffect(() => {
    debouncedUpdateUrlParams();
  }, [debouncedUpdateUrlParams]);

  // Debounced generate collage function
  const debouncedGenerateCollage = useMemo(
    () => debounce(generateCollage, 1000),
    [generateCollage],
  );

  // Generate collage on page load and when settings change (debounced)
  useEffect(() => {
    debouncedGenerateCollage();

    // Cleanup function to cancel debounced call
    return () => {
      debouncedGenerateCollage.cancel();
    };
  }, [debouncedGenerateCollage]);

  // Generate watermarked collage when progressive NFTs are updated
  useEffect(() => {
    const activeNfts = progressiveNfts.filter((nft) => nft !== undefined);
    if (activeNfts.length > 0 && !loading) {
      generateCollageWithWatermarks();
    }
  }, [progressiveNfts, loading, generateCollageWithWatermarks]);

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

  const selectedCollectionNames = useMemo(() => {
    if (settings.collections.includes("all")) return ["All Collections"];
    return settings.collections.map((contract) => {
      const collection = collectionsMetadata.find(
        (c) => c.contract === contract,
      );
      return collection?.name || "Unknown Collection";
    });
  }, [settings.collections]);

  const selectedCollectionDisplayName = useMemo(() => {
    if (selectedCollectionNames.length === 1) return selectedCollectionNames[0];
    if (selectedCollectionNames.length <= 3)
      return selectedCollectionNames.join(", ");
    return `${selectedCollectionNames.slice(0, 2).join(", ")} +${selectedCollectionNames.length - 2} more`;
  }, [selectedCollectionNames]);

  // Render loading grid with progressive loading indicators
  const renderProgressiveGrid = () => {
    const total = settings.dimensions * settings.dimensions;
    const cells = Array.from({ length: total }).map((_, index) => {
      const nft = progressiveNfts[index];

      return (
        <div
          key={index}
          className="aspect-square rounded border bg-muted flex items-center justify-center"
        >
          {nft ? (
            <img
              src={nft.imageUrl}
              alt={`NFT ${index + 1}`}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Empty"}
            </div>
          )}
        </div>
      );
    });

    return (
      <div
        className="grid gap-1 w-full h-full p-2"
        style={{
          gridTemplateColumns: `repeat(${settings.dimensions}, 1fr)`,
          gridTemplateRows: `repeat(${settings.dimensions}, 1fr)`,
        }}
      >
        {cells}
      </div>
    );
  };

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
                {/* Progressive loading grid */}
                {renderProgressiveGrid()}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="bg-white/90 rounded-lg p-4 text-center">
                      <Spinner />
                      <div className="text-sm mt-2">
                        Loading {loadingProgress.loaded}/{loadingProgress.total}{" "}
                        images
                      </div>
                    </div>
                  </div>
                )}
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
            <Label htmlFor="collections">Collections</Label>
            <div className="flex gap-2">
              <MultiSearchableSelect
                items={collectionOptions}
                value={settings.collections}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, collections: value }))
                }
                placeholder="Select collections..."
                searchPlaceholder="Search collections..."
                getItemValue={(item) => item.value}
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.value}
                className="flex-1"
                fuseOptions={{
                  keys: ["label"],
                  threshold: 0.3,
                  includeScore: true,
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  const randomCollection =
                    collectionOptions[
                      Math.floor(Math.random() * collectionOptions.length)
                    ];
                  setSettings((prev) => ({
                    ...prev,
                    collections: [randomCollection.value],
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
        {(nfts.length > 0 || progressiveNfts.length > 0) && (
          <div className="text-center text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-md">
            <p>
              Generated: {settings.dimensions}×{settings.dimensions} grid with{" "}
              {Math.max(nfts.length, progressiveNfts.filter((n) => n).length)}{" "}
              NFTs
            </p>
            <p>Collections: {selectedCollectionDisplayName}</p>
            {loading && (
              <p>
                Progress: {loadingProgress.loaded}/{loadingProgress.total}{" "}
                images loaded
              </p>
            )}
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
