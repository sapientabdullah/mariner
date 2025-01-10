import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { loadingManager } from "../managers/loadingManager";
import { ScoreSystem } from "../progression/scoringSystem";

export class SharkSystem {
  private sharks: THREE.Object3D[] = [];
  private readonly scene: THREE.Scene;
  private readonly targetBoat: THREE.Object3D;
  private readonly scoreSystem: ScoreSystem;
  private readonly sharkSpeed = 50;
  private readonly attackRange = 100;
  private readonly damageRange = 10;
  private readonly spawnInterval = 5000;
  private lastSpawnTime = 0;
  private readonly maxSharks = 3;
  private readonly boatRadius = 5;
  private readonly repulsionForce = 20;

  constructor(
    scene: THREE.Scene,
    targetBoat: THREE.Object3D,
    scoreSystem: ScoreSystem
  ) {
    this.scene = scene;
    this.targetBoat = targetBoat;
    this.scoreSystem = scoreSystem;
    this.spawnShark();
  }

  private async spawnShark() {
    const loader = new GLTFLoader(loadingManager);
    try {
      const gltf = await loader.loadAsync("/models/shark/scene.gltf");
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
      shark.userData.velocity = new THREE.Vector3();
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

      const distanceToBoat = shark.position.distanceTo(
        this.targetBoat.position
      );

      if (!shark.userData.velocity) {
        shark.userData.velocity = new THREE.Vector3();
      }

      if (distanceToBoat < this.boatRadius + this.damageRange) {
        const repulsionDirection = direction.clone().multiplyScalar(-1);
        shark.userData.velocity.add(
          repulsionDirection.multiplyScalar(this.repulsionForce * deltaTime)
        );
      } else if (distanceToBoat < this.attackRange) {
        shark.userData.velocity.add(
          direction.multiplyScalar(this.sharkSpeed * deltaTime)
        );
      }

      shark.userData.velocity.multiplyScalar(0.95);

      shark.position.add(
        shark.userData.velocity.clone().multiplyScalar(deltaTime)
      );

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
            this.scoreSystem.addSharkKillScore(shark.position.clone());
            this.scene.remove(shark);
            this.sharks.splice(index, 1);
          }
        }
      });

      const time = performance.now() * 0.001;
      shark.position.y = 2 + Math.sin(time * 2) * 0.5;
      shark.rotation.z = Math.sin(time * 2) * 0.05;
    });
  }
  public handleExplosion(explosionPos: THREE.Vector3, explosionRadius: number) {
    this.sharks = this.sharks.filter((shark) => {
      const distanceToExplosion = shark.position.distanceTo(explosionPos);
      if (distanceToExplosion <= explosionRadius) {
        this.scoreSystem.addSharkKillScore(shark.position.clone());
        this.scene.remove(shark);
        return false;
      }
      return true;
    });
  }
  public getSharks(): THREE.Object3D[] {
    return this.sharks;
  }
}
