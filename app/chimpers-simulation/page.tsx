"use client";

import { useEffect, useRef, useState } from "react";

interface ChimpersSimulationScene extends Phaser.Scene {
  chimpers: ChimperSprite[];
  bananas: BananaSprite[];
  spawnChimper: (x?: number, y?: number, withEntryEffect?: boolean) => void;
  clearAllChimpers: () => void;
  bananasEaten: number;
  bananasEatenText: Phaser.GameObjects.Text | null;
  gameStarted: boolean;
  clickToStartText: Phaser.GameObjects.Text | null;
  titleText: Phaser.GameObjects.Text | null;
  audioContext: AudioContext | null;
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
  targetBanana: BananaSprite | null;
  timeOnBanana: number;
}

interface BananaSprite extends Phaser.GameObjects.Text {
  id: number;
  timeWithChimper: number;
  chimperOnBanana: ChimperSprite | null;
}

export default function ChimpersSimulationPage() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ChimpersSimulationScene | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const container = document.getElementById("simulation-container");
    if (!container || gameRef.current) return;

    // Dynamically import Phaser
    import("phaser").then((Phaser) => {
      class ChimpersSimulationScene extends Phaser.Scene {
        chimpers: ChimperSprite[] = [];
        bananas: BananaSprite[] = [];
        nextChimperId = 1;
        nextBananaId = 1;
        loadedChimpers = new Set<number>();
        bg: Phaser.GameObjects.TileSprite | null = null;
        bananasEaten = 0;
        bananasEatenText: Phaser.GameObjects.Text | null = null;
        gameStarted = false;
        clickToStartText: Phaser.GameObjects.Text | null = null;
        titleText: Phaser.GameObjects.Text | null = null;
        audioContext: AudioContext | null = null;

        constructor() {
          super({ key: "ChimpersSimulationScene" });
        }

        preload() {
          // Load background tiles
          this.load.spritesheet("bgTiles", "https://i.imgur.com/UIjW1B8.png", {
            frameWidth: 64,
            frameHeight: 64,
          });

          // Initialize audio context for sounds
          this.audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();

          // Preload a few random chimpers
          for (let i = 0; i < 30; i++) {
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

        // Create a beep sound using Web Audio API
        playChimpSound(
          frequency: number = 440,
          duration: number = 200,
          volume: number = 0.1,
        ) {
          if (!this.audioContext) return;

          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = "sine";

          gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            volume,
            this.audioContext.currentTime + 0.01,
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + duration / 1000,
          );

          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + duration / 1000);
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

          // Create UI elements
          this.createUI();

          // Handle clicks to start game
          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!this.gameStarted) {
              this.startGame();
            }
          });

          // Spawn bananas periodically
          this.time.addEvent({
            delay: 5000, // Every 5 seconds
            callback: () => {
              if (this.gameStarted) {
                this.spawnBanana();
              }
            },
            loop: true,
          });

          // Update banana counter periodically
          this.time.addEvent({
            delay: 100,
            callback: () => {
              if (this.bananasEatenText) {
                this.bananasEatenText.setText(
                  `🍌 Bananas Eaten: ${this.bananasEaten}`,
                );
              }
            },
            loop: true,
          });
        }

        createBackground() {
          // Use different background each time
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

        createUI() {
          // Title overlay
          this.titleText = this.add
            .text(this.scale.width / 2, 60, "!CHIMP Simulation", {
              fontSize: "48px",
              color: "#ffffff",
              fontStyle: "bold",
              stroke: "#000000",
              strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(1000)
            .setShadow(2, 2, "#000000", 2, true, true);

          // Click to start message
          this.clickToStartText = this.add
            .text(
              this.scale.width / 2,
              this.scale.height / 2,
              "Click the screen to start!",
              {
                fontSize: "32px",
                color: "#ffff00",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 3,
              },
            )
            .setOrigin(0.5)
            .setDepth(1000)
            .setShadow(2, 2, "#000000", 2, true, true);

          // Bananas eaten counter (initially hidden)
          this.bananasEatenText = this.add
            .text(
              this.scale.width / 2,
              this.scale.height - 40,
              "🍌 Bananas Eaten: 0",
              {
                fontSize: "24px",
                color: "#ffffff",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 3,
              },
            )
            .setOrigin(0.5)
            .setDepth(1000)
            .setShadow(2, 2, "#000000", 2, true, true)
            .setVisible(false);
        }

        startGame() {
          this.gameStarted = true;

          // Hide click to start message
          if (this.clickToStartText) {
            this.clickToStartText.setVisible(false);
          }

          // Show bananas counter
          if (this.bananasEatenText) {
            this.bananasEatenText.setVisible(true);
          }

          // Play chimp sound
          this.playChimpSound(600, 300, 0.2);

          // Spawn initial chimpers with entry effects
          for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 500, () => {
              this.spawnChimper(undefined, undefined, true);
            });
          }

          // Spawn initial bananas
          for (let i = 0; i < 3; i++) {
            this.time.delayedCall(1000 + i * 1000, () => {
              this.spawnBanana();
            });
          }
        }

        spawnChimper(x?: number, y?: number, withEntryEffect: boolean = false) {
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
              this.createChimperSprite(
                key,
                randomChimperId,
                x,
                y,
                withEntryEffect,
              );
            });
            this.load.start();
          } else {
            this.createChimperSprite(
              key,
              randomChimperId,
              x,
              y,
              withEntryEffect,
            );
          }
        }

        createChimperSprite(
          key: string,
          chimperId: number,
          x?: number,
          y?: number,
          withEntryEffect: boolean = false,
        ) {
          let spawnX: number, spawnY: number;

          if (withEntryEffect) {
            // Spawn from top of screen for entry effect
            spawnX = Phaser.Math.Between(100, this.scale.width - 100);
            spawnY = -100; // Start above screen
          } else {
            spawnX = x ?? Phaser.Math.Between(100, this.scale.width - 100);
            spawnY = y ?? Phaser.Math.Between(100, this.scale.height - 100);
          }

          const chimper = this.add.sprite(
            spawnX,
            spawnY,
            key,
            0,
          ) as ChimperSprite;
          chimper.setScale(1.5);
          chimper.setDepth(10);

          // Initialize chimper properties
          chimper.id = this.nextChimperId++;
          chimper.chimperId = chimperId;
          chimper.homeX = spawnX;
          chimper.homeY = withEntryEffect
            ? Phaser.Math.Between(100, this.scale.height - 100)
            : spawnY;
          chimper.targetX = chimper.homeX;
          chimper.targetY = chimper.homeY;
          chimper.speed = Phaser.Math.Between(30, 80);
          chimper.restTime = 0;
          chimper.isResting = false;
          chimper.restDuration = 0;
          chimper.wanderRadius = Phaser.Math.Between(200, 400);
          chimper.lastDirectionChange = 0;
          chimper.energy = 100;
          chimper.maxEnergy = 100;
          chimper.targetBanana = null;
          chimper.timeOnBanana = 0;

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

          // Entry effect: falling and spinning
          if (withEntryEffect) {
            // Spin while falling
            this.tweens.add({
              targets: chimper,
              rotation: Math.PI * 4, // 2 full rotations
              duration: 1500,
              ease: "Power2",
            });

            // Fall down
            this.tweens.add({
              targets: chimper,
              y: chimper.homeY,
              duration: 1500,
              ease: "Bounce.out",
              onComplete: () => {
                // Set initial target after landing
                this.setNewTarget(chimper);
              },
            });
          } else {
            // Set initial target immediately
            this.setNewTarget(chimper);
          }
        }

        spawnBanana() {
          const bananaX = Phaser.Math.Between(100, this.scale.width - 100);
          const bananaY = Phaser.Math.Between(100, this.scale.height - 100);

          // Create banana using text (emoji)
          const banana = this.add.text(bananaX, bananaY, "🍌", {
            fontSize: "32px",
          }) as any as BananaSprite;

          banana.setOrigin(0.5);
          banana.setDepth(5);

          // Initialize banana properties
          banana.id = this.nextBananaId++;
          banana.timeWithChimper = 0;
          banana.chimperOnBanana = null;

          this.bananas.push(banana);

          // Add a little bounce animation
          this.tweens.add({
            targets: banana,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            yoyo: true,
            ease: "Power2",
          });
        }

        setNewTarget(chimper: ChimperSprite) {
          // Check if there are bananas and chimper should go after one
          if (this.bananas.length > 0 && Math.random() < 0.7) {
            // Find closest banana
            let closestBanana: BananaSprite | null = null;
            let closestDistance = Infinity;

            this.bananas.forEach((banana) => {
              const distance = Phaser.Math.Distance.Between(
                chimper.x,
                chimper.y,
                banana.x,
                banana.y,
              );
              if (distance < closestDistance) {
                closestDistance = distance;
                closestBanana = banana;
              }
            });

            if (closestBanana) {
              chimper.targetBanana = closestBanana;
              chimper.targetX = closestBanana.x;
              chimper.targetY = closestBanana.y;
              return;
            }
          }

          // Default behavior if no banana target
          chimper.targetBanana = null;
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
          if (!this.gameStarted) return;

          // Update chimpers
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

            if (distance < 20) {
              // Reached target
              if (chimper.targetBanana) {
                // Check if the banana still exists
                const bananaExists = this.bananas.includes(
                  chimper.targetBanana,
                );
                if (bananaExists) {
                  // Start eating the banana
                  chimper.targetBanana.chimperOnBanana = chimper;
                  chimper.timeOnBanana = 0;
                }
              }
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

          // Update bananas
          this.bananas.forEach((banana, index) => {
            if (banana.chimperOnBanana) {
              // Check if chimper is still close to banana
              const distance = Phaser.Math.Distance.Between(
                banana.chimperOnBanana.x,
                banana.chimperOnBanana.y,
                banana.x,
                banana.y,
              );

              if (distance < 30) {
                banana.timeWithChimper += delta;
                banana.chimperOnBanana.timeOnBanana += delta;

                // If chimper has been on banana for 3 seconds, eat it
                if (banana.timeWithChimper >= 3000) {
                  this.bananasEaten++;

                  // Play eating sound
                  this.playChimpSound(800, 150, 0.15);

                  // Remove banana
                  banana.destroy();
                  this.bananas.splice(index, 1);

                  // Reset chimper's banana target
                  banana.chimperOnBanana.targetBanana = null;
                  banana.chimperOnBanana.timeOnBanana = 0;
                }
              } else {
                // Chimper moved away
                banana.chimperOnBanana.timeOnBanana = 0;
                banana.chimperOnBanana = null;
                banana.timeWithChimper = 0;
              }
            }
          });
        }

        clearAllChimpers() {
          this.chimpers.forEach((chimper) => chimper.destroy());
          this.chimpers = [];
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#87CEEB",
        parent: container,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: "100%",
          height: "100%",
        },
        scene: ChimpersSimulationScene,
      });

      gameRef.current = game;

      game.events.on("ready", () => {
        const scene = game.scene.getScene(
          "ChimpersSimulationScene",
        ) as ChimpersSimulationScene;
        if (scene) {
          sceneRef.current = scene;
        }
      });

      // Handle resize
      const resizeHandler = () => {
        game.scale.resize(window.innerWidth, window.innerHeight);

        // Update UI positions
        if (sceneRef.current) {
          const scene = sceneRef.current;
          if (scene.titleText) {
            scene.titleText.setPosition(window.innerWidth / 2, 60);
          }
          if (scene.clickToStartText) {
            scene.clickToStartText.setPosition(
              window.innerWidth / 2,
              window.innerHeight / 2,
            );
          }
          if (scene.bananasEatenText) {
            scene.bananasEatenText.setPosition(
              window.innerWidth / 2,
              window.innerHeight - 40,
            );
          }
        }
      };

      window.addEventListener("resize", resizeHandler);

      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          sceneRef.current = null;
        }
        window.removeEventListener("resize", resizeHandler);
      };
    });
  }, [mounted]);

  if (!mounted) return null;

  return (
    <main className="w-screen h-screen overflow-hidden">
      {/* Full Screen Simulation Container */}
      <div
        id="simulation-container"
        className="w-full h-full cursor-pointer"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
      />
    </main>
  );
}
