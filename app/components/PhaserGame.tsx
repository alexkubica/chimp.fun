"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import { debounce } from "lodash";
import confetti from "canvas-confetti";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";

// Extend Window interface for joystick
declare global {
  interface Window {
    __JOYSTICK_DIR__?: { dx: number; dy: number };
  }
}

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
  _hasSpawnedFirstCollectible: boolean;
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
  sceneRef,
}: {
  points: number;
  setGameStatus: Dispatch<
    SetStateAction<"idle" | "countdown" | "running" | "finished">
  >;
  setChimpPoints: Dispatch<SetStateAction<number>>;
  setCountdownText: Dispatch<SetStateAction<string>>;
  setTimer: Dispatch<SetStateAction<number>>;
  countdownIntervalRef: MutableRefObject<NodeJS.Timeout | null>;
  sceneRef: MutableRefObject<any>;
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
          onClick={() => {
            const tweetText = `I !CHIMPED ${points} points within 30 seconds in the @ChimpersNFT game made by @mrcryptoalex's game, can you beat me?\nPlay for FREE instantly in your browser 👉 https://chimp.fun/game !CHIMP 🙉`;
            const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(tweetUrl, "_blank", "noopener,noreferrer");
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
            // Spawn the first collectible during countdown
            if (
              sceneRef.current &&
              !sceneRef.current._hasSpawnedFirstCollectible
            ) {
              sceneRef.current.spawnCollectible(true);
            }
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

// Update HudToggleButton to only show the cog icon
function HudToggleButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="p-2 rounded-full bg-gray-300 text-gray-800 hover:bg-gray-400 transition-colors shadow"
      onClick={onClick}
      type="button"
      aria-label="Toggle HUD controls"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.142-.854-.108-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.774-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.806.272 1.203.107.397-.165.71-.505.781-.929l.149-.894z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
}

function SettingsContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-6 pointer-events-auto">
      {children}
    </div>
  );
}

function ChimpHudControls({
  chimpId,
  setChimpId,
  handleChimpChange,
  isZoomedOut,
  toggleZoom,
  handleRandomChimp,
  handleRandomBg,
  isDesktop,
  gameStatus,
  showFps,
  setShowFps,
  showJoystick,
  setShowJoystick,
  isMobile,
}: {
  chimpId: string;
  setChimpId: (id: string) => void;
  handleChimpChange: () => void;
  isZoomedOut: boolean;
  toggleZoom: () => void;
  handleRandomChimp: () => void;
  handleRandomBg: () => void;
  isDesktop: boolean;
  gameStatus: string;
  showFps: boolean;
  setShowFps: (v: boolean) => void;
  showJoystick: boolean;
  setShowJoystick: (v: boolean) => void;
  isMobile: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 w-full items-center">
      <div
        className={`flex flex-row gap-2 w-full ${isDesktop ? "justify-end" : "justify-center"}`}
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
      <div
        className={`flex flex-row gap-2 w-full ${isDesktop ? "justify-end" : "justify-center"}`}
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
      <div className="flex flex-col gap-2 w-full mt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showFps}
            onChange={function (e) {
              setShowFps(e.target.checked);
            }}
          />
          Show FPS
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showJoystick}
            onChange={function (e) {
              setShowJoystick(e.target.checked);
            }}
            disabled={!isMobile}
          />
          Show Joystick
        </label>
      </div>
    </div>
  );
}

// Helper to get random collectible position with at least minVisible percent on screen
function getRandomCollectiblePosition({
  cameraLeft,
  cameraRight,
  cameraTop,
  cameraBottom,
  collectibleSize,
  minVisible = 0.25,
  overflow = 0.5,
}: {
  cameraLeft: number;
  cameraRight: number;
  cameraTop: number;
  cameraBottom: number;
  collectibleSize: number;
  minVisible?: number;
  overflow?: number;
}) {
  const colW = collectibleSize;
  const colH = collectibleSize;
  const minX = cameraLeft - colW * overflow + (colW * minVisible) / 2;
  const maxX = cameraRight + colW * overflow - (colW * minVisible) / 2;
  const minY = cameraTop - colH * overflow + (colH * minVisible) / 2;
  const maxY = cameraBottom + colH * overflow - (colH * minVisible) / 2;
  return {
    x: Phaser.Math.Between(minX, maxX),
    y: Phaser.Math.Between(minY, maxY),
  };
}

