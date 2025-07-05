import * as React from "react";
import { useRef, useEffect, useCallback } from "react";

interface SpeechBubbleProps {
  text: string;
  fontSize?: number;
  padding?: number;
  spikeHeight?: number;
  onImageGenerated?: (imageUrl: string) => void;
  className?: string;
}

export function SpeechBubble({
  text,
  fontSize = 16,
  padding = 20,
  spikeHeight = 20,
  onImageGenerated,
  className = "",
}: SpeechBubbleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateSpeechBubble = useCallback(() => {
    if (!canvasRef.current || !text.trim()) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      ctx.fillText(line, padding, padding + i * fontSize);
    });

    // Generate image URL and call callback
    const imageUrl = canvas.toDataURL("image/png");
    if (onImageGenerated) {
      onImageGenerated(imageUrl);
    }
  }, [text, fontSize, padding, spikeHeight, onImageGenerated]);

  useEffect(() => {
    generateSpeechBubble();
  }, [generateSpeechBubble]);

  return (
    <canvas
      ref={canvasRef}
      className={`border max-w-full h-auto ${className}`}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}

export function generateSpeechBubbleDataUrl(
  text: string,
  fontSize: number = 16,
  padding: number = 20,
  spikeHeight: number = 20,
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || !text.trim()) return "";

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
    ctx.fillText(line, padding, padding + i * fontSize);
  });

  return canvas.toDataURL("image/png");
}
