import * as THREE from "three";
import { EnemyBoatSystem } from "./enemyBoatSystem";
import { ObstacleSystem } from "./obstacleSystem";

export class BombSystem {
  private bombs: THREE.Mesh[] = [];
  private lastBombTime: number = 0;
  private scene: THREE.Scene;
  private enemyBoatSystem: EnemyBoatSystem;
  private obstacleSystem: ObstacleSystem;
  private explosionTexture: THREE.Texture;
  private explosionSound: THREE.Audio | null = null;
  private readonly BOMB_COOLDOWN = 5000; // 5s cooldown
  private readonly BOMB_SIZE = 2;
  private readonly BOMB_SPEED = 200;
  private readonly EXPLOSION_RADIUS = 200;
  private readonly GRAVITY = -9.81;
  private readonly OBSTACLE_DAMAGE = 3;

  private bombGeometry = new THREE.SphereGeometry(this.BOMB_SIZE);
  private bombMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    emissive: 0x111111,
    metalness: 0.9,
    roughness: 0.2,
  });

  constructor(
    scene: THREE.Scene,
    enemyBoatSystem: EnemyBoatSystem,
    obstacleSystem: ObstacleSystem,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.enemyBoatSystem = enemyBoatSystem;
    this.obstacleSystem = obstacleSystem;
    const textureLoader = new THREE.TextureLoader();
    this.explosionTexture = textureLoader.load("/textures/explosion.webp");
    this.initializeSounds(camera);
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();

    try {
      const explosionSound = new THREE.Audio(listener);
      const buffer = await audioLoader.loadAsync("/audio/explosion.mp3");
      explosionSound.setBuffer(buffer);
      explosionSound.setVolume(0.5);
      this.explosionSound = explosionSound;
    } catch (error) {
      console.error("Error loading explosion sound:", error);
    }
  }

  private handleExplosionDamage(position: THREE.Vector3) {
    const affectedObstacles = this.obstacleSystem.getObstaclesInRadius(
      position,
      this.EXPLOSION_RADIUS
    );

    affectedObstacles.forEach((obstacle) => {
      const distance = position.distanceTo(obstacle.position);
      const damageMultiplier = 1 - distance / this.EXPLOSION_RADIUS;
      const damage = Math.ceil(this.OBSTACLE_DAMAGE * damageMultiplier);

      for (let i = 0; i < damage; i++) {
        obstacle.userData.currentHits++;
      }

      if (obstacle.userData.currentHits >= obstacle.userData.hitPoints) {
        this.obstacleSystem.destroyObstacle(obstacle);
      } else {
        this.obstacleSystem.updateObstacleAppearance(obstacle);
      }
    });
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
    const explosionMaterial = new THREE.SpriteMaterial({
      map: this.explosionTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const explosion = new THREE.Sprite(explosionMaterial);
    explosion.position.copy(position);

    const initialScale = this.EXPLOSION_RADIUS;
    explosion.scale.set(initialScale, initialScale, 1);

    this.scene.add(explosion);

    this.handleExplosionDamage(position);

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

      explosion.material.opacity = 1 - progress;

      const currentScale = initialScale * (1 + progress);
      explosion.scale.set(currentScale, currentScale, 1);

      requestAnimationFrame(animateExplosion);
    };

    if (this.explosionSound && !this.explosionSound.isPlaying) {
      this.explosionSound.play();
    }

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

    if (this.explosionSound) {
      this.explosionSound.disconnect();
      this.explosionSound = null;
    }
  }
}
