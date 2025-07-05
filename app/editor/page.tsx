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
import {
  collectionsMetadata,
  reactionsMap,
  multiAssetPresetsMap,
} from "@/consts";
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
import path from "path";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { middleEllipsis } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { AssetSettings, MultiAssetSettings } from "@/app/editor/types";

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
  assetId?: string;
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
  assetId,
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

// Multi-Asset Overlay Component
function MultiAssetOverlay({
  assets,
  containerSize = 320,
  onChange,
  setDragging,
  dragging,
  onDragEnd,
  setResizing,
  resizing,
  onResizeEnd,
  disabled = false,
}: {
  assets: AssetSettings[];
  containerSize?: number;
  onChange: (
    assetId: string,
    vals: { x: number; y: number; scale: number },
  ) => void;
  setDragging: (dragging: boolean) => void;
  dragging: boolean;
  onDragEnd?: () => void;
  setResizing: (resizing: boolean) => void;
  resizing: boolean;
  onResizeEnd?: () => void;
  disabled?: boolean;
}) {
  const [activeAsset, setActiveAsset] = useState<string | null>(null);

  const handleAssetChange = (
    assetId: string,
    vals: { x: number; y: number; scale: number },
  ) => {
    setActiveAsset(assetId);
    onChange(assetId, vals);
  };

  return (
    <div
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {assets.map((asset) => (
        <ReactionOverlayDraggable
          key={asset.id}
          x={asset.x}
          y={asset.y}
          scale={asset.scale}
          imageUrl={asset.imageUrl}
          containerSize={containerSize}
          onChange={(vals) => handleAssetChange(asset.id, vals)}
          setDragging={setDragging}
          dragging={dragging && activeAsset === asset.id}
          onDragEnd={() => {
            setActiveAsset(null);
            if (onDragEnd) onDragEnd();
          }}
          setResizing={setResizing}
          resizing={resizing && activeAsset === asset.id}
          onResizeEnd={() => {
            setActiveAsset(null);
            if (onResizeEnd) onResizeEnd();
          }}
          disabled={disabled}
          assetId={asset.id}
        />
      ))}
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
  // Lazy load state
  const [visibleCount, setVisibleCount] = useState(100);
  useEffect(() => {
    setVisibleCount(100); // Reset when nfts change
  }, [nfts]);
  const visibleNFTs = nfts.slice(0, visibleCount);
  const canLoadMore = nfts.length > visibleCount;

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
      {/* NFT horizontal scroll gallery */}
      <div className="relative">
        {/* Left arrow */}
        {visibleNFTs.length > 2 && (
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
        {visibleNFTs.length > 2 && (
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
          {visibleNFTs.map((nft) => {
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
      {(hasMore || canLoadMore) && (
        <div className="flex gap-2">
          {canLoadMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((c) => c + 100)}
              disabled={loading}
              className="flex-1"
            >
              {loading
                ? "Loading..."
                : `Load More (${visibleCount + 1}-${Math.min(visibleCount + 100, nfts.length)} of ${nfts.length})`}
            </Button>
          )}
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

  const ffmpegRef = useRef(new FFmpeg());
  const [imageExtension, setImageExtension] = useState("gif");
  const [loading, setLoading] = useState(true);
  const [tokenID, setTokenID] = useState<string | number>(2956);
  const [tempTokenID, setTempTokenID] = useState<string | number>(2956);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [collectionIndex, setCollectionIndex] = useState(0);
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

  // Multi-asset preset state
  const [isMultiAssetMode, setIsMultiAssetMode] = useState(false);
  const [multiAssetPresetNumber, setMultiAssetPresetNumber] = useState(0);
  const [multiAssetSettings, setMultiAssetSettings] =
    useState<MultiAssetSettings>({
      assets: [],
      presetNumber: 0,
      overlayEnabled: true,
    });

  // Dynamic SDK hooks for wallet context
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Unified NFT Gallery state (replaces both user and external states)
  const [selectedFromWallet, setSelectedFromWallet] = useState<{
    contract: string;
    tokenId: string;
    imageUrl: string;
    source?: "your-wallet" | "external-wallet";
    walletAddress?: string;
  } | null>(null);

  // Unified wallet browsing state
  const [walletInput, setWalletInput] = useState<string>("");
  const [activeWallet, setActiveWallet] = useState<string | null>(null); // Currently loaded wallet
  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);

  // Tab state for switching between connected and inputted wallet
  const [activeTab, setActiveTab] = useState<"connected" | "input">(
    "connected",
  );

  let collectionMetadata = collectionsMetadata[collectionIndex];
  let minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  let maxTokenID =
    collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);

  // Create supported collections set for filtering
  const supportedCollections = useMemo(() => {
    return new Set(
      collectionsMetadata.map((c) => c.contract?.toLowerCase()).filter(Boolean),
    );
  }, []);

  // URL parameter handling functions
  const parseUrlParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);

    // Parse preset (overlayNumber or multi-asset preset)
    const presetParam = params.get("preset");
    if (presetParam) {
      // Check if it's a multi-asset preset first
      const multiAssetIndex = multiAssetPresetsMap.findIndex(
        (r) => r.title.toLowerCase() === presetParam.toLowerCase(),
      );
      if (multiAssetIndex >= 0) {
        setIsMultiAssetMode(true);
        setMultiAssetPresetNumber(multiAssetIndex);
        setMultiAssetSettings({
          assets: multiAssetPresetsMap[multiAssetIndex].assets,
          presetNumber: multiAssetIndex,
          overlayEnabled: true,
        });
      } else {
        // Check single asset presets
        const presetIndex = reactionsMap.findIndex(
          (r) => r.title.toLowerCase() === presetParam.toLowerCase(),
        );
        if (presetIndex >= 0) {
          setIsMultiAssetMode(false);
          setOverlayNumber(presetIndex + 1);
        }
      }
    } else {
      // Default to CHIMP preset if not specified
      const chimpIndex = reactionsMap.findIndex((r) =>
        r.title.toLowerCase().includes("chimp"),
      );
      if (chimpIndex >= 0) {
        setIsMultiAssetMode(false);
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

    // Parse multi-asset settings
    const multiAssetDataParam = params.get("multiAssetData");
    if (multiAssetDataParam && isMultiAssetMode) {
      try {
        const multiAssetData = JSON.parse(
          decodeURIComponent(multiAssetDataParam),
        );
        setMultiAssetSettings((prev) => ({
          ...prev,
          assets: multiAssetData.assets || prev.assets,
        }));
      } catch (error) {
        console.error("Failed to parse multi-asset data:", error);
      }
    }

    // Set the overlay enabled state correctly for multi-asset mode
    if (isMultiAssetMode) {
      setOverlayEnabled(multiAssetSettings.overlayEnabled);
    }

    // Parse wallet id
    const walletIdParam = params.get("walletId");
    if (walletIdParam && isValidEthereumAddress(walletIdParam)) {
      setWalletInput(walletIdParam);
      setActiveTab("input");
    }
  }, []);

  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    // Add preset (reaction title or multi-asset preset title)
    if (isMultiAssetMode) {
      const currentMultiAssetPreset =
        multiAssetPresetsMap[multiAssetPresetNumber];
      if (currentMultiAssetPreset) {
        params.set("preset", currentMultiAssetPreset.title);
        // Add multi-asset data
        params.set(
          "multiAssetData",
          encodeURIComponent(
            JSON.stringify({
              assets: multiAssetSettings.assets,
            }),
          ),
        );
      }
    } else {
      const currentReaction = reactionsMap[overlayNumber - 1];
      if (currentReaction) {
        params.set("preset", currentReaction.title);
      }
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

    // Add position and scale (for single asset mode)
    if (!isMultiAssetMode) {
      params.set("x", x.toString());
      params.set("y", y.toString());
      params.set("scale", scale.toString());
    }

    // Add wallet id if available
    if (activeWallet && activeWallet !== primaryWallet?.address) {
      params.set("walletId", activeWallet);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    isMultiAssetMode,
    multiAssetPresetNumber,
    multiAssetSettings,
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

  // Multi-asset change handler
  const handleMultiAssetChange = useCallback(
    (assetId: string, vals: { x: number; y: number; scale: number }) => {
      setMultiAssetSettings((prev) => ({
        ...prev,
        assets: prev.assets.map((asset) =>
          asset.id === assetId ? { ...asset, ...vals } : asset,
        ),
      }));
    },
    [],
  );

  // Combined preset options for select
  const allPresetOptions = useMemo(() => {
    const singleAssetOptions = reactionsMap.map((reaction, index) => ({
      value: `single-${index + 1}`,
      label: reaction.title,
      type: "single" as const,
      index: index + 1,
    }));

    const multiAssetOptions = multiAssetPresetsMap.map((preset, index) => ({
      value: `multi-${index}`,
      label: preset.title,
      type: "multi" as const,
      index: index,
    }));

    return [...singleAssetOptions, ...multiAssetOptions];
  }, []);

  // Handle preset selection
  const handlePresetChange = useCallback(
    (value: string) => {
      const option = allPresetOptions.find((opt) => opt.value === value);
      if (!option) return;

      if (option.type === "single") {
        setIsMultiAssetMode(false);
        setOverlayNumber(option.index);
        // Reset multi-asset settings
        setMultiAssetSettings({
          assets: [],
          presetNumber: 0,
          overlayEnabled: true,
        });
      } else {
        setIsMultiAssetMode(true);
        setMultiAssetPresetNumber(option.index);
        const preset = multiAssetPresetsMap[option.index];
        setMultiAssetSettings({
          assets: preset.assets,
          presetNumber: option.index,
          overlayEnabled: true,
        });
      }
    },
    [allPresetOptions],
  );

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
      setActiveTab("connected"); // Switch to connected tab when logged in
      if (!activeWallet || activeWallet !== primaryWallet.address) {
        setWalletInput(""); // Clear input when loading user's wallet
        fetchAllUserNFTs(primaryWallet.address); // Fetch ALL user NFTs automatically
      }
    }
  }, [isLoggedIn, primaryWallet?.address, fetchAllUserNFTs]);

  // Switch tab logic
  useEffect(() => {
    if (!isLoggedIn && activeTab === "connected") {
      setActiveTab("input"); // Switch to input tab if not logged in
    }
  }, [isLoggedIn, activeTab]);

  // Unified NFT selection handler
  const handleNFTSelect = useCallback(
    (contract: string, tokenId: string, imageUrl: string) => {
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
        const isYourWallet = activeWallet === primaryWallet?.address;
        setSelectedFromWallet({
          contract,
          tokenId,
          imageUrl,
          source: isYourWallet ? "your-wallet" : "external-wallet",
          walletAddress: activeWallet || "",
        });
      }
    },
    [activeWallet, primaryWallet?.address],
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
      if (
        isNaN(Number(tokenID)) ||
        Number(tokenID) < minTokenID ||
        Number(tokenID) > maxTokenID
      ) {
        return;
      }

      if (collectionMetadata.gifOverride) {
        const gifUrl = collectionMetadata.gifOverride(tokenID.toString());
        // r3bell api
        // return encodeURIComponent( `/proxy?url=${https://r3bel-gifs-prod.s3.us-east-2.amazonaws.com/chimpers-main-portrait/${gifNumber}.gif}`,);

        setImageUrl(`/proxy?url=${encodeURIComponent(gifUrl)}`);
        return;
      }

      const response = await fetch(
        `/fetchNFTImage?tokenId=${tokenID}&contract=${collectionMetadata.contract}`,
      );
      if (!response.ok) {
        throw new Error(
          `Error fetching Chimpers image URL: ${response.statusText}`,
        );
      }
      const { imageUrl } = await response.json();
      if (imageUrl.includes("ipfs")) {
        setImageUrl(imageUrl);
      } else {
        setImageUrl(`/proxy?url=${imageUrl}`);
      }
    })();
  }, [collectionIndex, collectionMetadata, maxTokenID, minTokenID, tokenID]);

  const encodedImageUrl = useMemo(() => {
    if (!imageUrl) {
      return null;
    }

    return encodeURIComponent(imageUrl);
  }, [imageUrl]);

  const debouncedRenderImageUrl = useCallback(
    debounce(async () => {
      if (!imageUrl || !encodedImageUrl) {
        return;
      }
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
        await ffmpegRef.current.writeFile(
          "reaction.png",
          await fetchFile(`/reactions/${overlaySettings.filename}`),
        );
        let ffmpegArgs;
        if (overlayEnabled) {
          await ffmpegRef.current.writeFile(
            "credit.png",
            await fetchFile(`/credit.png`),
          );
          ffmpegArgs = [
            "-i",
            `input.${imageExtension}`,
            "-i",
            "reaction.png",
            "-i",
            "credit.png",
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; \
   [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; \
   [scaled_input][scaled1]overlay=${x}:${y}[video1]; \
   [2:v]scale=iw/1.5:-1[scaled2]; \
   [video1][scaled2]overlay=x=(W-w)/2:y=H-h`,
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
            `[0:v]scale=1080:1080[scaled_input]; \
   [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; \
   [scaled_input][scaled1]overlay=${x}:${y}`,
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
        console.log("Image URL generated:", url);
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
    ],
  );

  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
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
      } catch (e) {
        console.error(e);
      }
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

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-2 py-4">
        <div className="w-full max-w-2xl mx-auto">
          <header className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              <a href="/" className="text-inherit no-underline">
                CHIMP.FUN
              </a>
            </h1>
            <p className="text-lg font-medium mb-2">NFT Editor</p>
            <div className="flex justify-center mt-2">
              <Button onClick={handleFeelingLucky} variant="secondary">
                I&apos;m Feeling Lucky
              </Button>
            </div>
          </header>
          <section className="flex flex-col gap-4">
            {/* NFT Gallery - Mobile: under title, Desktop: above collection selector */}
            <div className="md:hidden flex flex-col gap-4">
              {/* Simple Tabs - Mobile */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab("connected")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "connected"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={!isLoggedIn}
                >
                  Your NFTs
                </button>
                <button
                  onClick={() => setActiveTab("input")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "input"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Browse Wallet
                </button>
              </div>

              {/* Tab Content - Mobile */}
              {activeTab === "connected" ? (
                isLoggedIn ? (
                  (nfts.length > 0 || nftLoading || nftError) &&
                  activeWallet === primaryWallet?.address ? (
                    <UnifiedNFTGallery
                      onSelectNFT={handleNFTSelect}
                      supportedCollections={supportedCollections}
                      nfts={nfts}
                      loading={nftLoading}
                      error={nftError}
                      hasMore={hasMore}
                      providerName={providerName}
                      onLoadMore={() => {
                        // For connected wallet, we auto-fetch all NFTs, so no manual loading needed
                        // This shouldn't be called since hasMore is set to false for user wallet
                      }}
                      title="Your NFTs"
                      subtitle={
                        nfts.length > 0
                          ? `${nfts.length} NFTs found in your connected wallet`
                          : undefined
                      }
                      showLoadingState={true}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-4 border rounded-md">
                      Loading your NFTs...
                    </div>
                  )
                ) : (
                  <div className="text-center text-muted-foreground p-4 border rounded-md">
                    Connect your wallet to see your NFTs
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Wallet Input */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="walletInputMobile">
                      Enter wallet address or ENS name
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="walletInputMobile"
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
                        size="sm"
                        onClick={loadWallet}
                        disabled={
                          nftLoading || isResolvingENS || !walletInput.trim()
                        }
                      >
                        {nftLoading || isResolvingENS ? "..." : "Load"}
                      </Button>
                    </div>
                  </div>

                  {/* External Wallet NFT Gallery */}
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
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* First column: collection, token id, image, tip */}
              <div className="flex flex-col gap-8">
                {/* Simple Tabs - Desktop */}
                <div className="hidden md:block">
                  <div className="flex border-b">
                    <button
                      onClick={() => setActiveTab("connected")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "connected"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      disabled={!isLoggedIn}
                    >
                      Your NFTs
                    </button>
                    <button
                      onClick={() => setActiveTab("input")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "input"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Browse Wallet
                    </button>
                  </div>

                  {/* Tab Content - Desktop */}
                  <div className="mt-4">
                    {activeTab === "connected" ? (
                      isLoggedIn ? (
                        (nfts.length > 0 || nftLoading || nftError) &&
                        activeWallet === primaryWallet?.address ? (
                          <UnifiedNFTGallery
                            onSelectNFT={handleNFTSelect}
                            supportedCollections={supportedCollections}
                            nfts={nfts}
                            loading={nftLoading}
                            error={nftError}
                            hasMore={hasMore}
                            providerName={providerName}
                            onLoadMore={() => {
                              // For connected wallet, we auto-fetch all NFTs, so no manual loading needed
                              // This shouldn't be called since hasMore is set to false for user wallet
                            }}
                            title="Your NFTs"
                            subtitle={
                              nfts.length > 0
                                ? `${nfts.length} NFTs found in your connected wallet`
                                : undefined
                            }
                            showLoadingState={true}
                          />
                        ) : (
                          <div className="text-center text-muted-foreground p-4 border rounded-md">
                            Loading your NFTs...
                          </div>
                        )
                      ) : (
                        <div className="text-center text-muted-foreground p-4 border rounded-md">
                          Connect your wallet to see your NFTs
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Wallet Input */}
                        <div className="flex flex-col gap-2">
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
                                nftLoading ||
                                isResolvingENS ||
                                !walletInput.trim()
                              }
                            >
                              {nftLoading || isResolvingENS
                                ? "Loading..."
                                : "Load NFTs"}
                            </Button>
                          </div>
                        </div>

                        {/* External Wallet NFT Gallery */}
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
                                  fetchWalletNFTs(
                                    walletInput.trim(),
                                    nextCursor,
                                  );
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
                  </div>
                </div>

                {/* Upload controls */}
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
                        minTokenID =
                          1 + (collectionMetadata.tokenIdOffset ?? 0);
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
                        setSelectedFromWallet(null); // Clear wallet selection when manually changing collection
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
                        const randomCollection =
                          collectionsMetadata[randomIndex];
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
                        setSelectedFromWallet(null); // Clear wallet selection when randomly changing collection
                      }}
                    >
                      🎲
                    </Button>
                  </div>
                  {selectedFromWallet && (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border-l-2 border-blue-500">
                      {selectedFromWallet.source === "your-wallet" ? (
                        <span>💳 Selected from your wallet</span>
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
                          setSelectedFromWallet(null); // Clear wallet selection when manually changing token ID
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
              </div>
              {/* Second column: preview, download, copy only */}
              <div className="flex flex-col gap-4 h-full items-stretch">
                {/* Preset select at the top, full width */}
                <div className="flex flex-col gap-2">
                  <Label>Preset</Label>
                  <div className="flex gap-2 items-center w-full">
                    <div className="flex-1 min-w-0 w-full">
                      <SearchableSelect
                        items={allPresetOptions}
                        value={
                          isMultiAssetMode
                            ? `multi-${multiAssetPresetNumber}`
                            : `single-${overlayNumber}`
                        }
                        onValueChange={function handleReaction(val) {
                          setLoading(true);
                          handlePresetChange(val);
                        }}
                        getItemValue={(option) => option.value}
                        getItemLabel={(option) => option.label}
                        getItemKey={(option) => option.value}
                        placeholder="Select Preset"
                        searchPlaceholder="Search presets... (e.g. 'gm' for GM!, 'hat test' for Hat Test)"
                        className="flex-1 min-w-0 w-full"
                        fuseOptions={{
                          keys: ["label"],
                          threshold: 0.3,
                          includeScore: true,
                        }}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={function handleRandomReaction() {
                        const randomOption =
                          allPresetOptions[
                            Math.floor(Math.random() * allPresetOptions.length)
                          ];
                        setLoading(true);
                        handlePresetChange(randomOption.value);
                      }}
                    >
                      🎲
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2 w-full">
                    {["Chimpers", "Chimpers Genesis"].includes(
                      collectionMetadata.name,
                    ) && (
                      <>
                        <Switch
                          id="playAnimation"
                          checked={playAnimation}
                          onCheckedChange={setPlayAnimation}
                        />
                        <Label htmlFor="playAnimation">Play animation</Label>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 w-full">
                    <Switch
                      id="overlayEnabled"
                      checked={overlayEnabled}
                      onCheckedChange={setOverlayEnabled}
                    />
                    <Label htmlFor="overlayEnabled">MADE WITH CHIMP.FUN</Label>
                  </div>
                </div>
                {/* Preview and controls below */}
                <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50 mt-2 w-full">
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
                          {isMultiAssetMode ? (
                            <MultiAssetOverlay
                              assets={multiAssetSettings.assets}
                              containerSize={320}
                              onChange={handleMultiAssetChange}
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
                          ) : (
                            <ReactionOverlayDraggable
                              x={x}
                              y={y}
                              scale={scale}
                              imageUrl={`/reactions/${reactionsMap[overlayNumber - 1].filename}`}
                              onChange={({
                                x: newX,
                                y: newY,
                                scale: newScale,
                              }) => {
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
                          )}
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
                          {isMultiAssetMode ? (
                            <MultiAssetOverlay
                              assets={multiAssetSettings.assets}
                              containerSize={320}
                              onChange={handleMultiAssetChange}
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
                          ) : (
                            <ReactionOverlayDraggable
                              x={x}
                              y={y}
                              scale={scale}
                              imageUrl={`/reactions/${reactionsMap[overlayNumber - 1].filename}`}
                              onChange={({
                                x: newX,
                                y: newY,
                                scale: newScale,
                              }) => {
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
                          )}
                        </>
                      )
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 w-full mt-2">
                    <Button
                      onClick={downloadOutput}
                      className="w-full md:w-auto"
                      aria-label="Download"
                    >
                      <AiOutlineDownload />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={function handleCopy() {
                        if (isGIF && !playAnimation && staticGifFrameUrl) {
                          setCopyStatus(null);
                          // Copy PNG from staticGifFrameUrl
                          const blob = dataURLtoBlob(staticGifFrameUrl);
                          navigator.clipboard
                            .write([new ClipboardItem({ "image/png": blob })])
                            .then(() => {
                              setCopyStatus("Image copied to clipboard!");
                            })
                            .catch((err) => {
                              setCopyStatus(
                                "Failed to copy image to clipboard. Please try again or download instead.",
                              );
                            });
                          return;
                        }
                        if (finalResult) {
                          setCopyStatus(null);
                          copyBlobToClipboard(finalResult);
                        }
                      }}
                      className="w-full md:w-auto"
                      aria-label="Copy"
                    >
                      <AiOutlineCopy />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={copyUrlToClipboard}
                      className="w-full md:w-auto"
                      aria-label="Share Template"
                    >
                      <AiOutlineLink />
                    </Button>
                  </div>
                  {copyStatus && (
                    <div className="text-sm mt-1 text-center text-muted-foreground">
                      {copyStatus}
                    </div>
                  )}
                  {/* GIF Copy Modal */}
                  {showGifCopyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                        <div className="mb-4 text-center">
                          <div className="font-semibold mb-2">
                            Copy GIF as static image?
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Copying GIFs isn&apos;t supported by your browser.
                            Would you like to copy a static image instead?
                          </div>
                        </div>
                        <div className="flex gap-2 w-full justify-center">
                          <Button
                            onClick={handleGifCopyModalConfirm}
                            className="flex-1"
                          >
                            Copy PNG
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleGifCopyModalCancel}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* X, Y, Scale controls under both columns */}
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {/* Removed X, Y, Scale controls as requested */}
            </div>
          </section>
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
