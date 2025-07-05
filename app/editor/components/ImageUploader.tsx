"use client";

import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/ui/ImagePicker";
import { ImageUploaderProps } from "../types";

export function ImageUploader({
  onFileChange,
  collectionIndex,
  tokenId,
}: ImageUploaderProps) {
  
  async function handlePasteImage() {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith("image/")) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], "pasted-image", { type });
            onFileChange(file);
            return;
          }
        }
      }
      alert("No image found in clipboard");
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      alert("Failed to read clipboard");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ImagePicker
        id="file"
        onFileChange={onFileChange}
        accept="image/*"
        key={`image-picker-${collectionIndex}-${tokenId}`}
      />
      <Button variant="outline" onClick={handlePasteImage}>
        📋 Paste From Clipboard
      </Button>
      <small className="text-muted-foreground">
        Tip: Use 1:1 aspect ratio for best results.
      </small>
    </div>
  );
}