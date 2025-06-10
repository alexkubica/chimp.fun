"use client";

import { useEffect, useState, useRef } from "react";
import { debounce } from "lodash";
import confetti from "canvas-confetti";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";

interface PhaserGameProps {
  onChimpChange?: (id: number) => void;
  onRandomChimp?: () => void;
  onRandomBg?: () => void;
}

interface MainScene extends Phaser.Scene {
  loadChimp: (id: number) => void;
  createBackground: () => void;
  bg: Phaser.GameObjects.TileSprite | null;
  chimp: Phaser.GameObjects.Sprite | null;
  updateBoundaries: () => void;
  spawnCollectible: (firstSpawn?: boolean) => void;
  collectible: Phaser.GameObjects.Sprite | null;
}

interface ChimpHUDProps {
  gameStatus: "idle" | "countdown" | "running" | "finished";
  timer: number;
  countdownText: string;
  pointsRef: MutableRefObject<number>;
  setGameStatus: Dispatch<
    SetStateAction<"idle" | "countdown" | "running" | "finished">
  >;
  setChimpPoints: Dispatch<SetStateAction<number>>;
  setCountdownText: Dispatch<SetStateAction<string>>;
  setTimer: Dispatch<SetStateAction<number>>;
  countdownIntervalRef: MutableRefObject<NodeJS.Timeout | null>;
  sceneRef: MutableRefObject<any>;
  confetti: (...args: any[]) => void;
}

function ChimpCountdown({ countdownText }: { countdownText: string }) {
  return (
    <div
      className="text-6xl font-bold text-white drop-shadow-lg mt-2"
      style={{
        fontFamily: '"Press Start 2P", monospace',
        animation: "bounce 0.5s infinite",
      }}
    >
      {countdownText}
    </div>
  );
}

function ChimpScoreShare({
  points,
  setGameStatus,
  setChimpPoints,
  setCountdownText,
  setTimer,
  countdownIntervalRef,
}: {
  points: number;
  setGameStatus: Dispatch<
    SetStateAction<"idle" | "countdown" | "running" | "finished">
  >;
  setChimpPoints: Dispatch<SetStateAction<number>>;
  setCountdownText: Dispatch<SetStateAction<string>>;
  setTimer: Dispatch<SetStateAction<number>>;
  countdownIntervalRef: MutableRefObject<NodeJS.Timeout | null>;
}) {
  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      <div
        className="text-4xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
      >
        Score: {points}
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setGameStatus("countdown");
            setChimpPoints(0);
            (window as any).__GAME_STATUS__ = "countdown";
            let count = 3;
            setCountdownText(count.toString());
            if (countdownIntervalRef.current)
              clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = setInterval(() => {
              count--;
              if (count > 0) {
                setCountdownText(count.toString());
              } else if (count === 0) {
                setCountdownText("!CHIMP");
                setTimeout(() => {
                  setGameStatus("running");
                  (window as any).__GAME_STATUS__ = "running";
                  setTimer(30);
                }, 800);
              }
            }, 800);
          }}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xl font-bold transition-colors"
        >
          PLAY AGAIN
        </button>
        <button
          onClick={async () => {
            const tweetText = `I !CHIMPED ${points} points within 30 seconds in the @ChimpersNFT game made by @mrcryptoalex's game, can you beat me?\nPlay for FREE instantly in your browser 👉 https://chimp.fun/game !CHIMP 🙉`;
            const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            const isMobile = /iPhone|iPad|iPod|Android/i.test(
              navigator.userAgent,
            );
            if (navigator.share && isMobile) {
              try {
                await navigator.share({
                  text: tweetText,
                  url: "https://chimp.fun/game",
                });
              } catch (err: unknown) {
                if (
                  !err ||
                  (typeof err === "object" &&
                    "name" in err &&
                    (err as any).name !== "AbortError")
                ) {
                  window.open(tweetUrl, "_blank", "noopener,noreferrer");
                }
              }
            } else {
              window.open(tweetUrl, "_blank", "noopener,noreferrer");
            }
          }}
          className="px-6 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] text-xl font-bold transition-colors text-center"
        >
          Share Score 🐦
        </button>
      </div>
    </div>
  );
}

