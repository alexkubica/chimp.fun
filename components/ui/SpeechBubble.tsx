"use client";

import * as React from "react";
const { useRef, useEffect, forwardRef, useImperativeHandle } = React;

interface SpeechBubbleProps {
  text: string;
  fontSize?: number;
  padding?: number;
  spikeHeight?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  borderWidth?: number;
  onCanvasUpdate?: (canvas: HTMLCanvasElement) => void;
}

export interface SpeechBubbleRef {
  getCanvas: () => HTMLCanvasElement | null;
  getDataURL: () => string | null;
  redraw: () => void;
}

export const SpeechBubble = forwardRef<SpeechBubbleRef, SpeechBubbleProps>(
  (
    {
      text,
      fontSize = 16,
      padding = 20,
      spikeHeight = 20,
      width,
      height,
      backgroundColor = "#FFFFFF",
      borderColor = "#000000",
      textColor = "#000000",
      borderWidth = 2,
      onCanvasUpdate,
    }: SpeechBubbleProps,
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const drawSpeechBubble = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "Press Start 2P", monospace`;
      // Support multi-line text
      const lines = text.split("\n");
      const textWidths = lines.map((line: string) => ctx.measureText(line).width);
      const textWidth = Math.max(...textWidths);
      const textHeight = fontSize * lines.length;

      const bubbleWidth = textWidth + padding * 2;
      const bubbleHeight = textHeight + padding * 2 + spikeHeight;

      // Use provided dimensions or calculate based on text
      canvas.width = width || bubbleWidth;
      canvas.height = height || bubbleHeight;

      // Reapply font after resizing canvas
      ctx.font = `${fontSize}px "Press Start 2P", monospace`;

      // Draw speech bubble
      ctx.fillStyle = backgroundColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, canvas.height - spikeHeight);
      ctx.lineTo(canvas.width / 2 - 10, canvas.height - spikeHeight);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.lineTo(canvas.width / 2 + 10, canvas.height - spikeHeight);
      ctx.lineTo(canvas.width, canvas.height - spikeHeight);
      ctx.lineTo(canvas.width, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw text (multi-line)
      ctx.fillStyle = textColor;
      ctx.textBaseline = "top";
      lines.forEach((line: string, i: number) => {
        const lineWidth = ctx.measureText(line).width;
        const x = (canvas.width - lineWidth) / 2; // Center text horizontally
        ctx.fillText(line, x, padding + i * fontSize);
      });

      // Notify parent component of canvas update
      if (onCanvasUpdate) {
        onCanvasUpdate(canvas);
      }
    };

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getDataURL: () => canvasRef.current?.toDataURL("image/png") || null,
      redraw: drawSpeechBubble,
    }));

    useEffect(() => {
      drawSpeechBubble();
    }, [text, fontSize, padding, spikeHeight, width, height, backgroundColor, borderColor, textColor, borderWidth]);

    return (
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      />
    );
  }
);

SpeechBubble.displayName = "SpeechBubble";

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
