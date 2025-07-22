"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { ReactionMetadata } from "@/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent,
  TouchEvent,
  Suspense,
} from "react";
import {
  AiOutlineCopy,
  AiOutlineDownload,
  AiOutlineLink,
} from "react-icons/ai";
import { ImagePicker } from "@/components/ui/ImagePicker";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import path from "path";
import {
  useDynamicContext,
  useIsLoggedIn,
  DynamicConnectButton,
} from "@dynamic-labs/sdk-react-core";
import { middleEllipsis } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useWatchlist } from "./hooks/useNFTFetcher";
import { WatchlistManager } from "./components/WatchlistManager";
import { NFTPagination } from "./components/NFTPagination";

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

type ReactionOverlayDraggableProps = {
  x: number;
  y: number;
  scale: number;
  imageUrl: string;
  containerSize?: number;
  onChange: (vals: { x: number; y: number; scale: number }) => void;
  setDragging: (dragging: boolean) => void;
  dragging: boolean;
  onDragEnd?: () => void;
  setResizing: (resizing: boolean) => void;
  resizing: boolean;
  onResizeEnd?: () => void;
  disabled?: boolean;
};

function ReactionOverlayDraggable({
  x,
  y,
  scale,
  imageUrl,
  containerSize = 320, // px, matches max-w-xs
  onChange,
  setDragging,
  dragging,
  onDragEnd,
  setResizing,
  resizing,
  onResizeEnd,
  disabled = false,
}: ReactionOverlayDraggableProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState({
    x: 0,
    y: 0,
    scale: 1,
    mouseX: 0,
    mouseY: 0,
    offsetX: 0,
    offsetY: 0,
    overlayWidth: 100,
    overlayHeight: 100,
    naturalWidth: 100,
    naturalHeight: 100,
  });
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Load image and get natural size
  useEffect(() => {
    if (!imageUrl) {
      setNaturalSize(null);
      return;
    }
    const img = new window.Image();
    img.onload = function () {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // --- Mouse and Touch Event Helpers ---
  function getClientXY(
    e: MouseEvent | TouchEvent | globalThis.MouseEvent | globalThis.TouchEvent,
  ) {
    if ("touches" in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    } else if ("changedTouches" in e && e.changedTouches.length > 0) {
      return {
        clientX: e.changedTouches[0].clientX,
        clientY: e.changedTouches[0].clientY,
      };
    } else if ("clientX" in e && "clientY" in e) {
      return { clientX: e.clientX, clientY: e.clientY };
    }
    return { clientX: 0, clientY: 0 };
  }

  // Drag handlers
  function onMouseDown(e: MouseEvent<HTMLDivElement>) {
    setDragging(true);
    const overlayLeftPx = (x / 1080) * containerSize;
    const overlayTopPx = (y / 1080) * containerSize;
    setStart({
      x,
      y,
      scale,
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: e.clientX - overlayLeftPx,
      offsetY: e.clientY - overlayTopPx,
      overlayWidth: naturalSize
        ? (naturalSize.width / scale) * (containerSize / 1080)
        : 100,
      overlayHeight: naturalSize
        ? (naturalSize.height / scale) * (containerSize / 1080)
        : 100,
      naturalWidth: naturalSize ? naturalSize.width : 100,
      naturalHeight: naturalSize ? naturalSize.height : 100,
    });
    e.stopPropagation();
    e.preventDefault();
  }
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setDragging(true);
    const touch = e.touches[0];
    const overlayLeftPx = (x / 1080) * containerSize;
    const overlayTopPx = (y / 1080) * containerSize;
    setStart({
      x,
      y,
      scale,
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      offsetX: touch.clientX - overlayLeftPx,
      offsetY: touch.clientY - overlayTopPx,
      overlayWidth: naturalSize
        ? (naturalSize.width / scale) * (containerSize / 1080)
        : 100,
      overlayHeight: naturalSize
        ? (naturalSize.height / scale) * (containerSize / 1080)
        : 100,
      naturalWidth: naturalSize ? naturalSize.width : 100,
      naturalHeight: naturalSize ? naturalSize.height : 100,
    });
    e.stopPropagation();
    e.preventDefault();
  }
  function onMouseMove(e: MouseEvent | globalThis.MouseEvent) {
    if (dragging) {
      const newLeftPx = e.clientX - start.offsetX;
      const newTopPx = e.clientY - start.offsetY;
      let newX = (newLeftPx / containerSize) * 1080;
      let newY = (newTopPx / containerSize) * 1080;
      // Clamp logic
      const overlayWidth1080 = (start.naturalWidth || 100) / start.scale;
      const overlayHeight1080 = (start.naturalHeight || 100) / start.scale;
      newX = Math.max(0, Math.min(newX, 1080 - overlayWidth1080));
      newY = Math.max(0, Math.min(newY, 1080 - overlayHeight1080));
      onChange({ x: newX, y: newY, scale });
      if (e.preventDefault) e.preventDefault();
    }
    if (resizing && naturalSize) {
      const deltaPx = e.clientX - start.mouseX;
      let newOverlayWidth = start.overlayWidth + deltaPx;
      let newOverlayHeight =
        (start.naturalHeight / start.naturalWidth) * newOverlayWidth;
      // Enforce minimum 50px for the smaller dimension
      const minSize = 50;
      if (newOverlayWidth < minSize || newOverlayHeight < minSize) {
        if (newOverlayWidth < newOverlayHeight) {
          newOverlayWidth = minSize;
          newOverlayHeight =
            (start.naturalHeight / start.naturalWidth) * minSize;
        } else {
          newOverlayHeight = minSize;
          newOverlayWidth =
            (start.naturalWidth / start.naturalHeight) * minSize;
        }
      }
      newOverlayWidth = Math.max(newOverlayWidth, minSize);
      newOverlayHeight = Math.max(newOverlayHeight, minSize);
      const pxTo1080 = 1080 / containerSize;
      // Clamp overlay so it doesn't go out of bounds
      const maxWidth1080 = 1080 - x;
      const maxHeight1080 = 1080 - y;
      const minScaleWidth = start.naturalWidth / maxWidth1080;
      const minScaleHeight = start.naturalHeight / maxHeight1080;
      const minScale = Math.max(minScaleWidth, minScaleHeight, 0.1);
      let newScale = start.naturalWidth / (newOverlayWidth * pxTo1080);
      newScale = Math.max(newScale, minScale);
      onChange({ x, y, scale: newScale });
      if (e.preventDefault) e.preventDefault();
    }
  }
  function onTouchMove(e: TouchEvent | globalThis.TouchEvent) {
    if (dragging && e.touches.length > 0) {
      const touch = e.touches[0];
      const newLeftPx = touch.clientX - start.offsetX;
      const newTopPx = touch.clientY - start.offsetY;
      let newX = (newLeftPx / containerSize) * 1080;
      let newY = (newTopPx / containerSize) * 1080;
      // Clamp logic
      const overlayWidth1080 = (start.naturalWidth || 100) / start.scale;
      const overlayHeight1080 = (start.naturalHeight || 100) / start.scale;
      newX = Math.max(0, Math.min(newX, 1080 - overlayWidth1080));
      newY = Math.max(0, Math.min(newY, 1080 - overlayHeight1080));
      onChange({ x: newX, y: newY, scale });
      if (e.preventDefault) e.preventDefault();
    }
    if (resizing && naturalSize && e.touches.length > 0) {
      const touch = e.touches[0];
      const deltaPx = touch.clientX - start.mouseX;
      let newOverlayWidth = start.overlayWidth + deltaPx;
      let newOverlayHeight =
        (start.naturalHeight / start.naturalWidth) * newOverlayWidth;
      // Enforce minimum 50px for the smaller dimension
      const minSize = 50;
      if (newOverlayWidth < minSize || newOverlayHeight < minSize) {
        if (newOverlayWidth < newOverlayHeight) {
          newOverlayWidth = minSize;
          newOverlayHeight =
            (start.naturalHeight / start.naturalWidth) * minSize;
        } else {
          newOverlayHeight = minSize;
          newOverlayWidth =
            (start.naturalWidth / start.naturalHeight) * minSize;
        }
      }
      newOverlayWidth = Math.max(newOverlayWidth, minSize);
      newOverlayHeight = Math.max(newOverlayHeight, minSize);
      const pxTo1080 = 1080 / containerSize;
      // Clamp overlay so it doesn't go out of bounds
      const maxWidth1080 = 1080 - x;
      const maxHeight1080 = 1080 - y;
      const minScaleWidth = start.naturalWidth / maxWidth1080;
      const minScaleHeight = start.naturalHeight / maxHeight1080;
      const minScale = Math.max(minScaleWidth, minScaleHeight, 0.1);
      let newScale = start.naturalWidth / (newOverlayWidth * pxTo1080);
      newScale = Math.max(newScale, minScale);
      onChange({ x, y, scale: newScale });
      if (e.preventDefault) e.preventDefault();
    }
  }
  function onMouseUp() {
    setDragging(false);
    setResizing(false);
    if (onDragEnd) onDragEnd();
    if (resizing && typeof onResizeEnd === "function") {
      onResizeEnd();
    }
  }
  function onTouchEnd(e: TouchEvent | globalThis.TouchEvent) {
    setDragging(false);
    setResizing(false);
    if (onDragEnd) onDragEnd();
    if (resizing && typeof onResizeEnd === "function") {
      onResizeEnd();
    }
    if (e.preventDefault) e.preventDefault();
  }
  function onResizeMouseDown(e: MouseEvent<HTMLDivElement>) {
    setResizing(true);
    setStart((prev) => ({
      ...prev,
      mouseX: e.clientX,
      mouseY: e.clientY,
      overlayWidth: naturalSize
        ? (naturalSize.width / scale) * (containerSize / 1080)
        : 100,
      overlayHeight: naturalSize
        ? (naturalSize.height / scale) * (containerSize / 1080)
        : 100,
      naturalWidth: naturalSize ? naturalSize.width : 100,
      naturalHeight: naturalSize ? naturalSize.height : 100,
    }));
    e.stopPropagation();
  }
  function onResizeTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setResizing(true);
    const touch = e.touches[0];
    setStart((prev) => ({
      ...prev,
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      overlayWidth: naturalSize
        ? (naturalSize.width / scale) * (containerSize / 1080)
        : 100,
      overlayHeight: naturalSize
        ? (naturalSize.height / scale) * (containerSize / 1080)
        : 100,
      naturalWidth: naturalSize ? naturalSize.width : 100,
      naturalHeight: naturalSize ? naturalSize.height : 100,
    }));
    e.stopPropagation();
  }
  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", onMouseMove as any);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove as any, {
        passive: false,
      });
      window.addEventListener("touchend", onTouchEnd as any);
      if (resizing) {
        document.body.style.userSelect = "none";
      }
      return () => {
        window.removeEventListener("mousemove", onMouseMove as any);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchmove", onTouchMove as any);
        window.removeEventListener("touchend", onTouchEnd as any);
        if (resizing) {
          document.body.style.userSelect = "";
        }
      };
    }
  });

  // Calculate overlay style (relative to 1080x1080 canvas)
  let overlayWidth = 100;
  let overlayHeight = 100;
  if (naturalSize) {
    overlayWidth = (naturalSize.width / scale) * (containerSize / 1080);
    overlayHeight = (naturalSize.height / scale) * (containerSize / 1080);
  }
  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    left: (x / 1080) * containerSize,
    top: (y / 1080) * containerSize,
    width: overlayWidth,
    height: overlayHeight,
    border: "2px dashed #888",
    cursor: dragging ? "grabbing" : "grab",
    zIndex: 10,
    background: "rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    userSelect: dragging ? "none" : undefined,
  };
  return (
    <div
      ref={overlayRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div
        className="absolute"
        style={{
          left: `${(x / 1080) * containerSize}px`,
          top: `${(y / 1080) * containerSize}px`,
          width: naturalSize
            ? `${(naturalSize.width / scale) * (containerSize / 1080)}px`
            : 100,
          height: naturalSize
            ? `${(naturalSize.height / scale) * (containerSize / 1080)}px`
            : 100,
          pointerEvents: disabled ? "none" : "auto",
          filter: disabled
            ? "brightness(0.7) grayscale(0.3) opacity(0.8)"
            : undefined,
          transition: "filter 0.2s",
          border: "2px dotted #888",
          borderRadius: "0.5rem",
          boxSizing: "border-box",
        }}
        onMouseDown={disabled ? undefined : onMouseDown}
        onTouchStart={disabled ? undefined : onTouchStart}
      >
        <img
          src={imageUrl}
          alt="Reaction overlay"
          className="w-full h-full object-contain select-none"
          draggable={false}
          style={{ pointerEvents: "none" }}
        />
        {/* No dark overlay when disabled */}
        {/* Resize handle, only if not disabled */}
        {!disabled && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-white border border-gray-400 rounded-full cursor-nwse-resize z-20"
            onMouseDown={onResizeMouseDown}
            onTouchStart={onResizeTouchStart}
            style={{ touchAction: "none" }}
          />
        )}
      </div>
    </div>
  );
}

