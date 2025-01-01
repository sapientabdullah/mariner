import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export class StaticObjectSystem {
  private scene: THREE.Scene;
  private island: THREE.Object3D | null = null;
  private lighthouse: THREE.Object3D | null = null;
  private readonly ISLAND_COLLISION_RADIUS = 2000;
  private readonly LIGHTHOUSE_COLLISION_RADIUS = 3000;
  private readonly COLLISION_BOUNCE_FACTOR = 0.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createIsland();
    this.createLighthouse();
  }

  private createIsland() {
    const islandLoader = new GLTFLoader();
    islandLoader.load("/models/island.glb", (gltf) => {
      this.island = gltf.scene;

      this.island.scale.set(2, 2, 2);
      this.island.rotation.set(0, -Math.PI / 2, 0);
      this.island.position.set(-10000, -40, -10000);

      this.island.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      this.scene.add(this.island);
    });
  }

  private createLighthouse() {
    const lighthouseLoader = new GLTFLoader();
    lighthouseLoader.load("/models/lighthouse.glb", (gltf) => {
      this.lighthouse = gltf.scene;

      this.lighthouse.scale.set(100, 100, 100);
      this.lighthouse.rotation.set(0, 0, 0);
      this.lighthouse.position.set(10000, -1200, -10000);

      this.lighthouse.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      this.scene.add(this.lighthouse);
    });
  }

  checkCollisions(
    boat: THREE.Object3D,
    currentSpeed: number,
    collisionSound: THREE.Audio
  ): { hasCollision: boolean; resultSpeed: number } {
    if (!boat || !this.island || !this.lighthouse) {
      return { hasCollision: false, resultSpeed: currentSpeed };
    }

    const boatPosition = boat.position.clone();
    const islandPosition = this.island.position.clone();
    const lighthousePosition = this.lighthouse.position.clone();

    const distanceToIsland = boatPosition.distanceTo(islandPosition);
    if (distanceToIsland < this.ISLAND_COLLISION_RADIUS) {
      const bounceDirection = boatPosition
        .clone()
        .sub(islandPosition)
        .normalize();
      boat.position.add(bounceDirection.multiplyScalar(5));

      if (collisionSound && !collisionSound.isPlaying) {
        collisionSound.play();
      }
      return {
        hasCollision: true,
        resultSpeed: -currentSpeed * this.COLLISION_BOUNCE_FACTOR,
      };
    }

    const distanceToLighthouse = boatPosition.distanceTo(lighthousePosition);
    if (distanceToLighthouse < this.LIGHTHOUSE_COLLISION_RADIUS) {
      const bounceDirection = boatPosition
        .clone()
        .sub(lighthousePosition)
        .normalize();
      boat.position.add(bounceDirection.multiplyScalar(5));

      if (collisionSound && !collisionSound.isPlaying) {
        collisionSound.play();
      }
      return {
        hasCollision: true,
        resultSpeed: -currentSpeed * this.COLLISION_BOUNCE_FACTOR,
      };
    }

    return { hasCollision: false, resultSpeed: currentSpeed };
  }
}
