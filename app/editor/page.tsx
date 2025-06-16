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
} from "react";
import { AiOutlineCopy, AiOutlineDownload } from "react-icons/ai";
import { ImagePicker } from "@/components/ui/ImagePicker";

const fileToDataUri = (file: File) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event?.target?.result);
    };
    reader.readAsDataURL(file);
  });

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

export default function Home() {
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

  let collectionMetadata = collectionsMetadata[collectionIndex];
  let minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  let maxTokenID =
    collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);

  useEffect(() => {
    if (isFirstRender) {
      setLoading(true);
      setIsFirstRender(false);
    }
  }, [isFirstRender]);

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

    // Create a download link and trigger the download
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
  }, [tempTokenID, minTokenID, maxTokenID]);

  const handleRandomClick = useCallback(() => {
    console.log("clicked random");
    const randomId = Math.floor(Math.random() * maxTokenID) + 1;
    setTempTokenID(randomId);
    setTokenID(randomId);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
  }, [maxTokenID]);

  const copyBlobToClipboard = async (blobUrl: string) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      if (blob.type === "image/gif") {
        if (
          confirm(
            "Copying GIFs isn't supported by current browser. Would you like to download instead?",
          )
        ) {
          downloadOutput();
        }
        return;
      }

      if (!navigator.clipboard.write) {
        alert("Your browser does not support copying images to clipboard");
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      alert("Image copied to clipboard successfully!");
    } catch (err) {
      console.error("Failed to copy image:", err);
      if (
        confirm("Failed to copy image. Would you like to download it instead?")
      ) {
        downloadOutput();
      }
    }
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

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            CHIMP.FUN
          </h1>
          <p className="text-lg font-medium mb-2">NFT Editor</p>
        </header>
        <section className="flex flex-col gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* First column: collection, token id, image, tip */}
            <div className="flex flex-col gap-8">
              {/* Upload controls */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="collection">Collection</Label>
                <div className="flex gap-2">
                  <Select
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
                    }}
                  >
                    <SelectTrigger
                      id="collection"
                      className="flex-1 min-w-0 w-full overflow-hidden"
                      style={{ overflow: "hidden" }}
                    >
                      <SelectValue
                        placeholder="Select collection"
                        className="truncate"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          width: "100%",
                        }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {collectionsMetadata.map((collection, index) => (
                        <SelectItem
                          key={collection.name}
                          value={index.toString()}
                        >
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    }}
                  >
                    🎲
                  </Button>
                </div>
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
              </div>
              <div className="flex flex-col gap-2">
                <ImagePicker
                  id="file"
                  onFileChange={setFile}
                  accept="image/*"
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
                  Paste From Clipboard
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
                    <Select
                      value={overlayNumber.toString()}
                      onValueChange={function handleReaction(val) {
                        setLoading(true);
                        setOverlayNumber(Number(val));
                      }}
                    >
                      <SelectTrigger
                        id="preset"
                        className="flex-1 min-w-0 w-full overflow-hidden"
                        style={{ overflow: "hidden" }}
                      >
                        <SelectValue
                          placeholder="Select Preset"
                          className="truncate"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                            width: "100%",
                          }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {reactionsMap.map((value, index) => (
                          <SelectItem
                            key={index + 1}
                            value={(index + 1).toString()}
                          >
                            <span
                              style={{
                                whiteSpace: "normal",
                                overflow: "visible",
                                textOverflow: "unset",
                                display: "block",
                                width: "100%",
                              }}
                            >
                              {value.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div className="flex items-center space-x-2 w-full">
                  <Label htmlFor="overlayEnabled">Show MADE WITH</Label>
                  <Switch
                    id="overlayEnabled"
                    checked={overlayEnabled}
                    onCheckedChange={setOverlayEnabled}
                  />
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
                        <img
                          src={finalResult}
                          alt="Preview"
                          className="object-contain w-full h-full rounded-lg opacity-80"
                          style={{
                            background: "transparent",
                            filter: "brightness(0.7) grayscale(0.3)",
                          }}
                        />
                        {/* Draggable overlay for reaction, always shown if finalResult */}
                        <ReactionOverlayDraggable
                          x={x}
                          y={y}
                          scale={scale}
                          imageUrl={`/reactions/${reactionsMap[overlayNumber - 1].filename}`}
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
                          }}
                          onResizeEnd={() => {
                            setResizing(false);
                            debouncedRenderImageUrl();
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
                        <img
                          src={finalResult}
                          alt="Preview"
                          className="object-contain w-full h-full rounded-lg"
                          style={{ background: "transparent" }}
                        />
                        {/* Draggable overlay for reaction */}
                        <ReactionOverlayDraggable
                          x={x}
                          y={y}
                          scale={scale}
                          imageUrl={`/reactions/${reactionsMap[overlayNumber - 1].filename}`}
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
                          }}
                          onResizeEnd={() => {
                            setResizing(false);
                            debouncedRenderImageUrl();
                          }}
                          disabled={loading}
                        />
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
                      if (finalResult) {
                        copyBlobToClipboard(finalResult);
                      }
                    }}
                    className="w-full md:w-auto"
                    aria-label="Copy"
                  >
                    <AiOutlineCopy />
                  </Button>
                </div>
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
  );
}
