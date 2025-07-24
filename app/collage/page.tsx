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
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
  useRef,
} from "react";
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
  collections: string[];
}

// Individual NFT with loading state for progressive loading
interface LoadableNFT extends CollageNFT {
  isLoaded: boolean;
  hasError: boolean;
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
  const [nfts, setNfts] = useState<LoadableNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);

  // Debounce ref for settings changes
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse URL parameters
  const parseUrlParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);

    const dimensionsParam = params.get("dimensions");
    if (dimensionsParam && !isNaN(Number(dimensionsParam))) {
      const dimensions = Number(dimensionsParam);
      // Enforce 2-10 range
      const clampedDimensions = Math.max(2, Math.min(10, dimensions));
      setSettings((prev) => ({ ...prev, dimensions: clampedDimensions }));
    }

    const collectionsParam = params.get("collections");
    if (collectionsParam) {
      const collections = collectionsParam.split(",").filter(Boolean);
      setSettings((prev) => ({ ...prev, collections }));
    }
  }, []);

  // Update URL parameters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("dimensions", settings.dimensions.toString());
    params.set("collections", settings.collections.join(","));

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

  // Progressive image loading handler
  const handleImageLoad = useCallback((index: number, success: boolean) => {
    setNfts((prevNfts) =>
      prevNfts.map((nft, i) =>
        i === index ? { ...nft, isLoaded: true, hasError: !success } : nft,
      ),
    );

    if (success) {
      setLoadedImagesCount((prev) => prev + 1);
    }
  }, []);

  // Generate collage - fetch NFT data
  const generateCollage = useCallback(async () => {
    setLoading(true);
    setGenerating(true);
    setError(null);
    setLoadedImagesCount(0);

    try {
      const requiredNFTCount = settings.dimensions * settings.dimensions;
      console.log(`Fetching ${requiredNFTCount} random NFTs...`);

      const collectionContracts = settings.collections.includes("all")
        ? undefined
        : settings.collections;
      const randomNFTs = await fetchRandomNFTs(
        requiredNFTCount,
        collectionContracts,
      );

      // Initialize NFTs with loading state
      const loadableNFTs: LoadableNFT[] = randomNFTs.map((nft) => ({
        ...nft,
        isLoaded: false,
        hasError: false,
      }));

      setNfts(loadableNFTs);
      console.log(`Successfully fetched ${randomNFTs.length} NFTs`);
    } catch (err) {
      console.error("Error generating collage:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate collage",
      );
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // Debounced generate collage
  const debouncedGenerateCollage = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      generateCollage();
    }, 500); // 500ms debounce
  }, [generateCollage]);

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

  // Generate collage on page load and when settings change (debounced)
  useEffect(() => {
    debouncedGenerateCollage();

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [debouncedGenerateCollage]);

  // Generate watermarked collage when all NFTs are loaded
  useEffect(() => {
    const totalNfts = settings.dimensions * settings.dimensions;
    if (nfts.length > 0 && !loading && loadedImagesCount >= totalNfts) {
      generateCollageWithWatermarks();
    }
  }, [
    nfts,
    loading,
    loadedImagesCount,
    settings.dimensions,
    generateCollageWithWatermarks,
  ]);

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
            {loading ? (
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
            ) : nfts.length > 0 ? (
              <div className="relative w-full h-full">
                {/* Progressive loading grid */}
                <div
                  className="grid gap-1 w-full h-full p-2"
                  style={{
                    gridTemplateColumns: `repeat(${settings.dimensions}, 1fr)`,
                    gridTemplateRows: `repeat(${settings.dimensions}, 1fr)`,
                  }}
                >
                  {nfts
                    .slice(0, settings.dimensions * settings.dimensions)
                    .map((nft, index) => (
                      <div
                        key={nft.id}
                        className="relative w-full h-full rounded overflow-hidden"
                      >
                        {!nft.isLoaded && !nft.hasError && (
                          <Skeleton className="absolute inset-0 w-full h-full" />
                        )}
                        {nft.hasError ? (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                            Failed to load
                          </div>
                        ) : (
                          <img
                            src={nft.imageUrl}
                            alt={`NFT ${index + 1}`}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              nft.isLoaded ? "opacity-100" : "opacity-0"
                            }`}
                            onLoad={() => handleImageLoad(index, true)}
                            onError={() => handleImageLoad(index, false)}
                          />
                        )}
                      </div>
                    ))}
                </div>
                {/* Final collage overlay when all images are loaded and processing */}
                {finalImageUrl && (
                  <img
                    src={finalImageUrl}
                    alt="NFT Collage"
                    className="absolute inset-0 w-full h-full object-contain rounded-lg"
                    style={{ background: "transparent" }}
                  />
                )}
                {/* Loading spinner when generating final collage */}
                {generating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <Spinner />
                  </div>
                )}
              </div>
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
              min={2}
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
        {nfts.length > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-md">
            <p>
              Generated: {settings.dimensions}×{settings.dimensions} grid with{" "}
              {nfts.length} NFTs
            </p>
            <p>Collections: {selectedCollectionDisplayName}</p>
            {loadedImagesCount < settings.dimensions * settings.dimensions && (
              <p>
                Loading images: {loadedImagesCount}/
                {settings.dimensions * settings.dimensions}
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
