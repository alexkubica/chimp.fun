"use client";

import { useRef, useState, useEffect, MouseEvent } from "react";
import { ReactionOverlayDraggableProps } from "../types";
import { getClientXY } from "../utils";

/**
 * A draggable and resizable overlay component for reaction images
 * Supports both mouse and touch interactions with proper bounds checking
 */
export function ReactionOverlayDraggable({
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

  function onTouchStart(e: TouchEvent) {
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

  function onMouseMove(e: globalThis.MouseEvent) {
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

  function onTouchMove(e: globalThis.TouchEvent) {
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

  function onTouchEnd(e: globalThis.TouchEvent) {
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

  function onResizeTouchStart(e: TouchEvent) {
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
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", onTouchEnd);
      if (resizing) {
        document.body.style.userSelect = "none";
      }
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        if (resizing) {
          document.body.style.userSelect = "";
        }
      };
    }
  });

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