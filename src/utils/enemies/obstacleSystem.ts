import * as THREE from "three";
import { ScoreSystem } from "../progression/scoringSystem";
import { ImprovedNoise } from "three/examples/jsm/Addons.js";
import { healthSystem } from "../../main";

abstract class BaseObstacle {
  protected group: THREE.Group;
  protected hitPoints: number;
  protected currentHits: number = 0;
  protected floatPhase: number;
  protected floatSpeed: number;
  protected originalY: number;

  constructor(
    protected scene: THREE.Scene,
    protected MIN_HITS: number,
    protected MAX_HITS: number
  ) {
    this.group = new THREE.Group();
    this.hitPoints = Math.floor(
      Math.random() * (MAX_HITS - MIN_HITS + 1) + MIN_HITS
    );
    this.floatPhase = Math.random() * Math.PI * 2;
    this.floatSpeed = 0.5 + Math.random() * 0.5;
    this.originalY = 3;

    this.createMesh();
    this.setupShadows();
    this.initializeUserData();
  }

  protected abstract createMesh(): void;

  protected setupShadows(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  protected initializeUserData(): void {
    this.group.userData = {
      floatPhase: this.floatPhase,
      floatSpeed: this.floatSpeed,
      originalY: this.originalY,
      hitPoints: this.hitPoints,
      currentHits: this.currentHits,
      type: this.constructor.name,
      lastCollisionTime: 0,
    };
  }

  public getGroup(): THREE.Group {
    return this.group;
  }
}

class BuoyObstacle extends BaseObstacle {
  protected createMesh(): void {
    const bodyGeometry = new THREE.CylinderGeometry(8, 8, 12, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xff0000),
      metalness: 0.3,
      roughness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 6;

    const topConeGeometry = new THREE.ConeGeometry(8, 6, 16);
    const topConeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xff0000),
      metalness: 0.3,
      roughness: 0.7,
    });
    const topCone = new THREE.Mesh(topConeGeometry, topConeMaterial);
    topCone.position.y = 15;

    const bottomCone = topCone.clone();
    bottomCone.rotation.x = Math.PI;
    bottomCone.position.y = -3;

    const stripeGeometry = new THREE.CylinderGeometry(8.2, 8.2, 2, 16);
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.5,
      roughness: 0.5,
    });

    const upperStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    upperStripe.position.y = 9;

    const lowerStripe = upperStripe.clone();
    lowerStripe.position.y = 3;

    const anchorGeometry = new THREE.CylinderGeometry(1, 1, 6, 8);
    const anchorMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2,
    });
    const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
    anchor.position.y = -6;

    this.group.add(body, topCone, bottomCone, upperStripe, lowerStripe, anchor);
  }
}

class MineObstacle extends BaseObstacle {
  protected createMesh(): void {
    const sphereGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x303030,
      metalness: 0.8,
      roughness: 0.2,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    const bodyGeometry = new THREE.CylinderGeometry(8, 8, 4, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x996633,
      metalness: 0.5,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    sphere.add(body);

    const spikeGeometry = new THREE.ConeGeometry(3, 12, 8);

    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0x663300,
      metalness: 0.8,
      roughness: 0.2,
    });

    const numSpikes = 12;
    const spikeDistance = 8;

    for (let i = 0; i < numSpikes; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);

      const phi = Math.acos(-1 + (2 * i) / numSpikes);
      const theta = Math.sqrt(numSpikes * Math.PI) * phi;

      const x = spikeDistance * Math.sin(phi) * Math.cos(theta);
      const y = spikeDistance * Math.sin(phi) * Math.sin(theta);
      const z = spikeDistance * Math.cos(phi);

      spike.position.set(x, y, z);
      spike.lookAt(new THREE.Vector3(0, 0, 0));
      spike.rotateX(-Math.PI / 2);
      sphere.add(spike);
    }

    const chainGeometry = new THREE.CylinderGeometry(0.5, 0.5, 20, 8);
    const chainMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2,
    });
    const chain = new THREE.Mesh(chainGeometry, chainMaterial);
    chain.position.y = -10;
    sphere.add(chain);

    this.group.add(sphere);
  }
}

class IcebergObstacle extends BaseObstacle {
  protected createMesh(): void {
    const geometry = new THREE.IcosahedronGeometry(12, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xc0e8ff,
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.8,
    });

    const iceberg = new THREE.Mesh(geometry, material);

    const positions = geometry.attributes.position;
    const noise = new ImprovedNoise();
    const noiseScale = 0.5;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const noiseValue = noise.noise(
        x * noiseScale,
        y * noiseScale,
        z * noiseScale
      );
      positions.setXYZ(
        i,
        x + noiseValue * 2,
        y + noiseValue * 2,
        z + noiseValue * 2
      );
    }

    geometry.computeVertexNormals();
    this.group.add(iceberg);
  }
}

