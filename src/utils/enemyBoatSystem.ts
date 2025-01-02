import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { WaterSplashSystem } from "./splashSystem";
import { loadingManager } from "./managers/loadingManager";

export class EnemyBoatSystem {
  private enemyBoat: THREE.Object3D | null = null;
  private scene: THREE.Scene;
  private waterSplashSystem: WaterSplashSystem;
  private playerBoat: THREE.Object3D;

  private readonly ENEMY_SPEED = 20;
  private readonly ENEMY_ROTATION_SPEED = 0.02;

  constructor(
    scene: THREE.Scene,
    waterSplashSystem: WaterSplashSystem,
    playerBoat: THREE.Object3D
  ) {
    this.scene = scene;
    this.waterSplashSystem = waterSplashSystem;
    this.playerBoat = playerBoat;
    this.createEnemyBoat();
  }

  private createEnemyBoat() {
    const enemyLoader = new GLTFLoader(loadingManager);
    enemyLoader.load("/models/boat/scene.gltf", (gltf) => {
      this.enemyBoat = gltf.scene;
      this.enemyBoat.scale.set(10, 10, 10);
      this.enemyBoat.position.set(100, 5, 100);
      this.enemyBoat.rotation.set(0, Math.PI, 0);
      this.enemyBoat.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = true;
          const material = (node as THREE.Mesh)
            .material as THREE.MeshStandardMaterial;
          if (material) {
            material.color.setHex(0xff0000);
          }
        }
      });
      this.scene.add(this.enemyBoat);
    });
  }

  public update(deltaTime: number): {
    collisionOccurred: boolean;
    currentSpeed: number;
  } {
    if (!this.enemyBoat || !this.playerBoat)
      return { collisionOccurred: false, currentSpeed: 0 };

    const directionToPlayer = new THREE.Vector3()
      .subVectors(this.playerBoat.position, this.enemyBoat.position)
      .normalize();

    const targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);

    let rotationDiff = targetRotation - this.enemyBoat.rotation.y;
    if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

    this.enemyBoat.rotation.y += rotationDiff * this.ENEMY_ROTATION_SPEED;

    const distanceToPlayer = this.enemyBoat.position.distanceTo(
      this.playerBoat.position
    );
    const minDistance = 25;

    let currentSpeed = 0;
    let collisionOccurred = false;

    if (distanceToPlayer > minDistance) {
      this.enemyBoat.position.x +=
        directionToPlayer.x * this.ENEMY_SPEED * deltaTime;
      this.enemyBoat.position.z +=
        directionToPlayer.z * this.ENEMY_SPEED * deltaTime;

      const enemyBoatDirection = new THREE.Vector3(
        Math.sin(this.enemyBoat.rotation.y),
        0,
        Math.cos(this.enemyBoat.rotation.y)
      ).normalize();

      this.waterSplashSystem.createSplashEffect(
        this.enemyBoat.position,
        enemyBoatDirection
      );
    } else {
      collisionOccurred = true;
      const pushBackDirection = directionToPlayer.clone().negate();
      const pushBackStrength = (minDistance - distanceToPlayer) * 2;

      this.enemyBoat.position.add(
        pushBackDirection.clone().multiplyScalar(pushBackStrength)
      );
      this.playerBoat.position.add(
        directionToPlayer.clone().multiplyScalar(pushBackStrength)
      );

      currentSpeed *= 0.5;

      const collisionPoint = new THREE.Vector3()
        .addVectors(this.playerBoat.position, this.enemyBoat.position)
        .multiplyScalar(0.5);

      this.waterSplashSystem.createSplashEffect(
        collisionPoint,
        new THREE.Vector3(0, 1, 0)
      );
    }

    const time = performance.now() * 0.001;
    const bobbingSpeed = 1.5;
    const bobbingAmount = 0.015;
    this.enemyBoat.position.y = 5 + Math.sin(time * bobbingSpeed) * 0.5;
    this.enemyBoat.rotation.z =
      Math.sin(time * bobbingSpeed * 0.5) * bobbingAmount;
    this.enemyBoat.rotation.x =
      Math.sin(time * bobbingSpeed * 0.7) * bobbingAmount * 0.5;

    return { collisionOccurred, currentSpeed };
  }
}
