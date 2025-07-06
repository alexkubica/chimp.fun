import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { debounce } from 'lodash';
import { collectionsMetadata, reactionsMap } from '@/consts';

export const useUrlParams = ({
  overlayNumber,
  collectionIndex,
  tokenID,
  overlayEnabled,
  playAnimation,
  x,
  y,
  scale,
  activeWallet,
  primaryWalletAddress,
  setOverlayNumber,
  setCollectionIndex,
  setTokenID,
  setTempTokenID,
  setOverlayEnabled,
  setPlayAnimation,
  setX,
  setY,
  setScale,
  setWalletInput,
  setActiveTab,
}: {
  overlayNumber: number;
  collectionIndex: number;
  tokenID: string | number;
  overlayEnabled: boolean;
  playAnimation: boolean;
  x: number;
  y: number;
  scale: number;
  activeWallet: string | null;
  primaryWalletAddress?: string;
  setOverlayNumber: (num: number) => void;
  setCollectionIndex: (index: number) => void;
  setTokenID: (id: string | number) => void;
  setTempTokenID: (id: string | number) => void;
  setOverlayEnabled: (enabled: boolean) => void;
  setPlayAnimation: (play: boolean) => void;
  setX: (x: number) => void;
  setY: (y: number) => void;
  setScale: (scale: number) => void;
  setWalletInput: (input: string) => void;
  setActiveTab: (tab: "connected" | "input") => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    if (walletIdParam && isValidEthereumAddress(walletIdParam)) {
      setWalletInput(walletIdParam);
      setActiveTab("input");
    }
  }, [
    setOverlayNumber,
    setCollectionIndex,
    setTokenID,
    setTempTokenID,
    setOverlayEnabled,
    setPlayAnimation,
    setX,
    setY,
    setScale,
    setWalletInput,
    setActiveTab,
  ]);

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
    if (activeWallet && activeWallet !== primaryWalletAddress) {
      params.set("walletId", activeWallet);
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
    activeWallet,
    primaryWalletAddress,
  ]);

  // Debounced URL update for drag/resize operations
  const debouncedUpdateUrlParams = useMemo(
    () => debounce(updateUrlParams, 500),
    [updateUrlParams],
  );

  const copyUrlToClipboard = useCallback(async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      return "URL copied to clipboard!";
    } catch (err) {
      console.error("Failed to copy URL:", err);
      return "Failed to copy URL. Please try again.";
    }
  }, []);

  return {
    parseUrlParams,
    updateUrlParams,
    debouncedUpdateUrlParams,
    copyUrlToClipboard,
  };
};

// Helper function to validate Ethereum address
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};