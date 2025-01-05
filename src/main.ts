import "./style.css";
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";
import { Audio, AudioLoader } from "three";
import { SeagullSystem } from "./utils/decorations/seagullSystem";
import { WaterSplashSystem } from "./utils/effects/splashSystem";
import { SkySystem } from "./utils/world/skySystem";
import { updateCompass } from "./utils/ui/compassSystem";
import { SpeedometerSystem } from "./utils/ui/speedometerSystem";
import { OceanSystem } from "./utils/world/oceanSystem";
import { MinimapSystem } from "./utils/ui/minimapSystem";
import { EnemyBoatSystem } from "./utils/enemies/enemyBoatSystem";
import { ObstacleSystem } from "./utils/enemies/obstacleSystem";
import { StaticObjectSystem } from "./utils/decorations/staticObjectSystem";
import { SharkSystem } from "./utils/enemies/sharkSystem";
import { WaterSpoutSystem } from "./utils/effects/waterSpoutSystem";
import { CheckpointSystem } from "./utils/progression/checkpointSystem";
import { HealthSystem } from "./utils/ui/healthSystem";
import { ReticleSystem } from "./utils/ui/reticleSystem";
import { BombSystem } from "./utils/weapons/bombSystem";
import { BulletSystem } from "./utils/weapons/bulletSystem";
import { loadingManager } from "./utils/managers/loadingManager";
import { ScoreSystem } from "./utils/progression/scoringSystem";
import { SubmarineSystem } from "./utils/enemies/submarineSystem";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  1,
  20000
);
camera.position.set(30, 30, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.495;
controls.target.set(0, 10, 0);
controls.minDistance = 40.0;
controls.maxDistance = 200.0;
controls.update();

const audioListener = new THREE.AudioListener();
camera.add(audioListener);

let stats: Stats;
let showStats = false;
let previousAnimationFrame: number | null = null;
let isGameOver = false;
let isPaused = false;
let userPaused = false;
let isAnimating = false;

const loader = new GLTFLoader(loadingManager);
export let boat: THREE.Object3D;
let targetTilt = 0;
let currentTilt = 0;
const MAX_TILT = 0.3;
const TILT_SPEED = 2;
const TILT_RECOVERY_SPEED = 1.5;
let currentSpeed = 0;
const MAX_SPEED = 5;
const ACCELERATION = 2;
const DECELERATION = 1.5;
const MAX_PITCH_TILT = 0.2; // Maximum forward/backward tilt angle
const PITCH_TILT_SPEED = 3; // How quickly the boat tilts
let targetPitchTilt = 0;
let currentPitchTilt = 0;
let mouseX = 0;
let mouseY = 0;
const MOUSE_SENSITIVITY = 0.002; // Turning speed
let turret: THREE.Object3D;
let isMouseDown = false;
let engineSound: Audio;
let engineIdleSound: Audio;
let waterSplashSound: Audio;
let scoreSystem: ScoreSystem;
scoreSystem = new ScoreSystem(scene);

const reticleSystem = new ReticleSystem();
reticleSystem.toggleVisibility(false);
const speedometer = new SpeedometerSystem(MAX_SPEED);
const minimapSystem = new MinimapSystem(scene);
const oceanSystem = new OceanSystem(scene, audioListener);
const skySystem = new SkySystem(scene, renderer, oceanSystem.water);
const staticObjectSystem = new StaticObjectSystem(scene);
const seagullSystem = new SeagullSystem(scene, audioListener);
const waterSplashSystem = new WaterSplashSystem(scene);
let obstacleSystem: ObstacleSystem;
let bombSystem: BombSystem;
let sharkSystem: SharkSystem;
let waterSpoutSystem: WaterSpoutSystem;
let checkpointSystem: CheckpointSystem;
let enemyBoatSystem: EnemyBoatSystem;
let submarineSystem: SubmarineSystem;
export let healthSystem: HealthSystem;
let bulletSystem: BulletSystem;

const keysPressed: { [key: string]: boolean } = {};

export function startGame() {
  if (previousAnimationFrame !== null) {
    cancelAnimationFrame(previousAnimationFrame);
    previousAnimationFrame = null;
  }

  setupBoatSounds();
  lastTime = performance.now();
  isAnimating = true;
  isPaused = false;
  animate(performance.now());
  setupEventListeners();

  reticleSystem.toggleVisibility(true);
}

loader.load("/models/boat/scene.gltf", (gltf) => {
  boat = gltf.scene;
  boat.scale.set(10, 10, 10);
  boat.position.set(100, 5, 0);
  boat.rotation.set(0, Math.PI, 0);
  boat.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      node.castShadow = true;
    }
  });
  scene.add(boat);
  createTurret();
  healthSystem = new HealthSystem(100, () => {
    isPaused = true;
    handleGameOver();
  });
  enemyBoatSystem = new EnemyBoatSystem(scene, waterSplashSystem, boat, camera);
  submarineSystem = new SubmarineSystem(scene, waterSplashSystem, boat, camera);
  obstacleSystem = new ObstacleSystem(scene, scoreSystem, camera);
  sharkSystem = new SharkSystem(scene, boat, scoreSystem);
  bombSystem = new BombSystem(
    scene,
    enemyBoatSystem,
    obstacleSystem,
    sharkSystem,
    camera
  );
  waterSpoutSystem = new WaterSpoutSystem(scene, camera, boat);
  checkpointSystem = new CheckpointSystem(scene, camera, () => {
    isPaused = true;
    handleGameOver("time");
  });
  bulletSystem = new BulletSystem(scene, oceanSystem.water.position.y, camera);
});