export class ObstacleSystem {
  private obstacles: THREE.Group[] = [];
  private readonly OBSTACLE_COUNT = 10;
  private readonly SPAWN_DISTANCE = 300;
  private readonly DESPAWN_DISTANCE = 500;
  private readonly MIN_OBSTACLE_SPACING = 50;
  private readonly MIN_HITS_TO_DESTROY = 3;
  private readonly MAX_HITS_TO_DESTROY = 7;
  private readonly scene: THREE.Scene;
  private collisionSound: THREE.Audio | null = null;
  private explosionSound: THREE.Audio | null = null;
  private readonly textureLoader: THREE.TextureLoader;
  private readonly explosionTexture: THREE.Texture;
  private readonly scoreSystem: ScoreSystem;

  constructor(
    scene: THREE.Scene,
    scoreSystem: ScoreSystem,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.scoreSystem = scoreSystem;
    this.textureLoader = new THREE.TextureLoader();
    this.explosionTexture = this.textureLoader.load("/textures/explosion.webp");
    this.initializeSounds(camera);
    this.spawnObstacles();
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();

    try {
      const collisionSound = new THREE.Audio(listener);
      const buffer = await audioLoader.loadAsync("/audio/collision.mp3");
      collisionSound.setBuffer(buffer);
      collisionSound.setVolume(0.5);
      this.collisionSound = collisionSound;

      const explosionSound = new THREE.Audio(listener);
      const explosionBuffer = await audioLoader.loadAsync(
        "/audio/mine-explosion.mp3"
      );
      explosionSound.setBuffer(explosionBuffer);
      explosionSound.setVolume(0.7);
      this.explosionSound = explosionSound;
    } catch (error) {
      console.error("Error loading collision sound:", error);
    }
  }

  public getObstaclesInRadius(
    center: THREE.Vector3,
    radius: number
  ): THREE.Group[] {
    return this.obstacles.filter((obstacle) => {
      const distance = obstacle.position.distanceTo(center);
      return distance <= radius;
    });
  }

  public getObstacles(): THREE.Group[] {
    return this.obstacles;
  }

  private createObstacle(): THREE.Group {
    const obstacleTypes = [BuoyObstacle, MineObstacle, IcebergObstacle];
    const ObstacleClass =
      obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

    const obstacle = new ObstacleClass(
      this.scene,
      this.MIN_HITS_TO_DESTROY,
      this.MAX_HITS_TO_DESTROY
    );

    const obstacleGroup = obstacle.getGroup();
    this.scene.add(obstacleGroup);

    return obstacleGroup;
  }

  public checkBulletCollisions(bullets: THREE.Mesh[]): THREE.Mesh[] {
    const remainingBullets: THREE.Mesh[] = [];

    for (const bullet of bullets) {
      let bulletHit = false;

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obstacle = this.obstacles[i];
        const distance = bullet.position.distanceTo(obstacle.position);
        const hitDistance = 10;

        if (distance < hitDistance) {
          bulletHit = true;
          obstacle.userData.currentHits++;

          this.createHitEffect(bullet.position);

          if (obstacle.userData.currentHits >= obstacle.userData.hitPoints) {
            this.destroyObstacle(obstacle);
          } else {
            this.updateObstacleAppearance(obstacle);
          }
          break;
        }
      }

      if (!bulletHit) {
        remainingBullets.push(bullet);
      } else {
        this.scene.remove(bullet);
      }
    }

