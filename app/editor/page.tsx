"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton, Spinner } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { ReactionMetadata } from "@/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import {
  AiOutlineCopy,
  AiOutlineDownload,
  AiOutlineLink,
} from "react-icons/ai";
import { ImagePicker } from "@/components/ui/ImagePicker";
import {
  useDynamicContext,
  useIsLoggedIn,
  DynamicConnectButton,
} from "@dynamic-labs/sdk-react-core";
import { middleEllipsis } from "@/lib/utils";

// Extracted Components
import { useWatchlist } from "./hooks/useNFTFetcher";
import { WatchlistManager } from "./components/WatchlistManager";
import { NFTPagination } from "./components/NFTPagination";
import { CollageTab } from "./components/CollageTab";
import { ReactionOverlayDraggable } from "./components/ReactionOverlayDraggable";
import { UnifiedNFTGallery } from "./components/UnifiedNFTGallery";
import { CollectionSelector } from "./components/CollectionSelector";
import { TokenIdInput } from "./components/TokenIdInput";
import { PresetSelector } from "./components/PresetSelector";
import { PreviewPanel } from "./components/PreviewPanel";

// Import types
import { UserNFT, SelectedNFT, ReactionSettings } from "./types";
import {
  isValidEthereumAddress,
  looksLikeENS,
  fileToDataUri,
  generateSpeechBubbleDataUrl,
} from "./utils";

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error("Invalid data URL");
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Helper functions for settings
function getReactionSettingsKey(
  collectionIndex: number,
  tokenID: string | number,
): string {
  return `reaction-settings-${collectionIndex}-${tokenID}`;
}

function saveReactionSettings(
  collectionIndex: number,
  tokenID: string | number,
  settings: ReactionSettings,
): void {
  const key = getReactionSettingsKey(collectionIndex, tokenID);
  localStorage.setItem(key, JSON.stringify(settings));
}

