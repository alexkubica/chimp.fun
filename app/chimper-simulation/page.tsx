"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

// Helper to get image URL for Chimpers or Chimpers Genesis
function getChimperImageUrl(id: number, collection: string) {
  if (collection === "Chimpers Genesis") {
    return `https://d31ss916pli4td.cloudfront.net/game/avatars/chimpersgenesis/full/${id}.png?v6`;
  }
  return `https://d31ss916pli4td.cloudfront.net/game/avatars/chimpers/full/${id}.png?v6`;
}

interface ChimperSimulationScene extends Phaser.Scene {
  chimpers: ChimperSprite[];
  spawnChimper: (x?: number, y?: number, chimperIdOverride?: number) => void;
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
  const [chimperCount, setChimperCount] = useState(1);
  const [actualChimperCount, setActualChimperCount] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const [specificChimperId, setSpecificChimperId] = useState("");
  const [inputError, setInputError] = useState("");
  const [collection, setCollection] = useState<"Chimpers" | "Chimpers Genesis">(
    "Chimpers",
  );

  // Track collection in a ref for Phaser scene
  const collectionRef = useRef(collection);
  useEffect(() => {
    collectionRef.current = collection;
  }, [collection]);

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
        chimperQueue: number[] = [];
        // Use correct max ID for collection
        get maxChimperId() {
          return collectionRef.current === "Chimpers Genesis" ? 98 : 5555;
        }
        queueSize = 20;
        bg: Phaser.GameObjects.TileSprite | null = null;

        constructor() {
          super({ key: "ChimperSimulationScene" });
        }

        getRandomUnusedChimperId() {
          let id;
          let attempts = 0;
          do {
            id = Math.floor(Math.random() * this.maxChimperId) + 1;
            attempts++;
          } while (
            (this.loadedChimpers.has(id) || this.chimperQueue.includes(id)) &&
            attempts < 20
          );
          return id;
        }

        refillChimperQueue() {
          while (this.chimperQueue.length < this.queueSize) {
            const id = this.getRandomUnusedChimperId();
            if (
              !this.loadedChimpers.has(id) &&
              !this.chimperQueue.includes(id)
            ) {
              this.chimperQueue.push(id);
              const key = `chimp_${id}`;
              const url = getChimperImageUrl(id, collectionRef.current);
              this.load.spritesheet(key, url, {
                frameWidth: 96,
                frameHeight: 96,
              });
              this.loadedChimpers.add(id);
            }
          }
        }

