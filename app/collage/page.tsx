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
  AiOutlineStop,
} from "react-icons/ai";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchRandomNFTs,
  fetchReplacementNFT,
} from "../editor/utils/collageUtils";
import { CollageNFT } from "../editor/types";
import { debounce } from "lodash";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface CollageSettings {
  dimensions: number; // Combined rows and columns (square)
  collections: string[];
  format: "png" | "gif"; // Add format option
}

function CollagePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortControllerRef = useRef<AbortController | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Settings
  const [settings, setSettings] = useState<CollageSettings>({
    dimensions: 2, // Default to 2x2
    collections: ["all"], // Default to all collections
    format: "png", // Default to PNG
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
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [usedNFTsSet, setUsedNFTsSet] = useState<Set<string>>(new Set());
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // Available collections for the dropdown
  const collectionOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Collections" }];
    collectionsMetadata.forEach((collection) => {
      if (collection.contract) {
        options.push({
          value: collection.contract,
          label: collection.name,
        });
      }
    });
    return options;
  }, []);

  // Selected collection display name
  const selectedCollectionDisplayName = useMemo(() => {
    if (settings.collections.includes("all")) {
      return "All Collections";
    }
    const selectedCollection = collectionsMetadata.find((c) =>
      settings.collections.includes(c.contract || ""),
    );
    return selectedCollection?.name || "Unknown Collection";
  }, [settings.collections]);

  // Initialize FFmpeg
  useEffect(() => {
    const loadFfmpeg = async () => {
      if (typeof window === "undefined") return;
      if (ffmpegLoading) return;

      setFfmpegLoading(true);
      try {
        if (!ffmpegRef.current) {
          ffmpegRef.current = new FFmpeg();
          console.log("FFmpeg instance created for collage");
        }

        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on("log", ({ message }) => {
          console.log("FFmpeg:", message);
        });

        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript",
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm",
          ),
        });

        setFfmpegReady(true);
        console.log("FFmpeg loaded for collage generation");
      } catch (error) {
        console.error("Failed to load FFmpeg:", error);
        setError("Failed to load video processing library");
      } finally {
        setFfmpegLoading(false);
      }
    };

    loadFfmpeg();
  }, [ffmpegLoading]);

  // Parse URL parameters
  const parseUrlParams = useCallback(() => {
    const dimensionsParam = searchParams.get("dimensions");
    const collectionsParam = searchParams.get("collections");
    const formatParam = searchParams.get("format");

    if (dimensionsParam) {
      const dimensions = parseInt(dimensionsParam, 10);
      if (dimensions >= 1 && dimensions <= 5) {
        setSettings((prev) => ({ ...prev, dimensions }));
      }
    }

    if (collectionsParam) {
      const collections = collectionsParam.split(",");
      setSettings((prev) => ({ ...prev, collections }));
    }

    if (formatParam && (formatParam === "png" || formatParam === "gif")) {
      setSettings((prev) => ({
        ...prev,
        format: formatParam as "png" | "gif",
      }));
    }
  }, [searchParams]);

  // Update URL parameters (debounced)
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("dimensions", settings.dimensions.toString());
    params.set("collections", settings.collections.join(","));
    params.set("format", settings.format);
    router.replace(`?${params.toString()}`);
  }, [settings, router]);

  const debouncedUpdateUrlParams = useMemo(
    () => debounce(updateUrlParams, 500),
    [updateUrlParams],
  );

  // Handle NFT progress
  const handleNFTProgress = useCallback((nft: CollageNFT, index: number) => {
    setProgressiveNfts((prevArray) => {
      const newArray = [...prevArray];
      newArray[index] = nft;
      return newArray;
    });
    setLoadingProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }));
  }, []);

  // Cancel current generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setGenerating(false);
    setError("Generation cancelled");
  }, []);

  // Generate final collage using FFmpeg or Canvas
  const generateFinalCollage = useCallback(
    async (nftList: CollageNFT[]) => {
      if (nftList.length === 0) return;

      setGenerating(true);
      setError(null);

      try {
        const cellSize = 512;
        const totalSize = settings.dimensions * cellSize;

        if (settings.format === "gif" && ffmpegReady && ffmpegRef.current) {
          // Use FFmpeg for GIF generation - create a simpler animated collage
          console.log("Generating GIF using FFmpeg...");

          // First, create a base collage image
          const baseCanvas = document.createElement("canvas");
          const baseCtx = baseCanvas.getContext("2d");
          if (!baseCtx) throw new Error("Failed to get canvas context");

          baseCanvas.width = totalSize;
          baseCanvas.height = totalSize;

          // Load all images first
          const loadedImages = await Promise.all(
            nftList.map(async (nft) => {
              if (!nft) return null;
              try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = () =>
                    reject(new Error(`Failed to load: ${nft.imageUrl}`));
                  img.src = nft.imageUrl;
                });
                return img;
              } catch (error) {
                console.warn(
                  `Failed to load NFT image: ${nft.imageUrl}`,
                  error,
                );
                return null;
              }
            }),
          );

          // Write the base image to FFmpeg
          nftList.forEach((nft, index) => {
            if (!nft || !loadedImages[index]) return;

            const row = Math.floor(index / settings.dimensions);
            const col = index % settings.dimensions;
            const x = col * cellSize;
            const y = row * cellSize;

            baseCtx.drawImage(loadedImages[index]!, x, y, cellSize, cellSize);
          });

          const baseBlob = await new Promise<Blob>((resolve) => {
            baseCanvas.toBlob((blob) => resolve(blob!), "image/png");
          });

          const baseData = await fetchFile(URL.createObjectURL(baseBlob));
          await ffmpegRef.current.writeFile("input.png", baseData);

          // Convert to GIF format (simple conversion first)
          const ffmpegArgs = [
            "-i",
            "input.png",
            "-vf",
            "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-f",
            "gif",
            "output.gif",
          ];

          await ffmpegRef.current.exec(ffmpegArgs);

          const data = await ffmpegRef.current.readFile("output.gif");
          const url = URL.createObjectURL(
            new Blob([data], { type: "image/gif" }),
          );
          setFinalImageUrl(url);
        } else {
          // Use Canvas for PNG generation
          console.log("Generating PNG using Canvas...");

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Failed to get canvas context");

          canvas.width = totalSize;
          canvas.height = totalSize;

          await Promise.all(
            nftList.map(async (nft, index) => {
              if (!nft) return;

              const row = Math.floor(index / settings.dimensions);
              const col = index % settings.dimensions;
              const x = col * cellSize;
              const y = row * cellSize;

              try {
                const img = new Image();
                img.crossOrigin = "anonymous";

                await new Promise<void>((resolve, reject) => {
                  img.onload = () => {
                    ctx.drawImage(img, x, y, cellSize, cellSize);
                    resolve();
                  };
                  img.onerror = () =>
                    reject(new Error(`Failed to load image: ${nft.imageUrl}`));
                  img.src = nft.imageUrl;
                });
              } catch (error) {
                console.warn(
                  `Failed to load NFT image: ${nft.imageUrl}`,
                  error,
                );
                ctx.fillStyle = "#f5f5f5";
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.fillStyle = "#999";
                ctx.font = "24px Arial";
                ctx.textAlign = "center";
                ctx.fillText(
                  "Failed to load",
                  x + cellSize / 2,
                  y + cellSize / 2,
                );
              }
            }),
          );

          // Add watermark
          const watermarkImg = new Image();
          watermarkImg.crossOrigin = "anonymous";

          await new Promise<void>((resolve) => {
            watermarkImg.onload = () => {
              const watermarkScale = 0.3;
              const watermarkWidth = watermarkImg.width * watermarkScale;
              const watermarkHeight = watermarkImg.height * watermarkScale;
              const watermarkX = canvas.width - watermarkWidth - 20;
              const watermarkY = canvas.height - watermarkHeight - 20;

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
            watermarkImg.onerror = () => resolve();
            watermarkImg.src = "/chimp.png";
          });

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setFinalImageUrl(url);
            }
          }, "image/png");
        }
      } catch (error) {
        console.error("Error generating final collage:", error);
        setError("Failed to generate final collage");
      } finally {
        setGenerating(false);
      }
    },
    [settings, ffmpegReady],
  );

  // Generate collage
  const generateCollage = useCallback(async () => {
    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setGenerating(false);
    setError(null);
    setProgressiveNfts([]);
    setFinalImageUrl(null); // Clear previous image

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
        abortControllerRef.current.signal,
      );

      // Check if operation was cancelled
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setNfts(randomNFTs);
      console.log(`Successfully fetched ${randomNFTs.length} NFTs`);

      // Auto-generate the final image after all NFTs are loaded
      if (randomNFTs.length === requiredNFTCount) {
        await generateFinalCollage(randomNFTs);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Generation was cancelled");
        return;
      }
      console.error("Error generating collage:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate collage",
      );
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [settings, handleNFTProgress, generateFinalCollage]);

  // Download collage
  const handleDownload = useCallback(() => {
    if (!finalImageUrl) return;

    const a = document.createElement("a");
    a.href = finalImageUrl;
    const extension = settings.format === "gif" ? "gif" : "png";
    a.download = `nft-collage-${settings.dimensions}x${settings.dimensions}-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [finalImageUrl, settings.dimensions, settings.format]);

  // Copy URL to clipboard
  const copyUrlToClipboard = useCallback(() => {
    const currentUrl = window.location.href;
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        setCopyStatus("URL copied to clipboard!");
        setTimeout(() => setCopyStatus(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy URL: ", err);
        setCopyStatus("Failed to copy URL");
        setTimeout(() => setCopyStatus(null), 2000);
      });
  }, []);

  // Handle replacing a specific NFT
  const handleReplaceNFT = useCallback(
    async (index: number) => {
      if (replacingIndex !== null || progressiveNfts.length === 0) return;

      setReplacingIndex(index);
      setError(null);

      try {
        const newUsedNFTsSet = new Set(usedNFTsSet);
        const oldNFT = progressiveNfts[index];
        if (oldNFT) {
          newUsedNFTsSet.delete(oldNFT.id);
        }

        const replacementNFT = await fetchReplacementNFT(
          settings.collections,
          newUsedNFTsSet,
          abortControllerRef.current?.signal,
        );

        if (replacementNFT) {
          // Update the NFT array
          const newNfts = [...progressiveNfts];
          newNfts[index] = replacementNFT;
          setProgressiveNfts(newNfts);
          setNfts(newNfts);

          // Update used NFTs set
          newUsedNFTsSet.add(replacementNFT.id);
          setUsedNFTsSet(newUsedNFTsSet);

          // Clear the final image and regenerate
          setFinalImageUrl(null);
          await generateFinalCollage(newNfts);
        } else {
          setError("Failed to find a replacement NFT");
        }
      } catch (error) {
        console.error("Error replacing NFT:", error);
        setError("Failed to replace NFT");
      } finally {
        setReplacingIndex(null);
      }
    },
    [
      replacingIndex,
      progressiveNfts,
      settings.collections,
      usedNFTsSet,
      generateFinalCollage,
    ],
  );

  // Parse URL params on mount
  useEffect(() => {
    parseUrlParams();
  }, [parseUrlParams]);

  // Update URL when settings change (debounced)
  useEffect(() => {
    debouncedUpdateUrlParams();
  }, [debouncedUpdateUrlParams]);

  // Update used NFTs set when progressive NFTs change
  useEffect(() => {
    const newUsedSet = new Set(progressiveNfts.map((nft) => nft.id));
    setUsedNFTsSet(newUsedSet);
  }, [progressiveNfts]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          NFT Collage Generator
        </h1>

        {/* Preview Section */}
        <div className="flex flex-col items-center gap-6">
          {loading && progressiveNfts.length === 0 ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="w-[400px] h-[400px] rounded-lg" />
              <span className="text-muted-foreground">
                Click &quot;Generate Collage&quot; to start
              </span>
            </div>
          ) : progressiveNfts.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              {/* Progressive NFT Grid */}
              <div
                className="grid gap-2 p-4 bg-white rounded-lg shadow-lg"
                style={{
                  gridTemplateColumns: `repeat(${settings.dimensions}, 1fr)`,
                  width: "fit-content",
                }}
              >
                {Array.from({
                  length: settings.dimensions * settings.dimensions,
                }).map((_, index) => {
                  const nft = progressiveNfts[index];
                  const isReplacing = replacingIndex === index;

                  return (
                    <div
                      key={index}
                      className={`
                        w-24 h-24 border border-gray-200 rounded-md overflow-hidden 
                        cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md
                        ${isReplacing ? "opacity-50 animate-pulse" : ""}
                      `}
                      onClick={() => !isReplacing && handleReplaceNFT(index)}
                      title={
                        nft
                          ? `${nft.collectionName} #${nft.tokenId} - Click to replace`
                          : "Loading..."
                      }
                    >
                      {nft ? (
                        <img
                          src={nft.imageUrl}
                          alt={`${nft.collectionName} #${nft.tokenId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to placeholder on error
                            const target = e.target as HTMLImageElement;
                            target.src = `data:image/svg+xml;base64,${btoa(`
                              <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
                                <rect width="96" height="96" fill="#f0f0f0"/>
                                <text x="48" y="48" text-anchor="middle" dy="0.35em" font-family="Arial" font-size="10" fill="#666">
                                  Error
                                </text>
                              </svg>
                            `)}`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
                          {loadingProgress && (
                            <span className="text-xs text-gray-500">
                              {index < loadingProgress.loaded ? "✓" : "..."}
                            </span>
                          )}
                        </div>
                      )}
                      {isReplacing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                          <Spinner className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress indicator */}
              {loading && loadingProgress && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-64 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Loading NFTs: {loadingProgress.loaded} /{" "}
                    {loadingProgress.total}
                  </span>
                </div>
              )}

              {/* Final collage image */}
              {finalImageUrl && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={finalImageUrl}
                      alt="Generated Collage"
                      className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                    />
                    {generating && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2 text-white">
                          <Spinner className="w-6 h-6" />
                          <span>
                            Generating {settings.format.toUpperCase()}...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Download button */}
                  <Button
                    onClick={handleDownload}
                    disabled={!finalImageUrl || generating}
                    className="flex items-center gap-2"
                  >
                    <AiOutlineDownload className="w-4 h-4" />
                    Download {settings.format.toUpperCase()}
                  </Button>
                </div>
              )}

              {/* Hint text */}
              <p className="text-sm text-muted-foreground text-center max-w-md">
                💡 Click on any NFT in the grid above to replace it with a
                random one
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-[400px] h-[400px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">
                  Click &quot;Generate Collage&quot; to start
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2 mt-4 justify-center w-full">
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
          <div className="text-sm text-green-600 mt-2 text-center">
            {copyStatus}
          </div>
        )}

        {/* Settings */}
        <div className="flex flex-col gap-4 mt-6">
          {/* Format Selection */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="format">Output Format</Label>
            <Select
              value={settings.format}
              onValueChange={(value: "png" | "gif") =>
                setSettings((prev) => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (Static Image)</SelectItem>
                <SelectItem value="gif">GIF (Animated)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dimensions Slider */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="dimensions">
              Dimensions: {settings.dimensions}x{settings.dimensions}
            </Label>
            <Slider
              id="dimensions"
              value={[settings.dimensions]}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, dimensions: value[0] }))
              }
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Collections */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="collections">Collections</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const availableCollections = collectionOptions.filter(
                    (opt) => opt.value !== "all",
                  );
                  const randomCollection =
                    availableCollections[
                      Math.floor(Math.random() * availableCollections.length)
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
              className="w-full"
              fuseOptions={{
                keys: ["label"],
                threshold: 0.3,
                includeScore: true,
              }}
            />
          </div>

          {/* Generate and Cancel Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={generateCollage}
              disabled={
                loading ||
                generating ||
                (settings.format === "gif" && !ffmpegReady)
              }
              className="flex-1"
              size="lg"
            >
              {ffmpegLoading
                ? "Loading video processor..."
                : loading
                  ? "Fetching NFTs..."
                  : generating
                    ? `Generating ${settings.format.toUpperCase()}...`
                    : settings.format === "gif" && !ffmpegReady
                      ? "Video processor not ready"
                      : "Generate Collage"}
            </Button>

            {(loading || generating) && (
              <Button
                onClick={cancelGeneration}
                variant="destructive"
                size="lg"
              >
                <AiOutlineStop className="w-4 h-4" />
              </Button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* FFmpeg Status */}
        {settings.format === "gif" && (
          <div className="text-center text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-md">
            <p className="flex items-center justify-center gap-2">
              {ffmpegLoading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Loading video processor for GIF generation...
                </>
              ) : ffmpegReady ? (
                <>
                  <span className="text-green-600">✓</span>
                  Video processor ready for GIF generation
                </>
              ) : (
                <>
                  <span className="text-red-600">✗</span>
                  Video processor failed to load
                </>
              )}
            </p>
          </div>
        )}

        {/* Info */}
        {(nfts.length > 0 || progressiveNfts.length > 0) && (
          <div className="text-center text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-md">
            <p>
              Generated: {settings.dimensions}×{settings.dimensions} grid with{" "}
              {Math.max(nfts.length, progressiveNfts.filter((n) => n).length)}{" "}
              NFTs
            </p>
            <p>Collections: {selectedCollectionDisplayName}</p>
            <p>Format: {settings.format.toUpperCase()}</p>
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
