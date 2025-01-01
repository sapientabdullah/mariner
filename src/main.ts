import "./style.css";
import * as THREE from "three";
import { GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";
import { Audio, AudioLoader } from "three";
import { SeagullSystem } from "./utils/seagullSystem";
import { WaterSplashSystem } from "./utils/splashSystem";
import { SkySystem } from "./utils/skySystem";
import { updateCompass } from "./utils/compassSystem";
import { SpeedometerSystem } from "./utils/ui/speedometerSystem";
import { OceanSystem } from "./utils/oceanSystem";
import { MinimapSystem } from "./utils/ui/minimapSystem";
import { EnemyBoatSystem } from "./utils/enemyBoatSystem";
import { ObstacleSystem } from "./utils/obstacleSystem";
import { StaticObjectSystem } from "./utils/staticObjectSystem";
import { SharkSystem } from "./utils/sharkSystem";
import { WaterSpoutSystem } from "./utils/waterSpoutSystem";
import { CheckpointSystem } from "./utils/checkpointSystem";
import { HealthSystem } from "./utils/ui/healthSystem";
import { ReticleSystem } from "./utils/reticleSystem";
import { BombSystem } from "./utils/bombSystem";
import { BulletSystem } from "./utils/bulletSystem";
import { loadingManager } from "./utils/managers/loadingManager";
import { ScoreSystem } from "./utils/scoringSystem";

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

let animationFrameId: number;

const loader = new GLTFLoader(loadingManager);
export let boat: THREE.Object3D;
let isPaused = false;
let userPaused = false;
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
const GUNSHOT_POOL_SIZE = 5;
let engineSound: Audio;
let engineIdleSound: Audio;
let waterSplashSound: Audio;
let collisionSound: Audio;
let explosionSound: Audio;
let whaleSounds: Audio[] = [];
let gunSoundPool: Audio[] = [];
let checkpointSound: Audio;
let scoreSystem: ScoreSystem;
scoreSystem = new ScoreSystem(scene);

const reticleSystem = new ReticleSystem();
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
let healthSystem: HealthSystem;
let bulletSystem: BulletSystem;

const keysPressed: { [key: string]: boolean } = {};

export function startGame() {
  setupBoatSounds();
  lastTime = performance.now();
  cancelAnimationFrame(animationFrameId);
  isPaused = false;
  animate(performance.now());
  setupEventListeners();
}

loader.load("/models/boat/scene.gltf", (gltf) => {
  boat = gltf.scene;
  boat.scale.set(10, 10, 10);
  boat.position.set(0, 5, 0);
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
  enemyBoatSystem = new EnemyBoatSystem(scene, waterSplashSystem, boat);
  bombSystem = new BombSystem(scene, enemyBoatSystem, explosionSound);
  sharkSystem = new SharkSystem(scene, boat);
  waterSpoutSystem = new WaterSpoutSystem(scene, boat, whaleSounds);
  checkpointSystem = new CheckpointSystem(scene, checkpointSound, () => {
    isPaused = true;
    handleGameOver();
  });
  obstacleSystem = new ObstacleSystem(scene, collisionSound);
  bulletSystem = new BulletSystem(
    scene,
    oceanSystem.water.position.y,
    gunSoundPool
  );
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
  engineSound = new Audio(audioListener);

  const engineLoader = new AudioLoader();
  engineLoader.load("/audio/engine-move.mp3", function (buffer) {
    engineSound.setBuffer(buffer);
    engineSound.setLoop(true);
    engineSound.setVolume(0);
    engineSound.play();
  });

  engineIdleSound = new Audio(audioListener);
  const idleLoader = new AudioLoader();
  idleLoader.load("/audio/engine-idle.mp3", function (buffer) {
    engineIdleSound.setBuffer(buffer);
    engineIdleSound.setLoop(true);
    engineIdleSound.setVolume(0.3);
    engineIdleSound.play();
  });

  waterSplashSound = new Audio(audioListener);
  const splashLoader = new AudioLoader();
  splashLoader.load("/sounds/water-splash.mp3", function (buffer) {
    waterSplashSound.setBuffer(buffer);
    waterSplashSound.setLoop(false);
    waterSplashSound.setVolume(0.4);
  });

  collisionSound = new Audio(audioListener);
  const collisionLoader = new AudioLoader();
  collisionLoader.load("/audio/collision.mp3", function (buffer) {
    collisionSound.setBuffer(buffer);
    collisionSound.setLoop(false);
    collisionSound.setVolume(0.5);
  });

  const gunLoader = new AudioLoader();
  gunLoader.load("/audio/bullet-fire.wav", function (buffer) {
    for (let i = 0; i < GUNSHOT_POOL_SIZE; i++) {
      const sound = new Audio(audioListener);
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(0.3);
      gunSoundPool.push(sound);
    }
  });

  checkpointSound = new Audio(audioListener);
  const checkpointLoader = new AudioLoader();
  checkpointLoader.load("/audio/checkpoint.mp3", function (buffer) {
    checkpointSound.setBuffer(buffer);
    checkpointSound.setLoop(false);
    checkpointSound.setVolume(0.5);
  });

  const whaleFiles = ["/audio/whale-1.mp3", "/audio/whale-2.mp3"];

  whaleFiles.forEach((soundFile) => {
    const whaleSound = new Audio(audioListener);
    const whaleLoader = new AudioLoader();
    whaleLoader.load(soundFile, function (buffer) {
      whaleSound.setBuffer(buffer);
      whaleSound.setLoop(false);
      whaleSound.setVolume(0.5);
    });
    whaleSounds.push(whaleSound);
  });

  explosionSound = new Audio(audioListener);
  const explosionLoader = new AudioLoader();
  explosionLoader.load("/audio/explosion.mp3", function (buffer) {
    explosionSound.setBuffer(buffer);
    explosionSound.setLoop(false);
    explosionSound.setVolume(0.8);
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

let lastTime = 0;
const MAX_DELTA_TIME = 0.1;

function animate(time: number) {
  if (isPaused) {
    cancelAnimationFrame(animationFrameId);
    return;
  }

  if (time - lastTime > 1000) {
    lastTime = time - 1000 / 60;
  }

  let deltaTime = (time - lastTime) / 1000;
  deltaTime = Math.min(deltaTime, MAX_DELTA_TIME);

  if (scoreSystem) {
    scoreSystem.update(deltaTime);
  }

  lastTime = time;

  if (bulletSystem) {
    bulletSystem.update(deltaTime, obstacleSystem);
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
      if (collisionSound && !collisionSound.isPlaying) {
        collisionSound.play();
      }
    }
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
      if (healthSystem) {
        healthSystem.takeDamage(5);
      }
    }

    const { hasCollision, resultSpeed } = staticObjectSystem.checkCollisions(
      boat,
      currentSpeed,
      collisionSound
    );
    if (hasCollision) {
      currentSpeed = resultSpeed;
    }

    minimapSystem.update(boat.position);

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
      targetPitchTilt = +MAX_PITCH_TILT * (currentSpeed / MAX_SPEED);
    } else if (keysPressed["s"] || keysPressed["ArrowDown"]) {
      currentSpeed = Math.max(
        currentSpeed - ACCELERATION * deltaTime,
        -MAX_SPEED
      );
      targetPitchTilt = -MAX_PITCH_TILT * (currentSpeed / MAX_SPEED);
    } else {
      if (Math.abs(currentSpeed) < DECELERATION * deltaTime) {
        currentSpeed = 0;
        targetPitchTilt = 0;
      } else if (currentSpeed > 0) {
        currentSpeed -= DECELERATION * deltaTime;
        targetPitchTilt = MAX_PITCH_TILT * (currentSpeed / MAX_SPEED);
      } else if (currentSpeed < 0) {
        currentSpeed += DECELERATION * deltaTime;
        targetPitchTilt = -MAX_PITCH_TILT * (currentSpeed / MAX_SPEED);
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
  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(animate);
}

function togglePauseUI(isPaused: boolean) {
  const pauseOverlay = document.getElementById("pause-overlay");

  if (pauseOverlay) {
    if (isPaused) {
      pauseOverlay.classList.remove("hidden");
      reticleSystem.toggleVisibility(false);
      setupPauseMenuListeners();
    } else {
      pauseOverlay.classList.add("hidden");
      reticleSystem.toggleVisibility(true);
      removePauseMenuListeners();
    }
  }
}

function setupPauseMenuListeners() {
  const resumeButton = document.getElementById("resume-button");
  const controlsButton = document.getElementById("controls-button");
  const controlsBackButton = document.getElementById("controls-back");
  const restartButton = document.getElementById("restart-button");
  const quitButton = document.getElementById("quit-button");
  const controlsPanel = document.getElementById("controls-panel");

  if (resumeButton) {
    resumeButton.addEventListener("click", handleResume);
  }
  if (controlsButton) {
    controlsButton.addEventListener("click", () => {
      controlsPanel?.classList.remove("hidden");
    });
  }
  if (controlsBackButton) {
    controlsBackButton.addEventListener("click", () => {
      controlsPanel?.classList.add("hidden");
    });
  }
  if (restartButton) {
    restartButton.addEventListener("click", handleRestart);
  }
  if (quitButton) {
    quitButton.addEventListener("click", handleQuit);
  }
}

function removePauseMenuListeners() {
  const resumeButton = document.getElementById("resume-button");
  const controlsButton = document.getElementById("controls-button");
  const controlsBackButton = document.getElementById("controls-back");
  const restartButton = document.getElementById("restart-button");
  const quitButton = document.getElementById("quit-button");

  if (resumeButton) {
    resumeButton.removeEventListener("click", handleResume);
  }
  if (controlsButton) {
    controlsButton.removeEventListener("click", () => {});
  }
  if (controlsBackButton) {
    controlsBackButton.removeEventListener("click", () => {});
  }
  if (restartButton) {
    restartButton.removeEventListener("click", handleRestart);
  }
  if (quitButton) {
    quitButton.removeEventListener("click", handleQuit);
  }
}

function handleResume() {
  togglePause();
}

function handleRestart() {
  if (healthSystem) {
    healthSystem.reset();
  }

  if (boat) {
    boat.position.set(0, 5, 0);
    boat.rotation.set(0, Math.PI, 0);
  }

  currentSpeed = 0;
  targetTilt = 0;
  currentTilt = 0;

  togglePause();
}

function handleQuit() {
  if (confirm("Are you sure you want to quit?")) {
    window.close();
  }
}

function pauseAllAudio() {
  const audioSources = [
    engineSound,
    engineIdleSound,
    waterSplashSound,
    collisionSound,
    checkpointSound,
    ...gunSoundPool,
  ];
  audioSources.forEach((sound) => {
    if (sound?.isPlaying) sound.pause();
  });
}

function resumeMainAudio() {
  if (engineSound) engineSound.play();
  if (engineIdleSound) engineIdleSound.play();
}

function handleGamePause() {
  cancelAnimationFrame(animationFrameId);
  pauseAllAudio();
  togglePauseUI(true);
  bulletSystem.cleanup();

  if (bombSystem) {
    bombSystem.cleanup();
  }
}

function handleGameResume() {
  cancelAnimationFrame(animationFrameId);
  lastTime = performance.now();
  isPaused = false;
  animate(performance.now());
  resumeMainAudio();
  togglePauseUI(false);
}

function togglePause() {
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
  window.addEventListener("resize", () => {
    handleResize();
    reticleSystem.handleResize();
  });

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
      isPaused = true;
      handleGamePause();
    } else {
      if (!userPaused) {
        isPaused = false;
        handleGameResume();
      } else {
        togglePauseUI(true);
      }
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

function handleGameOver() {
  if (healthSystem) {
    healthSystem.reset();
  }
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
