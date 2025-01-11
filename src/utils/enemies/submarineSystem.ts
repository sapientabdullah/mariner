import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { loadingManager } from "../managers/loadingManager";

export class SubmarineSystem {
  private submarine: THREE.Object3D | null = null;
  private readonly scene: THREE.Scene;
  private readonly playerBoat: THREE.Object3D;
  private torpedoes: THREE.Mesh[] = [];

  private sonarSound: THREE.Audio | null = null;
  private torpedoSound: THREE.Audio | null = null;
  private submarineEngineSound: THREE.Audio | null = null;
  private surfaceSound: THREE.Audio | null = null;

  private readonly SURFACE_HEIGHT = 5;
  private readonly SUBMERGED_HEIGHT = -20;
  private readonly SUBMARINE_SPEED = 15;
  private readonly SUBMARINE_ROTATION_SPEED = 0.015;
  private readonly TORPEDO_SPEED = 80;
  private readonly MIN_ATTACK_DISTANCE = 400;
  private readonly MAX_ATTACK_DISTANCE = 800;
  private readonly SUBMERGE_DURATION = 3000;

  private isSubmerged = false;
  private lastTorpedoTime = 0;
  private submarineState:
    | "surfacing"
    | "submerging"
    | "surface"
    | "underwater" = "underwater";
  private stateStartTime = 0;
  private readonly surfaceTime = 8000; // Time to stay on surface
  private readonly underwaterTime = 15000; // Time to stay underwater

  private bubbleParticles: THREE.Points[] = [];

  constructor(
    scene: THREE.Scene,
    playerBoat: THREE.Object3D,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.playerBoat = playerBoat;
    this.initializeSounds(camera);
    this.createSubmarine();
    this.initializeState();
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const audioLoader = new THREE.AudioLoader();

    try {
      const sonarSound = new THREE.Audio(listener);
      const torpedoSound = new THREE.Audio(listener);
      const submarineEngineSound = new THREE.Audio(listener);
      const surfaceSound = new THREE.Audio(listener);

      const [sonarBuffer, torpedoBuffer, engineBuffer, surfaceBuffer] =
        await Promise.all([
          audioLoader.loadAsync("/audio/submarine-sonar.mp3"),
          audioLoader.loadAsync("/audio/torpedo.mp3"),
          audioLoader.loadAsync("/audio/submarine-engine.mp3"),
          audioLoader.loadAsync("/audio/surface.mp3"),
        ]);

      sonarSound.setBuffer(sonarBuffer);
      sonarSound.setVolume(0.3);
      this.sonarSound = sonarSound;

      torpedoSound.setBuffer(torpedoBuffer);
      torpedoSound.setVolume(0.4);
      this.torpedoSound = torpedoSound;

      submarineEngineSound.setBuffer(engineBuffer);
      submarineEngineSound.setLoop(true);
      submarineEngineSound.setVolume(0.2);
      this.submarineEngineSound = submarineEngineSound;

      surfaceSound.setBuffer(surfaceBuffer);
      surfaceSound.setVolume(0.5);
      this.surfaceSound = surfaceSound;

      this.submarineEngineSound.play();
    } catch (error) {
      console.error("Error loading submarine sounds:", error);
    }
  }