function createTurret() {
  const turretLoader = new GLTFLoader(loadingManager);
  turretLoader.load("/models/turret/scene.gltf", (gltf) => {
    turret = gltf.scene;
    turret.scale.set(0.1, 0.1, 0.1);
    turret.rotation.set(0, Math.PI / 2, 0);
    turret.position.set(0, 0, -3);

    turret.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
      }
    });

    boat.add(turret);
  });
  if (turret) {
    mouseX = -turret.rotation.y;
    mouseY = turret.rotation.x;
  }
}

function setupBoatSounds() {
  cleanupAudio();

  engineSound = new Audio(audioListener);
  engineIdleSound = new Audio(audioListener);
  waterSplashSound = new Audio(audioListener);

  const audioLoader = new AudioLoader();
  audioLoader.load("/audio/engine-move.mp3", function (buffer) {
    engineSound.setBuffer(buffer);
    engineSound.setLoop(true);
    engineSound.setVolume(0);
    engineSound.play();
  });

  audioLoader.load("/audio/engine-idle.mp3", function (buffer) {
    engineIdleSound.setBuffer(buffer);
    engineIdleSound.setLoop(true);
    engineIdleSound.setVolume(0.3);
    engineIdleSound.play();
  });

  audioLoader.load("/sounds/water-splash.mp3", function (buffer) {
    waterSplashSound.setBuffer(buffer);
    waterSplashSound.setLoop(false);
    waterSplashSound.setVolume(0.4);
  });
}

function updateBoatSounds(deltaTime: number) {
  if (!boat || isPaused) return;

  if (engineSound && engineSound.isPlaying) {
    const targetVolume = Math.abs(currentSpeed) / MAX_SPEED;
    const currentVolume = engineSound.getVolume();
    const newVolume = THREE.MathUtils.lerp(
      currentVolume,
      targetVolume * 0.5,
      deltaTime * 2
    );
    engineSound.setVolume(newVolume);
  }

  if (engineIdleSound && engineIdleSound.isPlaying) {
    const targetVolume = 1 - Math.abs(currentSpeed) / MAX_SPEED;
    const currentVolume = engineIdleSound.getVolume();
    const newVolume = THREE.MathUtils.lerp(
      currentVolume,
      targetVolume * 0.3,
      deltaTime * 2
    );
    engineIdleSound.setVolume(newVolume);
  }
}

function cleanupAudio() {
  const sounds = [engineSound, engineIdleSound, waterSplashSound];

  sounds.forEach((sound) => {
    if (sound?.isPlaying) {
      sound.stop();
    }
    try {
      sound?.disconnect();
    } catch (e) {}
  });
}

let lastTime = 0;
const MAX_DELTA_TIME = 0.1;

function animate(time: number) {
  if (!isAnimating || isPaused) {
    previousAnimationFrame = null;
    return;
  }

  if (stats && showStats) {
    stats.begin();
  }

  const maxFrameTime = 1000 / 30;
  let deltaTime = Math.min(time - lastTime, maxFrameTime) / 1000;
  deltaTime = Math.min(deltaTime, MAX_DELTA_TIME);

  lastTime = time;

  updateGameState(deltaTime);
  renderer.render(scene, camera);

  if (stats && showStats) {
    stats.end();
  }

  previousAnimationFrame = requestAnimationFrame(animate);
}

