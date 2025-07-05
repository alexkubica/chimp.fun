import { useCallback, useState, useMemo } from "react";
import { reactionsMap } from "@/consts";
import { dataURLtoBlob, copyGifFirstFrameAsPng } from "../utils";

export function useImageActions() {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showGifCopyModal, setShowGifCopyModal] = useState(false);
  const [gifBlobToCopy, setGifBlobToCopy] = useState<Blob | null>(null);

  // Clear copy status after timeout
  const clearCopyStatus = useCallback(() => {
    setTimeout(() => setCopyStatus(null), 3000);
  }, []);

  // Download image
  const downloadImage = useCallback(
    (
      finalResult: string | null,
      isGIF: boolean,
      playAnimation: boolean,
      staticGifFrameUrl: string | null,
      collectionName: string,
      tokenID: string | number,
      overlayNumber: number,
      imageExtension: string,
    ) => {
      if (!finalResult) {
        console.warn("can't download image, no final result");
        return;
      }

      const fileName = `${collectionName}-${tokenID}-${reactionsMap[overlayNumber - 1].title}`;

      // If playAnimation is off and staticGifFrameUrl is available, download as PNG
      if (isGIF && !playAnimation && staticGifFrameUrl) {
        const a = document.createElement("a");
        a.href = staticGifFrameUrl;
        a.download = `${fileName}.png`;
        a.click();
        return;
      }

      // Otherwise, download the GIF or other image as before
      const a = document.createElement("a");
      a.href = finalResult;
      a.download = `${fileName}.${imageExtension}`;
      a.click();
    },
    [],
  );

  // Copy image to clipboard
  const copyToClipboard = useCallback(
    async (
      finalResult: string | null,
      isGIF: boolean,
      playAnimation: boolean,
      staticGifFrameUrl: string | null,
    ) => {
      if (!finalResult) {
        setCopyStatus("No image to copy");
        clearCopyStatus();
        return;
      }

      // Handle static GIF frame copy
      if (isGIF && !playAnimation && staticGifFrameUrl) {
        try {
          const blob = dataURLtoBlob(staticGifFrameUrl);
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setCopyStatus("Image copied to clipboard!");
          clearCopyStatus();
        } catch (err) {
          console.error("Failed to copy:", err);
          setCopyStatus("Failed to copy image to clipboard. Please try again or download instead.");
          clearCopyStatus();
        }
        return;
      }

      // Handle regular image copy
      try {
        const response = await fetch(finalResult);
        const blob = await response.blob();

        if (blob.type === "image/gif") {
          setGifBlobToCopy(blob);
          setShowGifCopyModal(true);
          return;
        }

        if (!navigator.clipboard.write) {
          setCopyStatus("Your browser does not support copying images to clipboard");
          clearCopyStatus();
          return;
        }

        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setCopyStatus("Image copied to clipboard successfully!");
        clearCopyStatus();
      } catch (err) {
        console.error("Failed to copy image:", err);
        setCopyStatus("Failed to copy image. Please try again or download instead.");
        clearCopyStatus();
      }
    },
    [clearCopyStatus],
  );

  // Copy URL to clipboard
  const copyUrlToClipboard = useCallback(async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopyStatus("URL copied to clipboard!");
      clearCopyStatus();
    } catch (err) {
      console.error("Failed to copy URL:", err);
      setCopyStatus("Failed to copy URL. Please try again.");
      clearCopyStatus();
    }
  }, [clearCopyStatus]);

  // Handle GIF copy modal confirm
  const handleGifCopyModalConfirm = useCallback(async () => {
    if (!gifBlobToCopy) return;
    
    setShowGifCopyModal(false);
    try {
      await copyGifFirstFrameAsPng(gifBlobToCopy);
      setCopyStatus("Image copied to clipboard!");
      clearCopyStatus();
    } catch (err) {
      setCopyStatus("Failed to copy image to clipboard. Please try again or download instead.");
      clearCopyStatus();
    } finally {
      setGifBlobToCopy(null);
    }
  }, [gifBlobToCopy, clearCopyStatus]);

  // Handle GIF copy modal cancel
  const handleGifCopyModalCancel = useCallback(() => {
    setShowGifCopyModal(false);
    setGifBlobToCopy(null);
  }, []);

  return useMemo(() => ({
    // State
    copyStatus,
    setCopyStatus,
    showGifCopyModal,
    setShowGifCopyModal,
    gifBlobToCopy,
    setGifBlobToCopy,
    
    // Functions
    downloadImage,
    copyToClipboard,
    copyUrlToClipboard,
    handleGifCopyModalConfirm,
    handleGifCopyModalCancel,
    clearCopyStatus,
  }), [
    copyStatus, showGifCopyModal, gifBlobToCopy,
    downloadImage, copyToClipboard, copyUrlToClipboard,
    handleGifCopyModalConfirm, handleGifCopyModalCancel, clearCopyStatus
  ]);
}