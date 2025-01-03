import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { WaterSplashSystem } from "./splashSystem";
import { loadingManager } from "./managers/loadingManager";

export class EnemyBoatSystem {
  private enemyBoat: THREE.Object3D | null = null;
  private scene: THREE.Scene;
  private waterSplashSystem: WaterSplashSystem;
  private playerBoat: THREE.Object3D;
  private collisionSound: THREE.Audio | null = null;
  private explosionSound: THREE.Audio | null = null;
  private fireTexture: THREE.Texture | null = null;
  private camera: THREE.Camera;

  private maxHealth = 100;
  private currentHealth = 100;
  private isDestroyed = false;
  private fireParticles: THREE.Points[] = [];
  private smokeParticles: THREE.Points[] = [];

  private readonly ENEMY_SPEED = 20;
  private readonly ENEMY_ROTATION_SPEED = 0.02;
  private readonly DAMAGE_THRESHOLD = 30;

  constructor(
    scene: THREE.Scene,
    waterSplashSystem: WaterSplashSystem,
    playerBoat: THREE.Object3D,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.camera = camera;
    this.waterSplashSystem = waterSplashSystem;
    this.playerBoat = playerBoat;
    this.initializeSounds(camera);
    this.loadFireTexture();
    this.createEnemyBoat();
  }

  private loadFireTexture() {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    textureLoader.load("/textures/fire.png", (texture) => {
      this.fireTexture = texture;
    });
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const audioLoader = new THREE.AudioLoader();

    try {
      const collisionSound = new THREE.Audio(listener);
      const explosionSound = new THREE.Audio(listener);

      const [collisionBuffer, explosionBuffer] = await Promise.all([
        audioLoader.loadAsync("/audio/collision.mp3"),
        audioLoader.loadAsync("/audio/explosion.mp3"),
      ]);

      collisionSound.setBuffer(collisionBuffer);
      collisionSound.setVolume(0.5);
      this.collisionSound = collisionSound;

      explosionSound.setBuffer(explosionBuffer);
      explosionSound.setVolume(0.7);
      this.explosionSound = explosionSound;
    } catch (error) {
      console.error("Error loading sounds:", error);
    }
  }

  public checkBulletCollisions(bullets: THREE.Mesh[]): THREE.Mesh[] {
    if (!this.enemyBoat || this.isDestroyed) {
      return bullets;
    }

    const remainingBullets: THREE.Mesh[] = [];
    const hitDistance = 15;

    for (const bullet of bullets) {
      const distance = bullet.position.distanceTo(this.enemyBoat.position);

      if (distance < hitDistance) {
        const bulletDamage = 2;
        this.takeDamage(bulletDamage);

        this.createBulletHitEffect(bullet.position);

        this.scene.remove(bullet);
      } else {
        remainingBullets.push(bullet);
      }
    }

    return remainingBullets;
  }

  private createBulletHitEffect(position: THREE.Vector3) {
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 10;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      positions[i] = position.x + Math.cos(angle) * radius;
      positions[i + 1] = position.y + Math.random() * 2;
      positions[i + 2] = position.z + Math.sin(angle) * radius;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.5,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particleSystem);