initStats();

function updateGameState(deltaTime: number) {
  if (scoreSystem) {
    scoreSystem.update(deltaTime);
  }

  if (bulletSystem) {
    bulletSystem.update(deltaTime, obstacleSystem, enemyBoatSystem);
  }

  if (bombSystem) {
    bombSystem.update(deltaTime, oceanSystem.water.position.y);
  }

  if (healthSystem) {
    healthSystem.update(deltaTime);
  }

  if (sharkSystem) {
    sharkSystem.update(deltaTime, bulletSystem.getBullets());
  }

  if (waterSpoutSystem) {
    waterSpoutSystem.update(deltaTime);
  }

  if (isMouseDown && !isPaused && document.pointerLockElement) {
    bulletSystem.createBullet(turret);
  }

  updateBoatSounds(deltaTime);
  if (enemyBoatSystem) {
    const { collisionOccurred, currentSpeed: newSpeed } =
      enemyBoatSystem.update(deltaTime);
    if (collisionOccurred) {
      currentSpeed = newSpeed;
      camera.position.y += Math.random() * 2 - 1;
    }
  }

  if (submarineSystem) {
    submarineSystem.update(deltaTime);
  }

  seagullSystem.update(deltaTime);

  if (boat && turret) {
    const currentRotationY = turret.rotation.y;
    const currentRotationX = turret.rotation.x;

    const targetRotationY = -mouseX;
    const targetRotationX = mouseY;

    turret.rotation.y += (targetRotationY - currentRotationY) * 0.1;
    turret.rotation.x += (targetRotationX - currentRotationX) * 0.1;
  }

  if (boat) {
    if (checkpointSystem) {
      checkpointSystem.update(boat.position, deltaTime, scoreSystem);
    }

    obstacleSystem.update(deltaTime, boat);

    const { collided, newSpeed } = obstacleSystem.checkCollision(boat);
    if (collided) {
      currentSpeed = newSpeed;
    }

    const { hasCollision, resultSpeed } = staticObjectSystem.checkCollisions(
      boat,
      currentSpeed
    );
    if (hasCollision) {
      currentSpeed = resultSpeed;
    }

    minimapSystem.update(
      boat.position,
      obstacleSystem.getObstacles(),
      sharkSystem.getSharks()
    );

    speedometer.update(currentSpeed);
    updateCompass(checkpointSystem);
    oceanSystem.updateWaterPosition(boat.position);

    const time = performance.now() * 0.001;
    const bobbingSpeed = 1.5; // Adjust this value to change bobbing speed
    const bobbingAmount = 0.015; // Adjust this value to change bobbing amount
    boat.position.y = 5 + Math.sin(time * bobbingSpeed) * 0.5;
    boat.rotation.z = Math.sin(time * bobbingSpeed * 0.5) * bobbingAmount;
    boat.rotation.x = Math.sin(time * bobbingSpeed * 0.7) * bobbingAmount * 0.5;

    const isMoving =
      keysPressed["w"] ||
      keysPressed["ArrowUp"] ||
      keysPressed["s"] ||
      keysPressed["ArrowDown"];

    if (isMoving) {
      const boatDirection = new THREE.Vector3(
        Math.sin(boat.rotation.y),
        0,
        Math.cos(boat.rotation.y)
      ).normalize();

      waterSplashSystem.createSplashEffect(boat.position, boatDirection);

      if (
        waterSplashSound &&
        !waterSplashSound.isPlaying &&
        Math.abs(currentSpeed) > MAX_SPEED * 0.5
      ) {
        waterSplashSound.play();
      }
    }

    waterSplashSystem.update(deltaTime);

    const rotationSpeed = 0.03;

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), boat.rotation.y);

    if (keysPressed["w"] || keysPressed["ArrowUp"]) {
      currentSpeed = Math.min(
        currentSpeed + ACCELERATION * deltaTime,
        MAX_SPEED
      );

      const rotationFactor = Math.cos(boat.rotation.y);
      targetPitchTilt =
        -MAX_PITCH_TILT * (currentSpeed / MAX_SPEED) * rotationFactor;
    } else if (keysPressed["s"] || keysPressed["ArrowDown"]) {
      currentSpeed = Math.max(
        currentSpeed - ACCELERATION * deltaTime,
        -MAX_SPEED
      );
      const rotationFactor = Math.cos(boat.rotation.y);
      targetPitchTilt =
        MAX_PITCH_TILT * (currentSpeed / MAX_SPEED) * rotationFactor;
    } else {
      if (Math.abs(currentSpeed) < DECELERATION * deltaTime) {
        currentSpeed = 0;
        targetPitchTilt = 0;
      } else if (currentSpeed > 0) {
        currentSpeed -= DECELERATION * deltaTime;
        const rotationFactor = Math.cos(boat.rotation.y);
        targetPitchTilt =
          -MAX_PITCH_TILT * (currentSpeed / MAX_SPEED) * rotationFactor;
      } else if (currentSpeed < 0) {
        currentSpeed += DECELERATION * deltaTime;
        const rotationFactor = Math.cos(boat.rotation.y);
        targetPitchTilt =
          MAX_PITCH_TILT * (currentSpeed / MAX_SPEED) * rotationFactor;
      }
    }

    currentPitchTilt +=
      (targetPitchTilt - currentPitchTilt) * deltaTime * PITCH_TILT_SPEED;
    targetPitchTilt *= 0.95;

    boat.position.x += forward.x * currentSpeed;
    boat.position.z += forward.z * currentSpeed;

    if (keysPressed["a"] || keysPressed["ArrowLeft"]) {
      boat.rotation.y += rotationSpeed;
      targetTilt = -MAX_TILT;
    } else if (keysPressed["d"] || keysPressed["ArrowRight"]) {
      boat.rotation.y -= rotationSpeed;
      targetTilt = MAX_TILT;
    } else {
      targetTilt = 0;
    }

    const tiltSpeed = targetTilt === 0 ? TILT_RECOVERY_SPEED : TILT_SPEED;
    currentTilt += (targetTilt - currentTilt) * deltaTime * tiltSpeed;

    if (
      !keysPressed["a"] &&
      !keysPressed["ArrowLeft"] &&
      !keysPressed["d"] &&
      !keysPressed["ArrowRight"]
    ) {
      currentTilt *= 0.95;
    }

    boat.rotation.z = currentTilt;

    const turnVelocity =
      keysPressed["a"] || keysPressed["ArrowLeft"]
        ? rotationSpeed
        : keysPressed["d"] || keysPressed["ArrowRight"]
        ? -rotationSpeed
        : 0;

    boat.rotation.x =
      Math.sin(time * bobbingSpeed * 0.7) * bobbingAmount * 0.5 -
      turnVelocity * 0.5 +
      currentPitchTilt;

    const cameraHeight = 40;
    const cameraDistance = 100;
    const lookAheadDistance = 30; // How far ahead to look
    const smoothFactor = 0.1; // Camera smoothing (lower = smoother)

    const boatDirection = new THREE.Vector3(
      Math.sin(boat.rotation.y),
      0,
      Math.cos(boat.rotation.y)
    ).normalize();

    const idealOffset = new THREE.Vector3(
      boat.position.x - boatDirection.x * cameraDistance,
      boat.position.y + cameraHeight,
      boat.position.z - boatDirection.z * cameraDistance
    );

    camera.position.lerp(idealOffset, smoothFactor);

    const lookAtPosition = new THREE.Vector3(
      boat.position.x + boatDirection.x * lookAheadDistance,
      boat.position.y + 10,
      boat.position.z + boatDirection.z * lookAheadDistance
    );

    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);

    const targetLookAt = lookAtPosition
      .clone()
      .sub(camera.position)
      .normalize();
    const smoothedDirection = new THREE.Vector3().copy(currentLookAt);
    smoothedDirection.lerp(targetLookAt, smoothFactor);

    camera.lookAt(
      camera.position.clone().add(smoothedDirection.multiplyScalar(100))
    );

    controls.enabled = false;
  }

  oceanSystem.update();
  skySystem.update(camera);
}

