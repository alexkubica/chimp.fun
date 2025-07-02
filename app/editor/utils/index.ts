/**
 * Utility functions for the NFT Editor
 */

import { ReactionSettings } from "../types";

/**
 * Converts a data URL to a Blob object
 */
export function dataURLtoBlob(dataurl: string): Blob {
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

/**
 * Converts a File to a data URI
 */
export const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event?.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Generates a storage key for reaction settings
 */
export function getReactionSettingsKey(
  collectionIndex: number,
  tokenID: string | number,
): string {
  return `reactionSettings-${collectionIndex}-${tokenID}`;
}

/**
 * Saves reaction settings to localStorage
 */
export function saveReactionSettings(
  collectionIndex: number,
  tokenID: string | number,
  settings: ReactionSettings,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getReactionSettingsKey(collectionIndex, tokenID),
      JSON.stringify(settings),
    );
  } catch (error) {
    console.warn("Failed to save reaction settings:", error);
  }
}

/**
 * Loads reaction settings from localStorage
 */
export function loadReactionSettings(
  collectionIndex: number,
  tokenID: string | number,
): ReactionSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(
      getReactionSettingsKey(collectionIndex, tokenID),
    );
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load reaction settings:", error);
    return null;
  }
}

/**
 * Validates if a string is a valid Ethereum address
 */
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Checks if input looks like an ENS name
 */
export const looksLikeENS = (input: string): boolean => {
  return input.includes(".") && !input.startsWith("0x");
};

/**
 * Gets client X and Y coordinates from mouse or touch events
 */
export function getClientXY(
  e: globalThis.MouseEvent | globalThis.TouchEvent,
): { clientX: number; clientY: number } {
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

/**
 * Copies a GIF's first frame as PNG to clipboard
 */
export async function copyGifFirstFrameAsPng(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
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
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error("Failed to create PNG blob."));
            return;
          }
          navigator.clipboard
            .write([new ClipboardItem({ "image/png": pngBlob })])
            .then(() => {
              resolve();
              URL.revokeObjectURL(url);
            })
            .catch((err) => {
              reject(err);
              URL.revokeObjectURL(url);
            });
        }, "image/png");
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
}

/**
 * Extracts the first frame of a GIF as PNG data URL
 */
export async function extractFirstFrame(gifUrl: string): Promise<string> {
  const response = await fetch(gifUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  return new Promise<string>((resolve, reject) => {
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
}

/**
 * Creates a middle ellipsis for long text
 */
export function middleEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const start = Math.ceil(maxLength / 2) - 1;
  const end = Math.floor(maxLength / 2) - 2;
  return text.slice(0, start) + "..." + text.slice(-end);
}