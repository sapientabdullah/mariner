import * as THREE from "three";
import { createMuzzleFlash } from "../effects/createMuzzleFlash";
import { ObstacleSystem } from "../enemies/obstacleSystem";
import { EnemyBoatSystem } from "../enemies/enemyBoatSystem";
import { SmokeSystem } from "../effects/smokeSystem";
import { currentTurretAction } from "../../main";

export class BulletSystem {
  private scene: THREE.Scene;
  private bullets: THREE.Mesh[] = [];
  private gunSoundPool: THREE.Audio[] = [];
  private currentGunSoundIndex: number = 0;
  private lastFireTime: number = 0;
  private oceanWaterLevel: number;
  private textureLoader: THREE.TextureLoader;
  private splashTexture: THREE.Texture;
  private smokeSystem: SmokeSystem;

  private readonly BULLET_SPEED = 1000;
  private readonly BULLET_SIZE = 0.2;
  private readonly FIRE_RATE = 0.02;
  private readonly BULLET_LIFETIME = 1.5;
  private readonly MUZZLE_OFFSET = 30;
  private readonly BULLET_TRAIL_LENGTH = 15;
  private readonly GRAVITY = -9.81;
  private readonly GUNSHOT_POOL_SIZE = 8;

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
    this.smokeSystem = new SmokeSystem(scene, camera);
    this.bulletGeometry = new THREE.SphereGeometry(this.BULLET_SIZE);
    this.bulletMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff2200,
      emissiveIntensity: 2.5,
      metalness: 0.9,
      roughness: 0.1,
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

    if (currentTurretAction && !currentTurretAction.isRunning()) {
      currentTurretAction.reset();
      currentTurretAction.play();
    }

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
    this.smokeSystem.createSmoke(bullet.position.clone(), direction.clone());
    this.playGunSound();
  }

  private createBulletTrail() {
    const trail = new THREE.Group();

    for (let i = 0; i < this.BULLET_TRAIL_LENGTH; i++) {
      const radius = 0.15 * (1 - i / this.BULLET_TRAIL_LENGTH);
      const trailGeometry = new THREE.CylinderGeometry(
        radius,
        radius * 0.7,
        2,
        8,
        1
      );

      const segment = new THREE.Mesh(trailGeometry, this.trailMaterial.clone());

      segment.material.opacity = Math.pow(
        1 - i / this.BULLET_TRAIL_LENGTH,
        1.5
      );

      segment.position.x += (Math.random() - 0.5) * 0.1;
      segment.position.y += (Math.random() - 0.5) * 0.1;

      segment.rotateZ(Math.PI / 2);

      trail.add(segment);
    }

    return trail;
  }

  private createMuzzleFlashEffect(turret: THREE.Object3D) {
    const flashMesh = createMuzzleFlash(turret);
    this.scene.add(flashMesh);

    setTimeout(() => {
      flashMesh.material.opacity = 0;
    }, 30);
    setTimeout(() => {
      this.scene.remove(flashMesh);
    }, 50);
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

    this.smokeSystem.update(deltaTime);

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

        const direction = end.clone().sub(start).normalize();

        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        quaternion.setFromUnitVectors(up, direction);
        segment.setRotationFromQuaternion(quaternion);

        segment.rotateOnAxis(direction, Math.PI / 2);

        const baseOpacity = 1 - Math.pow(i / this.BULLET_TRAIL_LENGTH, 1.5);
        ((segment as THREE.Mesh).material as THREE.Material).opacity =
          baseOpacity * (0.9 + Math.random() * 0.2);
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
    this.smokeSystem.cleanup();
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