function togglePauseUI(isPaused: boolean) {
  const pauseOverlay = document.getElementById("pause-overlay");
  const gameCanvas = renderer.domElement;

  if (pauseOverlay) {
    if (isPaused) {
      pauseOverlay.classList.remove("hidden");
      reticleSystem.toggleVisibility(false);
      gameCanvas.style.cursor = "auto";
      setupPauseMenuListeners();
    } else {
      pauseOverlay.classList.add("hidden");
      reticleSystem.toggleVisibility(true);
      gameCanvas.style.cursor = "none";
      removePauseMenuListeners();
    }
  }
}

const pauseMenuHandlers = {
  controls: () => {
    const controlsPanel = document.getElementById("controls-panel");
    const settingsPanel = document.getElementById("settings-panel");
    controlsPanel?.classList.remove("hidden");
    settingsPanel?.classList.add("hidden");
  },
  controlsBack: () => {
    const controlsPanel = document.getElementById("controls-panel");
    controlsPanel?.classList.add("hidden");
  },
  settings: () => {
    const settingsPanel = document.getElementById("settings-panel");
    const controlsPanel = document.getElementById("controls-panel");
    settingsPanel?.classList.remove("hidden");
    controlsPanel?.classList.add("hidden");
  },
  settingsBack: () => {
    const settingsPanel = document.getElementById("settings-panel");
    settingsPanel?.classList.add("hidden");
  },
};

