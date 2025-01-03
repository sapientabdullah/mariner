import * as THREE from "three";
import { createMuzzleFlash } from "./createMuzzleFlash";
import { ObstacleSystem } from "./obstacleSystem";
import { EnemyBoatSystem } from "./enemyBoatSystem";

export class BulletSystem {
  private scene: THREE.Scene;
  private bullets: THREE.Mesh[] = [];
  private gunSoundPool: THREE.Audio[] = [];
  private currentGunSoundIndex: number = 0;
  private lastFireTime: number = 0;
  private oceanWaterLevel: number;
  private textureLoader: THREE.TextureLoader;
  private splashTexture: THREE.Texture;

  private readonly BULLET_SPEED = 500;
  private readonly BULLET_SIZE = 0.5;
  private readonly FIRE_RATE = 0.1;
  private readonly BULLET_LIFETIME = 3;
  private readonly MUZZLE_OFFSET = 50;
  private readonly BULLET_TRAIL_LENGTH = 10;
  private readonly GRAVITY = -9.81;
  private readonly GUNSHOT_POOL_SIZE = 5;

  private readonly bulletGeometry: THREE.SphereGeometry;
  private readonly bulletMaterial: THREE.MeshStandardMaterial;
  private readonly trailMaterial: THREE.MeshBasicMaterial;

  constructor(
    scene: THREE.Scene,
    oceanWaterLevel: number,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.oceanWaterLevel = oceanWaterLevel;
    this.textureLoader = new THREE.TextureLoader();
    this.splashTexture = this.textureLoader.load("/textures/bullet-splash.png");
    this.bulletGeometry = new THREE.SphereGeometry(this.BULLET_SIZE);
    this.bulletMaterial = new THREE.MeshStandardMaterial({
      color: 0xff7700,
      emissive: 0xff4400,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.5,
    });

    this.initializeSounds(camera);
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();

    try {
      const buffer = await audioLoader.loadAsync("/audio/bullet-fire.wav");

      for (let i = 0; i < this.GUNSHOT_POOL_SIZE; i++) {
        const sound = new THREE.Audio(listener);
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(0.3);
        this.gunSoundPool.push(sound);
      }
    } catch (error) {
      console.error("Error loading gunshot sounds:", error);
    }
  }

  public canFire(): boolean {
    const currentTime = performance.now();
    if (currentTime - this.lastFireTime > this.FIRE_RATE * 1000) {
      this.lastFireTime = currentTime;
      return true;
    }
    return false;
  }

  createBullet(turret: THREE.Object3D) {
    if (!turret || !this.canFire()) return;

    const bullet = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial);
    const trail = this.createBulletTrail();
    bullet.add(trail);

    const turretWorldPos = new THREE.Vector3();
    turret.getWorldPosition(turretWorldPos);

    const turretQuaternion = turret.getWorldQuaternion(new THREE.Quaternion());
    const muzzleOffset = new THREE.Vector3(0, 10, this.MUZZLE_OFFSET);
    muzzleOffset.applyQuaternion(turretQuaternion);

    bullet.position.copy(turretWorldPos).add(muzzleOffset);

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(turretQuaternion);

    bullet.userData.velocity = direction.multiplyScalar(this.BULLET_SPEED);
    bullet.userData.positions = [];
    bullet.userData.creationTime = performance.now();

    this.scene.add(bullet);
    this.bullets.push(bullet);