// --- Reaction Settings Persistence Helpers ---
function getReactionSettingsKey(
  collectionIndex: number,
  tokenID: string | number,
) {
  return `reactionSettings-${collectionIndex}-${tokenID}`;
}

function saveReactionSettings(
  collectionIndex: number,
  tokenID: string | number,
  settings: {
    x: number;
    y: number;
    scale: number;
    overlayNumber: number;
    overlayEnabled: boolean;
  },
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getReactionSettingsKey(collectionIndex, tokenID),
      JSON.stringify(settings),
    );
  } catch {}
}

function loadReactionSettings(
  collectionIndex: number,
  tokenID: string | number,
): {
  x: number;
  y: number;
  scale: number;
  overlayNumber: number;
  overlayEnabled: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(
      getReactionSettingsKey(collectionIndex, tokenID),
    );
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const fileToDataUri = (file: File) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event?.target?.result);
    };
    reader.readAsDataURL(file);
  });

// NFT Types
interface UserNFT {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description?: string;
  image_url?: string;
  metadata_url?: string;
  opensea_url?: string;
  updated_at?: string;
  is_disabled?: boolean;
  is_nsfw?: boolean;
}

interface NFTApiResponse {
  nfts: UserNFT[];
  next?: string;
  provider?: string;
  providerName?: string;
}

