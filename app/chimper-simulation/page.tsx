"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";

interface ChimperSimulationScene extends Phaser.Scene {
  chimpers: ChimperSprite[];
  spawnChimper: (x?: number, y?: number) => void;
  clearAllChimpers: () => void;
}

interface ChimperSprite extends Phaser.GameObjects.Sprite {
  id: number;
  chimperId: number;
  targetX: number;
  targetY: number;
  speed: number;
  restTime: number;
  isResting: boolean;
  restDuration: number;
  wanderRadius: number;
  homeX: number;
  homeY: number;
  lastDirectionChange: number;
  energy: number;
  maxEnergy: number;
  personalityType: "explorer" | "homebody" | "social" | "wanderer";
}

export default function ChimperSimulationPage() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ChimperSimulationScene | null>(null);
  const [mounted, setMounted] = useState(false);
  const [chimperCount, setChimperCount] = useState(10);
  const [actualChimperCount, setActualChimperCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const container = document.getElementById("simulation-container");
    if (!container || gameRef.current) return;

    // Dynamically import Phaser
    import("phaser").then((Phaser) => {
      class ChimperSimulationScene extends Phaser.Scene {
        chimpers: ChimperSprite[] = [];
        nextChimperId = 1;
        loadedChimpers = new Set<number>();
        bg: Phaser.GameObjects.TileSprite | null = null;

        constructor() {
          super({ key: "ChimperSimulationScene" });
        }

        preload() {
          // Load background tiles
          this.load.spritesheet("bgTiles", "https://i.imgur.com/UIjW1B8.png", {
            frameWidth: 64,
            frameHeight: 64,
          });

          // Preload a few random chimpers
          for (let i = 0; i < 20; i++) {
            const randomId = Math.floor(Math.random() * 5555) + 1;
            const key = `chimp_${randomId}`;
            const url = `https://d31ss916pli4td.cloudfront.net/game/avatars/chimpers/full/${randomId}.png?v6`;

            this.load.spritesheet(key, url, {
              frameWidth: 96,
              frameHeight: 96,
            });
            this.loadedChimpers.add(randomId);
          }
        }

        create() {
          this.createBackground();

          // Set up camera
          this.cameras.main.setBounds(
            0,
            0,
            this.scale.width,
            this.scale.height,
          );

          // Handle clicks to spawn chimpers
          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (
              !pointer.downElement ||
              pointer.downElement.id === "simulation-container" ||
              pointer.downElement.tagName === "CANVAS"
            ) {
              this.spawnChimper(pointer.worldX, pointer.worldY);
            }
          });

          // Update chimper count periodically
          this.time.addEvent({
            delay: 500,
            callback: () => {
              setActualChimperCount(this.chimpers.length);
            },
            loop: true,
          });
        }

        createBackground() {
          const totalFrames = 16 * 12;
          const chosenFrame = Phaser.Math.Between(0, totalFrames - 1);
          const frameWidth = 64;
          const frameHeight = 64;

          // Create background that covers the screen
          const tilesX = Math.ceil(this.scale.width / frameWidth) + 1;
          const tilesY = Math.ceil(this.scale.height / frameHeight) + 1;

          this.bg = this.add
            .tileSprite(
              0,
              0,
              tilesX * frameWidth,
              tilesY * frameHeight,
              "bgTiles",
              chosenFrame,
            )
            .setOrigin(0)
            .setDepth(0);
        }

        spawnChimper(x?: number, y?: number) {
          // Get random chimper ID that we've loaded
          const loadedChimperIds = Array.from(this.loadedChimpers);
          const randomChimperId =
            Phaser.Utils.Array.GetRandom(loadedChimperIds);
          const key = `chimp_${randomChimperId}`;

          if (!this.textures.exists(key)) {
            // If texture doesn't exist, load it
            const url = `https://d31ss916pli4td.cloudfront.net/game/avatars/chimpers/full/${randomChimperId}.png?v6`;
            this.load.spritesheet(key, url, {
              frameWidth: 96,
              frameHeight: 96,
            });
            this.load.once("complete", () => {
              this.createChimperSprite(key, randomChimperId, x, y);
            });
            this.load.start();
          } else {
            this.createChimperSprite(key, randomChimperId, x, y);
          }
        }

        createChimperSprite(
          key: string,
          chimperId: number,
          x?: number,
          y?: number,
        ) {
          const spawnX = x ?? Phaser.Math.Between(100, this.scale.width - 100);
          const spawnY = y ?? Phaser.Math.Between(100, this.scale.height - 100);

          const chimper = this.add.sprite(
            spawnX,
            spawnY,
            key,
            0,
          ) as ChimperSprite;
          chimper.setScale(1.5);
          chimper.setDepth(1);

          // Initialize chimper properties
          chimper.id = this.nextChimperId++;
          chimper.chimperId = chimperId;
          chimper.homeX = spawnX;
          chimper.homeY = spawnY;
          chimper.targetX = spawnX;
          chimper.targetY = spawnY;
          chimper.speed = Phaser.Math.Between(30, 80);
          chimper.restTime = 0;
          chimper.isResting = false;
          chimper.restDuration = 0;
          chimper.wanderRadius = Phaser.Math.Between(200, 400);
          chimper.lastDirectionChange = 0;
          chimper.energy = 100;
          chimper.maxEnergy = 100;

          // Assign personality type
          const personalities = ["explorer", "homebody", "social", "wanderer"];
          chimper.personalityType = Phaser.Utils.Array.GetRandom(
            personalities,
          ) as any;

          // Create animations for this chimper
          const runKey = `run_${key}`;
          const restKey = `rest_${key}`;

          if (!this.anims.exists(runKey)) {
            this.anims.create({
              key: runKey,
              frames: this.anims.generateFrameNumbers(key, {
                start: 0,
                end: 5,
              }),
              frameRate: 8,
              repeat: -1,
            });
          }

          if (!this.anims.exists(restKey)) {
            this.anims.create({
              key: restKey,
              frames: this.anims.generateFrameNumbers(key, {
                start: 6,
                end: 13,
              }),
              frameRate: 4,
              repeat: -1,
            });
          }

          chimper.play(restKey);
          this.chimpers.push(chimper);

          // Store animation keys for later use
          (chimper as any).runKey = runKey;
          (chimper as any).restKey = restKey;

          // Set initial target
          this.setNewTarget(chimper);
        }

        setNewTarget(chimper: ChimperSprite) {
          let targetX: number, targetY: number;

          switch (chimper.personalityType) {
            case "explorer":
              // Explorers go to screen edges and corners
              if (Math.random() < 0.5) {
                targetX = Math.random() < 0.5 ? 50 : this.scale.width - 50;
                targetY = Phaser.Math.Between(50, this.scale.height - 50);
              } else {
                targetX = Phaser.Math.Between(50, this.scale.width - 50);
                targetY = Math.random() < 0.5 ? 50 : this.scale.height - 50;
              }
              break;

            case "homebody":
              // Homebodies stay near their spawn point
              const homeAngle = Math.random() * Math.PI * 2;
              const homeDistance = Math.random() * chimper.wanderRadius * 0.5;
              targetX = chimper.homeX + Math.cos(homeAngle) * homeDistance;
              targetY = chimper.homeY + Math.sin(homeAngle) * homeDistance;
              break;

            case "social":
              // Social chimpers move toward other chimpers
              if (this.chimpers.length > 1) {
                const otherChimpers = this.chimpers.filter(
                  (c) => c !== chimper,
                );
                const target = Phaser.Utils.Array.GetRandom(otherChimpers);
                const socialAngle = Math.random() * Math.PI * 2;
                const socialDistance = Phaser.Math.Between(50, 150);
                targetX = target.x + Math.cos(socialAngle) * socialDistance;
                targetY = target.y + Math.sin(socialAngle) * socialDistance;
              } else {
                // Fallback to wanderer behavior
                targetX = Phaser.Math.Between(100, this.scale.width - 100);
                targetY = Phaser.Math.Between(100, this.scale.height - 100);
              }
              break;

            case "wanderer":
            default:
              // Wanderers go anywhere
              targetX = Phaser.Math.Between(50, this.scale.width - 50);
              targetY = Phaser.Math.Between(50, this.scale.height - 50);
              break;
          }

          // Clamp to screen bounds
          chimper.targetX = Phaser.Math.Clamp(
            targetX,
            50,
            this.scale.width - 50,
          );
          chimper.targetY = Phaser.Math.Clamp(
            targetY,
            50,
            this.scale.height - 50,
          );
        }

        update(time: number, delta: number) {
          this.chimpers.forEach((chimper, index) => {
            if (!chimper.active) {
              this.chimpers.splice(index, 1);
              return;
            }

            // Update energy
            if (chimper.isResting) {
              chimper.energy = Math.min(
                chimper.maxEnergy,
                chimper.energy + delta * 0.05,
              );
            } else {
              chimper.energy = Math.max(0, chimper.energy - delta * 0.01);
            }

            // Handle resting
            if (chimper.isResting) {
              chimper.restTime -= delta;
              if (chimper.restTime <= 0) {
                chimper.isResting = false;
                chimper.play((chimper as any).runKey);
                this.setNewTarget(chimper);
              }
              return;
            }

            // Check if should start resting (random chance or low energy)
            if (chimper.energy < 20 || Math.random() < 0.0005 * delta) {
              chimper.isResting = true;
              chimper.restTime = Phaser.Math.Between(2000, 8000); // 2-8 seconds
              chimper.play((chimper as any).restKey);
              return;
            }

            // Move toward target
            const distance = Phaser.Math.Distance.Between(
              chimper.x,
              chimper.y,
              chimper.targetX,
              chimper.targetY,
            );

            if (distance < 10) {
              // Reached target, set new one
              this.setNewTarget(chimper);
            } else {
              // Move toward target
              const angle = Phaser.Math.Angle.Between(
                chimper.x,
                chimper.y,
                chimper.targetX,
                chimper.targetY,
              );

              const moveDistance = (chimper.speed * delta) / 1000;
              chimper.x += Math.cos(angle) * moveDistance;
              chimper.y += Math.sin(angle) * moveDistance;

              // Update facing direction
              if (Math.cos(angle) > 0) {
                chimper.setFlipX(false);
              } else {
                chimper.setFlipX(true);
              }

              // Ensure running animation is playing
              if (
                !chimper.anims.isPlaying ||
                chimper.anims.currentAnim?.key.includes("rest")
              ) {
                chimper.play((chimper as any).runKey);
              }
            }

            // Keep within screen bounds
            chimper.x = Phaser.Math.Clamp(chimper.x, 50, this.scale.width - 50);
            chimper.y = Phaser.Math.Clamp(
              chimper.y,
              50,
              this.scale.height - 50,
            );
          });
        }

        clearAllChimpers() {
          this.chimpers.forEach((chimper) => chimper.destroy());
          this.chimpers = [];
          setActualChimperCount(0);
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: "#87CEEB",
        parent: container,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: "100%",
          height: "100%",
        },
        scene: ChimperSimulationScene,
      });

      gameRef.current = game;

      game.events.on("ready", () => {
        const scene = game.scene.getScene(
          "ChimperSimulationScene",
        ) as ChimperSimulationScene;
        if (scene) {
          sceneRef.current = scene;

          // Spawn initial chimpers
          for (let i = 0; i < chimperCount; i++) {
            scene.spawnChimper();
          }
        }
      });

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        game.scale.resize(container.clientWidth, container.clientHeight);
      });
      resizeObserver.observe(container);

      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          sceneRef.current = null;
        }
        resizeObserver.disconnect();
      };
    });
  }, [mounted, chimperCount]);

  const spawnChimper = () => {
    if (sceneRef.current) {
      sceneRef.current.spawnChimper();
    }
  };

  const clearAll = () => {
    if (sceneRef.current) {
      sceneRef.current.clearAllChimpers();
    }
  };

  const updateChimperCount = (newCount: number) => {
    setChimperCount(newCount);
    if (sceneRef.current) {
      const currentCount = sceneRef.current.chimpers.length;
      const difference = newCount - currentCount;

      if (difference > 0) {
        // Spawn more chimpers
        for (let i = 0; i < difference; i++) {
          sceneRef.current.spawnChimper();
        }
      } else if (difference < 0) {
        // Remove chimpers
        const toRemove = Math.abs(difference);
        for (
          let i = 0;
          i < toRemove && sceneRef.current.chimpers.length > 0;
          i++
        ) {
          const chimper = sceneRef.current.chimpers.pop();
          if (chimper) {
            chimper.destroy();
          }
        }
      }
    }
  };

  if (!mounted) return null;

  return (
    <main className="w-screen h-screen bg-[#87CEEB] flex flex-col">
      {/* Header */}
      <div className="bg-[#f8fbff] border-b-2 border-[#8DC7FF] p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="outline"
              className="bg-[#8DC7FF] hover:bg-[#5bb0f7] border-[#5bb0f7]"
            >
              ← Back to Home
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#222]">
            !CHIMP Life Simulation
          </h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#222]">
              Chimpers: {actualChimperCount}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-sm font-medium text-[#222]">
              Spawn Count:
            </span>
            <Slider
              value={[chimperCount]}
              onValueChange={(value) => updateChimperCount(value[0])}
              max={50}
              min={0}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium text-[#222] min-w-[2ch]">
              {chimperCount}
            </span>
          </div>

          <Button
            onClick={spawnChimper}
            className="bg-[#8DC7FF] hover:bg-[#5bb0f7] text-white"
          >
            Spawn Chimper
          </Button>

          <Button
            onClick={clearAll}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-100 border-b border-yellow-300 p-2 text-center">
        <p className="text-sm text-yellow-800">
          🎮 <strong>Click anywhere</strong> on the screen to spawn a chimper!
          Watch them explore, rest, and live their own little lives. Each
          chimper has its own personality: <strong>Explorer</strong>,{" "}
          <strong>Homebody</strong>, <strong>Social</strong>, or{" "}
          <strong>Wanderer</strong>!
        </p>
      </div>

      {/* Simulation Container */}
      <div
        id="simulation-container"
        className="flex-1 w-full relative cursor-crosshair"
        style={{ minHeight: "calc(100vh - 140px)" }}
      />
    </main>
  );
}