function setupPauseMenuListeners() {
  const resumeButton = document.getElementById("resume-button");
  const controlsButton = document.getElementById("controls-button");
  const settingsButton = document.getElementById("settings-button");
  const controlsBackButton = document.getElementById("controls-back");
  const settingsBackButton = document.getElementById("settings-back");
  const restartButton = document.getElementById("restart-button");
  const quitButton = document.getElementById("quit-button");
  const statsToggle = document.getElementById(
    "stats-toggle"
  ) as HTMLInputElement;

  if (resumeButton) {
    resumeButton.addEventListener("click", handleResume);
  }
  if (controlsButton) {
    controlsButton.addEventListener("click", pauseMenuHandlers.controls);
  }
  if (settingsButton) {
    settingsButton.addEventListener("click", pauseMenuHandlers.settings);
  }
  if (controlsBackButton) {
    controlsBackButton.addEventListener(
      "click",
      pauseMenuHandlers.controlsBack
    );
  }
  if (settingsBackButton) {
    settingsBackButton.addEventListener(
      "click",
      pauseMenuHandlers.settingsBack
    );
  }
  if (restartButton) {
    restartButton.addEventListener("click", handleRestart);
  }
  if (quitButton) {
    quitButton.addEventListener("click", handleQuit);
  }
  if (statsToggle) {
    statsToggle.checked = showStats;
    statsToggle.addEventListener("change", (e) => {
      showStats = (e.target as HTMLInputElement).checked;
      const container = document.getElementById("stats-container");
      if (container) {
        container.style.display = showStats ? "block" : "none";
      }
    });
  }
}

function removePauseMenuListeners() {
  const resumeButton = document.getElementById("resume-button");
  const controlsButton = document.getElementById("controls-button");
  const settingsButton = document.getElementById("settings-button");
  const controlsBackButton = document.getElementById("controls-back");
  const settingsBackButton = document.getElementById("settings-back");
  const restartButton = document.getElementById("restart-button");
  const quitButton = document.getElementById("quit-button");

  if (resumeButton) {
    resumeButton.removeEventListener("click", handleResume);
  }
  if (controlsButton) {
    controlsButton.removeEventListener("click", pauseMenuHandlers.controls);
  }
  if (settingsButton) {
    settingsButton.removeEventListener("click", pauseMenuHandlers.settings);
  }
  if (controlsBackButton) {
    controlsBackButton.removeEventListener(
      "click",
      pauseMenuHandlers.controlsBack
    );
  }
  if (settingsBackButton) {
    settingsBackButton.removeEventListener(
      "click",
      pauseMenuHandlers.settingsBack
    );
  }
  if (restartButton) {
    restartButton.removeEventListener("click", handleRestart);
  }
  if (quitButton) {
    quitButton.removeEventListener("click", handleQuit);
  }
}

function handleResume() {
  if (isPaused) {
    userPaused = false;
    isPaused = false;
    isAnimating = true;
    lastTime = performance.now();
    previousAnimationFrame = requestAnimationFrame(animate);
    resumeMainAudio();
    togglePauseUI(false);

    setTimeout(() => {
      renderer.domElement.requestPointerLock();
      reticleSystem.centerReticle();
    }, 100);
  }
}

function handleRestart() {
  window.location.reload();
}

function handleQuit() {
  if (confirm("Are you sure you want to quit?")) {
    window.close();
  }
}

