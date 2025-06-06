"use client";

import { useEffect, useState, useRef } from "react";

interface PhaserGameProps {
  onChimpChange?: (id: number) => void;
  onRandomChimp?: () => void;
  onRandomBg?: () => void;
}

interface MainScene extends Phaser.Scene {
  loadChimp: (id: number) => void;
  createBackground: () => void;
  bg: Phaser.GameObjects.TileSprite | null;
}

export default function PhaserGame({
  onChimpChange,
  onRandomChimp,
  onRandomBg,
}: PhaserGameProps) {
  const [chimpId, setChimpId] = useState("2956");
  const [chimpPoints, setChimpPoints] = useState(0);
  const [mounted, setMounted] = useState(false);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MainScene | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    // Set up the window function to update points
    (window as any).__SET_CHIMP_POINTS__ = (
      callback: (prev: number) => number,
    ) => {
      setChimpPoints(callback);
    };

    // Avoid duplicate game init on hot reload
    const container = document.getElementById("phaser-container");
    if (!container || gameRef.current) return;

    // Dynamically import Phaser
    import("phaser").then((Phaser) => {
      // Phaser game definition
      class MainScene extends Phaser.Scene {
        chimp: Phaser.GameObjects.Sprite | null = null;
        cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
        wasd: any;
        touchPointer: Phaser.Input.Pointer | null = null;
        bg: Phaser.GameObjects.TileSprite | null = null;
        lastDirection: number = 1;
        currentAnimKeys: { run: string; rest: string } = { run: "", rest: "" };
        collectible: Phaser.GameObjects.Sprite | null = null;
        static TOP_BOUNDARY = 64;
        collectibleAssets = [
          {
            key: "collectible_punch",
            sprite: "chimpers-punch-sprite",
            anim: "punch_anim",
            frameWidth: 360,
            frameHeight: 320,
            frameCount: 9,
          },
          {
            key: "collectible_pushup",
            sprite: "chimpers-pushup-sprite",
            anim: "pushup_anim",
            frameWidth: 360,
            frameHeight: 360,
            frameCount: 9,
          },
        ];

        constructor() {
          super({ key: "MainScene" });
        }

        preload() {
          this.loadChimp(2956);
          this.load.spritesheet("bgTiles", "https://i.imgur.com/UIjW1B8.png", {
            frameWidth: 64,
            frameHeight: 64,
          });
          // Load collectible spritesheets
          this.load.spritesheet(
            "chimpers-punch-sprite",
            "/game/chimpers-punch-sprite.png",
            {
              frameWidth: 360,
              frameHeight: 320,
              endFrame: 8,
            },
          );
          this.load.spritesheet(
            "chimpers-pushup-sprite",
            "/game/chimpers-pushup-sprite.png",
            {
              frameWidth: 360,
              frameHeight: 360,
              endFrame: 8,
            },
          );
        }

        create() {
          this.createBackground();
          // Create collectible animations
          this.anims.create({
            key: "punch_anim",
            frames: this.anims.generateFrameNumbers("chimpers-punch-sprite", {
              start: 0,
              end: 8,
            }),
            frameRate: 12,
            repeat: -1,
          });
          this.anims.create({
            key: "pushup_anim",
            frames: this.anims.generateFrameNumbers("chimpers-pushup-sprite", {
              start: 0,
              end: 8,
            }),
            frameRate: 12,
            repeat: -1,
          });
          this.spawnCollectible();
          // Only set up keyboard if input is available
          if (this.input && this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = this.input.keyboard.addKeys({
              up: Phaser.Input.Keyboard.KeyCodes.W,
              down: Phaser.Input.Keyboard.KeyCodes.S,
              left: Phaser.Input.Keyboard.KeyCodes.A,
              right: Phaser.Input.Keyboard.KeyCodes.D,
            });
          }

          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.touchPointer = pointer;
          });
          this.input.on("pointerup", () => {
            this.touchPointer = null;
          });
        }

        createBackground() {
          const totalFrames = 16 * 12;
          const frameWidth = 64;
          const frameHeight = 64;
          const rawImage = this.textures.get("bgTiles").getSourceImage();

          // Only proceed if rawImage is a valid HTMLImageElement
          if (!(rawImage instanceof HTMLImageElement)) {
            return;
          }
          this.textures.remove("bgTiles");
          this.textures.addSpriteSheet("bgTiles", rawImage, {
            frameWidth,
            frameHeight,
            startFrame: 0,
            endFrame: totalFrames - 1,
          });

          const chosenFrame = Phaser.Math.Between(0, totalFrames - 1);
          const tileKey = `bgTile_${chosenFrame}`;
          const frame = this.textures.getFrame("bgTiles", chosenFrame);
          if (!frame) {
            return;
          }
          // Remove existing canvas texture with this key if it exists
          if (this.textures.exists(tileKey)) {
            this.textures.remove(tileKey);
          }
          const canvas = this.textures
            .createCanvas(tileKey, frame.width, frame.height)
            ?.getSourceImage();
          if (
            canvas &&
            "getContext" in canvas &&
            typeof canvas.getContext === "function"
          ) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              // Only draw if image is a valid CanvasImageSource
              if (
                frame.source.image instanceof HTMLImageElement ||
                frame.source.image instanceof HTMLCanvasElement ||
                frame.source.image instanceof HTMLVideoElement
              ) {
                ctx.drawImage(
                  frame.source.image,
                  frame.cutX,
                  frame.cutY,
                  frame.width,
                  frame.height,
                  0,
                  0,
                  frame.width,
                  frame.height,
                );
              }
            }
          }
          const tileTexture = this.textures.get(tileKey);
          if (
            tileTexture &&
            typeof (tileTexture as any).refresh === "function"
          ) {
            (tileTexture as any).refresh();
          }

          this.bg = this.add
            .tileSprite(0, 0, this.scale.width, this.scale.height, tileKey)
            .setOrigin(0)
            //   .setAlpha(0.15)
            .setDepth(0);

          this.scale.on(
            "resize",
            (gameSize: { width: number; height: number }) => {
              if (this.bg) {
                this.bg.setSize(gameSize.width, gameSize.height);
              }
              if (this.chimp) {
                // Calculate relative position
                const relativeX = this.chimp.x / this.scale.width;
                const relativeY = this.chimp.y / this.scale.height;
                // Update position based on new dimensions
                this.chimp.x = Phaser.Math.Clamp(
                  relativeX * gameSize.width,
                  (this.chimp.width * this.chimp.scaleX) / 2,
                  gameSize.width - (this.chimp.width * this.chimp.scaleX) / 2,
                );
                this.chimp.y = Phaser.Math.Clamp(
                  relativeY * gameSize.height,
                  MainScene.TOP_BOUNDARY +
                    (this.chimp.height * this.chimp.scaleY) / 2,
                  gameSize.height - (this.chimp.height * this.chimp.scaleY) / 2,
                );
              }
              if (this.collectible) {
                const colWidth =
                  this.collectible.width * this.collectible.scaleX;
                const colHeight =
                  this.collectible.height * this.collectible.scaleY;
                this.collectible.x = Phaser.Math.Clamp(
                  this.collectible.x,
                  colWidth / 2,
                  gameSize.width - colWidth / 2,
                );
                this.collectible.y = Phaser.Math.Clamp(
                  this.collectible.y,
                  MainScene.TOP_BOUNDARY + colHeight / 2,
                  gameSize.height - colHeight / 2,
                );
              }
            },
            this,
          );
        }

        loadChimp(id: number) {
          const key = `chimp_${id}`;
          const url = `https://d31ss916pli4td.cloudfront.net/game/avatars/chimpers/full/${id}.png?v6`;

          if (this.textures.exists(key)) {
            this.replaceChimp(key);
            return;
          }

          this.load.spritesheet(key, url, {
            frameWidth: 96,
            frameHeight: 96,
          });

          this.load.once("complete", () => {
            this.replaceChimp(key);
          });

          this.load.start();
        }

        replaceChimp(key: string) {
          const oldFlipX = this.chimp?.flipX ?? false;
          const oldX = this.chimp?.x ?? this.scale.width / 2;
          const oldY = this.chimp?.y ?? this.scale.height / 2;

          if (this.chimp) this.chimp.destroy();

          this.chimp = this.add
            .sprite(oldX, oldY, key, 0)
            .setScale(2)
            .setFlipX(oldFlipX)
            .setDepth(1);

          const runKey = `run_${key}`;
          const restKey = `rest_${key}`;

          if (!this.anims.exists(runKey)) {
            this.anims.create({
              key: runKey,
              frames: this.anims.generateFrameNumbers(key, {
                start: 0,
                end: 5,
              }),
              frameRate: 12,
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
              frameRate: 6,
              repeat: -1,
            });
          }

          this.chimp.play(restKey);
          this.currentAnimKeys = { run: runKey, rest: restKey };
        }

        spawnCollectible() {
          if (this.collectible) {
            this.collectible.destroy();
          }
          // Randomly pick an asset
          const asset = Phaser.Utils.Array.GetRandom(this.collectibleAssets);
          const collectibleSize = asset.frameWidth / 3;
          const chimpWidth = 96 * 2;
          const minDistanceFromChimp = 200;
          let validPosition = false;
          let randomX = 0;
          let randomY = 0;
          let tries = 0;
          while (!validPosition && tries < 50) {
            randomX = Phaser.Math.Between(
              collectibleSize / 2,
              this.scale.width - collectibleSize / 2,
            );
            randomY = Phaser.Math.Between(
              MainScene.TOP_BOUNDARY + collectibleSize / 2,
              this.scale.height - collectibleSize / 2,
            );
            if (this.chimp) {
              const distance = Phaser.Math.Distance.Between(
                randomX,
                randomY,
                this.chimp.x,
                this.chimp.y,
              );
              validPosition = distance > minDistanceFromChimp;
            } else {
              validPosition = true;
            }
            tries++;
          }
          this.collectible = this.add
            .sprite(randomX, randomY, asset.sprite)
            .setScale(1 / 3)
            .setDepth(1);
          this.collectible.play(asset.anim);
        }

        update() {
          if (!this.chimp) return;

          const speed = 12;
          let dx = 0,
            dy = 0;
          let moving = false;

          if (this.cursors?.left.isDown || this.wasd.left.isDown) {
            dx -= speed;
            moving = true;
          }
          if (this.cursors?.right.isDown || this.wasd.right.isDown) {
            dx += speed;
            moving = true;
          }
          if (this.cursors?.up.isDown || this.wasd.up.isDown) {
            dy -= speed;
            moving = true;
          }
          if (this.cursors?.down.isDown || this.wasd.down.isDown) {
            dy += speed;
            moving = true;
          }

          if (this.touchPointer?.isDown) {
            const angle = Phaser.Math.Angle.Between(
              this.chimp.x,
              this.chimp.y,
              this.touchPointer.x,
              this.touchPointer.y,
            );
            dx = Math.cos(angle) * speed;
            dy = Math.sin(angle) * speed;
            moving = true;
          }

          // Calculate new position
          const newX = this.chimp.x + dx;
          const newY = this.chimp.y + dy;

          // Get chimp's scaled dimensions
          const chimpWidth = this.chimp.width * this.chimp.scaleX;
          const chimpHeight = this.chimp.height * this.chimp.scaleY;

          // Apply boundaries
          this.chimp.x = Phaser.Math.Clamp(
            newX,
            chimpWidth / 2,
            this.scale.width - chimpWidth / 2,
          );
          this.chimp.y = Phaser.Math.Clamp(
            newY,
            MainScene.TOP_BOUNDARY + chimpHeight / 2,
            this.scale.height - chimpHeight / 2,
          );

          if (dx !== 0) {
            this.lastDirection = dx > 0 ? 1 : -1;
            this.chimp.setFlipX(this.lastDirection === -1);
          }

          this.chimp.play(
            moving ? this.currentAnimKeys.run : this.currentAnimKeys.rest,
            true,
          );

          // Check for collision with collectible
          if (this.collectible && this.chimp) {
            const distance = Phaser.Math.Distance.Between(
              this.chimp.x,
              this.chimp.y,
              this.collectible.x,
              this.collectible.y,
            );
            const minDistance =
              (96 * 2 + this.collectible.width * this.collectible.scaleX) / 2;
            if (distance < minDistance) {
              this.createBackground();
              this.spawnCollectible();
              if (typeof (window as any).__SET_CHIMP_POINTS__ === "function") {
                (window as any).__SET_CHIMP_POINTS__(
                  (prev: number) => prev + 1,
                );
              }
            }
          }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: "#111111",
        parent: container,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: MainScene,
      });

      gameRef.current = game;

      // Store a reference to the scene instance
      game.events.on("ready", () => {
        const scene = game.scene.getScene("MainScene") as MainScene;
        if (scene) {
          sceneRef.current = scene;
        }
      });
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, [mounted]);

  if (!mounted) return null;

  const handleChimpChange = () => {
    const id = Math.max(1, Math.min(5555, parseInt(chimpId) || 2956));
    setChimpId(String(id));
    onChimpChange?.(id);
    if (sceneRef.current) {
      sceneRef.current.loadChimp(id);
    }
  };

  const handleRandomChimp = () => {
    const randomId = Math.floor(Math.random() * 5555) + 1;
    setChimpId(String(randomId));
    onRandomChimp?.();
    if (sceneRef.current) {
      sceneRef.current.loadChimp(randomId);
    }
  };

  const handleRandomBg = () => {
    if (sceneRef.current) {
      if (sceneRef.current.bg) {
        sceneRef.current.bg.destroy();
      }
      sceneRef.current.createBackground();
    }
    onRandomBg?.();
  };

  return (
    <>
      {/* Title: always top center */}
      <div
        className="absolute top-4 left-1/2 z-50 -translate-x-1/2 text-3xl sm:text-5xl font-extrabold text-white drop-shadow-lg select-none pointer-events-none tracking-widest px-2 text-center w-[98vw] max-w-full"
        style={{
          fontFamily:
            '"Press Start 2P", monospace, "VT323", "Courier New", Courier',
        }}
      >
        CHIMP.FUN
      </div>
      {/* Settings: below title on mobile, top right on desktop */}
      <div className="absolute top-16 left-1/2 z-50 -translate-x-1/2 w-[95vw] max-w-full flex flex-col gap-2 justify-center sm:hidden">
        <div className="flex flex-row gap-2 w-full justify-center">
          <input
            type="number"
            min="1"
            max="5555"
            value={chimpId}
            onChange={(e) => setChimpId(e.target.value)}
            onKeyDown={(e) => {
              const currentValue = parseInt(chimpId) || 2956;
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setChimpId(String(Math.min(5555, currentValue + 1)));
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setChimpId(String(Math.max(1, currentValue - 1)));
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleChimpChange();
              }
            }}
            className="w-20 px-2 py-1 border rounded text-base"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleChimpChange();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base"
          >
            PICK
          </button>
        </div>
        <div className="flex flex-row gap-2 w-full justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRandomChimp();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base"
          >
            🎲 !CHIMP
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRandomBg();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base"
          >
            🎲 BG
          </button>
        </div>
      </div>
      {/* Settings: top right on desktop */}
      <div className="absolute top-2 right-2 z-50 flex flex-col gap-2 w-auto max-w-full items-end hidden sm:flex">
        <div className="flex flex-row gap-2 w-full justify-end">
          <input
            type="number"
            min="1"
            max="5555"
            value={chimpId}
            onChange={(e) => setChimpId(e.target.value)}
            onKeyDown={(e) => {
              const currentValue = parseInt(chimpId) || 2956;
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setChimpId(String(Math.min(5555, currentValue + 1)));
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setChimpId(String(Math.max(1, currentValue - 1)));
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleChimpChange();
              }
            }}
            className="w-20 px-2 py-1 border rounded text-base sm:text-lg"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleChimpChange();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base sm:text-lg"
          >
            PICK
          </button>
        </div>
        <div className="flex flex-row gap-2 w-full justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRandomChimp();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base sm:text-lg"
          >
            🎲 !CHIMP
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRandomBg();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base sm:text-lg"
          >
            🎲 BG
          </button>
        </div>
      </div>
      {/* Points: bottom on mobile, top left on desktop */}
      <div className="fixed bottom-2 left-1/2 z-50 -translate-x-1/2 w-auto sm:hidden">
        <div
          className="text-base font-extrabold text-yellow-300 drop-shadow-lg select-none pointer-events-none tracking-widest px-2 py-1 rounded bg-black/60"
          style={{
            fontFamily:
              '"Press Start 2P", monospace, "VT323", "Courier New", Courier',
          }}
        >
          {chimpPoints} !CHIMP
        </div>
      </div>
      <div className="absolute top-2 left-2 z-50 flex flex-col items-start hidden sm:flex">
        <div
          className="text-base sm:text-2xl font-extrabold text-yellow-300 drop-shadow-lg select-none pointer-events-none tracking-widest px-1 py-0.5 rounded bg-black/40"
          style={{
            fontFamily:
              '"Press Start 2P", monospace, "VT323", "Courier New", Courier',
          }}
        >
          {chimpPoints} !CHIMP
        </div>
      </div>
    </>
  );
}