// Unified NFT Gallery Component
function UnifiedNFTGallery({
  onSelectNFT,
  supportedCollections,
  nfts,
  loading,
  error,
  hasMore,
  providerName,
  onLoadMore,
  onLoadAll,
  title,
  subtitle,
  showLoadingState = true,
}: {
  onSelectNFT: (contract: string, tokenId: string, imageUrl: string) => void;
  supportedCollections: Set<string>;
  nfts: UserNFT[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  providerName: string | null;
  onLoadMore: () => void;
  onLoadAll?: () => void;
  title: string;
  subtitle?: string;
  showLoadingState?: boolean;
}) {
  // Pagination state for wallet previews
  const [walletPreviewPage, setWalletPreviewPage] = useState(1);
  const [showWalletPagination, setShowWalletPagination] = useState(false);
  const walletPreviewItemsPerPage = 24;

  useEffect(() => {
    setWalletPreviewPage(1); // Reset when nfts change
    setShowWalletPagination(false); // Reset pagination view
  }, [nfts]);

  // Decide whether to show horizontal scroll or pagination
  const shouldPaginate = nfts.length > 100;

  const paginatedNFTs = useMemo(() => {
    if (!shouldPaginate || !showWalletPagination) {
      // Show first 100 in horizontal scroll
      return nfts.slice(0, 100);
    }

    // Show paginated view
    const startIndex = (walletPreviewPage - 1) * walletPreviewItemsPerPage;
    const endIndex = Math.min(
      startIndex + walletPreviewItemsPerPage,
      nfts.length,
    );
    return nfts.slice(startIndex, endIndex);
  }, [
    nfts,
    shouldPaginate,
    showWalletPagination,
    walletPreviewPage,
    walletPreviewItemsPerPage,
  ]);

  const paginationInfo = useMemo(() => {
    if (!shouldPaginate) return null;

    const totalPages = Math.ceil(nfts.length / walletPreviewItemsPerPage);
    return {
      totalPages,
      hasNext: walletPreviewPage < totalPages,
      hasPrev: walletPreviewPage > 1,
      startIndex: (walletPreviewPage - 1) * walletPreviewItemsPerPage + 1,
      endIndex: Math.min(
        walletPreviewPage * walletPreviewItemsPerPage,
        nfts.length,
      ),
    };
  }, [
    nfts.length,
    walletPreviewPage,
    walletPreviewItemsPerPage,
    shouldPaginate,
  ]);

  if (loading && nfts.length === 0 && showLoadingState) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{title}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="w-full aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{title}</Label>
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <div className="font-medium mb-1">Failed to load NFTs</div>
          <div className="text-xs">{error}</div>
          <div className="text-xs mt-2 opacity-75">
            Try ENS names like &quot;vitalik.eth&quot; or paste a wallet address
          </div>
        </div>
      </div>
    );
  }

  if (nfts.length === 0 && !loading) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{title}</Label>
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md text-center">
          <div>{subtitle || "No supported NFTs found"}</div>
          {providerName && (
            <div className="text-xs mt-1 opacity-75">
              Using {providerName} API
            </div>
          )}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return null; // Don't show anything if no NFTs and not loading
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{title}</Label>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
          )}
        </div>
        {providerName && (
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            via {providerName}
          </div>
        )}
      </div>
      {/* NFT display - horizontal scroll or paginated grid */}
      {showWalletPagination && shouldPaginate ? (
        /* Paginated grid view for large collections */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {paginatedNFTs.map((nft) => {
            // Find collection name for this NFT
            const collectionObj = collectionsMetadata.find(
              (c) => c.contract?.toLowerCase() === nft.contract.toLowerCase(),
            );
            const collectionName =
              collectionObj?.name || nft.collection || "Unknown";
            const truncatedCollection = middleEllipsis(collectionName, 32);
            return (
              <button
                key={`${nft.contract}-${nft.identifier}`}
                onClick={() =>
                  onSelectNFT(nft.contract, nft.identifier, nft.image_url || "")
                }
                className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors bg-muted/50 aspect-square"
              >
                {/* Collection name at top */}
                <div className="absolute top-1 left-1 right-1">
                  <div className="text-xs text-white bg-black/70 rounded px-1 py-0.5 leading-tight font-semibold text-center truncate">
                    {middleEllipsis(collectionName, 14)}
                  </div>
                </div>
                {nft.image_url ? (
                  <img
                    src={nft.image_url}
                    alt={nft.name || `NFT ${nft.identifier}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {/* NFT ID at bottom */}
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="text-xs text-white bg-black/70 rounded px-1 py-0.5 leading-tight font-mono text-center">
                    ID: {nft.identifier}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Horizontal scroll view */
        <div className="relative">
          {/* Left arrow */}
          {paginatedNFTs.length > 2 && (
            <button
              type="button"
              aria-label="Scroll left"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white border rounded-full shadow p-1 flex items-center justify-center"
              style={{ display: "flex" }}
              onClick={() => {
                const el = document.getElementById("nft-scroll-gallery");
                if (el) el.scrollBy({ left: -160, behavior: "smooth" });
              }}
            >
              <span style={{ fontSize: 24, fontWeight: "bold" }}>{"<"}</span>
            </button>
          )}
          {/* Right arrow */}
          {paginatedNFTs.length > 2 && (
            <button
              type="button"
              aria-label="Scroll right"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white border rounded-full shadow p-1 flex items-center justify-center"
              style={{ display: "flex" }}
              onClick={() => {
                const el = document.getElementById("nft-scroll-gallery");
                if (el) el.scrollBy({ left: 160, behavior: "smooth" });
              }}
            >
              <span style={{ fontSize: 24, fontWeight: "bold" }}>{">"}</span>
            </button>
          )}
          <div
            id="nft-scroll-gallery"
            className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 py-2 px-1"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {paginatedNFTs.map((nft) => {
              // Find collection name for this NFT
              const collectionObj = collectionsMetadata.find(
                (c) => c.contract?.toLowerCase() === nft.contract.toLowerCase(),
              );
              const collectionName =
                collectionObj?.name || nft.collection || "Unknown";
              const truncatedCollection = middleEllipsis(collectionName, 32);
              return (
                <button
                  key={`${nft.contract}-${nft.identifier}`}
                  onClick={() =>
                    onSelectNFT(
                      nft.contract,
                      nft.identifier,
                      nft.image_url || "",
                    )
                  }
                  className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors bg-muted/50 flex-shrink-0"
                  style={{
                    width: 132,
                    height: 132,
                    scrollSnapAlign: "start",
                    display: "block",
                  }}
                >
                  {/* Collection name at top, with tooltip */}
                  <div className="absolute top-0 left-0 w-full px-1 pt-1 z-10 flex flex-col items-center pointer-events-none">
                    <div
                      className="max-w-full text-xs text-white bg-black/70 rounded px-1 py-0.5 leading-tight font-semibold text-center line-clamp-2 middle-ellipsis-tooltip"
                      style={{
                        WebkitLineClamp: 2,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-all",
                        cursor: "pointer",
                      }}
                      tabIndex={0}
                    >
                      {truncatedCollection}
                      <span className="middle-ellipsis-tooltip-content">
                        {collectionName}
                      </span>
                    </div>
                  </div>
                  {nft.image_url ? (
                    <img
                      src={nft.image_url}
                      alt={nft.name || `NFT ${nft.identifier}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* NFT ID at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex flex-col items-center">
                    <div className="text-xs text-white/80 font-mono">
                      ID: {nft.identifier}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination or Load More Controls */}
      {shouldPaginate && (
        <div className="flex flex-col gap-2">
          {!showWalletPagination ? (
            /* Switch to pagination view for large collections */
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWalletPagination(true)}
                className="flex-1"
              >
                View All {nfts.length} NFTs (Paginated)
              </Button>
              {onLoadAll && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onLoadAll}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Loading..." : "Load All"}
                </Button>
              )}
            </div>
          ) : (
            paginationInfo && (
              /* Pagination controls */
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {paginationInfo.startIndex}-{paginationInfo.endIndex}{" "}
                  of {nfts.length} NFTs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setWalletPreviewPage(Math.max(1, walletPreviewPage - 1))
                    }
                    disabled={!paginationInfo.hasPrev}
                  >
                    ← Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {walletPreviewPage} of {paginationInfo.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setWalletPreviewPage(
                        Math.min(
                          paginationInfo.totalPages,
                          walletPreviewPage + 1,
                        ),
                      )
                    }
                    disabled={!paginationInfo.hasNext}
                  >
                    Next →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWalletPagination(false)}
                  >
                    Show Less
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Regular load more for smaller collections */}
      {!shouldPaginate && hasMore && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
          {onLoadAll && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadAll}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Loading..." : "Load All"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [imageExtension, setImageExtension] = useState("gif");
  const [loading, setLoading] = useState(true);
  const [tokenID, setTokenID] = useState<string | number>(1507);
  const [tempTokenID, setTempTokenID] = useState<string | number>(1507);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [collectionIndex, setCollectionIndex] = useState(2);
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [overlayNumber, setOverlayNumber] = useState(18);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const ffmpegLoadPromise = useRef<Promise<boolean> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [showGifCopyModal, setShowGifCopyModal] = useState(false);
  const [gifBlobToCopy, setGifBlobToCopy] = useState<Blob | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [playAnimation, setPlayAnimation] = useState(true);
  const [staticGifFrameUrl, setStaticGifFrameUrl] = useState<string | null>(
    null,
  );

  // Custom speech bubble state
  const [customSpeechBubbleText, setCustomSpeechBubbleText] =
    useState("!CHIMP");
  const [customSpeechBubbleDataUrl, setCustomSpeechBubbleDataUrl] = useState<
    string | null
  >(null);

  // Helper function to generate speech bubble data URL
  const generateSpeechBubbleDataUrl = useCallback((text: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const fontSize = 16;
    const padding = 20;
    const spikeHeight = 20;

    ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    // Support multi-line text
    const lines = text.split("\n");
    const textWidths = lines.map((line) => ctx.measureText(line).width);
    const textWidth = Math.max(...textWidths);
    const textHeight = fontSize * lines.length;

    const bubbleWidth = textWidth + padding * 2;
    const bubbleHeight = textHeight + padding * 2 + spikeHeight;

    canvas.width = bubbleWidth;
    canvas.height = bubbleHeight;

    // Reapply font after resizing canvas
    ctx.font = `${fontSize}px "Press Start 2P", monospace`;

    // Draw speech bubble
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth / 2 - 10, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth / 2, bubbleHeight);
    ctx.lineTo(bubbleWidth / 2 + 10, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text (multi-line)
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      const lineWidth = ctx.measureText(line).width;
      const x = (canvas.width - lineWidth) / 2; // Center text horizontally
      ctx.fillText(line, x, padding + i * fontSize);
    });

    return canvas.toDataURL("image/png");
  }, []);

  // Update speech bubble data URL when text changes
  useEffect(() => {
    if (customSpeechBubbleText.trim()) {
      const dataUrl = generateSpeechBubbleDataUrl(customSpeechBubbleText);
      setCustomSpeechBubbleDataUrl(dataUrl);

      // Trigger re-render if we're currently using the custom speech bubble
      if (reactionsMap[overlayNumber - 1]?.isCustom) {
        setLoading(true);
      }
    }
  }, [customSpeechBubbleText, generateSpeechBubbleDataUrl, overlayNumber]);

  // Watermark configuration state
  const [watermarkStyle, setWatermarkStyle] = useState<"oneline" | "twoline">(
    "twoline",
  );
  const watermarkPaddingX = -170;
  const watermarkPaddingY = -30;
  const watermarkScale = 3;

  // Dynamic SDK hooks for wallet context
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Unified NFT Gallery state (replaces both user and external states)
  const [selectedFromWallet, setSelectedFromWallet] = useState<{
    contract: string;
    tokenId: string;
    imageUrl: string;
    source?: "your-wallet" | "external-wallet" | "watchlist";
    walletAddress?: string;
    walletLabel?: string;
  } | null>(null);

  // Unified wallet browsing state
  const [walletInput, setWalletInput] = useState<string>(
    "0x9624e6235a358fafadb50714ddd039d75d46687d",
  );
  const [activeWallet, setActiveWallet] = useState<string | null>(null); // Currently loaded wallet
  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);

  // Tab state for switching between load wallet (merged connected+input), watchlist, and upload image
  const [activeTab, setActiveTab] = useState<
    "loadwallet" | "watchlist" | "upload"
  >("watchlist");

  // Pagination state for all NFTs view
  const [allNFTsPage, setAllNFTsPage] = useState(1);
  const [allNFTsPerPage] = useState(24);

  // NFT owner state
  const [nftOwner, setNftOwner] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Create supported collections set for filtering
  const supportedCollections = useMemo(() => {
    return new Set(
      collectionsMetadata.map((c) => c.contract?.toLowerCase()).filter(Boolean),
    );
  }, []);

  // Initialize watchlist hook
  const watchlist = useWatchlist(supportedCollections);

  let collectionMetadata = collectionsMetadata[collectionIndex];
  let minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  let maxTokenID =
    collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);

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
    if (walletIdParam && isValidEthereumAddress(walletIdParam)) {
      setWalletInput(walletIdParam);
      setActiveTab("loadwallet");
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
    if (activeWallet && activeWallet !== primaryWallet?.address) {
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
    primaryWallet?.address,
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
      setCopyStatus("URL copied to clipboard!");
      setTimeout(() => setCopyStatus(null), 3000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      setCopyStatus("Failed to copy URL. Please try again.");
      setTimeout(() => setCopyStatus(null), 3000);
    }
  }, []);

  const copyOwnerToClipboard = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyStatus("Address copied to clipboard!");
      setTimeout(() => setCopyStatus(null), 3000);
    } catch (err) {
      console.error("Failed to copy address:", err);
      setCopyStatus("Failed to copy address. Please try again.");
      setTimeout(() => setCopyStatus(null), 3000);
    }
  }, []);

  // Helper function to validate Ethereum address
  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Helper function to check if input looks like ENS
  const looksLikeENS = (input: string): boolean => {
    return input.includes(".") && !input.startsWith("0x");
  };

  // ENS resolution function
  const resolveENS = useCallback(
    async (ensName: string): Promise<string | null> => {
      try {
        setIsResolvingENS(true);
        // Use a free ENS resolver API
        const response = await fetch(
          `https://api.ensideas.com/ens/resolve/${ensName}`,
        );
        if (response.ok) {
          const data = await response.json();
          return data.address || null;
        }

        // Fallback: try another free ENS API
        const fallbackResponse = await fetch(
          `https://api.web3.bio/profile/${ensName}`,
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.address || null;
        }

        return null;
      } catch (error) {
        console.error("ENS resolution failed:", error);
        return null;
      } finally {
        setIsResolvingENS(false);
      }
    },
    [],
  );

  // Function to fetch ALL NFTs from user's connected wallet (auto-paginate)
  const fetchAllUserNFTs = useCallback(
    async (walletAddress: string) => {
      let resolvedAddress = walletAddress.trim();

      // Handle ENS resolution
      if (looksLikeENS(resolvedAddress)) {
        const resolved = await resolveENS(resolvedAddress);
        if (!resolved) {
          setNftError(`Could not resolve ENS name: ${resolvedAddress}`);
          return;
        }
        resolvedAddress = resolved;
      } else if (!isValidEthereumAddress(resolvedAddress)) {
        setNftError("Invalid wallet");
        return;
      }

      setNftLoading(true);
      setNftError(null);
      setNfts([]); // Clear previous results
      setActiveWallet(resolvedAddress);

      try {
        let allNFTs: UserNFT[] = [];
        let nextCursor: string | null = null;
        let provider: string | null = null;
        let providerName: string | null = null;
        let pageCount = 0;

        do {
          pageCount++;
          let url = `/fetchUserNFTs?wallet=${resolvedAddress}&limit=100`; // Increased limit for fewer requests

          if (nextCursor) {
            url += `&next=${encodeURIComponent(nextCursor)}`;
          }

          const response = await fetch(url);

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Unknown error" }));
            throw new Error(
              errorData.error || `Failed to fetch NFTs: ${response.status}`,
            );
          }

          const data: NFTApiResponse = await response.json();

          // Filter NFTs to only show supported collections
          const filteredNFTs = data.nfts.filter((nft) =>
            supportedCollections.has(nft.contract.toLowerCase()),
          );

          allNFTs = [...allNFTs, ...filteredNFTs];
          nextCursor = data.next || null;

          // Store provider info from first response
          if (pageCount === 1) {
            provider = data.provider || null;
            providerName = data.providerName || null;
          }

          // Update state with current progress
          setNfts([...allNFTs]);

          // Add a small delay between requests to be nice to the API
          if (nextCursor) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } while (nextCursor);

        // Final state updates
        setNextCursor(null);
        setHasMore(false);
        setProvider(provider);
        setProviderName(providerName);

        console.log(
          `Fetched ${allNFTs.length} supported NFTs across ${pageCount} pages`,
        );
      } catch (err) {
        console.error("Error fetching all user NFTs:", err);
        setNftError(
          err instanceof Error ? err.message : "Failed to fetch NFTs",
        );
      } finally {
        setNftLoading(false);
      }
    },
    [supportedCollections, resolveENS],
  );

  // Function to fetch NFTs from external wallets (manual pagination)
  const fetchWalletNFTs = useCallback(
    async (walletAddress: string, cursor?: string) => {
      let resolvedAddress = walletAddress.trim();

      // Handle ENS resolution
      if (looksLikeENS(resolvedAddress)) {
        const resolved = await resolveENS(resolvedAddress);
        if (!resolved) {
          setNftError(`Could not resolve ENS name: ${resolvedAddress}`);
          return;
        }
        resolvedAddress = resolved;
      } else if (!isValidEthereumAddress(resolvedAddress)) {
        // Show "Invalid wallet" error for invalid input
        setNftError("Invalid wallet");
        return;
      }

      setNftLoading(true);
      setNftError(null);

      try {
        let url = `/fetchUserNFTs?wallet=${resolvedAddress}&limit=50`;

        if (cursor) {
          url += `&next=${encodeURIComponent(cursor)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            errorData.error || `Failed to fetch NFTs: ${response.status}`,
          );
        }

        const data: NFTApiResponse = await response.json();

        // Filter NFTs to only show supported collections
        const filteredNFTs = data.nfts.filter((nft) =>
          supportedCollections.has(nft.contract.toLowerCase()),
        );

        if (cursor) {
          setNfts((prev) => [...prev, ...filteredNFTs]);
        } else {
          setNfts(filteredNFTs);
          setActiveWallet(resolvedAddress); // Set the active wallet
        }

        setNextCursor(data.next || null);
        setHasMore(!!data.next);
        setProvider(data.provider || null);
        setProviderName(data.providerName || null);
      } catch (err) {
        console.error("Error fetching wallet NFTs:", err);
        setNftError(
          err instanceof Error ? err.message : "Failed to fetch NFTs",
        );
      } finally {
        setNftLoading(false);
      }
    },
    [supportedCollections, resolveENS],
  );

  // Load user's own NFTs when they sign in and switch to connected tab
  useEffect(() => {
    if (isLoggedIn && primaryWallet?.address) {
      setActiveTab("loadwallet"); // Switch to load wallet tab when logged in
      if (!activeWallet || activeWallet !== primaryWallet.address) {
        setWalletInput(""); // Clear input when loading user's wallet
        fetchAllUserNFTs(primaryWallet.address); // Fetch ALL user NFTs automatically
      }
    }
  }, [isLoggedIn, primaryWallet?.address, fetchAllUserNFTs]);

  // Load NFTs for all watchlist wallets on page load
  useEffect(() => {
    if (watchlist.watchedWallets.length > 0) {
      watchlist.watchedWallets.forEach((wallet) => {
        const data = watchlist.walletData.get(wallet.address);
        if (data && !data.lastFetched && !data.loading) {
          watchlist.loadWalletNFTs(wallet.address);
        }
      });
    }
  }, [
    watchlist.watchedWallets,
    watchlist.walletData,
    watchlist.loadWalletNFTs,
  ]);

  // Switch tab logic
  useEffect(() => {
    if (!isLoggedIn && activeTab === "loadwallet") {
      // Keep on load wallet tab when logged out
      setActiveTab("loadwallet");
    }
  }, [isLoggedIn, activeTab]);

  // Unified NFT selection handler
  const handleNFTSelect = useCallback(
    (
      contract: string,
      tokenId: string,
      imageUrl: string,
      walletAddress?: string,
      walletLabel?: string,
    ) => {
      console.log("NFT selected:", {
        contract,
        tokenId,
        imageUrl,
        walletAddress,
        walletLabel,
      });
      // Find the collection index for this contract
      const collectionIdx = collectionsMetadata.findIndex(
        (c) => c.contract?.toLowerCase() === contract.toLowerCase(),
      );

      if (collectionIdx >= 0) {
        setLoading(true);
        setCollectionIndex(collectionIdx);
        setTokenID(tokenId);
        setTempTokenID(tokenId);
        setFile(null);
        setUploadedImageUri(null);

        // Determine source and wallet address
        let source: "your-wallet" | "external-wallet" | "watchlist" =
          "external-wallet";
        if (walletAddress && watchlist.isInWatchlist(walletAddress)) {
          source = "watchlist";
        } else if (activeWallet === primaryWallet?.address) {
          source = "your-wallet";
        }

        setSelectedFromWallet({
          contract,
          tokenId,
          imageUrl,
          source,
          walletAddress: walletAddress || activeWallet || "",
          walletLabel,
        });

        // Scroll up to the preview when an NFT is selected
        setTimeout(() => {
          const preview = document.querySelector(".aspect-square");
          if (preview) {
            preview.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    },
    [activeWallet, primaryWallet?.address, watchlist],
  );

  // Paste from clipboard function
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setWalletInput(text.trim());
      }
    } catch (err) {
      console.error("Failed to read from clipboard:", err);
      // Fallback: show a helpful message
      alert("Unable to read from clipboard. Please paste manually.");
    }
  }, []);

  // Clear gallery and load new wallet
  const loadWallet = useCallback(() => {
    if (walletInput.trim()) {
      setNfts([]); // Clear previous results
      setActiveWallet(null); // Reset active wallet
      fetchWalletNFTs(walletInput.trim());
    }
  }, [walletInput, fetchWalletNFTs]);

  // Load all NFTs from external wallet
  const loadAllFromExternalWallet = useCallback(() => {
    if (walletInput.trim()) {
      setNfts([]); // Clear previous results
      setActiveWallet(null); // Reset active wallet
      fetchAllUserNFTs(walletInput.trim());
    }
  }, [walletInput, fetchAllUserNFTs]);

  // Get current gallery display info
  const getGalleryInfo = useMemo(() => {
    if (!activeWallet) {
      return {
        title: "NFT Gallery",
        subtitle: "Connect wallet or enter address to browse NFTs",
      };
    }

    const isYourWallet = activeWallet === primaryWallet?.address;
    if (isYourWallet) {
      if (nftLoading && nfts.length === 0) {
        return {
          title: "Your NFTs",
          subtitle: "Loading all your NFTs...",
        };
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

    // For external wallets, show shortened address or ENS if available
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

    return {
      title: `${displayAddress}'s NFTs`,
      subtitle,
    };
  }, [
    activeWallet,
    primaryWallet?.address,
    nfts.length,
    walletInput,
    nftLoading,
    hasMore,
  ]);

  // Get all NFTs from watchlist for pagination
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

  useEffect(() => {
    if (isFirstRender) {
      setLoading(true);
      setIsFirstRender(false);
    }
  }, [isFirstRender]);

  // Parse URL parameters on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      parseUrlParams();
    }
  }, [parseUrlParams]); // Only run once on mount

  // Update URL when state changes
  useEffect(() => {
    if (typeof window !== "undefined" && !isFirstRender) {
      updateUrlParams();
    }
  }, [updateUrlParams, isFirstRender]);

  useEffect(() => {
    (async () => {
      console.log("Fetching image for", { collectionIndex, tokenID });
      if (
        isNaN(Number(tokenID)) ||
        Number(tokenID) < minTokenID ||
        Number(tokenID) > maxTokenID
      ) {
        return;
      }

      // Fetch NFT image
      if (collectionMetadata.gifOverride) {
        const gifUrl = collectionMetadata.gifOverride(tokenID.toString());
        setImageUrl(`/proxy?url=${encodeURIComponent(gifUrl)}`);
        console.log(
          "Set imageUrl:",
          `/proxy?url=${encodeURIComponent(gifUrl)}`,
        );
      } else {
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
          console.log("Set imageUrl:", imageUrl);
        } catch (error) {
          console.error("Error fetching image:", error);
        }
      }

      // Fetch NFT owner (only for manual token ID input, not for wallet-selected NFTs)
      if (!selectedFromWallet) {
        setOwnerLoading(true);
        setOwnerError(null);
        try {
          const ownerResponse = await fetch(
            `/fetchNFTOwner?tokenId=${tokenID}&contract=${collectionMetadata.contract}`,
          );
          if (ownerResponse.ok) {
            const { owner } = await ownerResponse.json();
            setNftOwner(owner);
          } else {
            setOwnerError("Could not fetch owner");
            setNftOwner(null);
          }
        } catch (error) {
          console.error("Error fetching NFT owner:", error);
          setOwnerError("Failed to fetch owner");
          setNftOwner(null);
        } finally {
          setOwnerLoading(false);
        }
      } else {
        // If NFT was selected from wallet, use the wallet address as owner
        setNftOwner(selectedFromWallet.walletAddress || null);
        setOwnerLoading(false);
        setOwnerError(null);
      }
    })();
  }, [
    collectionIndex,
    collectionMetadata,
    maxTokenID,
    minTokenID,
    tokenID,
    selectedFromWallet,
  ]);

  const encodedImageUrl = useMemo(() => {
    console.log("encodedImageUrl useMemo:", imageUrl);
    if (!imageUrl) {
      return null;
    }
    return encodeURIComponent(imageUrl);
  }, [imageUrl]);

  const debouncedRenderImageUrl = useCallback(
    debounce(async () => {
      console.log("debouncedRenderImageUrl called", {
        imageUrl,
        encodedImageUrl,
        ffmpegReady,
        uploadedImageUri,
      });
      if (!imageUrl || !encodedImageUrl) {
        return;
      }
      if (!ffmpegRef.current) return;
      if (!ffmpegReady) {
        console.warn("FFmpeg not ready yet.");
        return;
      }

      let overlaySettings: Partial<ReactionMetadata> = {
        title: "",
        filename: "",
      };

      overlaySettings = reactionsMap[overlayNumber - 1];

      try {
        let filedata;
        setLoading(true);
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

        const imageExtension = isPNG ? "png" : isGIF ? "gif" : "jpg";
        setImageExtension(imageExtension);

        await ffmpegRef.current.writeFile(`input.${imageExtension}`, filedata);

        // Handle custom speech bubble differently
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

          // Try to load the specific watermark, fallback to credit.png if not found
          let watermarkData;
          try {
            watermarkData = await fetchFile(watermarkPath);
          } catch (error) {
            console.log(
              `Fallback: ${watermarkPath} not found, using credit.png`,
            );
            watermarkData = await fetchFile("/credit.png");
          }

          await ffmpegRef.current.writeFile(watermarkFile, watermarkData);
          ffmpegArgs = [
            "-i",
            `input.${imageExtension}`,
            "-i",
            "reaction.png",
            "-i",
            watermarkFile,
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}[video1]; [2:v]scale=iw*${watermarkScale}:-1[scaled2]; [video1][scaled2]overlay=x=W-w-${watermarkPaddingX}:y=H-h-${watermarkPaddingY}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${imageExtension}`,
          ];
        } else {
          ffmpegArgs = [
            "-i",
            `input.${imageExtension}`,
            "-i",
            "reaction.png",
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${imageExtension}`,
          ];
        }
        await ffmpegRef.current.exec(ffmpegArgs);
        console.log("FFmpeg command executed successfully");

        const data = await ffmpegRef.current.readFile(
          `output.${imageExtension}`,
        );
        const url = URL.createObjectURL(
          new Blob([data], { type: `image/${imageExtension}` }),
        );

        setFinalResult(url);
        console.log("Set finalResult:", url);
      } catch (error) {
        console.error("Error during FFmpeg execution:", error);
      } finally {
        setLoading(false);
      }
    }, 200),
    [
      ffmpegReady,
      uploadedImageUri,
      encodedImageUrl,
      overlayNumber,
      scale,
      x,
      y,
      overlayEnabled,
      watermarkStyle,
      watermarkPaddingX,
      watermarkPaddingY,
      watermarkScale,
      customSpeechBubbleDataUrl,
    ],
  );

  useEffect(() => {
    console.log("FFmpeg load effect running");
    const loadFfmpeg = async () => {
      if (typeof window === "undefined") return;
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
        console.log("FFmpeg instance created");
      }
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on("log", ({ message }) => {
        console.log(message);
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
      console.log("FFmpeg loaded and ffmpegReady set to true");
    };
    loadFfmpeg();
  }, []);

  useEffect(() => {
    if (file) {
      fileToDataUri(file).then((dataUri) => {
        setUploadedImageUri(dataUri as string);
      });
    } else {
      setUploadedImageUri(null);
    }
  }, [file]);

  useEffect(() => {
    console.log("Preview effect:", {
      ffmpegReady,
      encodedImageUrl,
      uploadedImageUri,
      dragging,
      resizing,
    });
    if (
      ffmpegReady &&
      (encodedImageUrl || uploadedImageUri) &&
      !dragging &&
      !resizing
    ) {
      debouncedRenderImageUrl();
    }
  }, [
    ffmpegReady,
    uploadedImageUri,
    debouncedRenderImageUrl,
    encodedImageUrl,
    dragging,
    resizing,
  ]);

  useEffect(() => {
    return () => {
      debouncedRenderImageUrl.cancel(); // Cleanup the debounce on unmount
    };
  }, [debouncedRenderImageUrl]);

  // Only keep the effect that resets x, y, scale on overlayNumber change
  useEffect(() => {
    let overlaySettings = reactionsMap[overlayNumber - 1];
    setX(overlaySettings.x);
    setY(overlaySettings.y);
    setScale(overlaySettings.scale);
  }, [overlayNumber]);

  async function downloadOutput() {
    if (!finalResult) {
      console.warn("can't download gif, no final result");
      return;
    }
    // If playAnimation is off and staticGifFrameUrl is available, download as PNG
    if (isGIF && !playAnimation && staticGifFrameUrl) {
      const a = document.createElement("a");
      a.href = staticGifFrameUrl;
      a.download = `${collectionMetadata.name}-${tokenID}-${reactionsMap[overlayNumber - 1].title}.png`;
      a.click();
      return;
    }
    // Otherwise, download the GIF or other image as before
    const a = document.createElement("a");
    a.href = finalResult;
    a.download = `${collectionMetadata.name}-${tokenID}-${reactionsMap[overlayNumber - 1].title}.${imageExtension}`;
    a.click();
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setLoading(true);
        console.log("upload file");
        setFile(e.target.files[0]);
        // Clear owner info when uploading a file
        setNftOwner(null);
        setOwnerError(null);
        setSelectedFromWallet(null);
      }
    },
    [],
  );

  const handleTokenIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempTokenID(e.target.value);
    },
    [],
  );

  const handleTokenIdSubmit = useCallback(() => {
    const tokenIdNum = Number(tempTokenID);
    if (
      isNaN(tokenIdNum) ||
      tokenIdNum < minTokenID ||
      tokenIdNum > maxTokenID
    ) {
      setErrorMessage(
        `Invalid Token ID, please choose between ${minTokenID} and ${maxTokenID}`,
      );
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    setTokenID(tempTokenID);
    setFile(null);
    setUploadedImageUri(null);
    setSelectedFromWallet(null); // Clear wallet selection when manually changing token ID
    // Clear owner state since we're manually changing the token
    setNftOwner(null);
    setOwnerError(null);
  }, [tempTokenID, minTokenID, maxTokenID]);

  const handleRandomClick = useCallback(() => {
    console.log("clicked random");
    const randomId = Math.floor(Math.random() * maxTokenID) + 1;
    setTempTokenID(randomId);
    setTokenID(randomId);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
    setSelectedFromWallet(null); // Clear wallet selection when using random
    // Clear owner state since we're using random
    setNftOwner(null);
    setOwnerError(null);
  }, [maxTokenID]);

  // Helper: Copy first frame of GIF as PNG to clipboard
  async function copyGifFirstFrameAsPng(blob: Blob) {
    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = async function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            alert("Failed to get canvas context for PNG copy.");
            reject(new Error("Failed to get canvas context."));
            URL.revokeObjectURL(url);
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (!pngBlob) {
              alert("Failed to convert GIF to PNG.");
              reject(new Error("Failed to convert GIF to PNG."));
              return;
            }
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": pngBlob }),
              ]);
              resolve();
            } catch (err) {
              reject(err);
            }
            URL.revokeObjectURL(url);
          }, "image/png");
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = url;
    });
  }

  const copyBlobToClipboard = async (blobUrl: string) => {
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
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopyStatus("Image copied to clipboard successfully!");
    } catch (err) {
      console.error("Failed to copy image:", err);
      setCopyStatus(
        "Failed to copy image. Please try again or download instead.",
      );
    }
  };

  // Handler for modal confirm
  const handleGifCopyModalConfirm = async () => {
    if (!gifBlobToCopy) return;
    setShowGifCopyModal(false);
    try {
      await copyGifFirstFrameAsPng(gifBlobToCopy);
      setCopyStatus("Image copied to clipboard!");
    } catch (err) {
      setCopyStatus(
        "Failed to copy image to clipboard. Please try again or download instead.",
      );
    } finally {
      setGifBlobToCopy(null);
    }
  };

  // Handler for modal cancel
  const handleGifCopyModalCancel = () => {
    setShowGifCopyModal(false);
    setGifBlobToCopy(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).debouncedRenderImageUrl = debouncedRenderImageUrl;
    }
    return () => {
      if (typeof window !== "undefined") {
        (window as any).debouncedRenderImageUrl = undefined;
      }
    };
  }, [debouncedRenderImageUrl]);

  // Helper to determine if current image is a GIF
  const isGIF = imageExtension === "gif";

  // Extract first frame of GIF as PNG data URL for static preview
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
          img.onerror = (err) => {
            reject(err);
            URL.revokeObjectURL(url);
          };
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

  const handleFeelingLucky = useCallback(() => {
    // Randomize collection
    const randomCollectionIndex = Math.floor(
      Math.random() * collectionsMetadata.length,
    );
    const randomCollection = collectionsMetadata[randomCollectionIndex];
    let randomTokenId: number | string;
    // If collection has gifOverride, any ID in range is valid
    if (randomCollection.gifOverride) {
      const min = 1 + (randomCollection.tokenIdOffset ?? 0);
      const max =
        randomCollection.total + (randomCollection.tokenIdOffset ?? 0);
      randomTokenId = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      // Otherwise, pick a valid tokenId from metadata files if available
      let validTokenIds: number[] = [];
      try {
        // Only works client-side if you expose the list, so fallback to range if not available
        // For now, fallback to range
        const min = 1 + (randomCollection.tokenIdOffset ?? 0);
        const max =
          randomCollection.total + (randomCollection.tokenIdOffset ?? 0);
        randomTokenId = Math.floor(Math.random() * (max - min + 1)) + min;
      } catch {
        // fallback to range
        const min = 1 + (randomCollection.tokenIdOffset ?? 0);
        const max =
          randomCollection.total + (randomCollection.tokenIdOffset ?? 0);
        randomTokenId = Math.floor(Math.random() * (max - min + 1)) + min;
      }
    }
    const randomPreset = Math.floor(Math.random() * reactionsMap.length) + 1;
    setCollectionIndex(randomCollectionIndex);
    setTokenID(randomTokenId);
    setTempTokenID(randomTokenId);
    setOverlayNumber(randomPreset);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
    setSelectedFromWallet(null); // Clear wallet selection when feeling lucky
    // Clear owner state since we're feeling lucky
    setNftOwner(null);
    setOwnerError(null);
    // Clear unified wallet browsing state
    setWalletInput("");
    setNfts([]);
    setNftError(null);
    setActiveWallet(null);
  }, []);

  // Handle Enter key for wallet input
  const handleWalletInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" && walletInput.trim() && !nftLoading) {
      setNfts([]); // Clear previous results
      fetchWalletNFTs(walletInput.trim());
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && ffmpegRef.current === null) {
      ffmpegRef.current = new FFmpeg();
      console.log("FFmpeg instance created");
    }
  }, []);

  useEffect(() => {
    console.log("imageUrl changed:", imageUrl);
  }, [imageUrl]);

  console.log("Top-level render:", { ffmpegReady, imageUrl });

  // Handler for Add to Watchlist button
  function handleAddToWatchlist(address?: string) {
    return async function () {
      const addressToAdd = address || walletInput.trim();
      console.log("Add to Watchlist clicked", addressToAdd);
      const result = await watchlist.addWallet(addressToAdd);
      console.log("addWallet result", result);
      if (result) {
        // Optionally clear input or show feedback
      }
    };
  }

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-2 py-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* 1. Title */}
          <header className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              <a href="/" className="text-inherit no-underline">
                CHIMP.FUN
              </a>
            </h1>
            <p className="text-lg font-medium mb-2">NFT Editor</p>
          </header>

          {/* 2. Preview */}
          <div className="flex flex-col items-center w-full p-4 border rounded-lg bg-muted/50 mt-2">
            <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
              {loading ? (
                isFirstRender ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : finalResult ? (
                  <div className="relative w-full h-full">
                    {isGIF && !playAnimation && staticGifFrameUrl ? (
                      <img
                        src={staticGifFrameUrl}
                        alt="Preview (static frame)"
                        className="object-contain w-full h-full rounded-lg opacity-80"
                        style={{
                          background: "transparent",
                          filter: "brightness(0.7) grayscale(0.3)",
                        }}
                      />
                    ) : (
                      <img
                        src={finalResult}
                        alt="Preview"
                        className="object-contain w-full h-full rounded-lg opacity-80"
                        style={{
                          background: "transparent",
                          filter: "brightness(0.7) grayscale(0.3)",
                        }}
                      />
                    )}
                    {/* Draggable overlay for reaction, always shown if finalResult */}
                    <ReactionOverlayDraggable
                      x={x}
                      y={y}
                      scale={scale}
                      imageUrl={
                        reactionsMap[overlayNumber - 1]?.isCustom
                          ? customSpeechBubbleDataUrl || ""
                          : `/reactions/${reactionsMap[overlayNumber - 1].filename}`
                      }
                      onChange={({ x: newX, y: newY, scale: newScale }) => {
                        setX(newX);
                        setY(newY);
                        setScale(newScale);
                      }}
                      containerSize={320}
                      setDragging={setDragging}
                      dragging={dragging}
                      setResizing={setResizing}
                      resizing={resizing}
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
                      disabled={loading}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Spinner />
                    </div>
                  </div>
                ) : (
                  <Skeleton className="w-full h-full rounded-lg" />
                )
              ) : (
                finalResult && (
                  <>
                    {isGIF && !playAnimation && staticGifFrameUrl ? (
                      <img
                        src={staticGifFrameUrl}
                        alt="Preview (static frame)"
                        className="object-contain w-full h-full rounded-lg"
                        style={{ background: "transparent" }}
                      />
                    ) : (
                      <img
                        src={finalResult}
                        alt="Preview"
                        className="object-contain w-full h-full rounded-lg"
                        style={{ background: "transparent" }}
                      />
                    )}
                    {/* Draggable overlay for reaction */}
                    <ReactionOverlayDraggable
                      x={x}
                      y={y}
                      scale={scale}
                      imageUrl={
                        reactionsMap[overlayNumber - 1]?.isCustom
                          ? customSpeechBubbleDataUrl || ""
                          : `/reactions/${reactionsMap[overlayNumber - 1].filename}`
                      }
                      onChange={({ x: newX, y: newY, scale: newScale }) => {
                        setX(newX);
                        setY(newY);
                        setScale(newScale);
                      }}
                      containerSize={320}
                      setDragging={setDragging}
                      dragging={dragging}
                      setResizing={setResizing}
                      resizing={resizing}
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
                      disabled={loading}
                    />
                  </>
                )
              )}
            </div>
            <div className="flex flex-row gap-2 mt-2 justify-center w-full">
              {/* Preview Buttons, always small, centered below preview */}
              <Button size="sm" onClick={downloadOutput} aria-label="Download">
                <AiOutlineDownload />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={function handleCopy() {
                  /* ... */
                }}
                aria-label="Copy"
              >
                <AiOutlineCopy />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={copyUrlToClipboard}
                aria-label="Share Template"
              >
                <AiOutlineLink />
              </Button>
            </div>
          </div>

          {/* 4. Feeling Lucky Button */}
          <div className="flex justify-center mt-2">
            <Button onClick={handleFeelingLucky} variant="secondary">
              I&apos;m Feeling Lucky
            </Button>
          </div>

          {/* 5. Settings Section */}
          <div className="flex flex-col gap-4 mt-4">
            {/* Collection */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="collection">Collection</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  items={collectionsMetadata}
                  value={collectionIndex.toString()}
                  onValueChange={function handleCollectionChange(val) {
                    const newCollectionIndex = Number(val);
                    setLoading(true);
                    setCollectionIndex(newCollectionIndex);
                    collectionMetadata =
                      collectionsMetadata[newCollectionIndex];
                    minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
                    maxTokenID =
                      collectionMetadata.total +
                      (collectionMetadata.tokenIdOffset ?? 0);
                    if (
                      Number(tokenID) < minTokenID ||
                      Number(tokenID) > maxTokenID
                    ) {
                      setTokenID(minTokenID);
                      setTempTokenID(minTokenID);
                    }
                    setFile(null);
                    setUploadedImageUri(null);
                    setSelectedFromWallet(null);
                    // Clear owner state when changing collection
                    setNftOwner(null);
                    setOwnerError(null);
                  }}
                  getItemValue={(collection) =>
                    collectionsMetadata.indexOf(collection).toString()
                  }
                  getItemLabel={(collection) => collection.name}
                  getItemKey={(collection) => collection.name}
                  placeholder="Select collection"
                  searchPlaceholder="Search collections... (e.g. 'doo' for Doodles)"
                  className="flex-1 min-w-0 w-full"
                  fuseOptions={{
                    keys: ["name"],
                    threshold: 0.3,
                    includeScore: true,
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={function handleRandomCollection() {
                    const randomIndex = Math.floor(
                      Math.random() * collectionsMetadata.length,
                    );
                    setCollectionIndex(randomIndex);
                    setLoading(true);
                    const randomCollection = collectionsMetadata[randomIndex];
                    const min = 1 + (randomCollection.tokenIdOffset ?? 0);
                    const max =
                      randomCollection.total +
                      (randomCollection.tokenIdOffset ?? 0);
                    const randomTokenId =
                      Math.floor(Math.random() * (max - min + 1)) + min;
                    setTokenID(randomTokenId);
                    setTempTokenID(randomTokenId);
                    setFile(null);
                    setUploadedImageUri(null);
                    setSelectedFromWallet(null);
                    // Clear owner state when changing collection
                    setNftOwner(null);
                    setOwnerError(null);
                  }}
                >
                  🎲
                </Button>
              </div>
              {selectedFromWallet && (
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border-l-2 border-blue-500">
                  {selectedFromWallet.source === "your-wallet" ? (
                    <span>�� Selected from your wallet</span>
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
            </div>
            {/* Token ID */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="gifNumber">
                Token ID ({minTokenID}-{maxTokenID})
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gifNumber"
                  min={minTokenID}
                  max={maxTokenID}
                  value={tempTokenID}
                  onChange={function handleTokenIdInput(e) {
                    const value = e.target.value;
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
                  type="number"
                  className="flex-1 min-w-0"
                  style={{ minWidth: 0 }}
                />
                <Button variant="secondary" onClick={handleRandomClick}>
                  🎲
                </Button>
              </div>
              {errorMessage && (
                <div className="text-destructive text-sm mt-1">
                  {errorMessage}
                </div>
              )}
              {/* NFT Owner Display */}
              {!uploadedImageUri && (
                <div className="mt-2">
                  {ownerLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading owner...
                    </div>
                  ) : ownerError ? (
                    <div className="text-sm text-muted-foreground">
                      {ownerError}
                    </div>
                  ) : nftOwner ? (
                    <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {selectedFromWallet ? "Selected from" : "Owned by"}
                        </span>
                        <span className="text-sm font-mono">
                          {middleEllipsis(nftOwner, 20)}'s NFTs
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyOwnerToClipboard(nftOwner)}
                        title="Copy address"
                      >
                        <AiOutlineCopy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
              {/* Load Wallet button above OpenSea link */}
              {!uploadedImageUri && nftOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab("loadwallet");
                    // Fill the wallet input with the current NFT owner
                    setWalletInput(nftOwner);
                    // Scroll to wallet input after a brief delay
                    setTimeout(() => {
                      const walletInput =
                        document.getElementById("walletInput");
                      if (walletInput) {
                        walletInput.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        walletInput.focus();
                      }
                    }, 100);
                  }}
                  className="w-full mt-1"
                >
                  🔍 Load This Wallet to Browse NFTs
                </Button>
              )}
              {!uploadedImageUri && !nftOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab("loadwallet");
                    // Scroll to wallet input after a brief delay
                    setTimeout(() => {
                      const walletInput =
                        document.getElementById("walletInput");
                      if (walletInput) {
                        walletInput.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        walletInput.focus();
                      }
                    }, 100);
                  }}
                  className="w-full mt-1"
                >
                  🔍 Load Wallet to Browse NFTs
                </Button>
              )}
              {/* OpenSea link below Token ID input */}
              {uploadedImageUri
                ? null
                : (() => {
                    const contract = collectionMetadata.contract;
                    const chain = collectionMetadata.chain;
                    const tokenIdNum = Number(tempTokenID);
                    const validTokenId =
                      !isNaN(tokenIdNum) &&
                      tokenIdNum >= minTokenID &&
                      tokenIdNum <= maxTokenID;
                    let openseaChainSegment = "";
                    if (chain === "ape") {
                      openseaChainSegment = "ape_chain";
                    } else if (chain === "polygon") {
                      openseaChainSegment = "polygon";
                    } else {
                      openseaChainSegment = "ethereum";
                    }
                    if (validTokenId && contract && openseaChainSegment) {
                      const url = `https://opensea.io/assets/${openseaChainSegment}/${contract}/${tokenIdNum}`;
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm mt-1"
                          style={{ wordBreak: "break-all" }}
                        >
                          View on OpenSea
                        </a>
                      );
                    }
                    return null;
                  })()}
            </div>
            {/* Preset */}
            <div className="flex flex-col gap-2">
              <Label>Preset</Label>
              <div className="flex gap-2 items-center w-full">
                <div className="flex-1 min-w-0 w-full">
                  <SearchableSelect
                    items={reactionsMap}
                    value={overlayNumber.toString()}
                    onValueChange={function handleReaction(val) {
                      setLoading(true);
                      setOverlayNumber(Number(val));
                    }}
                    getItemValue={(reaction) =>
                      (reactionsMap.indexOf(reaction) + 1).toString()
                    }
                    getItemLabel={(reaction) => reaction.title}
                    getItemKey={(reaction) => reaction.title}
                    placeholder="Select Preset"
                    searchPlaceholder="Search presets... (e.g. 'gm' for GM!)"
                    className="flex-1 min-w-0 w-full"
                    fuseOptions={{
                      keys: ["title"],
                      threshold: 0.3,
                      includeScore: true,
                    }}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={function handleRandomReaction() {
                    const randomReaction =
                      Math.floor(Math.random() * reactionsMap.length) + 1;
                    setOverlayNumber(randomReaction);
                    setLoading(true);
                  }}
                >
                  🎲
                </Button>
              </div>
              {/* Custom speech bubble text input */}
              {reactionsMap[overlayNumber - 1]?.isCustom && (
                <div className="flex flex-col gap-2 mt-2">
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
                    Press Enter for new lines. Text will be centered in the
                    speech bubble.
                  </small>
                </div>
              )}
            </div>
            {/* Watermark */}
            <div className="flex items-center space-x-2 w-full">
              <Switch
                id="overlayEnabled"
                checked={overlayEnabled}
                onCheckedChange={setOverlayEnabled}
              />
              <Label htmlFor="overlayEnabled">Watermark</Label>
            </div>
          </div>

          {/* 6. Tabs */}
          <div
            className="flex border-b mt-6 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "watchlist" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Watchlist{" "}
              {watchlist.watchedWallets.length > 0 &&
                `(${watchlist.watchedWallets.length})`}
            </button>
            <button
              onClick={() => setActiveTab("loadwallet")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "loadwallet" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Load Wallet
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "upload" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Upload Image
            </button>
          </div>

          {/* 7. Tab Content */}
          <div className="mt-4">
            {activeTab === "watchlist" && (
              <div className="space-y-6">
                {/* Show all NFTs first */}
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
                {/* Watchlist manager below the NFTs */}
                <WatchlistManager
                  watchlist={watchlist}
                  supportedCollections={supportedCollections}
                  onSelectNFT={handleNFTSelect}
                  isResolvingENS={isResolvingENS}
                />
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
                      onKeyDown={handleWalletInputKeyDown}
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
          </div>
        </div>
      </main>
      {/* Tooltip CSS for .middle-ellipsis-tooltip */}
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
