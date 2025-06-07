"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function BannerPage() {
  const [clickCount, setClickCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInitialPosition, setIsInitialPosition] = useState(true);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount === 1) {
      setIsInitialPosition(false);
    }

    if (newCount === 4) {
      window.open("https://x.com/rafalors", "_blank");
      return;
    }

    // Calculate safe boundaries for the link
    const linkWidth = 100; // Approximate width of the link
    const linkHeight = 30; // Approximate height of the link
    const padding = 50; // Increased padding from edges
    const warningHeight = 30; // Height of the warning message

    const maxX = window.innerWidth - linkWidth - padding * 2;
    const maxY = window.innerHeight - linkHeight - warningHeight - padding * 2;

    setPosition({
      x: Math.max(padding, Math.min(maxX, Math.random() * maxX)),
      y: Math.max(padding, Math.min(maxY, Math.random() * maxY)),
    });
  };

  return (
    <main className="h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <h1 className="text-4xl font-bold mb-2">COMING SOON!</h1>
      <p className="text-xl mb-8">
        for now here&apos;s{" "}
        <div
          className={`relative inline-block ${
            isInitialPosition ? "relative" : "fixed"
          }`}
          style={
            !isInitialPosition
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 50,
                }
              : undefined
          }
        >
          {clickCount >= 3 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-red-600 font-bold text-sm rounded whitespace-nowrap">
              don&apos;t click it!
            </div>
          )}
          <Link
            href="https://x.com/rafalors"
            target="_blank"
            className="text-blue-500 hover:underline transition-all duration-300"
            onClick={handleClick}
          >
            banana rafa
          </Link>
        </div>
      </p>
      <div className="relative w-full max-w-2xl h-[calc(100vh-12rem)]">
        <Image
          src="/banana-rafa.jpeg"
          alt="Banana Rafa"
          fill
          className="object-contain"
          priority
        />
      </div>
    </main>
  );
}