function pauseAllAudio() {
  const audioSources = [engineSound, engineIdleSound, waterSplashSound];
  audioSources.forEach((sound) => {
    if (sound?.isPlaying) sound.pause();
  });
}

function resumeMainAudio() {
  if (engineSound) engineSound.play();
  if (engineIdleSound) engineIdleSound.play();
}

function handleGamePause() {
  isAnimating = false;
  isPaused = true;

  if (previousAnimationFrame !== null) {
    cancelAnimationFrame(previousAnimationFrame);
    previousAnimationFrame = null;
  }

  pauseAllAudio();
  togglePauseUI(true);
}

function handleGameResume() {
  if (!isPaused) return;

  isAnimating = true;
  isPaused = false;
  lastTime = performance.now();
  previousAnimationFrame = requestAnimationFrame(animate);
  resumeMainAudio();
  togglePauseUI(false);

  document.exitPointerLock();
}

function togglePause() {
  if (isGameOver) {
    return;
  }

  userPaused = !userPaused;
  isPaused = !isPaused;

  if (isPaused) {
    handleGamePause();
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  } else {
    handleGameResume();
    renderer.domElement.requestPointerLock();
    reticleSystem.centerReticle();
  }
}

function setupEventListeners() {
  window.addEventListener("keydown", (event) => {
    keysPressed[event.key] = true;
    if (event.key.toLowerCase() === "p") {
      togglePause();
    }
    if (event.key === " " && turret) {
      bombSystem.createBomb(turret);
    }
  });

  window.addEventListener("keydown", (event) => {
    keysPressed[event.key] = true;
  });

  window.addEventListener("keyup", (event) => {
    keysPressed[event.key] = false;
  });

  document.addEventListener("mousedown", () => {
    if (document.pointerLockElement) {
      isMouseDown = true;
    }
  });

  document.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  document.addEventListener("click", () => {
    if (audioListener.context.state === "suspended") {
      audioListener.context.resume();
    }
    oceanSystem.playOceanSound();
  });

  document.addEventListener(
    "pointerlockchange",
    () => {
      if (!document.pointerLockElement && !isPaused) {
        renderer.domElement.requestPointerLock();
      }
    },
    false
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      handleGamePause();
    } else if (!userPaused) {
      handleGameResume();
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement) {
      mouseX += event.movementX * MOUSE_SENSITIVITY;
      mouseY += event.movementY * MOUSE_SENSITIVITY;

      mouseY = Math.max(Math.min(mouseY, Math.PI / 3), -Math.PI / 3);

      reticleSystem.updatePosition(event.movementX, event.movementY);

      if (turret) {
        turret.rotation.y = -mouseX;
        turret.rotation.x = mouseY;
      }
    }
  });

  renderer.domElement.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
  });
}

function handleGameOver(reason = "default") {
  isGameOver = true;
  if (healthSystem) {
    healthSystem.reset();
  }

  currentSpeed = 0;
  targetTilt = 0;
  currentTilt = 0;
  mouseX = 0;
  mouseY = 0;

  cleanup();

  reticleSystem.toggleVisibility(false);
  document.exitPointerLock();
  const gameOverOverlay = document.getElementById("game-over-overlay")!;
  const finalScoreElement = document.getElementById("final-score")!;
  const playerRankElement = document.getElementById("player-rank")!;

  finalScoreElement.textContent = scoreSystem.getScore().toString();
  playerRankElement.textContent = scoreSystem.getRank(scoreSystem.getScore());

  const gameOverText = document.getElementById("game-over-text");
  if (gameOverText) {
    if (reason === "time") {
      gameOverText.innerText = "Time's Up";
    } else {
      gameOverText.innerText = "Mission Failed";
    }
  }

  gameOverOverlay.classList.remove("hidden");
}

function initStats() {
  stats = new Stats();
  const container = document.createElement("div");
  container.id = "stats-container";
  container.style.display = "none";
  container.appendChild(stats.dom);
  document.body.appendChild(container);
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function cleanup() {
  isAnimating = false;
  if (previousAnimationFrame !== null) {
    cancelAnimationFrame(previousAnimationFrame);
    previousAnimationFrame = null;
  }
  cleanupAudio();
  removePauseMenuListeners();
  bulletSystem?.cleanup();
  bombSystem?.cleanup();
  renderer.domElement.style.cursor = "auto";
}

window.addEventListener("resize", () => {
  handleResize();
  reticleSystem.handleResize();
});