function ChimpHUD({
  gameStatus,
  timer,
  countdownText,
  pointsRef,
  setGameStatus,
  setChimpPoints,
  setCountdownText,
  setTimer,
  countdownIntervalRef,
  sceneRef,
  confetti,
}: ChimpHUDProps) {
  return (
    <>
      {gameStatus === "idle" && (
        <button
          onClick={() => {
            confetti({
              particleCount: 100,
              spread: 360,
              startVelocity: 30,
              decay: 0.9,
              gravity: 1,
              drift: 0,
              ticks: 200,
              origin: { x: 0.5, y: 0.5 },
              colors: [
                "#ff0000",
                "#00ff00",
                "#0000ff",
                "#ffff00",
                "#ff00ff",
                "#00ffff",
              ],
              scalar: 0.7,
              shapes: ["circle", "square"],
            });
            setGameStatus("countdown");
            pointsRef.current = 0;
            setChimpPoints(0);
            (window as any).__GAME_STATUS__ = "countdown";
            let count = 3;
            setCountdownText(count.toString());
            if (countdownIntervalRef.current)
              clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = setInterval(() => {
              count--;
              if (count > 0) {
                setCountdownText(count.toString());
              } else if (count === 0) {
                setCountdownText("!CHIMP");
                confetti({
                  particleCount: 150,
                  spread: 360,
                  startVelocity: 35,
                  decay: 0.9,
                  gravity: 1,
                  drift: 0,
                  ticks: 200,
                  origin: { x: 0.5, y: 0.5 },
                  colors: [
                    "#ff0000",
                    "#00ff00",
                    "#0000ff",
                    "#ffff00",
                    "#ff00ff",
                    "#00ffff",
                  ],
                  scalar: 0.8,
                  shapes: ["circle", "square"],
                });
                (window as any).__GAME_STATUS__ = "running";
                if (sceneRef.current) {
                  sceneRef.current.spawnCollectible();
                }
                setTimeout(() => {
                  setGameStatus("running");
                  (window as any).__GAME_STATUS__ = "running";
                  setTimer(30);
                }, 800);
              }
            }, 800);
          }}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xl font-bold transition-colors"
        >
          START
        </button>
      )}
      {gameStatus === "running" && (
        <div
          className="text-4xl font-bold text-white drop-shadow-lg"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {timer.toFixed(3)}
        </div>
      )}
    </>
  );
}

