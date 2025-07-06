"use client";

import PhaserGame from "../components/PhaserGame";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

interface MainScene extends Phaser.Scene {
  loadChimp: (id: number) => void;
  createBackground: () => void;
  bg: Phaser.GameObjects.TileSprite | null;
  chimp: Phaser.GameObjects.Sprite | null;
  updateBoundaries: () => void;
  spawnCollectible: (firstSpawn?: boolean) => void;
  collectible: Phaser.GameObjects.Sprite | null;
  _hasSpawnedFirstCollectible: boolean;
  // New properties for survival mechanics
  health: number;
  obstacles: Phaser.GameObjects.Group | null;
  bananas: Phaser.GameObjects.Group | null;
}

export default function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MainScene | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChimpChange = (id: number) => {
    if (!mounted) return;
    if (sceneRef.current) {
      sceneRef.current.loadChimp(id);
    }
  };

  const handleRandomChimp = () => {
    if (!mounted) return;
    if (sceneRef.current) {
      const randomId = Math.floor(Math.random() * 5555) + 1;
      sceneRef.current.loadChimp(randomId);
    }
  };

  const handleRandomBg = () => {
    if (!mounted) return;
    if (sceneRef.current) {
      if (sceneRef.current.bg) {
        sceneRef.current.bg.destroy();
      }
      sceneRef.current.createBackground();
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    gameRef.current = (window as any).__PHASER_GAME__;
    if (gameRef.current?.scene?.scenes[0]) {
      sceneRef.current = gameRef.current.scene.scenes[0] as MainScene;
    }
  }, [mounted]);

  if (!mounted) return null;

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
