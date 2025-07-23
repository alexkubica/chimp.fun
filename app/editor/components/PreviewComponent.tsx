"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PreviewComponentProps {
  imageUrl: string | null;
  loading?: boolean;
  watermarkEnabled?: boolean;
  watermarkUrl?: string;
  watermarkScale?: number;
  watermarkPaddingX?: number;
  watermarkPaddingY?: number;
  className?: string;
  alt?: string;
}

export function PreviewComponent({
  imageUrl,
  loading = false,
  watermarkEnabled = false,
  watermarkUrl,
  watermarkScale = 0.3,
  watermarkPaddingX = 20,
  watermarkPaddingY = 20,
  className = "w-full h-full",
  alt = "Preview",
}: PreviewComponentProps) {
  if (loading) {
    return <Skeleton className={className} />;
  }

  if (!imageUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground">No image</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={imageUrl}
        alt={alt}
        className="object-contain w-full h-full rounded-lg"
        style={{ background: "transparent" }}
      />
      {watermarkEnabled && watermarkUrl && (
        <img
          src={watermarkUrl}
          alt="Watermark"
          className="absolute"
          style={{
            right: `${watermarkPaddingX}px`,
            bottom: `${watermarkPaddingY}px`,
            width: `${watermarkScale * 100}%`,
            height: "auto",
            opacity: 0.8,
          }}
        />
      )}
    </div>
  );
}
