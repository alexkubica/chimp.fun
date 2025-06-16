"use client";

import { useEffect, useRef, useState } from "react";
import opentype from "opentype.js";

export default function SpeechBubblePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("!CHIMP");
  const [font, setFont] = useState<opentype.Font | null>(null);

  useEffect(() => {
    opentype.load("/slkscr.ttf", (err, font) => {
      if (err) console.error(err);
      else setFont(font);
    });
  }, []);

  const drawSpeechBubble = () => {
    if (!canvasRef.current || !font) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fontSize = 48;
    const padding = 20;
    const spikeHeight = 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Measure text width
    const glyphs = font.stringToGlyphs(text);
    const width = glyphs.reduce(
      (w, g, i) => w + font.getAdvanceWidth(text[i], fontSize),
      0,
    );

    const textX = padding;
    const textY = padding + fontSize;

    const bubbleWidth = width + padding * 2;
    const bubbleHeight = fontSize + padding * 2 + spikeHeight;

    // Draw bubble
    ctx.fillStyle = "#FFF";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(10, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth / 2 - 10, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth / 2, bubbleHeight);
    ctx.lineTo(bubbleWidth / 2 + 10, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth - 10, bubbleHeight - spikeHeight);
    ctx.lineTo(bubbleWidth - 10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = "#000";
    glyphs.forEach((glyph, i) => {
      glyph.draw(
        ctx,
        textX + i * font.getAdvanceWidth(text[i], fontSize),
        textY,
        fontSize,
      );
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
  }, [text, font]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Speech Bubble Generator</h1>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border p-2 mb-4 w-full max-w-md"
        placeholder="Enter text..."
      />
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="border mb-4"
      />
      <button
        onClick={handleDownload}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Download PNG
      </button>
    </div>
  );
}
