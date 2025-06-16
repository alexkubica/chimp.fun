"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpeechBubblePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("!CHIMP");

  const drawSpeechBubble = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontSize = 16;
    const padding = 20;
    const spikeHeight = 20;

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
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "speech-bubble.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  useEffect(() => {
    drawSpeechBubble();
  }, [text]);

  return (
    <main className="flex items-center bg-[#f8fbff] px-2 py-4 flex-col">
      <h1 className="text-4xl font-extrabold mb-2 text-center">CHIMP.FUN</h1>
      <h2 className="text-2xl font-bold text-center mb-6">
        Speech Bubble Generator
      </h2>
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mb-2 w-full text-base p-2 rounded border resize-y min-h-[60px]"
          placeholder="Enter text..."
          rows={3}
        />
        <div className="w-full flex justify-center">
          <canvas
            ref={canvasRef}
            className="border mb-2 max-w-full h-auto"
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
        </div>
        <Button
          onClick={handleDownload}
          className="w-full bg-black text-white px-4 py-2 rounded mt-2"
        >
          Download PNG
        </Button>
      </div>
    </main>
  );
}
