import * as THREE from "three";
import { ScoreSystem } from "./scoringSystem";

export class CheckpointSystem {
  private readonly checkpoints: THREE.Vector3[] = [];
  private currentCheckpointMesh: THREE.Object3D | null = null;
  private currentCheckpointIndex: number = 0;
  private readonly scene: THREE.Scene;
  private currentTextSprite: THREE.Sprite | null = null;
  private timeSprite: THREE.Sprite | null = null;
  private checkpointSound: THREE.Audio | null = null;
  private readonly CHECKPOINT_RADIUS = 50;
  private readonly CHECKPOINT_SPACING = 500;
  private readonly LINE_HEIGHT = 100;
  private readonly TEXT_SPACING = 20;
  private readonly TIME_PER_CHECKPOINT = 30;
  private timeRemaining: number;
  private readonly onTimeUp: () => void;
  private ringMaterial: THREE.MeshBasicMaterial | null = null;
  private lineMaterial: THREE.MeshBasicMaterial | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, onTimeUp: () => void) {
    this.scene = scene;
    this.onTimeUp = onTimeUp;
    this.timeRemaining = this.TIME_PER_CHECKPOINT;
    this.initializeSound(camera);
    this.initialize();
  }

  private async initializeSound(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    this.checkpointSound = new THREE.Audio(listener);

    const audioLoader = new THREE.AudioLoader();

    try {
      const buffer = await audioLoader.loadAsync("/audio/checkpoint.mp3");
      this.checkpointSound.setBuffer(buffer);
      this.checkpointSound.setVolume(0.5);
    } catch (error) {
      console.error("Error loading checkpoint sound:", error);
    }
  }

  private initialize() {
    this.generateNextCheckpoint();
    this.createTimeSprite();
  }

  private createTimeSprite() {
    const sprite = this.createTextSprite("");
    sprite.position.set(0, this.LINE_HEIGHT + this.TEXT_SPACING, 0);
    this.timeSprite = sprite;
    this.scene.add(sprite);
  }

  private updateTimeSprite() {
    if (!this.timeSprite) return;

    const timeText = `${Math.ceil(this.timeRemaining)}s`;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 128;

    if (context) {
      context.fillStyle = this.timeRemaining <= 10 ? "#ff0000" : "#ffffff";
      context.font = "48px Jura";
      context.textAlign = "center";
      context.fillText(timeText, 128, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    (this.timeSprite.material as THREE.SpriteMaterial).map = texture;
    this.timeSprite.material.needsUpdate = true;

    if (this.currentCheckpointMesh) {
      const checkpointPosition = this.checkpoints[this.currentCheckpointIndex];
      this.timeSprite.position.copy(checkpointPosition);
      this.timeSprite.position.y += this.LINE_HEIGHT + this.TEXT_SPACING;
    }

    this.updateCheckpointColors();
  }

  private updateCheckpointColors() {
    if (this.ringMaterial && this.lineMaterial) {
      const color = this.timeRemaining <= 10 ? 0xff0000 : 0x00ff00;
      this.ringMaterial.color.setHex(color);
      this.lineMaterial.color.setHex(color);
    }
  }

  private generateNextCheckpoint() {
    let newPosition: THREE.Vector3;

    if (this.checkpoints.length === 0) {
      newPosition = new THREE.Vector3(0, 0.1, 0);
    } else {
      const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1];
      const angle = (Math.random() * Math.PI) / 2 - Math.PI / 4;

      const direction = new THREE.Vector3(
        Math.sin(angle),
        0,
        -Math.cos(angle)
      ).normalize();

      newPosition = lastCheckpoint
        .clone()
        .add(direction.multiplyScalar(this.CHECKPOINT_SPACING));
    }

    this.checkpoints.push(newPosition);
    this.createCheckpointVisual(newPosition);
  }

  private createCheckpointVisual(position: THREE.Vector3) {
    if (this.currentCheckpointMesh) {
      this.scene.remove(this.currentCheckpointMesh);
    }

    const ringGeometry = new THREE.TorusGeometry(
      this.CHECKPOINT_RADIUS,
      2,
      16,
      50
    );
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeometry, this.ringMaterial);
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2;

    const lineGeometry = new THREE.CylinderGeometry(1, 1, this.LINE_HEIGHT, 8);
    this.lineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const line = new THREE.Mesh(lineGeometry, this.lineMaterial);
    line.position.copy(position);
    line.position.y += this.LINE_HEIGHT / 2;

    const sprite = this.createTextSprite("0m");
    sprite.position.copy(position);
    sprite.position.y += this.LINE_HEIGHT;

    const checkpointGroup = new THREE.Group();
    checkpointGroup.add(ring);
    checkpointGroup.add(line);
    checkpointGroup.add(sprite);

    this.scene.add(checkpointGroup);
    this.currentCheckpointMesh = checkpointGroup;
    this.currentTextSprite = sprite;
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 128;

    if (context) {
      context.fillStyle = "#ffffff";
      context.font = "48px Jura";
      context.textAlign = "center";
      context.fillText(text, 128, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(100, 50, 1);

    return sprite;
  }

  private updateTextSprite(sprite: THREE.Sprite, distance: number) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 128;

    if (context) {
      context.fillStyle = "#ffffff";
      context.font = "48px Jura";
      context.textAlign = "center";
      context.fillText(`${Math.round(distance)}m`, 128, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    (sprite.material as THREE.SpriteMaterial).map = texture;
    sprite.material.needsUpdate = true;
  }

  public update(
    boatPosition: THREE.Vector3,
    deltaTime: number,
    scoreSystem: ScoreSystem
  ): number {
    this.timeRemaining -= deltaTime;
    this.updateTimeSprite();

    if (this.timeRemaining <= 0) {
      this.onTimeUp();
      return 0;
    }

    const currentCheckpoint = this.checkpoints[this.currentCheckpointIndex];
    const distanceToCheckpoint = boatPosition.distanceTo(currentCheckpoint);

    if (this.currentTextSprite) {
      this.updateTextSprite(this.currentTextSprite, distanceToCheckpoint);
    }

    if (distanceToCheckpoint < this.CHECKPOINT_RADIUS) {
      if (scoreSystem) {
        scoreSystem.addCheckpointScore(currentCheckpoint, this.timeRemaining);
      }

      if (this.currentCheckpointMesh) {
        this.scene.remove(this.currentCheckpointMesh);
        this.currentCheckpointMesh = null;
        this.currentTextSprite = null;
      }

      if (this.checkpointSound && !this.checkpointSound.isPlaying) {
        this.checkpointSound.play();
      }

      this.timeRemaining = this.TIME_PER_CHECKPOINT;

      this.currentCheckpointIndex++;
      this.generateNextCheckpoint();
    }

    return distanceToCheckpoint;
  }

  public getRemainingTime(): number {
    return this.timeRemaining;
  }

  public getCurrentCheckpoint(): THREE.Vector3 | null {
    return this.checkpoints[this.currentCheckpointIndex] || null;
  }

  public cleanup() {
    if (this.timeSprite) {
      this.scene.remove(this.timeSprite);
    }
    if (this.currentCheckpointMesh) {
      this.scene.remove(this.currentCheckpointMesh);
    }
    if (this.checkpointSound) {
      this.checkpointSound.disconnect();
    }
  }
}
