import * as THREE from "three";
import { EnemyBoatSystem } from "../enemies/enemyBoatSystem";
import { ObstacleSystem } from "../enemies/obstacleSystem";
import { SharkSystem } from "../enemies/sharkSystem";

export class BombSystem {
  private bombs: THREE.Mesh[] = [];
  private lastBombTime: number = 0;
  private scene: THREE.Scene;
  private enemyBoatSystem: EnemyBoatSystem;
  private obstacleSystem: ObstacleSystem;
  private sharkSystem: SharkSystem;
  private explosionTexture: THREE.Texture;
  private splashTexture: THREE.Texture;
  private explosionSound: THREE.Audio | null = null;
  private firingSound: THREE.Audio | null = null;
  private readonly BOMB_COOLDOWN = 5000;
  private readonly BOMB_SIZE = 2;
  private readonly BOMB_SPEED = 200;
  private readonly EXPLOSION_RADIUS = 700;
  private readonly GRAVITY = -9.81;
  private readonly OBSTACLE_DAMAGE = 5;

  private bombGeometry = new THREE.CylinderGeometry(
    this.BOMB_SIZE,
    this.BOMB_SIZE,
    4,
    12
  );
  private bombMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.5,
    metalness: 1,
    emissive: 0x222222,
  });

  constructor(
    scene: THREE.Scene,
    enemyBoatSystem: EnemyBoatSystem,
    obstacleSystem: ObstacleSystem,
    sharkSystem: SharkSystem,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.enemyBoatSystem = enemyBoatSystem;
    this.obstacleSystem = obstacleSystem;
    this.sharkSystem = sharkSystem;
    const textureLoader = new THREE.TextureLoader();
    this.explosionTexture = textureLoader.load("/textures/bomb-explosion.png");
    this.splashTexture = textureLoader.load("/textures/bullet-splash.png");
    this.initializeSounds(camera);
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();

    try {
      const explosionSound = new THREE.Audio(listener);
      const explosionBuffer = await audioLoader.loadAsync(
        "/audio/explosion.mp3"
      );
      explosionSound.setBuffer(explosionBuffer);
      explosionSound.setVolume(0.5);
      this.explosionSound = explosionSound;

      const firingSound = new THREE.Audio(listener);
      const firingBuffer = await audioLoader.loadAsync("/audio/bomb-fire.mp3");
      firingSound.setBuffer(firingBuffer);
      firingSound.setVolume(1);
      this.firingSound = firingSound;
    } catch (error) {
      console.error("Error loading sounds:", error);
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

    if (this.enemyBoatSystem) {
      this.enemyBoatSystem.handleExplosion(position, this.EXPLOSION_RADIUS);
    }

    if (this.sharkSystem) {
      this.sharkSystem.handleExplosion(position, this.EXPLOSION_RADIUS);
    }
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

    bomb.rotation.x = Math.random() * Math.PI;
    bomb.rotation.y = Math.random() * Math.PI;
    bomb.rotation.z = Math.random() * Math.PI;

    bomb.scale.set(3, 3, 3);

    this.scene.add(bomb);
    this.bombs.push(bomb);
    this.lastBombTime = currentTime;

    if (this.firingSound && !this.firingSound.isPlaying) {
      this.firingSound.play();
    }
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

    const initialScale = 100;
    explosion.scale.set(initialScale, initialScale, 1);

    this.scene.add(explosion);

    this.handleExplosionDamage(position);

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

  private createWaterSplash(position: THREE.Vector3) {
    const splashMaterial = new THREE.SpriteMaterial({
      map: this.splashTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const splash = new THREE.Sprite(splashMaterial);
    splash.position.copy(position);

    const initialScale = 200;
    splash.scale.set(initialScale, initialScale, 1);

    this.scene.add(splash);

    const startTime = performance.now();
    const duration = 800;

    const animateSplash = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        this.scene.remove(splash);
        return;
      }

      splash.material.opacity = 1 - progress; // Fade out the splash
      const currentScale = initialScale * (1 + progress * 2); // Increase size
      splash.scale.set(currentScale, currentScale, 1);

      requestAnimationFrame(animateSplash);
    };

    animateSplash();
  }

  update(deltaTime: number, waterLevel: number) {
    this.bombs = this.bombs.filter((bomb) => {
      bomb.userData.velocity.y += this.GRAVITY * deltaTime;
      const movement = bomb.userData.velocity.clone().multiplyScalar(deltaTime);
      bomb.position.add(movement);

      const rotationSpeed = bomb.userData.velocity.length() * 0.005;
      bomb.rotation.x += rotationSpeed * deltaTime;
      bomb.rotation.y += rotationSpeed * deltaTime;
      bomb.rotation.z += rotationSpeed * deltaTime;

      if (bomb.position.y <= waterLevel) {
        this.createExplosion(bomb.position);
        this.createWaterSplash(bomb.position);
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
    if (this.firingSound) {
      this.firingSound.disconnect();
      this.firingSound = null;
    }
  }
}
