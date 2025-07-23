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
export function getClientXY(e: globalThis.MouseEvent | globalThis.TouchEvent): {
  clientX: number;
  clientY: number;
} {
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

// Watchlist Management Functions

/**
 * Storage key for wallet watchlist
 */
const WATCHLIST_STORAGE_KEY = "nft-editor-watchlist";

/**
 * Watched wallet interface
 */
export interface WatchedWallet {
  address: string;
  label?: string;
  addedAt: number;
  isEns?: boolean;
  ensName?: string;
}

/**
 * Gets all watched wallets from localStorage
 */
export function getWatchedWallets(): WatchedWallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const wallets = JSON.parse(raw);
    return Array.isArray(wallets) ? wallets : [];
  } catch (error) {
    console.warn("Failed to load watched wallets:", error);
    return [];
  }
}

/**
 * Saves watched wallets to localStorage
 */
export function saveWatchedWallets(wallets: WatchedWallet[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(wallets));
  } catch (error) {
    console.warn("Failed to save watched wallets:", error);
  }
}

/**
 * Adds a wallet to the watchlist
 */
export function addToWatchlist(
  address: string,
  label?: string,
  ensName?: string,
): boolean {
  try {
    const wallets = getWatchedWallets();
    const normalizedAddress = address.toLowerCase();

    // Check if already exists
    if (wallets.some((w) => w.address.toLowerCase() === normalizedAddress)) {
      return false;
    }

    const newWallet: WatchedWallet = {
      address: normalizedAddress,
      label:
        label || ensName || `${address.slice(0, 6)}...${address.slice(-4)}`,
      addedAt: Date.now(),
      isEns: !!ensName,
      ensName,
    };

    wallets.unshift(newWallet); // Add to beginning
    saveWatchedWallets(wallets);
    return true;
  } catch (error) {
    console.warn("Failed to add wallet to watchlist:", error);
    return false;
  }
}

/**
 * Removes a wallet from the watchlist
 */
export function removeFromWatchlist(address: string): boolean {
  try {
    const wallets = getWatchedWallets();
    const normalizedAddress = address.toLowerCase();
    const filteredWallets = wallets.filter(
      (w) => w.address.toLowerCase() !== normalizedAddress,
    );

    if (filteredWallets.length === wallets.length) {
      return false; // Wallet not found
    }

    saveWatchedWallets(filteredWallets);
    return true;
  } catch (error) {
    console.warn("Failed to remove wallet from watchlist:", error);
    return false;
  }
}

/**
 * Checks if a wallet is in the watchlist
 */
export function isInWatchlist(address: string): boolean {
  const wallets = getWatchedWallets();
  const normalizedAddress = address.toLowerCase();
  return wallets.some((w) => w.address.toLowerCase() === normalizedAddress);
}

/**
 * Updates the label of a watched wallet
 */
export function updateWatchlistLabel(address: string, label: string): boolean {
  try {
    const wallets = getWatchedWallets();
    const normalizedAddress = address.toLowerCase();
    const walletIndex = wallets.findIndex(
      (w) => w.address.toLowerCase() === normalizedAddress,
    );

    if (walletIndex === -1) {
      return false;
    }

    wallets[walletIndex].label = label;
    saveWatchedWallets(wallets);
    return true;
  } catch (error) {
    console.warn("Failed to update watchlist label:", error);
    return false;
  }
}

/**
 * Clears all watched wallets
 */
export function clearWatchlist(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WATCHLIST_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear watchlist:", error);
  }
}

/**
 * Generates a speech bubble data URL with custom text
 */
export function generateSpeechBubbleDataUrl(text: string): string | null {
  if (typeof window === "undefined") return null;

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
  const textHeight = lines.length * fontSize + (lines.length - 1) * 4; // 4px line spacing

  // Calculate bubble dimensions
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = textHeight + padding * 2;

  // Set canvas size
  canvas.width = bubbleWidth;
  canvas.height = bubbleHeight + spikeHeight;

  // Set font again after canvas resize
  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw bubble background
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  // Draw rounded rectangle
  const radius = 10;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(bubbleWidth - radius, 0);
  ctx.quadraticCurveTo(bubbleWidth, 0, bubbleWidth, radius);
  ctx.lineTo(bubbleWidth, bubbleHeight - radius);
  ctx.quadraticCurveTo(
    bubbleWidth,
    bubbleHeight,
    bubbleWidth - radius,
    bubbleHeight,
  );

  // Add speech spike
  ctx.lineTo(bubbleWidth * 0.7, bubbleHeight);
  ctx.lineTo(bubbleWidth * 0.6, bubbleHeight + spikeHeight);
  ctx.lineTo(bubbleWidth * 0.5, bubbleHeight);

  ctx.lineTo(radius, bubbleHeight);
  ctx.quadraticCurveTo(0, bubbleHeight, 0, bubbleHeight - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Draw text
  ctx.fillStyle = "#000000";
  const centerX = bubbleWidth / 2;
  const centerY = bubbleHeight / 2;
  const lineSpacing = fontSize + 4;
  const startY = centerY - ((lines.length - 1) * lineSpacing) / 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineSpacing;
    ctx.fillText(line, centerX, y);
  });

  return canvas.toDataURL("image/png");
}
