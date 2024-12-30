import * as THREE from "three";
import { AudioListener, PositionalAudio, AudioLoader } from "three";
import { boat } from "../main";
import { isWithinBounds } from "./withinBounds";

interface Seagull extends THREE.Group {
  wingL?: THREE.Mesh;
  wingR?: THREE.Mesh;
  originalY: number;
  phase: number;
  speed: number;
  direction: THREE.Vector3;
  sound?: PositionalAudio;
  lastSoundTime?: number;
}

export class SeagullSystem {
  private seagulls: Seagull[] = [];
  private seagullSound: AudioBuffer | null = null;
  private scene: THREE.Scene;
  private audioListener: AudioListener;

  constructor(scene: THREE.Scene, audioListener: AudioListener) {
    this.scene = scene;
    this.audioListener = audioListener;
    this.loadSound();
  }

  private loadSound() {
    const audioLoader = new AudioLoader();
    audioLoader.load("/Seagull Sound Effect.mp3", (buffer) => {
      this.seagullSound = buffer;
      this.spawnSeagulls(10);
    });
  }

  private createSeagull(): Seagull {
    const group = new THREE.Group() as Seagull;

    const bodyGeometry = new THREE.ConeGeometry(2, 8, 4);
    bodyGeometry.rotateX(Math.PI / 2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    const wingGeometry = new THREE.PlaneGeometry(12, 4);
    const wingMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    const wingL = new THREE.Mesh(wingGeometry, wingMaterial);
    wingL.position.set(-6, 0, 0);
    group.add(wingL);
    group.wingL = wingL;

    const wingR = new THREE.Mesh(wingGeometry, wingMaterial);
    wingR.position.set(6, 0, 0);
    group.add(wingR);
    group.wingR = wingR;

    group.originalY = 50 + Math.random() * 50;
    group.position.y = group.originalY;
    group.phase = Math.random() * Math.PI * 2;
    group.speed = 0.5 + Math.random() * 0.5;

    const angle = Math.random() * Math.PI * 2;
    group.direction = new THREE.Vector3(
      Math.cos(angle),
      0,
      Math.sin(angle)
    ).normalize();

    group.rotateY(angle);

    if (this.seagullSound) {
      const sound = new PositionalAudio(this.audioListener);
      sound.setBuffer(this.seagullSound);
      sound.setRefDistance(50);
      sound.setVolume(0.5);
      sound.setLoop(false);
      group.add(sound);
      group.sound = sound;
      group.lastSoundTime = 0;
    }

    return group;
  }

  private spawnSeagulls(count: number) {
    for (let i = 0; i < count; i++) {
      const seagull = this.createSeagull();

      const radius = Math.random() * 4000;
      const angle = Math.random() * Math.PI * 2;
      seagull.position.x = Math.cos(angle) * radius;
      seagull.position.z = Math.sin(angle) * radius;

      this.scene.add(seagull);
      this.seagulls.push(seagull);
    }
  }

  update(deltaTime: number) {
    const currentTime = Date.now();
    for (const seagull of this.seagulls) {
      seagull.position.add(
        seagull.direction.clone().multiplyScalar(seagull.speed)
      );

      if (seagull.sound && boat) {
        const distanceToBoat = seagull.position.distanceTo(boat.position);
        const timeSinceLastSound = currentTime - (seagull.lastSoundTime || 0);

        if (distanceToBoat < 100 && timeSinceLastSound > 10000) {
          if (!seagull.sound.isPlaying) {
            seagull.sound.play();
            seagull.lastSoundTime = currentTime;
          }
        }
      }

      seagull.phase += deltaTime * 5;
      if (seagull.wingL && seagull.wingR) {
        seagull.wingL.rotation.z = Math.sin(seagull.phase) * 0.3;
        seagull.wingR.rotation.z = -Math.sin(seagull.phase) * 0.3;
      }

      seagull.position.y =
        seagull.originalY + Math.sin(seagull.phase * 0.5) * 2;

      if (!isWithinBounds(seagull.position)) {
        seagull.direction.negate();
        seagull.rotateY(Math.PI);
      }
    }
  }
}