function loadReactionSettings(
  collectionIndex: number,
  tokenID: string | number,
): ReactionSettings | null {
  const key = getReactionSettingsKey(collectionIndex, tokenID);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Core state
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [imageExtension, setImageExtension] = useState("gif");
  const [loading, setLoading] = useState(true);
  const [tokenID, setTokenID] = useState<string | number>(1507);
  const [tempTokenID, setTempTokenID] = useState<string | number>(1507);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [urlParamsParsed, setUrlParamsParsed] = useState(false);
  const [collectionIndex, setCollectionIndex] = useState(2);

  // Reaction overlay state
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [overlayNumber, setOverlayNumber] = useState(18);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  // Media state
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [staticGifFrameUrl, setStaticGifFrameUrl] = useState<string | null>(
    null,
  );
  const [playAnimation, setPlayAnimation] = useState(true);

  // FFmpeg state
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const ffmpegLoadPromise = useRef<Promise<boolean> | null>(null);

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGifCopyModal, setShowGifCopyModal] = useState(false);
  const [gifBlobToCopy, setGifBlobToCopy] = useState<Blob | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "watchlist" | "loadwallet" | "upload" | "collage"
  >("watchlist");

  // Custom speech bubble state
  const [customSpeechBubbleText, setCustomSpeechBubbleText] =
    useState("!CHIMP");
  const [customSpeechBubbleDataUrl, setCustomSpeechBubbleDataUrl] = useState<
    string | null
  >(null);

  // NFT loading state
  const [walletInput, setWalletInput] = useState("");
  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);
  const [selectedFromWallet, setSelectedFromWallet] =
    useState<SelectedNFT | null>(null);

  // Pagination state
  const [allNFTsPage, setAllNFTsPage] = useState(1);
  const allNFTsPerPage = 24;

  // Watermark settings
  const [watermarkStyle, setWatermarkStyle] = useState("default");
  const [watermarkScalePreview, setWatermarkScalePreview] = useState(0.15);
  const [watermarkScaleCollage, setWatermarkScaleCollage] = useState(0.1);
  const [watermarkPaddingX, setWatermarkPaddingX] = useState(20);
  const [watermarkPaddingY, setWatermarkPaddingY] = useState(20);

  // Collection metadata helpers
  const collectionMetadata = collectionsMetadata[collectionIndex];
  const minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  const maxTokenID =
    collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);
  const supportedCollections = useMemo(() => {
    return new Set(
      collectionsMetadata.map((c) => c.contract?.toLowerCase()).filter(Boolean),
    );
  }, []);

  // Watchlist hook
  const watchlist = useWatchlist(supportedCollections);

  // Helper to generate speech bubble data URL
  const generateSpeechBubbleDataUrlMemo = useCallback((text: string) => {
    return generateSpeechBubbleDataUrl(text);
  }, []);

  // Update custom speech bubble when text changes
  useEffect(() => {
    if (reactionsMap[overlayNumber - 1]?.isCustom) {
      const dataUrl = generateSpeechBubbleDataUrlMemo(customSpeechBubbleText);
      setCustomSpeechBubbleDataUrl(dataUrl);
    }
  }, [customSpeechBubbleText, overlayNumber, generateSpeechBubbleDataUrlMemo]);

  // URL parameter handling
  const parseUrlParams = useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const collectionParam = params.get("collection");
    const tokenIdParam = params.get("tokenId");
    const overlayParam = params.get("overlay");
    const xParam = params.get("x");
    const yParam = params.get("y");
    const scaleParam = params.get("scale");

    if (collectionParam !== null) {
      const idx = parseInt(collectionParam);
      if (!isNaN(idx) && idx >= 0 && idx < collectionsMetadata.length) {
        setCollectionIndex(idx);
      }
    }

    if (tokenIdParam !== null) {
      const id = parseInt(tokenIdParam);
      if (!isNaN(id)) {
        setTokenID(id);
        setTempTokenID(id);
      }
    }

    if (overlayParam !== null) {
      const overlay = parseInt(overlayParam);
      if (!isNaN(overlay) && overlay >= 1 && overlay <= reactionsMap.length) {
        setOverlayNumber(overlay);
      }
    }

    if (xParam !== null && yParam !== null && scaleParam !== null) {
      const xVal = parseInt(xParam);
      const yVal = parseInt(yParam);
      const scaleVal = parseFloat(scaleParam);
      if (!isNaN(xVal) && !isNaN(yVal) && !isNaN(scaleVal)) {
        setX(xVal);
        setY(yVal);
        setScale(scaleVal);
      }
    }

    setUrlParamsParsed(true);
  }, []);

  const updateUrlParams = useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    params.set("collection", collectionIndex.toString());
    params.set("tokenId", tokenID.toString());
    params.set("overlay", overlayNumber.toString());
    params.set("x", x.toString());
    params.set("y", y.toString());
    params.set("scale", scale.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [collectionIndex, tokenID, overlayNumber, x, y, scale]);

  const debouncedUpdateUrlParams = useMemo(
    () => debounce(updateUrlParams, 500),
    [updateUrlParams],
  );

  // NFT Loading functionality
  const fetchWalletNFTs = useCallback(
    async (address: string, cursor?: string) => {
      if (!address.trim()) return;

      setNftLoading(true);
      setNftError(null);
      setActiveWallet(address);

      if (!cursor) {
        setNfts([]);
        setNextCursor(null);
        setHasMore(false);
        setProviderName(null);
      }

      try {
        const response = await fetch(
          `/api/nfts?address=${encodeURIComponent(address)}${cursor ? `&cursor=${cursor}` : ""}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch NFTs: ${response.statusText}`);
        }

        const data = await response.json();

        if (cursor) {
          setNfts((prev) => [...prev, ...data.nfts]);
        } else {
          setNfts(data.nfts);
        }

        setNextCursor(data.next || null);
        setHasMore(!!data.next);
        setProviderName(data.providerName || null);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
        setNftError(
          error instanceof Error ? error.message : "Failed to load NFTs",
        );
      } finally {
        setNftLoading(false);
      }
    },
    [],
  );

  // NFT selection handler
  const handleNFTSelect = useCallback(
    (
      contract: string,
      tokenId: string,
      imageUrl: string,
      walletAddress?: string,
      walletLabel?: string,
    ) => {
      const collectionMatch = collectionsMetadata.find(
        (c) => c.contract?.toLowerCase() === contract.toLowerCase(),
      );

      if (collectionMatch) {
        const newCollectionIndex = collectionsMetadata.indexOf(collectionMatch);
        setCollectionIndex(newCollectionIndex);
        setTokenID(tokenId);
        setTempTokenID(tokenId);
        setFile(null);
        setUploadedImageUri(null);
        setLoading(true);

        // Set selection info
        if (walletAddress) {
          const source =
            walletAddress === primaryWallet?.address
              ? "your-wallet"
              : watchlist.isInWatchlist(walletAddress)
                ? "watchlist"
                : "external-wallet";
          setSelectedFromWallet({
            contract,
            tokenId,
            imageUrl,
            source,
            walletAddress,
            walletLabel,
          });
        } else {
          setSelectedFromWallet(null);
        }
      }
    },
    [primaryWallet?.address, watchlist],
  );

  // Load wallet functionality
  const loadWallet = useCallback(() => {
    if (!walletInput.trim()) return;
    fetchWalletNFTs(walletInput.trim());
  }, [walletInput, fetchWalletNFTs]);

  // Clipboard functionality
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWalletInput(text.trim());
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  }, []);

  // Copy URL functionality
  const copyUrlToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("URL copied to clipboard!");
      setTimeout(() => setCopyStatus(null), 3000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      setCopyStatus("Failed to copy URL");
      setTimeout(() => setCopyStatus(null), 3000);
    }
  }, []);

  // Main image rendering with FFmpeg
  const debouncedRenderImageUrl = useCallback(
    debounce(async () => {
      if (!imageUrl || !ffmpegRef.current || !ffmpegReady) return;

      let overlaySettings: Partial<ReactionMetadata> =
        reactionsMap[overlayNumber - 1];

      try {
        setLoading(true);

        let filedata;
        if (uploadedImageUri) {
          filedata = await fetchFile(uploadedImageUri);
        } else {
          filedata = await fetchFile(imageUrl);
        }

        const imageBytes = new Uint8Array(filedata);
        const isPNG =
          imageBytes[0] === 0x89 &&
          imageBytes[1] === 0x50 &&
          imageBytes[2] === 0x4e &&
          imageBytes[3] === 0x47;
        const isGIF =
          imageBytes[0] === 0x47 &&
          imageBytes[1] === 0x49 &&
          imageBytes[2] === 0x46;
        const extension = isPNG ? "png" : isGIF ? "gif" : "jpg";
        setImageExtension(extension);

        await ffmpegRef.current.writeFile(`input.${extension}`, filedata);

        // Handle custom speech bubble or regular reaction
        if (overlaySettings.isCustom && customSpeechBubbleDataUrl) {
          await ffmpegRef.current.writeFile(
            "reaction.png",
            await fetchFile(customSpeechBubbleDataUrl),
          );
        } else {
          await ffmpegRef.current.writeFile(
            "reaction.png",
            await fetchFile(`/reactions/${overlaySettings.filename}`),
          );
        }

        let ffmpegArgs;
        if (overlayEnabled) {
          const watermarkFile =
            watermarkStyle === "oneline" ? "credit-oneline.png" : "credit.png";
          const watermarkPath =
            watermarkStyle === "oneline"
              ? "/credit-oneline.png"
              : "/credit.png";

          let watermarkData;
          try {
            watermarkData = await fetchFile(watermarkPath);
          } catch (error) {
            watermarkData = await fetchFile("/credit.png");
          }

          await ffmpegRef.current.writeFile(watermarkFile, watermarkData);
          ffmpegArgs = [
            "-i",
            `input.${extension}`,
            "-i",
            "reaction.png",
            "-i",
            watermarkFile,
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}[video1]; [2:v]scale=iw*${watermarkScalePreview}:-1[scaled2]; [video1][scaled2]overlay=x=W-w-${watermarkPaddingX}:y=H-h-${watermarkPaddingY}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${extension}`,
          ];
        } else {
          ffmpegArgs = [
            "-i",
            `input.${extension}`,
            "-i",
            "reaction.png",
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${extension}`,
          ];
        }

        await ffmpegRef.current.exec(ffmpegArgs);
        const data = await ffmpegRef.current.readFile(`output.${extension}`);
        const url = URL.createObjectURL(
          new Blob([data], { type: `image/${extension}` }),
        );
        setFinalResult(url);
      } catch (error) {
        console.error("Error during FFmpeg execution:", error);
      } finally {
        setLoading(false);
      }
    }, 200),
    [
      ffmpegReady,
      uploadedImageUri,
      imageUrl,
      overlayNumber,
      scale,
      x,
      y,
      overlayEnabled,
      watermarkStyle,
      watermarkPaddingX,
      watermarkPaddingY,
      watermarkScalePreview,
      customSpeechBubbleDataUrl,
    ],
  );

  // Download functionality
  const downloadOutput = useCallback(async () => {
    if (!finalResult) return;

    if (imageExtension === "gif" && !playAnimation && staticGifFrameUrl) {
      const a = document.createElement("a");
      a.href = staticGifFrameUrl;
      a.download = `${collectionMetadata.name}-${tokenID}-${reactionsMap[overlayNumber - 1].title}.png`;
      a.click();
      return;
    }

    const a = document.createElement("a");
    a.href = finalResult;
    a.download = `${collectionMetadata.name}-${tokenID}-${reactionsMap[overlayNumber - 1].title}.${imageExtension}`;
    a.click();
  }, [
    finalResult,
    imageExtension,
    playAnimation,
    staticGifFrameUrl,
    collectionMetadata.name,
    tokenID,
    overlayNumber,
  ]);

  // Copy to clipboard functionality
  const copyBlobToClipboard = useCallback(async (blobUrl: string) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      if (blob.type === "image/gif") {
        setGifBlobToCopy(blob);
        setShowGifCopyModal(true);
        return;
      }

      if (!navigator.clipboard.write) {
        setCopyStatus(
          "Your browser does not support copying images to clipboard",
        );
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopyStatus("Image copied to clipboard successfully!");
    } catch (err) {
      console.error("Failed to copy image:", err);
      setCopyStatus(
        "Failed to copy image. Please try again or download instead.",
      );
    }
  }, []);

  // Feeling Lucky functionality
  const handleFeelingLucky = useCallback(() => {
    const randomCollectionIndex = Math.floor(
      Math.random() * collectionsMetadata.length,
    );
    const randomCollection = collectionsMetadata[randomCollectionIndex];
    const min = 1 + (randomCollection.tokenIdOffset ?? 0);
    const max = randomCollection.total + (randomCollection.tokenIdOffset ?? 0);
    const randomTokenId = Math.floor(Math.random() * (max - min + 1)) + min;
    const randomPreset = Math.floor(Math.random() * reactionsMap.length) + 1;

    setCollectionIndex(randomCollectionIndex);
    setTokenID(randomTokenId);
    setTempTokenID(randomTokenId);
    setOverlayNumber(randomPreset);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
    setSelectedFromWallet(null);
    setWalletInput("");
    setNfts([]);
    setNftError(null);
    setActiveWallet(null);
  }, []);

  // Effects
  useEffect(() => {
    if (isFirstRender) {
      setLoading(true);
      setIsFirstRender(false);
    }
  }, [isFirstRender]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      parseUrlParams();
    }
  }, [parseUrlParams]);

  useEffect(() => {
    if (typeof window !== "undefined" && !isFirstRender) {
      updateUrlParams();
    }
  }, [updateUrlParams, isFirstRender]);

  useEffect(() => {
    if (!urlParamsParsed) return;

    (async () => {
      if (
        isNaN(Number(tokenID)) ||
        Number(tokenID) < minTokenID ||
        Number(tokenID) > maxTokenID
      ) {
        return;
      }

      if (collectionMetadata.gifOverride) {
        const gifUrl = collectionMetadata.gifOverride(tokenID.toString());
        setImageUrl(`/proxy?url=${encodeURIComponent(gifUrl)}`);
        return;
      }

      try {
        const response = await fetch(
          `/fetchNFTImage?tokenId=${tokenID}&contract=${collectionMetadata.contract}`,
        );
        if (!response.ok) {
          throw new Error(`Error fetching image URL: ${response.statusText}`);
        }
        const { imageUrl } = await response.json();
        if (imageUrl.includes("ipfs")) {
          setImageUrl(imageUrl);
        } else {
          setImageUrl(`/proxy?url=${imageUrl}`);
        }
      } catch (error) {
        console.error("Error fetching image:", error);
      }
    })();
  }, [
    collectionIndex,
    collectionMetadata,
    maxTokenID,
    minTokenID,
    tokenID,
    urlParamsParsed,
  ]);

  // FFmpeg initialization
  useEffect(() => {
    const loadFfmpeg = async () => {
      if (typeof window === "undefined") return;
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
      }
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      const ffmpeg = ffmpegRef.current;
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
    };
    loadFfmpeg();
  }, []);

  // File upload effect
  useEffect(() => {
    if (file) {
      fileToDataUri(file).then((dataUri) => {
        setUploadedImageUri(dataUri as string);
      });
    } else {
      setUploadedImageUri(null);
    }
  }, [file]);

  // Main rendering effect
  useEffect(() => {
    if (
      ffmpegReady &&
      (imageUrl || uploadedImageUri) &&
      !dragging &&
      !resizing
    ) {
      debouncedRenderImageUrl();
    }
  }, [
    ffmpegReady,
    uploadedImageUri,
    debouncedRenderImageUrl,
    imageUrl,
    dragging,
    resizing,
  ]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      debouncedRenderImageUrl.cancel();
    };
  }, [debouncedRenderImageUrl]);

  // Reset overlay position when preset changes
  useEffect(() => {
    const overlaySettings = reactionsMap[overlayNumber - 1];
    setX(overlaySettings.x);
    setY(overlaySettings.y);
    setScale(overlaySettings.scale);
  }, [overlayNumber]);

  // Helper to determine if image is GIF
  const isGIF = imageExtension === "gif";

  // Extract first frame for static preview
  useEffect(() => {
    async function extractFirstFrame(gifUrl: string) {
      try {
        const response = await fetch(gifUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return await new Promise<string>((resolve, reject) => {
          const img = new window.Image();
          img.onload = function () {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Failed to get canvas context."));
                URL.revokeObjectURL(url);
                return;
              }
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
              URL.revokeObjectURL(url);
            } catch (err) {
              reject(err);
              URL.revokeObjectURL(url);
            }
          };
          img.onerror = reject;
          img.src = url;
        });
      } catch (err) {
        return null;
      }
    }

    if (isGIF && finalResult && !playAnimation) {
      extractFirstFrame(finalResult).then(setStaticGifFrameUrl);
    } else {
      setStaticGifFrameUrl(null);
    }
  }, [isGIF, finalResult, playAnimation]);

  // Connected wallet NFTs effect
  useEffect(() => {
    if (isLoggedIn && primaryWallet?.address && activeTab === "loadwallet") {
      fetchWalletNFTs(primaryWallet.address);
    }
  }, [isLoggedIn, primaryWallet?.address, activeTab, fetchWalletNFTs]);

  // Gallery info for external wallets
  const getGalleryInfo = useMemo(() => {
    if (!activeWallet) return { title: "", subtitle: "" };

    const isYourWallet = activeWallet === primaryWallet?.address;

    if (isYourWallet) {
      if (nftLoading && nfts.length === 0) {
        return { title: "Your NFTs", subtitle: "Loading all your NFTs..." };
      } else if (nftLoading && nfts.length > 0) {
        return {
          title: "Your NFTs",
          subtitle: `Found ${nfts.length} NFTs so far, loading more...`,
        };
      } else {
        return {
          title: "Your NFTs",
          subtitle:
            nfts.length > 0
              ? `${nfts.length} NFTs found in your connected wallet`
              : "No supported NFTs found in your wallet",
        };
      }
    }

    const displayAddress =
      walletInput.includes(".") && !walletInput.startsWith("0x")
        ? walletInput
        : `${activeWallet.slice(0, 6)}...${activeWallet.slice(-4)}`;

    const subtitle =
      nftLoading && nfts.length === 0
        ? "Loading NFTs..."
        : hasMore
          ? `${nfts.length} NFTs found (more available)`
          : `${nfts.length} NFTs found`;

    return { title: `${displayAddress}'s NFTs`, subtitle };
  }, [
    activeWallet,
    primaryWallet?.address,
    nfts.length,
    walletInput,
    nftLoading,
    hasMore,
  ]);

  // Get all watchlist NFTs for pagination
  const allWatchlistNFTs = useMemo(() => {
    const allNFTs: Array<{
      nft: any;
      walletAddress: string;
      walletLabel: string;
    }> = [];
    const sources: {
      [walletAddress: string]: { count: number; label: string };
    } = {};

    watchlist.watchedWallets.forEach((wallet) => {
      const data = watchlist.walletData.get(wallet.address);
      if (data?.nfts) {
        const walletNFTs = data.nfts.map((nft) => ({
          nft,
          walletAddress: wallet.address,
          walletLabel: wallet.label || "",
        }));
        allNFTs.push(...walletNFTs);
        sources[wallet.address] = {
          count: data.nfts.length,
          label:
            wallet.label ||
            `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
        };
      }
    });

    // Sort by collection name, then token ID
    allNFTs.sort((a, b) => {
      const collectionA =
        collectionsMetadata.find(
          (c) => c.contract?.toLowerCase() === a.nft.contract.toLowerCase(),
        )?.name ||
        a.nft.collection ||
        "Unknown";
      const collectionB =
        collectionsMetadata.find(
          (c) => c.contract?.toLowerCase() === b.nft.contract.toLowerCase(),
        )?.name ||
        b.nft.collection ||
        "Unknown";

      if (collectionA !== collectionB) {
        return collectionA.localeCompare(collectionB);
      }

      return parseInt(a.nft.identifier) - parseInt(b.nft.identifier);
    });

    return {
      allNFTs: allNFTs.map((item) => item.nft),
      sources,
      allNFTsWithWallets: allNFTs,
    };
  }, [watchlist.watchedWallets, watchlist.walletData]);

  // Handler for Add to Watchlist button
  const handleAddToWatchlist = useCallback(
    (address?: string) => {
      return async function () {
        const addressToAdd = address || walletInput.trim();
        const result = await watchlist.addWallet(addressToAdd);
        if (result) {
          // Optionally show feedback
        }
      };
    },
    [walletInput, watchlist],
  );

  // Load all NFTs from external wallet
  const loadAllFromExternalWallet = useCallback(() => {
    // This would implement loading all NFTs at once
    // For now, we'll just continue loading more
    if (nextCursor && !nftLoading) {
      fetchWalletNFTs(walletInput.trim(), nextCursor);
    }
  }, [nextCursor, nftLoading, fetchWalletNFTs, walletInput]);

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-2 py-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Title */}
          <header className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              <a href="/" className="text-inherit no-underline">
                CHIMP.FUN
              </a>
            </h1>
            <p className="text-lg font-medium mb-2">NFT Editor</p>
          </header>

          {/* Preview Panel */}
          <PreviewPanel
            loading={loading}
            isFirstRender={isFirstRender}
            finalResult={finalResult}
            isGIF={isGIF}
            playAnimation={playAnimation}
            staticGifFrameUrl={staticGifFrameUrl}
            x={x}
            y={y}
            scale={scale}
            overlayNumber={overlayNumber}
            onOverlayChange={({ x: newX, y: newY, scale: newScale }) => {
              setX(newX);
              setY(newY);
              setScale(newScale);
            }}
            dragging={dragging}
            setDragging={setDragging}
            resizing={resizing}
            setResizing={setResizing}
            onDragEnd={() => {
              setDragging(false);
              debouncedRenderImageUrl();
              debouncedUpdateUrlParams();
            }}
            onResizeEnd={() => {
              setResizing(false);
              debouncedRenderImageUrl();
              debouncedUpdateUrlParams();
            }}
            onDownload={downloadOutput}
            onCopy={() => finalResult && copyBlobToClipboard(finalResult)}
            copyStatus={copyStatus}
            showGifCopyModal={showGifCopyModal}
            onGifCopyConfirm={async () => {
              if (!gifBlobToCopy) return;
              setShowGifCopyModal(false);
              try {
                // Copy first frame as PNG
                const url = URL.createObjectURL(gifBlobToCopy);
                const img = new window.Image();
                img.onload = async function () {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob(async (pngBlob) => {
                    if (!pngBlob) return;
                    try {
                      await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": pngBlob }),
                      ]);
                      setCopyStatus("Image copied to clipboard!");
                    } catch (err) {
                      setCopyStatus("Failed to copy image to clipboard.");
                    }
                  }, "image/png");
                  URL.revokeObjectURL(url);
                };
                img.src = url;
              } catch (err) {
                setCopyStatus("Failed to copy image to clipboard.");
              } finally {
                setGifBlobToCopy(null);
              }
            }}
            onGifCopyCancel={() => {
              setShowGifCopyModal(false);
              setGifBlobToCopy(null);
            }}
          />

          {/* Copy status */}
          {copyStatus && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              {copyStatus}
            </div>
          )}

          {/* Feeling Lucky Button */}
          <div className="flex justify-center mt-4">
            <Button onClick={handleFeelingLucky} variant="secondary">
              I&apos;m Feeling Lucky
            </Button>
          </div>

          {/* Settings Section */}
          <div className="flex flex-col gap-4 mt-4">
            {/* Collection Selector */}
            <CollectionSelector
              selectedIndex={collectionIndex}
              onSelectionChange={(newIndex) => {
                setLoading(true);
                setCollectionIndex(newIndex);
                const newMetadata = collectionsMetadata[newIndex];
                const newMinTokenID = 1 + (newMetadata.tokenIdOffset ?? 0);
                const newMaxTokenID =
                  newMetadata.total + (newMetadata.tokenIdOffset ?? 0);

                if (
                  Number(tokenID) < newMinTokenID ||
                  Number(tokenID) > newMaxTokenID
                ) {
                  setTokenID(newMinTokenID);
                  setTempTokenID(newMinTokenID);
                }
                setFile(null);
                setUploadedImageUri(null);
                setSelectedFromWallet(null);
              }}
              onClearWalletSelection={() => setSelectedFromWallet(null)}
            />

            {/* Show selected from wallet info */}
            {selectedFromWallet && (
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border-l-2 border-blue-500">
                {selectedFromWallet.source === "your-wallet" ? (
                  <span>🔗 Selected from your wallet</span>
                ) : selectedFromWallet.source === "watchlist" ? (
                  <span>
                    ⭐ Selected from watchlist:{" "}
                    {selectedFromWallet.walletLabel ||
                      (selectedFromWallet.walletAddress
                        ? `${selectedFromWallet.walletAddress.slice(0, 6)}...${selectedFromWallet.walletAddress.slice(-4)}`
                        : "")}
                  </span>
                ) : (
                  <span>
                    🔍 Selected from{" "}
                    {selectedFromWallet.walletAddress
                      ? `${selectedFromWallet.walletAddress.slice(0, 6)}...${selectedFromWallet.walletAddress.slice(-4)}`
                      : "external wallet"}
                  </span>
                )}
              </div>
            )}

            {/* Token ID Input */}
            <TokenIdInput
              tokenId={tokenID}
              tempTokenId={tempTokenID}
              minTokenId={minTokenID}
              maxTokenId={maxTokenID}
              errorMessage={errorMessage}
              onTokenIdChange={(value) => {
                setTempTokenID(value);
                const tokenIdNum = Number(value);
                if (
                  !isNaN(tokenIdNum) &&
                  tokenIdNum >= minTokenID &&
                  tokenIdNum <= maxTokenID
                ) {
                  setErrorMessage(null);
                  setTokenID(tokenIdNum);
                  setLoading(true);
                  setFile(null);
                  setUploadedImageUri(null);
                  setSelectedFromWallet(null);
                } else {
                  setErrorMessage(
                    `Invalid Token ID, please choose between ${minTokenID} and ${maxTokenID}`,
                  );
                }
              }}
              onRandomClick={() => {
                const randomId = Math.floor(Math.random() * maxTokenID) + 1;
                setTempTokenID(randomId);
                setTokenID(randomId);
                setLoading(true);
                setFile(null);
                setUploadedImageUri(null);
                setSelectedFromWallet(null);
              }}
              collectionMetadata={collectionMetadata}
            />

            {/* Preset Selector */}
            <PresetSelector
              selectedPreset={overlayNumber}
              onPresetChange={(preset) => {
                setLoading(true);
                setOverlayNumber(preset);
              }}
              onRandomPreset={() => {
                const randomReaction =
                  Math.floor(Math.random() * reactionsMap.length) + 1;
                setOverlayNumber(randomReaction);
                setLoading(true);
              }}
              playAnimation={playAnimation}
              onPlayAnimationChange={setPlayAnimation}
              overlayEnabled={overlayEnabled}
              onOverlayEnabledChange={setOverlayEnabled}
              collectionName={collectionMetadata.name}
            />

            {/* Custom speech bubble text input */}
            {reactionsMap[overlayNumber - 1]?.isCustom && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="customSpeechBubbleText">Custom Text</Label>
                <textarea
                  id="customSpeechBubbleText"
                  value={customSpeechBubbleText}
                  onChange={(e) => setCustomSpeechBubbleText(e.target.value)}
                  placeholder="Enter your custom text..."
                  className="mb-2 w-full text-base p-2 rounded border resize-y min-h-[60px]"
                  rows={3}
                />
                <small className="text-muted-foreground">
                  Press Enter for new lines. Text will be centered in the speech
                  bubble.
                </small>
              </div>
            )}

            {/* Watermark toggle */}
            <div className="flex items-center space-x-2 w-full">
              <Switch
                id="overlayEnabled"
                checked={overlayEnabled}
                onCheckedChange={setOverlayEnabled}
              />
              <Label htmlFor="overlayEnabled">Watermark</Label>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mt-6 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "watchlist"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Watchlist{" "}
              {watchlist.watchedWallets.length > 0 &&
                `(${watchlist.watchedWallets.length})`}
            </button>
            <button
              onClick={() => setActiveTab("loadwallet")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "loadwallet"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Load Wallet
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload Image
            </button>
            <button
              onClick={() => setActiveTab("collage")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "collage"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Collage
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === "watchlist" && (
              <div className="space-y-6">
                <WatchlistManager
                  watchlist={watchlist}
                  supportedCollections={supportedCollections}
                  onSelectNFT={handleNFTSelect}
                  isResolvingENS={isResolvingENS}
                />
                {allWatchlistNFTs.allNFTs.length > 0 && (
                  <NFTPagination
                    nfts={allWatchlistNFTs.allNFTs}
                    itemsPerPage={allNFTsPerPage}
                    currentPage={allNFTsPage}
                    onPageChange={setAllNFTsPage}
                    onSelectNFT={(contract, tokenId, imageUrl) => {
                      const nftWithWallet =
                        allWatchlistNFTs.allNFTsWithWallets.find(
                          (item) =>
                            item.nft.contract === contract &&
                            item.nft.identifier === tokenId,
                        );
                      handleNFTSelect(
                        contract,
                        tokenId,
                        imageUrl,
                        nftWithWallet?.walletAddress,
                        nftWithWallet?.walletLabel,
                      );
                    }}
                    supportedCollections={supportedCollections}
                    sources={allWatchlistNFTs.sources}
                  />
                )}
              </div>
            )}

            {activeTab === "loadwallet" && (
              <div className="flex flex-col gap-4">
                {/* Connect Wallet Section */}
                {!isLoggedIn ? (
                  <div className="flex flex-col gap-3 p-4 border rounded-md">
                    <h3 className="text-lg font-medium">Connect Your Wallet</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet to load your NFTs automatically
                    </p>
                    <DynamicConnectButton>
                      <Button className="w-full">Connect Wallet</Button>
                    </DynamicConnectButton>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-4 border rounded-md">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Connected Wallet</h3>
                      <span className="text-sm text-green-600 font-medium">
                        Connected
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your wallet is connected. NFTs will load automatically.
                    </p>
                    {primaryWallet?.address && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">
                          {middleEllipsis(primaryWallet.address, 20)}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={
                            isResolvingENS ||
                            watchlist.isInWatchlist(primaryWallet.address)
                          }
                          onClick={handleAddToWatchlist(primaryWallet.address)}
                          title={
                            watchlist.isInWatchlist(primaryWallet.address)
                              ? "Already in watchlist"
                              : "Add to Watchlist"
                          }
                        >
                          {watchlist.isInWatchlist(primaryWallet.address)
                            ? "In Watchlist"
                            : "+ Add to Watchlist"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Wallet Input Section */}
                <div className="flex flex-col gap-3 p-4 border rounded-md">
                  <h3 className="text-lg font-medium">Load Any Wallet</h3>
                  <Label htmlFor="walletInput">
                    Enter wallet address or ENS name
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="walletInput"
                      placeholder="0x... or vitalik.eth"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      className="flex-1 min-w-0 font-mono text-sm"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          walletInput.trim() &&
                          !nftLoading
                        ) {
                          setNfts([]);
                          fetchWalletNFTs(walletInput.trim());
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePasteFromClipboard}
                      title="Paste from clipboard"
                    >
                      📋
                    </Button>
                    <Button
                      variant="outline"
                      onClick={loadWallet}
                      disabled={
                        nftLoading || isResolvingENS || !walletInput.trim()
                      }
                    >
                      {nftLoading || isResolvingENS
                        ? "Loading..."
                        : "Load NFTs"}
                    </Button>
                  </div>
                  <Button
                    className="mt-2"
                    variant="secondary"
                    size="sm"
                    disabled={
                      !walletInput.trim() ||
                      isResolvingENS ||
                      watchlist.isInWatchlist(walletInput.trim()) ||
                      (!isValidEthereumAddress(walletInput.trim()) &&
                        !looksLikeENS(walletInput.trim()))
                    }
                    onClick={handleAddToWatchlist()}
                    title={
                      watchlist.isInWatchlist(walletInput.trim())
                        ? "Already in watchlist"
                        : !isValidEthereumAddress(walletInput.trim()) &&
                            !looksLikeENS(walletInput.trim())
                          ? "Enter a valid address or ENS"
                          : "Add to Watchlist"
                    }
                  >
                    + Add to Watchlist
                  </Button>
                </div>

                {/* Display Connected Wallet NFTs */}
                {isLoggedIn &&
                  (nfts.length > 0 || nftLoading || nftError) &&
                  activeWallet === primaryWallet?.address && (
                    <UnifiedNFTGallery
                      onSelectNFT={(contract, tokenId, imageUrl) =>
                        handleNFTSelect(
                          contract,
                          tokenId,
                          imageUrl,
                          primaryWallet?.address,
                        )
                      }
                      supportedCollections={supportedCollections}
                      nfts={nfts}
                      loading={nftLoading}
                      error={nftError}
                      hasMore={hasMore}
                      providerName={providerName}
                      onLoadMore={() => {}}
                      title="Your NFTs"
                      subtitle={
                        nfts.length > 0
                          ? `${nfts.length} NFTs found in your connected wallet`
                          : undefined
                      }
                      showLoadingState={true}
                    />
                  )}

                {/* Display Manual Wallet NFTs */}
                {activeWallet &&
                  activeWallet !== primaryWallet?.address &&
                  (nfts.length > 0 || nftLoading || nftError) && (
                    <UnifiedNFTGallery
                      onSelectNFT={handleNFTSelect}
                      supportedCollections={supportedCollections}
                      nfts={nfts}
                      loading={nftLoading}
                      error={nftError}
                      hasMore={hasMore}
                      providerName={providerName}
                      onLoadMore={() => {
                        if (nextCursor && !nftLoading) {
                          fetchWalletNFTs(walletInput.trim(), nextCursor);
                        }
                      }}
                      onLoadAll={loadAllFromExternalWallet}
                      title={getGalleryInfo.title}
                      subtitle={getGalleryInfo.subtitle}
                      showLoadingState={true}
                    />
                  )}
              </div>
            )}

            {activeTab === "upload" && (
              <div className="flex flex-col gap-2">
                <ImagePicker
                  id="file"
                  onFileChange={setFile}
                  accept="image/*"
                  key={`image-picker-${collectionIndex}-${tokenID}`}
                />
                <Button
                  variant="outline"
                  onClick={async function handlePasteImage() {
                    try {
                      const clipboardItems = await navigator.clipboard.read();
                      for (const clipboardItem of clipboardItems) {
                        for (const type of clipboardItem.types) {
                          if (type.startsWith("image/")) {
                            const blob = await clipboardItem.getType(type);
                            const file = new File([blob], "pasted-image", {
                              type,
                            });
                            setFile(file);
                            return;
                          }
                        }
                      }
                      alert("No image found in clipboard");
                    } catch (err) {
                      console.error("Failed to read clipboard:", err);
                      alert("Failed to read clipboard");
                    }
                  }}
                >
                  📋 Paste From Clipboard
                </Button>
                <small className="text-muted-foreground">
                  Tip: Use 1:1 aspect ratio for best results.
                </small>
              </div>
            )}

            {activeTab === "collage" && (
              <CollageTab
                watermarkEnabled={overlayEnabled}
                watermarkStyle={watermarkStyle}
                watermarkScale={watermarkScaleCollage}
                watermarkPaddingX={watermarkPaddingX}
                watermarkPaddingY={watermarkPaddingY}
                currentCollectionContract={collectionMetadata.contract}
              />
            )}
          </div>

          {/* Share URL functionality */}
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrlToClipboard}
              className="flex items-center gap-2"
            >
              <AiOutlineLink />
              Share Template
            </Button>
          </div>
        </div>
      </main>

      {/* Tooltip CSS */}
      <style jsx global>{`
        .middle-ellipsis-tooltip {
          position: relative;
        }
        .middle-ellipsis-tooltip-content {
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.95);
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          white-space: pre-line;
          z-index: 100;
          min-width: 120px;
          max-width: 220px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
          transition: opacity 0.15s;
          margin-top: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }
        .middle-ellipsis-tooltip:hover .middle-ellipsis-tooltip-content,
        .middle-ellipsis-tooltip:focus .middle-ellipsis-tooltip-content {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
        }
        @media (hover: none) {
          .middle-ellipsis-tooltip:active .middle-ellipsis-tooltip-content,
          .middle-ellipsis-tooltip:focus .middle-ellipsis-tooltip-content {
            visibility: visible;
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>
    </>
  );
}

// Suspense wrapper to handle useSearchParams during SSG
export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPage />
    </Suspense>
  );
}
