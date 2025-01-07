import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export class StaticObjectSystem {
  private scene: THREE.Scene;
  private islands: THREE.Object3D[] = [];
  private lighthouse: THREE.Object3D | null = null;
  private readonly ISLAND_COLLISION_RADIUS = 2000;
  private readonly LIGHTHOUSE_COLLISION_RADIUS = 3000;
  private readonly COLLISION_BOUNCE_FACTOR = 0.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createIsland("/models/island.glb", 2, -10000, -40, -10000);
    this.createIsland("/models/island-2.glb", 1.5, 100, -40, 50000);
    this.createLighthouse();
  }

  private createIsland(
    modelPath: string,
    scale: number,
    x: number,
    y: number,
    z: number
  ) {
    const islandLoader = new GLTFLoader();
    islandLoader.load(modelPath, (gltf) => {
      const island = gltf.scene;

      island.scale.set(scale, scale, scale);
      island.rotation.set(0, -Math.PI / 2, 0);
      island.position.set(x, y, z);

      island.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      this.islands.push(island);
      this.scene.add(island);
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
    currentSpeed: number
  ): { hasCollision: boolean; resultSpeed: number } {
    if (!boat || !this.lighthouse || this.islands.length === 0) {
      return { hasCollision: false, resultSpeed: currentSpeed };
    }

    const boatPosition = boat.position.clone();
    const lighthousePosition = this.lighthouse.position.clone();

    for (const island of this.islands) {
      const islandPosition = island.position.clone();
      const distanceToIsland = boatPosition.distanceTo(islandPosition);
      if (distanceToIsland < this.ISLAND_COLLISION_RADIUS) {
        const bounceDirection = boatPosition
          .clone()
          .sub(islandPosition)
          .normalize();
        boat.position.add(bounceDirection.multiplyScalar(5));

        return {
          hasCollision: true,
          resultSpeed: -currentSpeed * this.COLLISION_BOUNCE_FACTOR,
        };
      }
    }

    const distanceToLighthouse = boatPosition.distanceTo(lighthousePosition);
    if (distanceToLighthouse < this.LIGHTHOUSE_COLLISION_RADIUS) {
      const bounceDirection = boatPosition
        .clone()
        .sub(lighthousePosition)
        .normalize();
      boat.position.add(bounceDirection.multiplyScalar(5));

      return {
        hasCollision: true,
        resultSpeed: -currentSpeed * this.COLLISION_BOUNCE_FACTOR,
      };
    }

    return { hasCollision: false, resultSpeed: currentSpeed };
  }
}