export default function PhaserGame({
  onChimpChange,
  onRandomChimp,
  onRandomBg,
}: PhaserGameProps) {
  const [chimpId, setChimpId] = useState("2956");
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [chimpPoints, setChimpPoints] = useState(0);
  const pointsRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [gameStatus, setGameStatus] = useState<
    "idle" | "countdown" | "running" | "finished"
  >("idle");
  const [timer, setTimer] = useState(30);
  const [countdownText, setCountdownText] = useState("");
  const [fps, setFps] = useState(0);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MainScene | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lastRenderTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);

    const checkIfDesktop = () => {
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    };

    checkIfDesktop();
    window.addEventListener("resize", checkIfDesktop);

    return () => {
      window.removeEventListener("resize", checkIfDesktop);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    // Set up FPS counter
    fpsUpdateIntervalRef.current = setInterval(() => {
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;
      const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
      setFps(currentFps);
      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;
    }, 1000);

    // Set up the window function to update points
    (window as any).__SET_CHIMP_POINTS__ = (
      callback: (prev: number) => number,
    ) => {
      if (gameStatus === "running") {
        // Update both the ref and state
        const newPoints = callback(pointsRef.current);
        pointsRef.current = newPoints;
        setChimpPoints(newPoints);
      }
    };

    // Set initial game status
    (window as any).__GAME_STATUS__ = gameStatus;

    // Add keyboard event listener for zoom
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "-")) {
        e.preventDefault();
        if (sceneRef.current && sceneRef.current.cameras.main) {
          const camera = sceneRef.current.cameras.main;
          const currentZoom = camera.zoom;
          const newZoom =
            e.key === "+"
              ? Math.min(currentZoom * 1.2, 2)
              : Math.max(currentZoom / 1.2, 0.5);

          // Calculate boundary dimensions
          const width = 2000; // MIN_BOUNDARY_WIDTH
          const height = 1500; // MIN_BOUNDARY_HEIGHT
          const x = (sceneRef.current.scale.width - width) / 2;
          const y = (sceneRef.current.scale.height - height) / 2;

          // Calculate camera dimensions at new zoom
          const cameraWidth = camera.width / newZoom;
          const cameraHeight = camera.height / newZoom;

          // Calculate target position to center on player if possible
          let targetX = x + width / 2;
          let targetY = y + height / 2;

          const scene = sceneRef.current as MainScene;
          if (scene.chimp) {
            // Try to center on player
            targetX = scene.chimp.x - cameraWidth / 2;
            targetY = scene.chimp.y - cameraHeight / 2;

            // Clamp to boundaries
            targetX = Phaser.Math.Clamp(targetX, x, x + width - cameraWidth);
            targetY = Phaser.Math.Clamp(targetY, y, y + height - cameraHeight);
          }

          // Apply zoom and position
          camera.zoomTo(newZoom, 200, Phaser.Math.Easing.Quadratic.InOut);
          camera.setScroll(targetX, targetY);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Avoid duplicate game init on hot reload
    const container = document.getElementById("phaser-container");
    if (!container || gameRef.current) return;

    // Dynamically import Phaser
    import("phaser").then((Phaser) => {
      // Phaser game definition
      class MainScene extends Phaser.Scene {
        chimp: Phaser.GameObjects.Sprite | null = null;
        cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
        wasd: {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
        } | null = null;
        touchPointer: Phaser.Input.Pointer | null = null;
        bg: Phaser.GameObjects.TileSprite | null = null;
        lastDirection: number = 1;
        currentAnimKeys: { run: string; rest: string } = {
          run: "",
          rest: "",
        };
        collectible: Phaser.GameObjects.Sprite | null = null;
        circleBoundary: Phaser.GameObjects.Graphics | null = null;
        nextChimpId: number = 0;
        static TOP_BOUNDARY = 50;
        static MIN_BOUNDARY_WIDTH = 2000;
        static MIN_BOUNDARY_HEIGHT = 2000;
        static MAX_ZOOM = 2;
        static MIN_ZOOM = 0.5;
        static MIN_COLLECTIBLE_DISTANCE = 200;
        static BOUNDARY_PADDING_X = 20; // X-axis padding
        static BOUNDARY_PADDING_Y = 5; // Y-axis padding
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
          this.cursors = this.input.keyboard?.createCursorKeys() ?? null;
          this.wasd = this.input.keyboard?.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
          }) as any;

          // Create rectangle boundary with fixed size
          this.circleBoundary = this.add.graphics();
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;
          this.circleBoundary.lineStyle(8, 0xff0000, 0);
          this.circleBoundary.strokeRect(x, y, width, height);

          // Set up camera with slightly larger bounds to allow 1px buffer
          this.cameras.main.setBounds(x - 1, y - 1, width + 2, height + 2);
          this.cameras.main.setZoom(1);
          this.cameras.main.setFollowOffset(0, 0);
          this.cameras.main.setLerp(0.1);

          // Handle device pixel ratio and browser zoom
          const updatePixelRatio = () => {
            const pixelRatio = window.devicePixelRatio || 1;
            this.scale.setZoom(1 / pixelRatio);
          };
          updatePixelRatio();

          // Add zoom change handler
          window.addEventListener("resize", () => {
            updatePixelRatio();
            this.updateBoundaries();
          });

          // Add orientation change handler
          window.addEventListener("orientationchange", () => {
            // Wait for the orientation change to complete
            setTimeout(() => {
              this.scale.refresh();
              this.updateBoundaries();
            }, 100);
          });

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

          // Always spawn player at center of boundary
          if (this.chimp) {
            this.chimp.setPosition(x + width / 2, y + height / 2);
          }

          // Only spawn collectible if game is running
          if ((window as any).__GAME_STATUS__ === "running") {
            this.spawnCollectible(true); // pass true for first spawn
          }

          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.touchPointer = pointer;
          });
          this.input.on("pointerup", () => {
            this.touchPointer = null;
          });

          // Add debounced resize handler
          const debouncedResize = debounce(
            (gameSize: { width: number; height: number }) => {
              if (this.bg) {
                const newX = (gameSize.width - width) / 2;
                const newY = (gameSize.height - height) / 2;
                this.bg.setPosition(newX, newY);
              }
              if (this.chimp) {
                const relativeX = this.chimp.x / this.scale.width;
                const relativeY = this.chimp.y / this.scale.height;
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

              // Update boundary
              const newWidth = MainScene.MIN_BOUNDARY_WIDTH;
              const newHeight = MainScene.MIN_BOUNDARY_HEIGHT;
              const newX = (gameSize.width - newWidth) / 2;
              const newY = (gameSize.height - newHeight) / 2;

              if (this.circleBoundary) {
                this.circleBoundary.clear();
                this.circleBoundary.lineStyle(8, 0xff0000, 0);
                this.circleBoundary.strokeRect(newX, newY, newWidth, newHeight);
              }

              this.cameras.main.setBounds(newX, newY, newWidth, newHeight);
            },
            100,
          );

          this.scale.on("resize", debouncedResize, this);
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

          // Calculate boundary dimensions
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;

          // Create background covering the entire boundary area
          this.bg = this.add
            .tileSprite(x, y, width, height, tileKey)
            .setOrigin(0)
            .setDepth(0);

          this.scale.on(
            "resize",
            (gameSize: { width: number; height: number }) => {
              if (this.bg) {
                const newX = (gameSize.width - width) / 2;
                const newY = (gameSize.height - height) / 2;
                this.bg.setPosition(newX, newY);
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
            // Preload next chimp
            this.preloadNextChimp();
            return;
          }

          this.load.spritesheet(key, url, {
            frameWidth: 96,
            frameHeight: 96,
          });

          this.load.once("complete", () => {
            this.replaceChimp(key);
            // Preload next chimp
            this.preloadNextChimp();
          });

          this.load.start();
        }

        preloadNextChimp() {
          // Generate next random chimp ID
          this.nextChimpId = Math.floor(Math.random() * 5555) + 1;
          const nextKey = `chimp_${this.nextChimpId}`;
          const nextUrl = `https://d31ss916pli4td.cloudfront.net/game/avatars/chimpers/full/${this.nextChimpId}.png?v6`;

          // Only load if not already loaded
          if (!this.textures.exists(nextKey)) {
            this.load.spritesheet(nextKey, nextUrl, {
              frameWidth: 96,
              frameHeight: 96,
            });
            this.load.start();
          }
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
            .setDepth(2);

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

        spawnCollectible(firstSpawn = false) {
          if (this.collectible) {
            this.collectible.destroy();
          }
          // Only spawn if game is running
          if ((window as any).__GAME_STATUS__ !== "running") {
            return;
          }
          // Randomly pick an asset
          const asset = Phaser.Utils.Array.GetRandom(this.collectibleAssets);
          const collectibleSize = asset.frameWidth / 3;
          const chimpWidth = 96 * 2;
          let validPosition = false;
          let randomX = 0;
          let randomY = 0;
          let tries = 0;

          // Calculate boundary dimensions
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;

          if (firstSpawn && this.chimp) {
            // Place collectible near the chimp and visible on camera
            randomX = this.chimp.x + 200;
            randomY = this.chimp.y;
            validPosition = true;
          } else {
            while (!validPosition && tries < 50) {
              randomX = Phaser.Math.Between(
                x + collectibleSize / 2,
                x + width - collectibleSize / 2,
              );
              randomY = Phaser.Math.Between(
                y + collectibleSize / 2,
                y + height - collectibleSize / 2,
              );

              if (this.chimp) {
                const distanceX = Math.abs(randomX - this.chimp.x);
                const distanceY = Math.abs(randomY - this.chimp.y);
                validPosition =
                  distanceX >= MainScene.MIN_COLLECTIBLE_DISTANCE &&
                  distanceY >= MainScene.MIN_COLLECTIBLE_DISTANCE;
              } else {
                validPosition = true;
              }
              tries++;
            }
          }

          this.collectible = this.add
            .sprite(randomX, randomY, asset.sprite)
            .setScale(1 / 3)
            .setDepth(1);
          this.collectible.play(asset.anim);
        }

        updateBoundaries() {
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;

          // Store current world positions before updating
          const chimpWorldX = this.chimp?.x ?? x + width / 2;
          const chimpWorldY = this.chimp?.y ?? y + height / 2;
          const collectibleWorldX = this.collectible?.x ?? x + width / 2;
          const collectibleWorldY = this.collectible?.y ?? y + height / 2;

          // Update boundary graphics
          if (this.circleBoundary) {
            this.circleBoundary.clear();
            this.circleBoundary.lineStyle(8, 0xff0000, 0);
            this.circleBoundary.strokeRect(x, y, width, height);
          }

          // Update camera bounds and ensure it's properly positioned
          this.cameras.main.setBounds(x - 1, y - 1, width + 2, height + 2);

          // Force camera to update its viewport
          const camera = this.cameras.main;
          const cameraWidth = camera.width / camera.zoom;
          const cameraHeight = camera.height / camera.zoom;

          // Calculate optimal camera position
          let targetX = x + width / 2;
          let targetY = y + height / 2;

          if (this.chimp) {
            // Try to center on player
            targetX = this.chimp.x - cameraWidth / 2;
            targetY = this.chimp.y - cameraHeight / 2;

            // Clamp to boundaries
            targetX = Phaser.Math.Clamp(targetX, x, x + width - cameraWidth);
            targetY = Phaser.Math.Clamp(targetY, y, y + height - cameraHeight);
          }

          // Update camera position
          camera.setScroll(targetX, targetY);

          // Update background position
          if (this.bg) {
            this.bg.setPosition(x, y);
          }

          // Ensure chimp stays within bounds with different X and Y padding
          if (this.chimp) {
            const chimpWidth = this.chimp.width * this.chimp.scaleX;
            const chimpHeight = this.chimp.height * this.chimp.scaleY;

            // Use stored world position and clamp it
            this.chimp.x = Phaser.Math.Clamp(
              chimpWorldX,
              x + chimpWidth / 2 + MainScene.BOUNDARY_PADDING_X,
              x + width - chimpWidth / 2 - MainScene.BOUNDARY_PADDING_X,
            );
            this.chimp.y = Phaser.Math.Clamp(
              chimpWorldY,
              y + chimpHeight / 2 + MainScene.BOUNDARY_PADDING_Y,
              y + height - chimpHeight / 2 - MainScene.BOUNDARY_PADDING_Y,
            );
          }

          // Ensure collectible stays within bounds with different X and Y padding
          if (this.collectible) {
            const colWidth = this.collectible.width * this.collectible.scaleX;
            const colHeight = this.collectible.height * this.collectible.scaleY;

            // Use stored world position and clamp it
            this.collectible.x = Phaser.Math.Clamp(
              collectibleWorldX,
              x + colWidth / 2 + MainScene.BOUNDARY_PADDING_X,
              x + width - colWidth / 2 - MainScene.BOUNDARY_PADDING_X,
            );
            this.collectible.y = Phaser.Math.Clamp(
              collectibleWorldY,
              y + colHeight / 2 + MainScene.BOUNDARY_PADDING_Y,
              y + height - colHeight / 2 - MainScene.BOUNDARY_PADDING_Y,
            );
          }
        }

        update(time: number, delta: number) {
          if (!this.chimp) return;

          // Increment frame count for FPS calculation
          frameCountRef.current++;

          const baseSpeed = 400; // pixels per second
          const speed = (baseSpeed * delta) / 1000;
          let dx = 0,
            dy = 0;
          let moving = false;

          // Allow movement in all states except countdown
          if ((window as any).__GAME_STATUS__ !== "countdown") {
            if (this.cursors?.left.isDown || this.wasd?.left.isDown) {
              dx -= speed;
              moving = true;
            }
            if (this.cursors?.right.isDown || this.wasd?.right.isDown) {
              dx += speed;
              moving = true;
            }
            if (this.cursors?.up.isDown || this.wasd?.up.isDown) {
              dy -= speed;
              moving = true;
            }
            if (this.cursors?.down.isDown || this.wasd?.down.isDown) {
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
          } else {
            // During countdown, only check for left/right movement to animate
            if (
              this.cursors?.left.isDown ||
              this.wasd?.left.isDown ||
              this.cursors?.right.isDown ||
              this.wasd?.right.isDown
            ) {
              moving = true;
              // Update direction for animation
              if (this.cursors?.left.isDown || this.wasd?.left.isDown) {
                this.lastDirection = -1;
                this.chimp?.setFlipX(true);
              } else if (
                this.cursors?.right.isDown ||
                this.wasd?.right.isDown
              ) {
                this.lastDirection = 1;
                this.chimp?.setFlipX(false);
              }
            }
          }

          // Get chimp's scaled dimensions
          const chimpWidth = this.chimp.width * this.chimp.scaleX;
          const chimpHeight = this.chimp.height * this.chimp.scaleY;

          // Calculate overflow as percentage of player dimensions
          const boundaryOverflowX = chimpWidth * 0.35;
          const boundaryOverflowYTop = chimpHeight * 0.1;
          const boundaryOverflowYBottom = chimpHeight * 0.07;

          // Calculate rectangle boundaries with padding
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;

          // Calculate new position with padding
          let newX = this.chimp.x + dx;
          let newY = this.chimp.y + dy;

          // Clamp position to boundaries with padding and overflow
          newX = Phaser.Math.Clamp(
            newX,
            x +
              chimpWidth / 2 +
              MainScene.BOUNDARY_PADDING_X -
              boundaryOverflowX,
            x +
              width -
              chimpWidth / 2 -
              MainScene.BOUNDARY_PADDING_X +
              boundaryOverflowX,
          );
          newY = Phaser.Math.Clamp(
            newY,
            y +
              chimpHeight / 2 +
              MainScene.BOUNDARY_PADDING_Y -
              boundaryOverflowYTop,
            y +
              height -
              chimpHeight / 2 -
              MainScene.BOUNDARY_PADDING_Y +
              boundaryOverflowYBottom,
          );

          // Only update position if it changed
          if (newX !== this.chimp.x || newY !== this.chimp.y) {
            this.chimp.x = newX;
            this.chimp.y = newY;
          }

          // Update camera position
          const camera = this.cameras.main;
          const cameraWidth = camera.width / camera.zoom;
          const cameraHeight = camera.height / camera.zoom;

          // Calculate camera bounds with padding
          const cameraMinX = x + cameraWidth / 2;
          const cameraMaxX = x + width - cameraWidth / 2;
          const cameraMinY = y + cameraHeight / 2;
          const cameraMaxY = y + height - cameraHeight / 2;

          // Calculate screen margins for smooth transition
          const margin = 100; // pixels from edge to start following
          const playerScreenX = camera.getWorldPoint(this.chimp.x, 0).x;
          const playerScreenY = camera.getWorldPoint(0, this.chimp.y).y;
          const isNearScreenEdge =
            playerScreenX < margin ||
            playerScreenX > camera.width - margin ||
            playerScreenY < margin ||
            playerScreenY > camera.height - margin;

          if (camera.zoom < 1) {
            // When zoomed out, use smooth following near edges
            if (isNearScreenEdge) {
              // Calculate target position that keeps player within margins
              const targetX = Phaser.Math.Clamp(
                this.chimp.x - cameraWidth / 2,
                x,
                x + width - cameraWidth,
              );
              const targetY = Phaser.Math.Clamp(
                this.chimp.y - cameraHeight / 2,
                y,
                y + height - cameraHeight,
              );

              // Smoothly move camera to target position
              camera.scrollX = Phaser.Math.Linear(camera.scrollX, targetX, 0.1);
              camera.scrollY = Phaser.Math.Linear(camera.scrollY, targetY, 0.1);
            } else {
              // When player is in center, smoothly return to centered view
              const centerX = x + (width - cameraWidth) / 2;
              const centerY = y + (height - cameraHeight) / 2;
              camera.scrollX = Phaser.Math.Linear(
                camera.scrollX,
                centerX,
                0.05,
              );
              camera.scrollY = Phaser.Math.Linear(
                camera.scrollY,
                centerY,
                0.05,
              );
            }
          } else {
            // Normal zoomed in behavior
            if (cameraMinX <= cameraMaxX && cameraMinY <= cameraMaxY) {
              camera.startFollow(this.chimp, true);
            } else {
              camera.stopFollow();
              camera.setScroll(
                Phaser.Math.Clamp(
                  this.chimp.x - cameraWidth / 2,
                  x,
                  x + width - cameraWidth,
                ),
                Phaser.Math.Clamp(
                  this.chimp.y - cameraHeight / 2,
                  y,
                  y + height - cameraHeight,
                ),
              );
            }
          }

          // Update direction based on movement
          if ((window as any).__GAME_STATUS__ !== "countdown" && dx !== 0) {
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
              // Emit a custom event for points update
              this.events.emit("collectibleCollected");
              // Small confetti for collectible pickup - intensity increases with points
              const intensity = Math.min(1 + pointsRef.current * 0.1, 2); // Scale up to 2x intensity
              confetti({
                particleCount: Math.floor(30 * intensity),
                spread: 360,
                startVelocity: 20,
                decay: 0.9,
                gravity: 1,
                drift: 0,
                ticks: 100,
                origin: { x: 0.5, y: 0.5 },
                colors: [
                  "#ff0000",
                  "#00ff00",
                  "#0000ff",
                  "#ffff00",
                  "#ff00ff",
                  "#00ffff",
                ],
                scalar: 0.5,
                shapes: ["circle"],
              });
              // Update game elements
              this.createBackground();
              this.spawnCollectible();
              // Use preloaded chimp
              this.loadChimp(this.nextChimpId);
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
          width: "100%",
          height: "100%",
          min: {
            width: 320,
            height: 480,
          },
          max: {
            width: 2000,
            height: 2000,
          },
          autoRound: true,
          expandParent: true,
          resizeInterval: 0, // Immediate resize
        },
        scene: MainScene,
      });

      gameRef.current = game;

      // Store a reference to the scene instance
      game.events.on("ready", () => {
        const scene = game.scene.getScene("MainScene") as MainScene;
        if (scene) {
          sceneRef.current = scene;
          // Force initial boundary update
          scene.updateBoundaries();

          // Listen for collectible collection events
          scene.events.on("collectibleCollected", () => {
            if ((window as any).__GAME_STATUS__ === "running") {
              pointsRef.current += 1;
              setChimpPoints(pointsRef.current);
            }
          });
        }
      });

      // Add resize observer for more reliable resize handling
      const resizeObserver = new ResizeObserver(() => {
        if (sceneRef.current) {
          sceneRef.current.updateBoundaries();
        }
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
  }, [mounted]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (fpsUpdateIntervalRef.current) {
        clearInterval(fpsUpdateIntervalRef.current);
      }
    };
  }, []);

  // Add bounce animation
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add game status update effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__GAME_STATUS__ = gameStatus;
      if (gameStatus === "idle" || gameStatus === "countdown") {
        // Reset points when game starts
        pointsRef.current = 0;
        setChimpPoints(0);
      }
      if (gameStatus === "finished" && sceneRef.current) {
        // Clear collectible when game finishes
        if (sceneRef.current.collectible) {
          sceneRef.current.collectible.destroy();
          sceneRef.current.collectible = null;
        }
      }
      if (gameStatus === "running" && sceneRef.current) {
        // Spawn collectible when game starts running
        sceneRef.current.spawnCollectible();
      }
    }
  }, [gameStatus]);

  // Add points display update effect
  useEffect(() => {
    const updatePointsDisplay = () => {
      if (gameStatus === "running") {
        setChimpPoints(pointsRef.current);
      }
    };

    // Update points display every 100ms during gameplay
    const interval = setInterval(updatePointsDisplay, 100);

    return () => {
      clearInterval(interval);
    };
  }, [gameStatus]);

  // Add timer update effect
  useEffect(() => {
    if (gameStatus === "running") {
      const updateTimer = () => {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastRenderTimeRef.current) / 1000;
        lastRenderTimeRef.current = currentTime;

        setTimer((prev) => {
          if (prev <= 0) {
            setGameStatus("finished");
            (window as any).__GAME_STATUS__ = "finished";
            // Big confetti for game end
            confetti({
              particleCount: 200,
              spread: 360,
              startVelocity: 45,
              decay: 0.9,
              gravity: 1,
              drift: 0,
              ticks: 200,
              origin: { x: 0.5, y: 0.5 },
              colors: [
                "#ff0000",
                "#00ff00",
                "#0000ff",
                "#ffff00",
                "#ff00ff",
                "#00ffff",
              ],
              shapes: ["circle", "square"],
              scalar: 1.2,
            });
            return 0;
          }
          return Math.max(0, prev - deltaTime);
        });

        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };

      lastRenderTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStatus]);

  const toggleZoom = () => {
    if (sceneRef.current && sceneRef.current.cameras.main) {
      setIsZoomedOut(!isZoomedOut);
      const camera = sceneRef.current.cameras.main;
      const currentZoom = camera.zoom;

      // Calculate the zoom level needed to fit the boundary width to screen width
      const boundaryWidth = 2000; // MainScene.MIN_BOUNDARY_WIDTH
      const screenWidth = sceneRef.current.scale.width;
      const fitZoom = screenWidth / boundaryWidth;

      // Use the larger of the fit zoom or minimum zoom
      const targetZoom = !isZoomedOut ? Math.max(fitZoom, 0.5) : 1;
      const clampedZoom = Phaser.Math.Clamp(targetZoom, 0.5, 2);

      camera.zoomTo(clampedZoom, 1000, Phaser.Math.Easing.Quadratic.InOut);
    }
  };

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
      {/* Title and HUD: always top center, stacked on desktop */}
      <div className="fixed top-0 left-0 w-full z-50 flex flex-col items-center pointer-events-none">
        <div
          className="mt-4 text-3xl sm:text-5xl font-extrabold text-white drop-shadow-lg select-none pointer-events-none tracking-widest px-2 text-center w-[98vw] max-w-full"
          style={{
            fontFamily:
              '"Press Start 2P", monospace, "VT323", "Courier New", Courier',
          }}
        >
          CHIMP.FUN
        </div>
        {/* Desktop HUD: show only on sm and up */}
        <div className="mt-4 sm:mt-8 flex-col items-center gap-2 pointer-events-auto hidden sm:flex">
          <ChimpHUD
            gameStatus={gameStatus}
            timer={timer}
            countdownText={countdownText}
            pointsRef={pointsRef}
            setGameStatus={setGameStatus}
            setChimpPoints={setChimpPoints}
            setCountdownText={setCountdownText}
            setTimer={setTimer}
            countdownIntervalRef={countdownIntervalRef}
            sceneRef={sceneRef}
            confetti={confetti}
          />
        </div>
        {/* Mobile HUD: show only on mobile, always visible, directly under title */}
        <div className="mt-4 flex-col items-center gap-2 pointer-events-auto sm:hidden flex">
          <ChimpHUD
            gameStatus={gameStatus}
            timer={timer}
            countdownText={countdownText}
            pointsRef={pointsRef}
            setGameStatus={setGameStatus}
            setChimpPoints={setChimpPoints}
            setCountdownText={setCountdownText}
            setTimer={setTimer}
            countdownIntervalRef={countdownIntervalRef}
            sceneRef={sceneRef}
            confetti={confetti}
          />
          {/* Render countdown and finished UI below HUD and random buttons on mobile */}
          {gameStatus === "countdown" && (
            <ChimpCountdown countdownText={countdownText} />
          )}
          {gameStatus === "finished" && (
            <ChimpScoreShare
              points={pointsRef.current}
              setGameStatus={setGameStatus}
              setChimpPoints={setChimpPoints}
              setCountdownText={setCountdownText}
              setTimer={setTimer}
              countdownIntervalRef={countdownIntervalRef}
            />
          )}
        </div>
      </div>
      {/* Settings: below title on mobile, top right on desktop */}
      <div
        className={`${isDesktop ? "absolute top-2 right-2" : "relative mt-2"} z-50 ${isDesktop ? "w-auto" : "w-[95vw]"} max-w-full flex flex-col gap-2 ${isDesktop ? "items-end" : "justify-center"} ${isDesktop ? "hidden sm:flex" : "sm:hidden"}`}
      >
        <div
          className={`flex flex-row gap-2 w-full ${isDesktop ? "justify-end" : "justify-center"} ${gameStatus === "running" || gameStatus === "countdown" ? "!hidden" : ""}`}
        >
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleZoom();
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-base sm:text-lg"
          >
            {isZoomedOut ? "🔍" : "👁️"}
          </button>
        </div>
        {!isDesktop && (
          <div
            className={`flex flex-row gap-2 w-full justify-center ${gameStatus === "running" || gameStatus === "countdown" ? "!hidden" : ""}`}
          >
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
        )}
      </div>
      {/* Random buttons: only show on desktop */}
      {isDesktop && (
        <div
          className={`absolute top-14 right-2 z-50 flex flex-col gap-2 w-auto max-w-full items-end hidden sm:flex ${gameStatus === "running" || gameStatus === "countdown" ? "!hidden" : ""}`}
        >
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
      )}
      {/* Points: always bottom center */}
      <div className="fixed bottom-2 left-1/2 z-50 -translate-x-1/2 w-auto">
        {gameStatus === "running" && (
          <div
            className="text-base font-extrabold text-yellow-300 drop-shadow-lg select-none pointer-events-none tracking-widest px-2 py-1 rounded bg-black/60"
            style={{
              fontFamily:
                '"Press Start 2P", monospace, "VT323", "Courier New", Courier',
            }}
          >
            {pointsRef.current} !CHIMP POINTS
          </div>
        )}
      </div>
      {/* Game container */}
      <div id="phaser-container" className="fixed inset-0 w-full h-full" />

      {/* FPS Counter */}
      <div className="fixed bottom-2 left-2 z-50 text-white font-mono bg-black/60 px-2 py-1 rounded">
        FPS: {fps}
      </div>
    </>
  );
}