    return remainingBullets;
  }

  private createHitEffect(position: THREE.Vector3) {
    const particleGeometry = new THREE.SphereGeometry(0.2);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1,
    });

    for (let i = 0; i < 5; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);

      particle.position.x += (Math.random() - 0.5) * 2;
      particle.position.y += (Math.random() - 0.5) * 2;
      particle.position.z += (Math.random() - 0.5) * 2;

      this.scene.add(particle);

      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > 500) {
          this.scene.remove(particle);
          return;
        }

        const opacity = 1 - elapsed / 500;
        (particle.material as THREE.MeshBasicMaterial).opacity = opacity;
        particle.position.y += 0.1;

        requestAnimationFrame(animate);
      };

      animate();
    }
  }

  public updateObstacleAppearance(obstacle: THREE.Group) {
    const damageRatio =
      obstacle.userData.currentHits / obstacle.userData.hitPoints;

    obstacle.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material.color) {
          const intensity = 1 - damageRatio;
          child.material.color.setRGB(
            intensity,
            intensity * 0.5,
            intensity * 0.5
          );
        }
      }
    });
  }

  public destroyObstacle(obstacle: THREE.Group) {
    const index = this.obstacles.indexOf(obstacle);
    if (index !== -1) {
      this.scoreSystem.addEnemyKillScore(obstacle.position);
      if (obstacle.userData.type === "MineObstacle") {
        this.createExplosionEffect(obstacle.position);
        if (this.explosionSound && !this.explosionSound.isPlaying) {
          this.explosionSound.play();
        }
      }
      this.scene.remove(obstacle);
      this.obstacles.splice(index, 1);
    }
  }

  private createExplosionEffect(position: THREE.Vector3) {
    const particleCount = 8;
    const size = 100;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.explosionTexture,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < particleCount; i++) {
      const sprite = new THREE.Sprite(spriteMaterial.clone());
      sprite.scale.set(size, size, 1);
      sprite.position.copy(position);

      sprite.position.x += (Math.random() - 0.5) * 5;
      sprite.position.y += (Math.random() - 0.5) * 5;
      sprite.position.z += (Math.random() - 0.5) * 5;

      sprite.rotation.z = Math.random() * Math.PI * 2;

      const scale = 0.5 + Math.random() * 0.5;
      sprite.scale.multiplyScalar(scale);

      this.scene.add(sprite);

      const startTime = Date.now();
      const duration = 1000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > duration) {
          this.scene.remove(sprite);
          return;
        }

        const progress = elapsed / duration;

        const currentScale = size * (1 + progress) * scale;
        sprite.scale.set(currentScale, currentScale, 1);

        sprite.material.opacity = 1 - progress;

        requestAnimationFrame(animate);
      };

      animate();
    }
  }

  private spawnObstacles() {
    for (let i = 0; i < this.OBSTACLE_COUNT; i++) {
      const obstacle = this.createObstacle();
      const radius = 100 + Math.random() * 200;
      const angle = (Math.PI * 2 * i) / this.OBSTACLE_COUNT;
      obstacle.position.x = Math.cos(angle) * radius;
      obstacle.position.z = Math.sin(angle) * radius;
      this.obstacles.push(obstacle);
    }
  }

  public checkCollision(boat: THREE.Object3D): {
    collided: boolean;
    newSpeed: number;
  } {
    let currentSpeed = 0;
    let collided = false;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      const distance = boat.position.distanceTo(obstacle.position);
      const minDistance = 15;

      if (distance < minDistance) {
        if (
          !obstacle.userData.lastCollisionTime ||
          Date.now() - obstacle.userData.lastCollisionTime > 1000
        ) {
          if (obstacle.userData.type === "MineObstacle") {
            this.destroyObstacle(obstacle);
            this.createExplosionEffect(obstacle.position);
            healthSystem.takeDamage(20);
          } else {
            healthSystem.takeDamage(10);
            obstacle.userData.lastCollisionTime = Date.now();
          }

          if (this.collisionSound && !this.collisionSound.isPlaying) {
            this.collisionSound.play();
          }
        }

        const pushBack = new THREE.Vector3()
          .subVectors(boat.position, obstacle.position)
          .normalize()
          .multiplyScalar(minDistance - distance);

        boat.position.add(pushBack);
        currentSpeed *= 0.5;
        collided = true;
      }
    }

    return { collided, newSpeed: currentSpeed };
  }

  public update(deltaTime: number, boat: THREE.Object3D) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      const distanceToBoat = obstacle.position.distanceTo(boat.position);

      if (distanceToBoat > this.DESPAWN_DISTANCE) {
        this.scene.remove(obstacle);
        this.obstacles.splice(i, 1);
      }
    }

    const boatDirection = new THREE.Vector3(
      Math.sin(boat.rotation.y),
      0,
      Math.cos(boat.rotation.y)
    ).normalize();

    const spawnPoint = boat.position
      .clone()
      .add(boatDirection.multiplyScalar(this.SPAWN_DISTANCE));

    if (this.obstacles.length < this.OBSTACLE_COUNT) {
      const newObstacle = this.createObstacle();
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 100;

      newObstacle.position.x = spawnPoint.x + Math.cos(angle) * radius;
      newObstacle.position.z = spawnPoint.z + Math.sin(angle) * radius;

      let tooClose = false;
      for (const existingObstacle of this.obstacles) {
        if (
          newObstacle.position.distanceTo(existingObstacle.position) <
          this.MIN_OBSTACLE_SPACING
        ) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        this.obstacles.push(newObstacle);
      } else {
        this.scene.remove(newObstacle);
      }
    }

    for (const obstacle of this.obstacles) {
      if (obstacle.userData.floatPhase !== undefined) {
        obstacle.userData.floatPhase += deltaTime;
        obstacle.position.y =
          obstacle.userData.originalY +
          Math.sin(obstacle.userData.floatPhase) * 0.5;
      }
    }
  }
  public cleanup() {
    this.obstacles.forEach((obstacle) => this.scene.remove(obstacle));
    this.obstacles = [];

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
