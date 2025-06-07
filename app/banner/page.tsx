"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function BannerPage() {
  const [clickCount, setClickCount] = useState(0);
  const [hoverCount, setHoverCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInitialPosition, setIsInitialPosition] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    };

    checkIfDesktop();
    window.addEventListener("resize", checkIfDesktop);

    return () => window.removeEventListener("resize", checkIfDesktop);
  }, []);

  const calculateNewPosition = (currentX: number, currentY: number) => {
    // Calculate safe boundaries for the link
    const linkWidth = 100;
    const linkHeight = 30;
    const padding = 50;
    const warningHeight = 30;
    const warningWidth = 120;

    const containerWidth = Math.max(linkWidth, warningWidth);
    const containerHeight = linkHeight + warningHeight;

    const maxY = window.innerHeight - containerHeight - padding * 2;

    // Fixed x position
    const newX = currentX;

    // Calculate new y position based on sequence
    let newY;
    if (clickCount === 1) {
      // First click - move down
      newY = currentY + 100;
    } else if (clickCount === 2) {
      // Second click - move down again
      newY = currentY + 100;
    } else if (clickCount === 3) {
      // Third click - move up
      newY = currentY - 50;
    } else {
      // After third click - stay in place
      newY = currentY;
    }

    // Ensure the container stays within screen bounds
    // const adjustedY = Math.max(
    //   containerHeight / 2 + padding,
    //   Math.min(maxY + containerHeight / 2, newY + containerHeight / 2)
    // );

    // return { x: newX, y: adjustedY };
    return { x: newX, y: newY };
  };

  const handleInteraction = (e: React.MouseEvent, isClick: boolean) => {
    e.preventDefault();

    if (clickCount >= 3) {
      if (isClick) {
        window.open("https://x.com/rafalors", "_blank");
      }
      return;
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount === 1) {
      setIsInitialPosition(false);
    }

    setPosition(calculateNewPosition(position.x, position.y));
  };

  return (
    <main className="h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <h1 className="text-4xl font-bold mb-2">COMING SOON!</h1>
      <p className="text-xl mb-8">
        for now here&apos;s{" "}
        <span
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
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-red-600 font-bold text-sm rounded whitespace-nowrap overflow-hidden">
              don&apos;t click it!
            </div>
          )}
          <a
            href="https://x.com/rafalors"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline transition-all duration-300"
            onClick={(e) => handleInteraction(e, true)}
            onMouseEnter={(e) => handleInteraction(e, false)}
          >
            banana rafa
          </a>
        </span>
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
