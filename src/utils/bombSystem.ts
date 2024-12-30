import * as THREE from "three";
import { EnemyBoatSystem } from "./enemyBoatSystem";

export class BombSystem {
  private bombs: THREE.Mesh[] = [];
  private lastBombTime: number = 0;
  private scene: THREE.Scene;
  private enemyBoatSystem: EnemyBoatSystem;

  private readonly BOMB_COOLDOWN = 5000; // 5s cooldown
  private readonly BOMB_SIZE = 2;
  private readonly BOMB_SPEED = 200;
  private readonly EXPLOSION_RADIUS = 20;
  private readonly GRAVITY = -9.81;

  private bombGeometry = new THREE.SphereGeometry(this.BOMB_SIZE);
  private bombMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    emissive: 0x111111,
    metalness: 0.9,
    roughness: 0.2,
  });

  constructor(scene: THREE.Scene, enemyBoatSystem: EnemyBoatSystem) {
    this.scene = scene;
    this.enemyBoatSystem = enemyBoatSystem;
  }

  createBomb(turret: THREE.Object3D) {
    const currentTime = performance.now();
    if (currentTime - this.lastBombTime < this.BOMB_COOLDOWN) return;

    const bomb = new THREE.Mesh(this.bombGeometry, this.bombMaterial);

    const turretWorldPos = new THREE.Vector3();
    turret.getWorldPosition(turretWorldPos);

    const turretQuaternion = turret.getWorldQuaternion(new THREE.Quaternion());
    const muzzleOffset = new THREE.Vector3(0, 0, 5); // MUZZLE_OFFSET
    muzzleOffset.applyQuaternion(turretQuaternion);

    bomb.position.copy(turretWorldPos).add(muzzleOffset);

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(turretQuaternion);

    bomb.userData.velocity = direction.multiplyScalar(this.BOMB_SPEED);
    bomb.userData.creationTime = currentTime;

    this.scene.add(bomb);
    this.bombs.push(bomb);
    this.lastBombTime = currentTime;
  }

  private createExplosion(position: THREE.Vector3) {
    const explosionGeometry = new THREE.SphereGeometry(this.EXPLOSION_RADIUS);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8,
    });

    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    this.scene.add(explosion);

    // if (this.enemyBoatSystem) {
    //   this.enemyBoatSystem.handleExplosion(position, this.EXPLOSION_RADIUS);
    // }

    const startTime = performance.now();
    const duration = 1000;

    const animateExplosion = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        this.scene.remove(explosion);
        return;
      }

      explosion.material.opacity = 0.8 * (1 - progress);
      explosion.scale.setScalar(1 + progress);

      requestAnimationFrame(animateExplosion);
    };

    animateExplosion();
  }

  update(deltaTime: number, waterLevel: number) {
    this.bombs = this.bombs.filter((bomb) => {
      bomb.userData.velocity.y += this.GRAVITY * deltaTime;
      const movement = bomb.userData.velocity.clone().multiplyScalar(deltaTime);
      bomb.position.add(movement);

      if (bomb.position.y <= waterLevel) {
        this.createExplosion(bomb.position);
        this.scene.remove(bomb);
        return false;
      }

      return true;
    });
  }

  cleanup() {
    this.bombs.forEach((bomb) => this.scene.remove(bomb));
    this.bombs = [];
  }
}