        preload() {
          // Load background tiles
          this.load.spritesheet("bgTiles", "https://i.imgur.com/UIjW1B8.png", {
            frameWidth: 64,
            frameHeight: 64,
          });

          // Preload the first 10 random chimpers
          this.refillChimperQueue();
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
              // Hide the message on first click
              if (showMessage) {
                setShowMessage(false);
              }
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

        spawnChimper(x?: number, y?: number, chimperIdOverride?: number) {
          let chimperId: number;
          if (typeof chimperIdOverride === "number") {
            chimperId = chimperIdOverride;
            // If not loaded, load it
            const key = `chimp_${chimperId}`;
            if (!this.textures.exists(key)) {
              const url = getChimperImageUrl(chimperId, collectionRef.current);
              this.load.spritesheet(key, url, {
                frameWidth: 96,
                frameHeight: 96,
              });
              this.load.once("complete", () => {
                this.createChimperSprite(key, chimperId, x, y);
                this.refillChimperQueue();
              });
              this.load.start();
            } else {
              this.createChimperSprite(key, chimperId, x, y);
              this.refillChimperQueue();
            }
            return;
          }
          // Use a random chimper from the queue
          if (this.chimperQueue.length === 0) {
            this.refillChimperQueue();
          }
          const randomIndex = Math.floor(
            Math.random() * this.chimperQueue.length,
          );
          chimperId = this.chimperQueue.splice(randomIndex, 1)[0];
          const key = `chimp_${chimperId}`;

          if (!this.textures.exists(key)) {
            // If texture doesn't exist, load it
            const url = getChimperImageUrl(chimperId, collectionRef.current);
            this.load.spritesheet(key, url, {
              frameWidth: 96,
              frameHeight: 96,
            });
            this.load.once("complete", () => {
              this.createChimperSprite(key, chimperId, x, y);
              this.refillChimperQueue();
            });
            this.load.start();
          } else {
            this.createChimperSprite(key, chimperId, x, y);
            this.refillChimperQueue();
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
  }, [mounted, chimperCount, showMessage]);

  // Reset Phaser state when collection changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.clearAllChimpers();
      (sceneRef.current as any).loadedChimpers = new Set();
      (sceneRef.current as any).chimperQueue = [];
      (sceneRef.current as any).nextChimperId = 1;
      (sceneRef.current as any).refillChimperQueue();
    }
    setSpecificChimperId("");
    setInputError("");
  }, [collection]);

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

  // Add a function to spawn a specific chimper by ID
  const spawnSpecificChimper = () => {
    const maxId = collection === "Chimpers Genesis" ? 98 : 5555;
    const id = parseInt(specificChimperId, 10);
    if (isNaN(id) || id < 1 || id > maxId) {
      setInputError(`Enter a valid ID (1-${maxId})`);
      return;
    }
    setInputError("");
    if (sceneRef.current) {
      sceneRef.current.spawnChimper(undefined, undefined, id);
    }
    // Do not clear the input
  };

  if (!mounted) return null;

  return (
    <main className="w-screen h-screen bg-[#87CEEB] flex flex-col overflow-hidden">
      {/* Title Overlay */}
      <h1
        className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30 text-2xl sm:text-3xl font-extrabold uppercase text-[#222] text-center drop-shadow-lg px-4 py-1 bg-transparent pointer-events-none select-none"
        style={{ WebkitTextStroke: "1px white" }}
      >
        !CHIMP Simulation
      </h1>
      {/* Collection Selector - stays at top */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 bg-white/80 rounded-lg px-4 py-2 shadow-lg flex flex-row items-center space-x-2">
        <span className="font-bold">Collection:</span>
        <select
          value={collection}
          onChange={(e) => setCollection(e.target.value as any)}
          className="px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
        >
          <option value="Chimpers">Chimpers</option>
          <option value="Chimpers Genesis">Chimpers Genesis</option>
        </select>
      </div>
      {/* Spawn Specific Chimps UI - moved to bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 bg-white/80 rounded-lg px-4 py-2 shadow-lg flex flex-col sm:flex-row items-center sm:space-x-2 space-y-2 sm:space-y-0">
        <div className="flex flex-row items-center space-x-2 w-full justify-center">
          <input
            type="number"
            min={1}
            max={collection === "Chimpers Genesis" ? 98 : 5555}
            value={specificChimperId}
            onChange={(e) => setSpecificChimperId(e.target.value)}
            placeholder="Chimper ID"
            className="w-36 px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
          />
          <Button
            onClick={spawnSpecificChimper}
            size="sm"
            className="font-bold"
          >
            Spawn
          </Button>
          <Button
            onClick={spawnChimper}
            size="sm"
            className="font-bold"
            title="Spawn Random"
          >
            🎲
          </Button>
        </div>
        <Button
          onClick={clearAll}
          size="sm"
          className="font-bold mt-2 sm:mt-0"
          variant="destructive"
        >
          Clear All
        </Button>
      </div>
      {inputError && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30 text-red-600 bg-white/90 rounded px-3 py-1 shadow">
          {inputError}
        </div>
      )}
      {/* Simulation Container - Fullscreen */}
      <div
        id="simulation-container"
        className="flex-1 w-full h-full relative cursor-crosshair"
        style={{ minHeight: "0", minWidth: "0" }}
      >
        {/* Temporal Message */}
        {showMessage && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-100 border border-yellow-300 rounded px-6 py-3 shadow-lg z-20 text-center animate-fadeIn text-yellow-800 text-base sm:text-lg font-semibold pointer-events-none select-none">
            🎮 Click on the screen
          </div>
        )}
      </div>
    </main>
  );
}
