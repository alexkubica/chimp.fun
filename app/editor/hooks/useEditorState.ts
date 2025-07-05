import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { debounce } from "lodash";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { SelectedNFT } from "../types";

export function useEditorState() {
  const searchParams = useSearchParams();

  // Core editor state
  const [loading, setLoading] = useState(true);
  const [tokenID, setTokenID] = useState<string | number>(2956);
  const [tempTokenID, setTempTokenID] = useState<string | number>(2956);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [collectionIndex, setCollectionIndex] = useState(0);
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [overlayNumber, setOverlayNumber] = useState(18);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [playAnimation, setPlayAnimation] = useState(true);
  const [staticGifFrameUrl, setStaticGifFrameUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Modal state
  const [showGifCopyModal, setShowGifCopyModal] = useState(false);
  const [gifBlobToCopy, setGifBlobToCopy] = useState<Blob | null>(null);

  // Wallet selection state
  const [selectedFromWallet, setSelectedFromWallet] = useState<SelectedNFT | null>(null);
  const [walletInput, setWalletInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"connected" | "input">("connected");

  // Watermark configuration
  const [watermarkStyle, setWatermarkStyle] = useState<"oneline" | "twoline">("twoline");
  const watermarkPaddingX = -170;
  const watermarkPaddingY = -30;
  const watermarkScale = 3;

  // Computed values
  const collectionMetadata = collectionsMetadata[collectionIndex];
  const minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  const maxTokenID = collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);
  const isGIF = finalResult?.includes("data:image/gif") || false;

  // URL parameter handling functions
  const parseUrlParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);

    // Parse preset (overlayNumber)
    const presetParam = params.get("preset");
    if (presetParam) {
      const presetIndex = reactionsMap.findIndex(
        (r) => r.title.toLowerCase() === presetParam.toLowerCase(),
      );
      if (presetIndex >= 0) {
        setOverlayNumber(presetIndex + 1);
      }
    } else {
      // Default to CHIMP preset if not specified
      const chimpIndex = reactionsMap.findIndex((r) =>
        r.title.toLowerCase().includes("chimp"),
      );
      if (chimpIndex >= 0) {
        setOverlayNumber(chimpIndex + 1);
      }
    }

    // Parse collection
    const collectionParam = params.get("collection");
    if (collectionParam) {
      const collectionIdx = collectionsMetadata.findIndex(
        (c) => c.name.toLowerCase() === collectionParam.toLowerCase(),
      );
      if (collectionIdx >= 0) {
        setCollectionIndex(collectionIdx);
      }
    }

    // Parse id (tokenID)
    const idParam = params.get("id");
    if (idParam && !isNaN(Number(idParam))) {
      setTokenID(Number(idParam));
      setTempTokenID(Number(idParam));
    }

    // Parse watermark (overlayEnabled)
    const watermarkParam = params.get("watermark");
    if (watermarkParam !== null) {
      setOverlayEnabled(
        watermarkParam.toLowerCase() === "true" ||
          watermarkParam === "made with chimp.fun",
      );
    }

    // Parse animated (playAnimation)
    const animatedParam = params.get("animated");
    if (animatedParam !== null) {
      setPlayAnimation(animatedParam.toLowerCase() === "true");
    }

    // Parse position and scale
    const xParam = params.get("x");
    const yParam = params.get("y");
    const scaleParam = params.get("scale");

    if (xParam && !isNaN(Number(xParam))) {
      setX(Number(xParam));
    }
    if (yParam && !isNaN(Number(yParam))) {
      setY(Number(yParam));
    }
    if (scaleParam && !isNaN(Number(scaleParam))) {
      setScale(Number(scaleParam));
    }

    // Parse wallet id
    const walletIdParam = params.get("walletId");
    if (walletIdParam && /^0x[a-fA-F0-9]{40}$/.test(walletIdParam)) {
      setWalletInput(walletIdParam);
      setActiveTab("input");
    }
  }, []);

  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    // Add preset (reaction title)
    const currentReaction = reactionsMap[overlayNumber - 1];
    if (currentReaction) {
      params.set("preset", currentReaction.title);
    }

    // Add collection
    const currentCollection = collectionsMetadata[collectionIndex];
    if (currentCollection) {
      params.set("collection", currentCollection.name);
    }

    // Add id (tokenID)
    params.set("id", tokenID.toString());

    // Add watermark
    params.set("watermark", overlayEnabled ? "made with chimp.fun" : "false");

    // Add animated
    params.set("animated", playAnimation.toString());

    // Add position and scale
    params.set("x", x.toString());
    params.set("y", y.toString());
    params.set("scale", scale.toString());

    // Add wallet id if available
    if (walletInput && activeTab === "input") {
      params.set("walletId", walletInput);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    overlayNumber,
    collectionIndex,
    tokenID,
    overlayEnabled,
    playAnimation,
    x,
    y,
    scale,
    walletInput,
    activeTab,
  ]);

  // Debounced URL update for drag/resize operations
  const debouncedUpdateUrlParams = useMemo(
    () => debounce(updateUrlParams, 500),
    [updateUrlParams],
  );

  // Collection change handler
  const handleCollectionChange = useCallback((newCollectionIndex: number) => {
    setLoading(true);
    setCollectionIndex(newCollectionIndex);
    
    const newCollectionMetadata = collectionsMetadata[newCollectionIndex];
    const newMinTokenID = 1 + (newCollectionMetadata.tokenIdOffset ?? 0);
    const newMaxTokenID = newCollectionMetadata.total + (newCollectionMetadata.tokenIdOffset ?? 0);
    
    if (Number(tokenID) < newMinTokenID || Number(tokenID) > newMaxTokenID) {
      setTokenID(newMinTokenID);
      setTempTokenID(newMinTokenID);
    }
    
    setFile(null);
    setUploadedImageUri(null);
  }, [tokenID]);

  // Token ID change handler
  const handleTokenIdChange = useCallback((newTokenId: string | number) => {
    setTempTokenID(newTokenId);
    const tokenIdNum = Number(newTokenId);
    
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
    } else {
      setErrorMessage(
        `Invalid Token ID, please choose between ${minTokenID} and ${maxTokenID}`,
      );
    }
  }, [minTokenID, maxTokenID]);

  // Random token ID handler
  const handleRandomTokenId = useCallback(() => {
    const randomTokenId = Math.floor(Math.random() * (maxTokenID - minTokenID + 1)) + minTokenID;
    setTokenID(randomTokenId);
    setTempTokenID(randomTokenId);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
  }, [minTokenID, maxTokenID]);

  // Preset change handler
  const handlePresetChange = useCallback((newPreset: number) => {
    setLoading(true);
    setOverlayNumber(newPreset);
  }, []);

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

  // Clear wallet selection
  const clearWalletSelection = useCallback(() => {
    setSelectedFromWallet(null);
  }, []);

  return {
    // Core state
    loading,
    setLoading,
    tokenID,
    tempTokenID,
    isFirstRender,
    setIsFirstRender,
    collectionIndex,
    x,
    setX,
    y,
    setY,
    scale,
    setScale,
    overlayNumber,
    file,
    setFile,
    uploadedImageUri,
    setUploadedImageUri,
    finalResult,
    setFinalResult,
    imageUrl,
    setImageUrl,
    overlayEnabled,
    setOverlayEnabled,
    errorMessage,
    setErrorMessage,
    dragging,
    setDragging,
    resizing,
    setResizing,
    playAnimation,
    setPlayAnimation,
    staticGifFrameUrl,
    setStaticGifFrameUrl,
    copyStatus,
    setCopyStatus,
    
    // Modal state
    showGifCopyModal,
    setShowGifCopyModal,
    gifBlobToCopy,
    setGifBlobToCopy,
    
    // Wallet state
    selectedFromWallet,
    setSelectedFromWallet,
    walletInput,
    setWalletInput,
    activeTab,
    setActiveTab,
    
    // Watermark config
    watermarkStyle,
    setWatermarkStyle,
    watermarkPaddingX,
    watermarkPaddingY,
    watermarkScale,
    
    // Computed values
    collectionMetadata,
    minTokenID,
    maxTokenID,
    isGIF,
    
    // Functions
    parseUrlParams,
    updateUrlParams,
    debouncedUpdateUrlParams,
    handleCollectionChange,
    handleTokenIdChange,
    handleRandomTokenId,
    handlePresetChange,
    copyUrlToClipboard,
    clearWalletSelection,
  };
}