    this.createMuzzleFlashEffect(turret);
    this.playGunSound();
  }

  private createBulletTrail() {
    const trailGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
    const trail = new THREE.Group();

    for (let i = 0; i < this.BULLET_TRAIL_LENGTH; i++) {
      const segment = new THREE.Mesh(trailGeometry, this.trailMaterial.clone());
      segment.material.opacity = 1 - i / this.BULLET_TRAIL_LENGTH;
      trail.add(segment);
    }

    return trail;
  }

  private createMuzzleFlashEffect(turret: THREE.Object3D) {
    const flashMesh = createMuzzleFlash(turret);
    this.scene.add(flashMesh);

    setTimeout(() => {
      flashMesh.material.opacity = 0;
    }, 50);
    setTimeout(() => {
      this.scene.remove(flashMesh);
    }, 100);
  }

  private playGunSound() {
    if (this.gunSoundPool.length > 0) {
      const currentSound = this.gunSoundPool[this.currentGunSoundIndex];
      if (currentSound) {
        if (currentSound.isPlaying) {
          currentSound.stop();
        }
        currentSound.play();
      }
      this.currentGunSoundIndex =
        (this.currentGunSoundIndex + 1) % this.GUNSHOT_POOL_SIZE;
    }
  }

  update(
    deltaTime: number,
    obstacleSystem: ObstacleSystem,
    enemyBoatSystem: EnemyBoatSystem
  ) {
    const currentTime = performance.now();

    this.bullets = this.bullets.filter((bullet) => {
      bullet.userData.velocity.y += this.GRAVITY * deltaTime;
      this.updateBulletTrail(bullet);

      const movement = bullet.userData.velocity
        .clone()
        .multiplyScalar(deltaTime);
      bullet.position.add(movement);

      if (bullet.position.y <= this.oceanWaterLevel) {
        this.createBulletSplash(bullet.position);
        this.scene.remove(bullet);
        return false;
      }

      const age = (currentTime - bullet.userData.creationTime) / 1000;
      if (age > this.BULLET_LIFETIME) {
        this.scene.remove(bullet);
        return false;
      }

      return true;
    });

    if (obstacleSystem) {
      this.bullets = obstacleSystem.checkBulletCollisions(this.bullets);
    }
    if (enemyBoatSystem) {
      this.bullets = enemyBoatSystem.checkBulletCollisions(this.bullets);
    }
  }

  private updateBulletTrail(bullet: THREE.Mesh) {
    bullet.userData.positions.unshift(bullet.position.clone());
    if (bullet.userData.positions.length > this.BULLET_TRAIL_LENGTH) {
      bullet.userData.positions.pop();
    }

    const trail = bullet.children[0] as THREE.Group;
    trail.children.forEach((segment, i) => {
      if (bullet.userData.positions[i] && bullet.userData.positions[i + 1]) {
        const start = bullet.userData.positions[i];
        const end = bullet.userData.positions[i + 1];

        segment.position.copy(start);
        segment.lookAt(end);
        segment.rotateX(Math.PI / 2);

        ((segment as THREE.Mesh).material as THREE.Material).opacity =
          1 - i / this.BULLET_TRAIL_LENGTH;
      }
    });
  }

  private createBulletSplash(position: THREE.Vector3) {
    const splashSize = 5;
    const splashGeometry = new THREE.PlaneGeometry(splashSize, splashSize);
    const splashMaterial = new THREE.MeshBasicMaterial({
      map: this.splashTexture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const splash = new THREE.Mesh(splashGeometry, splashMaterial);
    splash.position.copy(position);
    splash.position.y = this.oceanWaterLevel + 0.1;

    // Faces the camera
    splash.rotation.x = -Math.PI / 2;

    splash.userData.creationTime = performance.now();
    splash.userData.lifetime = 1.0; // Duration in s

    const animate = () => {
      const age = (performance.now() - splash.userData.creationTime) / 1000;
      const lifeRatio = age / splash.userData.lifetime;

      if (lifeRatio >= 1) {
        this.scene.remove(splash);
        return;
      }

      // Scale up the splash over time
      const scale = 1 + lifeRatio * 2;
      splash.scale.set(scale, scale, scale);

      splashMaterial.opacity = 1 - lifeRatio;

      requestAnimationFrame(animate);
    };

    this.scene.add(splash);
    animate();

    return splash;
  }

  cleanup() {
    this.bullets.forEach((bullet) => this.scene.remove(bullet));
    this.bullets = [];
    this.gunSoundPool.forEach((sound) => {
      sound.disconnect();
    });
    this.gunSoundPool = [];
  }

  getBullets() {
    return this.bullets;
  }
}
