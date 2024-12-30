import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { loadingManager } from "./managers/loadingManager";

export class SharkSystem {
  private sharks: THREE.Object3D[] = [];
  private scene: THREE.Scene;
  private targetBoat: THREE.Object3D;
  private sharkSpeed = 50;
  private attackRange = 100;
  private damageRange = 10;
  private spawnInterval = 5000;
  private lastSpawnTime = 0;
  private maxSharks = 3;

  constructor(scene: THREE.Scene, targetBoat: THREE.Object3D) {
    this.scene = scene;
    this.targetBoat = targetBoat;
    this.spawnShark();
  }

  private async spawnShark() {
    const loader = new GLTFLoader(loadingManager);
    try {
      const gltf = await loader.loadAsync(
        "/Great White Shark Low Poly/scene.gltf"
      );
      const shark = gltf.scene;
      shark.scale.set(15, 15, 15);

      const angle = Math.random() * Math.PI * 2;
      const distance = this.attackRange;
      shark.position.set(
        this.targetBoat.position.x + Math.cos(angle) * distance,
        2,
        this.targetBoat.position.z + Math.sin(angle) * distance
      );

      shark.userData.health = 100;
      this.sharks.push(shark);
      this.scene.add(shark);
    } catch (error) {
      console.error("Error loading shark model: ", error);
    }
  }

  public update(deltaTime: number, bullets: THREE.Mesh[]) {
    const currentTime = performance.now();

    if (
      currentTime - this.lastSpawnTime > this.spawnInterval &&
      this.sharks.length < this.maxSharks
    ) {
      this.spawnShark();
      this.lastSpawnTime = currentTime;
    }

    this.sharks.forEach((shark, index) => {
      const direction = new THREE.Vector3()
        .subVectors(this.targetBoat.position, shark.position)
        .normalize();

      shark.position.add(direction.multiplyScalar(this.sharkSpeed * deltaTime));

      const targetPosition = this.targetBoat.position.clone();
      targetPosition.y = shark.position.y;

      const lookDirection = targetPosition.clone().sub(shark.position);

      const angle = Math.atan2(lookDirection.x, lookDirection.z);
      shark.rotation.y = angle;

      shark.rotation.x = 0;

      bullets.forEach((bullet, bulletIndex) => {
        if (bullet.position.distanceTo(shark.position) < this.damageRange) {
          shark.userData.health -= 25;
          this.scene.remove(bullet);
          bullets.splice(bulletIndex, 1);

          if (shark.userData.health <= 0) {
            this.scene.remove(shark);
            this.sharks.splice(index, 1);
          }
        }
      });

      if (
        shark.position.distanceTo(this.targetBoat.position) < this.damageRange
      ) {
        console.log("Shark attacked boat!");
      }

      const time = performance.now() * 0.001;
      shark.position.y = 2 + Math.sin(time * 2) * 0.5;
      shark.rotation.z = Math.sin(time * 2) * 0.05;
    });
  }
}