    const startTime = performance.now();
    const duration = 500;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed > duration) {
        this.scene.remove(particleSystem);
        return;
      }

      const progress = elapsed / duration;
      const positions = particleSystem.geometry.attributes.position
        .array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.1;
      }

      particleSystem.geometry.attributes.position.needsUpdate = true;
      particleMaterial.opacity = 1 - progress;

      requestAnimationFrame(animate);
    };

    animate();
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

  public handleExplosion(
    explosionPosition: THREE.Vector3,
    explosionRadius: number
  ) {
    if (!this.enemyBoat || this.isDestroyed) return;

    const distance = this.enemyBoat.position.distanceTo(explosionPosition);
    if (distance <= explosionRadius) {
      const damage = Math.ceil(50 * (1 - distance / explosionRadius));
      this.takeDamage(damage);
    }
  }

  private takeDamage(amount: number) {
    if (this.isDestroyed) return;

    this.currentHealth = Math.max(0, this.currentHealth - amount);

    if (this.enemyBoat) {
      this.enemyBoat.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const material = (node as THREE.Mesh)
            .material as THREE.MeshStandardMaterial;
          if (material) {
            material.emissive.setRGB(1, 0, 0);
            setTimeout(() => {
              material.emissive.setRGB(0, 0, 0);
            }, 100);
          }
        }
      });
    }

    if (this.currentHealth <= this.DAMAGE_THRESHOLD) {
      this.showDamageEffects();
    }

    if (this.currentHealth <= 0) {
      this.destroyBoat();
    }
  }

  private showDamageEffects() {
    if (!this.enemyBoat) return;

    const smokeGeometry = new THREE.BufferGeometry();
    const smokeParticles = new Float32Array(300 * 3);
    for (let i = 0; i < 300 * 3; i += 3) {
      smokeParticles[i] = (Math.random() - 0.5) * 10;
      smokeParticles[i + 1] = Math.random() * 5;
      smokeParticles[i + 2] = (Math.random() - 0.5) * 10;
    }
    smokeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(smokeParticles, 3)
    );

    const smokeMaterial = new THREE.PointsMaterial({
      size: 2,
      color: 0x666666,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const smokeSystem = new THREE.Points(smokeGeometry, smokeMaterial);
    smokeSystem.position.copy(this.enemyBoat.position);
    this.scene.add(smokeSystem);
    this.smokeParticles.push(smokeSystem);
  }

  private destroyBoat() {
    if (!this.enemyBoat || this.isDestroyed) return;

    this.isDestroyed = true;

    if (this.explosionSound && !this.explosionSound.isPlaying) {
      this.explosionSound.play();
    }

    const fireGeometry = new THREE.BufferGeometry();
    const fireParticles = new Float32Array(500 * 3);
    const fireUVs = new Float32Array(500 * 2);

    for (let i = 0; i < 500; i++) {
      const i3 = i * 3;
      const i2 = i * 2;

      fireParticles[i3] = (Math.random() - 0.5) * 15;
      fireParticles[i3 + 1] = Math.random() * 10;
      fireParticles[i3 + 2] = (Math.random() - 0.5) * 15;

      fireUVs[i2] = Math.random();
      fireUVs[i2 + 1] = Math.random();
    }

    fireGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(fireParticles, 3)
    );
    fireGeometry.setAttribute("uv", new THREE.BufferAttribute(fireUVs, 2));

    const fireMaterial = new THREE.PointsMaterial({
      size: 5,
      map: this.fireTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
    });

    fireMaterial.alphaTest = 0.5;
    fireMaterial.sizeAttenuation = true;

    const fireSystem = new THREE.Points(fireGeometry, fireMaterial);
    fireSystem.position.copy(this.enemyBoat.position);
    this.scene.add(fireSystem);
    this.fireParticles.push(fireSystem);

    const sinkDuration = 5000;
    const startPosition = this.enemyBoat.position.clone();
    const startTime = performance.now();

    const animateSinking = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / sinkDuration, 1);

      if (this.enemyBoat) {
        this.enemyBoat.position.y = startPosition.y - progress * 10;
        this.enemyBoat.rotation.z = progress * (Math.PI / 4);

        this.fireParticles.forEach((fire) => {
          fire.position.copy(this.enemyBoat!.position);
          fire.position.y += 2;
        });

        if (progress < 1) {
          requestAnimationFrame(animateSinking);
        } else {
          this.scene.remove(this.enemyBoat);
          setTimeout(() => this.cleanup(), 2000);
        }
      }
    };

    animateSinking();
  }

  public update(deltaTime: number): {
    collisionOccurred: boolean;
    currentSpeed: number;
  } {
    if (!this.enemyBoat || this.isDestroyed) {
      return { collisionOccurred: false, currentSpeed: 0 };
    }

    this.fireParticles.forEach((particles) => {
      const positions = particles.geometry.attributes.position
        .array as Float32Array;
      const uvs = particles.geometry.attributes.uv.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += deltaTime * 10;
        if (positions[i + 1] > 20) {
          positions[i + 1] = 0;
          positions[i] = (Math.random() - 0.5) * 15;
          positions[i + 2] = (Math.random() - 0.5) * 15;
        }

        const uvIndex = (i / 3) * 2;
        uvs[uvIndex] = (uvs[uvIndex] + deltaTime) % 1;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.uv.needsUpdate = true;

      particles.quaternion.copy(
        this.camera.quaternion || new THREE.Quaternion()
      );
    });

    this.smokeParticles.forEach((particles) => {
      const positions = particles.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += deltaTime * 5;
        if (positions[i + 1] > 30) {
          positions[i + 1] = 0;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
    });

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

    const speedMultiplier = this.currentHealth / this.maxHealth;

    if (distanceToPlayer > minDistance) {
      this.enemyBoat.position.x +=
        directionToPlayer.x * this.ENEMY_SPEED * deltaTime * speedMultiplier;
      this.enemyBoat.position.z +=
        directionToPlayer.z * this.ENEMY_SPEED * deltaTime * speedMultiplier;

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

      if (this.collisionSound && !this.collisionSound.isPlaying) {
        this.collisionSound.play();
      }

      const collisionPoint = new THREE.Vector3()
        .addVectors(this.playerBoat.position, this.enemyBoat.position)
        .multiplyScalar(0.5);

      this.waterSplashSystem.createSplashEffect(
        collisionPoint,
        new THREE.Vector3(0, 1, 0)
      );
    }

    if (!this.isDestroyed) {
      const time = performance.now() * 0.001;
      const bobbingSpeed = 1.5;
      const bobbingAmount = 0.015;
      this.enemyBoat.position.y = 5 + Math.sin(time * bobbingSpeed) * 0.5;
      this.enemyBoat.rotation.z =
        Math.sin(time * bobbingSpeed * 0.5) * bobbingAmount;
      this.enemyBoat.rotation.x =
        Math.sin(time * bobbingSpeed * 0.7) * bobbingAmount * 0.5;
    }

    return { collisionOccurred, currentSpeed };
  }
  public cleanup() {
    this.fireParticles.forEach((particles) => this.scene.remove(particles));
    this.smokeParticles.forEach((particles) => this.scene.remove(particles));
    this.fireParticles = [];
    this.smokeParticles = [];

    if (this.collisionSound) {
      this.collisionSound.disconnect();
      this.collisionSound = null;
    }
    if (this.explosionSound) {
      this.explosionSound.disconnect();
      this.explosionSound = null;
    }
  }
}