  private createSubmarine() {
    const submarineLoader = new GLTFLoader(loadingManager);
    submarineLoader.load("/models/submarine.glb", (gltf) => {
      this.submarine = gltf.scene;
      this.submarine.scale.set(120, 120, 120);
      this.submarine.position.set(500, this.SUBMERGED_HEIGHT, -8000);
      this.submarine.rotation.set(0, Math.PI, 0);
      this.submarine.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = true;
        }
      });
      this.scene.add(this.submarine);
    });
  }

  private initializeState() {
    this.submarineState = "underwater";
    this.stateStartTime = performance.now();
    this.isSubmerged = true;
  }

  private createTorpedo(
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): THREE.Mesh {
    const torpedoGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
    torpedoGeometry.rotateZ(Math.PI / 2);

    const torpedoMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });

    const torpedo = new THREE.Mesh(torpedoGeometry, torpedoMaterial);
    torpedo.position.copy(position);
    torpedo.quaternion.setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      direction
    );

    torpedo.userData.direction = direction;
    torpedo.userData.speed = this.TORPEDO_SPEED;
    torpedo.userData.creationTime = performance.now();
    torpedo.userData.maxLifetime = 5000;

    return torpedo;
  }

  private fireTorpedo() {
    if (!this.submarine || !this.isSubmerged) return;

    const currentTime = performance.now();
    if (currentTime - this.lastTorpedoTime < 2000) return;

    const torpedoOffset = new THREE.Vector3(0, 0, 10);
    torpedoOffset.applyQuaternion(this.submarine.quaternion);

    const directionToPlayer = new THREE.Vector3()
      .subVectors(this.playerBoat.position, this.submarine.position)
      .normalize();

    const torpedo = this.createTorpedo(
      this.submarine.position.clone().add(torpedoOffset),
      directionToPlayer
    );

    this.torpedoes.push(torpedo);
    this.scene.add(torpedo);

    if (this.torpedoSound && !this.torpedoSound.isPlaying) {
      this.torpedoSound.play();
    }

    this.createBubbleTrail(torpedo.position);
    this.lastTorpedoTime = currentTime;
  }

  private createBubbleTrail(position: THREE.Vector3) {
    const bubbleGeometry = new THREE.BufferGeometry();
    const bubbleCount = 30;
    const positions = new Float32Array(bubbleCount * 3);

    for (let i = 0; i < bubbleCount * 3; i += 3) {
      positions[i] = position.x + (Math.random() - 0.5) * 2;
      positions[i + 1] = position.y + (Math.random() - 0.5) * 2;
      positions[i + 2] = position.z + (Math.random() - 0.5) * 2;
    }

    bubbleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const bubbleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial);
    this.scene.add(bubbles);
    this.bubbleParticles.push(bubbles);

    setTimeout(() => {
      this.scene.remove(bubbles);
      const index = this.bubbleParticles.indexOf(bubbles);
      if (index > -1) {
        this.bubbleParticles.splice(index, 1);
      }
    }, 2000);
  }

  private updateState(currentTime: number) {
    const elapsedInState = currentTime - this.stateStartTime;

    switch (this.submarineState) {
      case "underwater":
        if (elapsedInState > this.underwaterTime) {
          this.submarineState = "surfacing";
          this.stateStartTime = currentTime;
          if (this.surfaceSound) this.surfaceSound.play();
        }
        break;

      case "surfacing":
        if (elapsedInState > this.SUBMERGE_DURATION) {
          this.submarineState = "surface";
          this.stateStartTime = currentTime;
          this.isSubmerged = false;
        }
        break;

      case "surface":
        if (elapsedInState > this.surfaceTime) {
          this.submarineState = "submerging";
          this.stateStartTime = currentTime;
          if (this.surfaceSound) this.surfaceSound.play();
        }
        break;

      case "submerging":
        if (elapsedInState > this.SUBMERGE_DURATION) {
          this.submarineState = "underwater";
          this.stateStartTime = currentTime;
          this.isSubmerged = true;
        }
        break;
    }
  }

  public update(deltaTime: number) {
    if (!this.submarine) return;

    const currentTime = performance.now();
    this.updateState(currentTime);

    this.updateTorpedoes(deltaTime);

    const targetHeight = this.updateSubmarineHeight(currentTime);
    this.submarine.position.y +=
      (targetHeight - this.submarine.position.y) * 0.1;

    const directionToPlayer = new THREE.Vector3()
      .subVectors(this.playerBoat.position, this.submarine.position)
      .normalize();
    const distanceToPlayer = this.submarine.position.distanceTo(
      this.playerBoat.position
    );

    this.updateSubmarineRotation(directionToPlayer);
    this.updateSubmarinePosition(
      directionToPlayer,
      distanceToPlayer,
      deltaTime
    );

    this.handleSurfaceEffects(currentTime);

    this.handleCombatBehavior(distanceToPlayer);
  }

  private updateSubmarineHeight(currentTime: number): number {
    let targetHeight = this.SUBMERGED_HEIGHT;

    switch (this.submarineState) {
      case "surface":
        targetHeight = this.SURFACE_HEIGHT;
        break;
      case "surfacing": {
        const progress =
          (currentTime - this.stateStartTime) / this.SUBMERGE_DURATION;
        targetHeight =
          this.SUBMERGED_HEIGHT +
          (this.SURFACE_HEIGHT - this.SUBMERGED_HEIGHT) * progress;
        break;
      }
      case "submerging": {
        const progress =
          (currentTime - this.stateStartTime) / this.SUBMERGE_DURATION;
        targetHeight =
          this.SURFACE_HEIGHT +
          (this.SUBMERGED_HEIGHT - this.SURFACE_HEIGHT) * progress;
        break;
      }
    }

    return targetHeight;
  }

  private updateSubmarineRotation(directionToPlayer: THREE.Vector3) {
    const targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    let rotationDiff = targetRotation - this.submarine!.rotation.y;

    if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

    this.submarine!.rotation.y += rotationDiff * this.SUBMARINE_ROTATION_SPEED;
  }

  private updateSubmarinePosition(
    directionToPlayer: THREE.Vector3,
    distanceToPlayer: number,
    deltaTime: number
  ) {
    if (distanceToPlayer > this.MIN_ATTACK_DISTANCE) {
      const movement = directionToPlayer
        .clone()
        .multiplyScalar(this.SUBMARINE_SPEED * deltaTime);
      this.submarine!.position.add(movement);

      if (this.isSubmerged && Math.random() < 0.1) {
        this.createBubbleTrail(this.submarine!.position);
      }
    }
  }

  private handleSurfaceEffects(currentTime: number) {
    if (this.submarineState === "surface") {
      const time = currentTime * 0.001;
      this.submarine!.rotation.z = Math.sin(time * 0.5) * 0.05;
    }
  }

  private handleCombatBehavior(distanceToPlayer: number) {
    if (
      this.isSubmerged &&
      distanceToPlayer < this.MAX_ATTACK_DISTANCE &&
      distanceToPlayer > this.MIN_ATTACK_DISTANCE
    ) {
      this.fireTorpedo();
    }

    if (
      this.isSubmerged &&
      this.sonarSound &&
      !this.sonarSound.isPlaying &&
      Math.random() < 0.005
    ) {
      this.sonarSound.play();
    }
  }

  private updateTorpedoes(deltaTime: number) {
    const currentTime = performance.now();
    const torpedoesToRemove: THREE.Mesh[] = [];

    this.torpedoes.forEach((torpedo) => {
      const direction = torpedo.userData.direction as THREE.Vector3;
      torpedo.position.add(
        direction.clone().multiplyScalar(torpedo.userData.speed * deltaTime)
      );

      if (Math.random() < 0.3) {
        this.createBubbleTrail(torpedo.position);
      }

      if (
        currentTime - torpedo.userData.creationTime >
        torpedo.userData.maxLifetime
      ) {
        torpedoesToRemove.push(torpedo);
      }

      const distanceToPlayer = torpedo.position.distanceTo(
        this.playerBoat.position
      );
      if (distanceToPlayer < 15) {
        torpedoesToRemove.push(torpedo);
      }
    });

    torpedoesToRemove.forEach((torpedo) => {
      this.scene.remove(torpedo);
      const index = this.torpedoes.indexOf(torpedo);
      if (index > -1) {
        this.torpedoes.splice(index, 1);
      }
    });
  }

  public cleanup() {
    this.torpedoes.forEach((torpedo) => this.scene.remove(torpedo));
    this.torpedoes = [];
    this.bubbleParticles.forEach((bubbles) => this.scene.remove(bubbles));
    this.bubbleParticles = [];

    if (this.sonarSound) {
      this.sonarSound.disconnect();
      this.sonarSound = null;
    }
    if (this.torpedoSound) {
      this.torpedoSound.disconnect();
      this.torpedoSound = null;
    }
  }
}