// Joystick component for mobile controls
function Joystick({
  dragging,
  pos,
  basePos,
  radius = 48,
}: {
  dragging: boolean;
  pos: { x: number; y: number };
  basePos: { x: number; y: number } | null;
  radius?: number;
}) {
  // Joystick base position: default bottom right, or at center
  let containerStyle: React.CSSProperties;
  if (basePos) {
    containerStyle = {
      touchAction: "none",
      width: 120,
      height: 120,
      position: "fixed",
      left: basePos.x - 60,
      top: basePos.y - 60,
      zIndex: 100,
      pointerEvents: "auto",
    };
  } else {
    containerStyle = {
      touchAction: "none",
      width: 120,
      height: 120,
      position: "fixed",
      right: 24,
      bottom: 24,
      zIndex: 100,
      pointerEvents: "auto",
    };
  }

  return (
    <div className="z-50 select-none" style={containerStyle}>
      <div
        className="absolute left-1/2 top-1/2 bg-gray-700/70 rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 bg-blue-400/90 rounded-full shadow-lg"
        style={{
          width: 48,
          height: 48,
          transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
          transition: dragging
            ? "none"
            : "transform 0.2s cubic-bezier(.4,2,.6,1)",
        }}
      />
    </div>
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
  const [showHud, setShowHud] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Joystick state for mobile
  const joystickDir = useRef({ dx: 0, dy: 0 });
  // In PhaserGame component state
  const [showFps, setShowFps] = useState(false);
  const [showJoystick, setShowJoystick] = useState(false);
  // Joystick UI state
  const [joystickDragging, setJoystickDragging] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [joystickBasePos, setJoystickBasePos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const joystickRadius = 48;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);

    const checkIfMobile = () => {
      // Use user agent and screen size for mobile detection
      const ua = navigator.userAgent;
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen =
        window.innerWidth <= 800 || window.innerHeight <= 800;
      const isMobileUA =
        /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
      setIsMobile((isTouch && isSmallScreen) || isMobileUA);
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => {
      window.removeEventListener("resize", checkIfMobile);
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

        // --- Optimization state fields ---
        private _lastPos: { x: number; y: number } = { x: 0, y: 0 };
        private _lastAnim: string = "";
        private _lastMoving: boolean = false;
        private _collectibleCooldown: number = 0;
        private _lastCameraZoom: number = 1;
        private _cameraFollowState: WeakMap<any, boolean> = new WeakMap();
        private _hasCenteredChimpInitially: boolean = false;
        _hasSpawnedFirstCollectible: boolean = false;
        lastTouchMove: { dx: number; dy: number; speed: number } | null = null;
        touchReached: boolean = false;

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
            this.touchReached = false;
            this.lastTouchMove = null;
          });
          this.input.on("pointerup", () => {
            this.touchPointer = null;
            this.touchReached = false;
            this.lastTouchMove = null;
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

          if (this.chimp) this.chimp.destroy();

          // Calculate center of boundary
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          // Only center on initial load, otherwise keep previous position
          let chimpX: number;
          let chimpY: number;
          if (!this._hasCenteredChimpInitially) {
            chimpX = centerX;
            chimpY = centerY;
            this._hasCenteredChimpInitially = true;
          } else {
            chimpX = this.chimp?.x ?? centerX;
            chimpY = this.chimp?.y ?? centerY;
          }

          this.chimp = this.add
            .sprite(chimpX, chimpY, key, 0)
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

          // Reset camera follow state so camera follows new chimp
          if (this.cameras && this.cameras.main && this._cameraFollowState) {
            this._cameraFollowState.set(this.cameras.main, false);
          }

          // Ensure chimp and camera are centered and clamped
          this.updateBoundaries();
        }

        spawnCollectible(firstSpawn = false) {
          if (this.collectible) {
            // Only destroy collectible if not first spawn
            if (!firstSpawn) {
              this.collectible.destroy();
            }
          }
          // Only spawn if game is running or during countdown for first spawn
          if ((window as any).__GAME_STATUS__ !== "running" && !firstSpawn) {
            return;
          }
          // Randomly pick an asset
          const asset = Phaser.Utils.Array.GetRandom(this.collectibleAssets);
          const collectibleSize = asset.frameWidth / 3;
          const chimpWidth = 96 * 2;
          let randomX = 0;
          let randomY = 0;

          // Calculate boundary dimensions
          const width = MainScene.MIN_BOUNDARY_WIDTH;
          const height = MainScene.MIN_BOUNDARY_HEIGHT;
          const x = (this.scale.width - width) / 2;
          const y = (this.scale.height - height) / 2;

          // Camera visible area
          const camera = this.cameras.main;
          const cameraWidth = camera.width / camera.zoom;
          const cameraHeight = camera.height / camera.zoom;
          const cameraLeft = camera.scrollX;
          const cameraTop = camera.scrollY;
          const cameraRight = cameraLeft + cameraWidth;
          const cameraBottom = cameraTop + cameraHeight;

          if (firstSpawn && this.chimp) {
            // Place collectible fully visible and near the chimp (easy), but not on top
            const offset = 200;
            // Try to place at a safe distance (minDistance)
            let tries = 0;
            let validPosition = false;
            let safeX = this.chimp.x + offset;
            let safeY = this.chimp.y;
            const minDistance = 150; // Minimum distance from chimp for first spawn
            while (!validPosition && tries < 50) {
              // Try a random direction around the chimp
              const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
              safeX = this.chimp.x + Math.cos(angle) * offset;
              safeY = this.chimp.y + Math.sin(angle) * offset;
              // Clamp to camera view
              safeX = Phaser.Math.Clamp(
                safeX,
                cameraLeft + collectibleSize / 2,
                cameraRight - collectibleSize / 2,
              );
              safeY = Phaser.Math.Clamp(
                safeY,
                cameraTop + collectibleSize / 2,
                cameraBottom - collectibleSize / 2,
              );
              const distance = Phaser.Math.Distance.Between(
                safeX,
                safeY,
                this.chimp.x,
                this.chimp.y,
              );
              validPosition = distance >= minDistance;
              tries++;
            }
            randomX = safeX;
            randomY = safeY;
            this._hasSpawnedFirstCollectible = true;
            // Only create collectible if it doesn't exist
            if (!this.collectible) {
              this.collectible = this.add
                .sprite(randomX, randomY, asset.sprite)
                .setScale(1 / 3)
                .setDepth(1);
              this.collectible.play(asset.anim);
            }
            return;
          } else {
            // Increase difficulty: as points increase, increase min distance
            let minDistance = MainScene.MIN_COLLECTIBLE_DISTANCE;
            if (typeof pointsRef !== "undefined" && pointsRef.current) {
              minDistance += Math.min(pointsRef.current * 20, 400); // up to +400px
            }
            let tries = 0;
            let validPosition = false;
            while (!validPosition && tries < 50) {
              // Use helper for readable bounds logic
              const { x: posX, y: posY } = getRandomCollectiblePosition({
                cameraLeft,
                cameraRight,
                cameraTop,
                cameraBottom,
                collectibleSize,
                minVisible: 0.25, // 25% visible
                overflow: 0.5,
              });
              randomX = posX;
              randomY = posY;
              if (this.chimp) {
                const distance = Phaser.Math.Distance.Between(
                  randomX,
                  randomY,
                  this.chimp.x,
                  this.chimp.y,
                );
                validPosition = distance >= minDistance;
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

          // --- Optimization state ---
          if (!this._lastPos)
            this._lastPos = { x: this.chimp.x, y: this.chimp.y };
          if (!this._lastAnim) this._lastAnim = "";
          if (!this._lastMoving) this._lastMoving = false;
          if (!this._collectibleCooldown) this._collectibleCooldown = 0;

          // --- Movement logic ---
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
            // Always allow touchPointer movement on mobile, regardless of joystick state
            if (this.touchPointer?.isDown) {
              const dist = Phaser.Math.Distance.Between(
                this.chimp.x,
                this.chimp.y,
                this.touchPointer.x,
                this.touchPointer.y,
              );
              const angle = Phaser.Math.Angle.Between(
                this.chimp.x,
                this.chimp.y,
                this.touchPointer.x,
                this.touchPointer.y,
              );
              // If not reached, move toward finger
              if (dist > 8) {
                dx = Math.cos(angle) * speed;
                dy = Math.sin(angle) * speed;
                this.lastTouchMove = {
                  dx: Math.cos(angle),
                  dy: Math.sin(angle),
                  speed,
                };
                this.touchReached = false;
                moving = true;
              } else if (this.lastTouchMove && !this.touchReached) {
                // Just reached, keep moving in last direction
                this.touchReached = true;
                dx = this.lastTouchMove.dx * speed;
                dy = this.lastTouchMove.dy * speed;
                moving = true;
              } else if (this.touchReached && this.lastTouchMove) {
                // Continue moving in last direction
                dx = this.lastTouchMove.dx * speed;
                dy = this.lastTouchMove.dy * speed;
                moving = true;
              }
            } else {
              this.touchReached = false;
              this.lastTouchMove = null;
            }
            // Joystick movement for mobile
            if (
              window.__JOYSTICK_DIR__ &&
              (window.__JOYSTICK_DIR__.dx !== 0 ||
                window.__JOYSTICK_DIR__.dy !== 0)
            ) {
              dx = window.__JOYSTICK_DIR__.dx * speed;
              dy = window.__JOYSTICK_DIR__.dy * speed;
              moving = true;
            }
          } else {
            // During countdown, check for any movement key or joystick to animate running
            let joystickActive =
              window.__JOYSTICK_DIR__ &&
              (window.__JOYSTICK_DIR__.dx !== 0 ||
                window.__JOYSTICK_DIR__.dy !== 0);
            const joystickDx =
              joystickActive && window.__JOYSTICK_DIR__
                ? window.__JOYSTICK_DIR__.dx
                : 0;
            if (
              this.cursors?.left.isDown ||
              this.wasd?.left.isDown ||
              this.cursors?.right.isDown ||
              this.wasd?.right.isDown ||
              this.cursors?.up.isDown ||
              this.wasd?.up.isDown ||
              this.cursors?.down.isDown ||
              this.wasd?.down.isDown ||
              joystickActive
            ) {
              moving = true;
              // Only update direction for left/right or joystick X
              if (
                this.cursors?.left.isDown ||
                this.wasd?.left.isDown ||
                (joystickActive && joystickDx < 0)
              ) {
                this.lastDirection = -1;
                this.chimp?.setFlipX(true);
              } else if (
                this.cursors?.right.isDown ||
                this.wasd?.right.isDown ||
                (joystickActive && joystickDx > 0)
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
          const posChanged = newX !== this.chimp.x || newY !== this.chimp.y;
          if (posChanged) {
            this.chimp.x = newX;
            this.chimp.y = newY;
          }

          // --- Camera optimization ---
          // Only update camera if player moved or zoom changed
          if (!this._lastCameraZoom)
            this._lastCameraZoom = this.cameras.main.zoom;
          const camera = this.cameras.main;
          const cameraZoomChanged = camera.zoom !== this._lastCameraZoom;
          if (posChanged || cameraZoomChanged) {
            const cameraWidth = camera.width / camera.zoom;
            const cameraHeight = camera.height / camera.zoom;
            const cameraMinX = x + cameraWidth / 2;
            const cameraMaxX = x + width - cameraWidth / 2;
            const cameraMinY = y + cameraHeight / 2;
            const cameraMaxY = y + height - cameraHeight / 2;
            const margin = 100;
            const playerScreenX = camera.getWorldPoint(this.chimp.x, 0).x;
            const playerScreenY = camera.getWorldPoint(0, this.chimp.y).y;
            const isNearScreenEdge =
              playerScreenX < margin ||
              playerScreenX > camera.width - margin ||
              playerScreenY < margin ||
              playerScreenY > camera.height - margin;
            if (camera.zoom < 1) {
              if (isNearScreenEdge) {
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
                camera.scrollX = Phaser.Math.Linear(
                  camera.scrollX,
                  targetX,
                  0.1,
                );
                camera.scrollY = Phaser.Math.Linear(
                  camera.scrollY,
                  targetY,
                  0.1,
                );
              } else {
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
              this._cameraFollowState.set(camera, false);
            } else {
              if (cameraMinX <= cameraMaxX && cameraMinY <= cameraMaxY) {
                if (!this._cameraFollowState.get(camera)) {
                  camera.startFollow(this.chimp, true);
                  this._cameraFollowState.set(camera, true);
                }
              } else {
                if (this._cameraFollowState.get(camera)) {
                  camera.stopFollow();
                  this._cameraFollowState.set(camera, false);
                }
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
            this._lastCameraZoom = camera.zoom;
          }

          // --- Animation optimization ---
          const animKey = moving
            ? this.currentAnimKeys.run
            : this.currentAnimKeys.rest;
          if (this._lastAnim !== animKey || this._lastMoving !== moving) {
            this.chimp.play(animKey, true);
            this._lastAnim = animKey;
            this._lastMoving = moving;
          }

          // Update direction based on movement
          if ((window as any).__GAME_STATUS__ !== "countdown" && dx !== 0) {
            this.lastDirection = dx > 0 ? 1 : -1;
            this.chimp.setFlipX(this.lastDirection === -1);
          }

          // --- Collectible collision optimization ---
          // Only allow collectible collision and point increment when running
          if ((window as any).__GAME_STATUS__ === "running") {
            if (this._collectibleCooldown > 0) {
              this._collectibleCooldown -= delta;
            }
            if (
              this.collectible &&
              this.chimp &&
              this._collectibleCooldown <= 0
            ) {
              const distance = Phaser.Math.Distance.Between(
                this.chimp.x,
                this.chimp.y,
                this.collectible.x,
                this.collectible.y,
              );
              const minDistance =
                (96 * 2 + this.collectible.width * this.collectible.scaleX) / 2;
              if (distance < minDistance) {
                this._collectibleCooldown = 300; // 300ms cooldown
                this.events.emit("collectibleCollected");
                const intensity = Math.min(1 + pointsRef.current * 0.1, 2);
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
                this.createBackground();
                this.spawnCollectible();
                this.loadChimp(this.nextChimpId);
              }
            }
          }
          // Store last position
          this._lastPos.x = this.chimp.x;
          this._lastPos.y = this.chimp.y;
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
        // Reset collectible spawn flag
        if (sceneRef.current) {
          sceneRef.current._hasSpawnedFirstCollectible = false;
        }
      }
      if (gameStatus === "countdown" && sceneRef.current) {
        // Only spawn the first collectible once per countdown
        sceneRef.current._hasSpawnedFirstCollectible = false;
        if (sceneRef.current.collectible) {
          sceneRef.current.collectible.destroy();
          sceneRef.current.collectible = null;
        }
        sceneRef.current.spawnCollectible(true);
      }
      if (gameStatus === "finished" && sceneRef.current) {
        // Clear collectible when game finishes
        if (sceneRef.current.collectible) {
          sceneRef.current.collectible.destroy();
          sceneRef.current.collectible = null;
        }
        // Reset collectible spawn flag
        sceneRef.current._hasSpawnedFirstCollectible = false;
      }
      if (gameStatus === "running" && sceneRef.current) {
        // Spawn collectible when game starts running, but only if one does not exist
        if (!sceneRef.current.collectible) {
          sceneRef.current.spawnCollectible();
        }
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

  // Joystick touch logic (always active, must be before any return)
  useEffect(() => {
    function handleTouchStartDoc(e: TouchEvent) {
      if (e.touches.length > 0) {
        // Always center joystick at screen center
        const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        setJoystickBasePos(center);
        setJoystickDragging(true);
        setJoystickPos({ x: 0, y: 0 });
      }
    }
    function handleTouchMoveDoc(e: TouchEvent) {
      if (!joystickDragging || !joystickBasePos) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const x = touch.clientX - joystickBasePos.x;
        const y = touch.clientY - joystickBasePos.y;
        // Clamp to radius
        const dist = Math.sqrt(x * x + y * y);
        let nx = x,
          ny = y;
        if (dist > joystickRadius) {
          nx = (x / dist) * joystickRadius;
          ny = (y / dist) * joystickRadius;
        }
        setJoystickPos({ x: nx, y: ny });
        // Normalize to [-1, 1]
        const dx = nx / joystickRadius;
        const dy = ny / joystickRadius;
        joystickDir.current = { dx, dy };
        (window as any).__JOYSTICK_DIR__ = { dx, dy };
      }
    }
    function handleTouchEndDoc() {
      setJoystickDragging(false);
      setJoystickBasePos(null);
      setJoystickPos({ x: 0, y: 0 });
      joystickDir.current = { dx: 0, dy: 0 };
      (window as any).__JOYSTICK_DIR__ = { dx: 0, dy: 0 };
    }
    document.addEventListener("touchstart", handleTouchStartDoc);
    document.addEventListener("touchmove", handleTouchMoveDoc);
    document.addEventListener("touchend", handleTouchEndDoc);
    document.addEventListener("touchcancel", handleTouchEndDoc);
    return () => {
      document.removeEventListener("touchstart", handleTouchStartDoc);
      document.removeEventListener("touchmove", handleTouchMoveDoc);
      document.removeEventListener("touchend", handleTouchEndDoc);
      document.removeEventListener("touchcancel", handleTouchEndDoc);
    };
  }, [joystickDragging, joystickBasePos]);

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
        {/* Always show START/timer HUD centered under title */}
        <div className="mt-4 flex flex-col items-center gap-2 pointer-events-auto">
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
          {/* Show countdown if in countdown state */}
          {gameStatus === "countdown" && (
            <ChimpCountdown countdownText={countdownText} />
          )}
          {/* Show score and share when finished */}
          {gameStatus === "finished" && (
            <ChimpScoreShare
              points={chimpPoints}
              setGameStatus={setGameStatus}
              setChimpPoints={setChimpPoints}
              setCountdownText={setCountdownText}
              setTimer={setTimer}
              countdownIntervalRef={countdownIntervalRef}
              sceneRef={sceneRef}
            />
          )}
          {/* Show SettingsContainer under START/timer HUD when toggled */}
          {showHud && (
            <SettingsContainer>
              <ChimpHudControls
                chimpId={chimpId}
                setChimpId={setChimpId}
                handleChimpChange={handleChimpChange}
                isZoomedOut={isZoomedOut}
                toggleZoom={toggleZoom}
                handleRandomChimp={handleRandomChimp}
                handleRandomBg={handleRandomBg}
                isDesktop={isDesktop}
                gameStatus={gameStatus}
                showFps={showFps}
                setShowFps={setShowFps}
                showJoystick={showJoystick}
                setShowJoystick={setShowJoystick}
                isMobile={isMobile}
              />
            </SettingsContainer>
          )}
        </div>
        {/* Desktop cog button: top right, only on desktop */}
        <div className="hidden sm:block fixed top-2 right-2 z-50 pointer-events-auto">
          <HudToggleButton
            open={showHud}
            onClick={() => setShowHud((v) => !v)}
          />
        </div>
        {/* Mobile cog button: top right, only on mobile */}
        <div className="sm:hidden fixed top-2 right-2 z-50 pointer-events-auto">
          <HudToggleButton
            open={showHud}
            onClick={() => setShowHud((v) => !v)}
          />
        </div>
      </div>
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
      <div
        id="phaser-container"
        className="fixed inset-0 w-full h-full pointer-events-auto"
      />

      {/* FPS Counter */}
      {showFps && (
        <div className="fixed bottom-2 left-2 z-50 text-white font-mono bg-black/60 px-2 py-1 rounded">
          FPS: {fps}
        </div>
      )}
      {/* Joystick UI only if enabled and mobile */}
      {showJoystick && isMobile && (
        <Joystick
          dragging={joystickDragging}
          pos={joystickPos}
          basePos={joystickBasePos}
          radius={joystickRadius}
        />
      )}
    </>
  );
}
