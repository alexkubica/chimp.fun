"use client";

import PhaserGame from "../components/PhaserGame";
import { useEffect, useRef } from "react";

export default function GamePage() {
  const gameRef = useRef<any>(null);

  const handleChimpChange = (id: number) => {
    if (gameRef.current?.scene?.scenes[0]) {
      gameRef.current.scene.scenes[0].loadChimp(id);
    }
  };

  const handleRandomChimp = () => {
    if (gameRef.current?.scene?.scenes[0]) {
      const randomId = Math.floor(Math.random() * 5555) + 1;
      gameRef.current.scene.scenes[0].loadChimp(randomId);
    }
  };

  const handleRandomBg = () => {
    const scene = (window as any).__PHASER_SCENE__;
    if (scene) {
      if (scene.bg) {
        scene.bg.destroy();
      }
      scene.createBackground();
    }
  };

  useEffect(() => {
    gameRef.current = (window as any).__PHASER_GAME__;
    if (gameRef.current?.scene?.scenes[0]) {
      (window as any).__PHASER_SCENE__ = gameRef.current.scene.scenes[0];
    }
  }, []);

  return (
    <main className="w-screen h-screen overflow-hidden bg-black">
      <div id="phaser-container" className="w-full h-full relative z-0"></div>
      <PhaserGame
        onChimpChange={handleChimpChange}
        onRandomChimp={handleRandomChimp}
        onRandomBg={handleRandomBg}
      />
    </main>
  );
}
