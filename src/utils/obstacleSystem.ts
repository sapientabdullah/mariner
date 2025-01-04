import * as THREE from "three";
import { ScoreSystem } from "./scoringSystem";

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

    const spikeGeometry = new THREE.ConeGeometry(2, 8, 8);
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0x303030,
      metalness: 0.8,
      roughness: 0.2,
    });

    for (let i = 0; i < 12; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.position.normalize().multiplyScalar(10);
      spike.lookAt(new THREE.Vector3(0, 0, 0));
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

    this.group.add(sphere, chain);
  }
}

class IcebergObstacle extends BaseObstacle {
  protected createMesh(): void {
    const geometry = new THREE.IcosahedronGeometry(12, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xc0e8ff,
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.8,
    });

    const iceberg = new THREE.Mesh(geometry, material);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      positions.setXYZ(
        i,
        x * (0.9 + Math.random() * 0.2),
        y * (0.9 + Math.random() * 0.2),
        z * (0.9 + Math.random() * 0.2)
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
  private scene: THREE.Scene;
  private collisionSound: THREE.Audio | null = null;
  private textureLoader: THREE.TextureLoader;
  private explosionTexture: THREE.Texture;
  private scoreSystem: ScoreSystem;

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
      this.createExplosionEffect(obstacle.position);
      this.scene.remove(obstacle);
      this.obstacles.splice(index, 1);
    }
  }

  private createExplosionEffect(position: THREE.Vector3) {
    const particleCount = 8;
    const size = 15;

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

    for (const obstacle of this.obstacles) {
      const distance = boat.position.distanceTo(obstacle.position);
      const minDistance = 15;

      if (distance < minDistance) {
        const pushBack = new THREE.Vector3()
          .subVectors(boat.position, obstacle.position)
          .normalize()
          .multiplyScalar(minDistance - distance);

        boat.position.add(pushBack);
        currentSpeed *= 0.5;
        collided = true;

        if (this.collisionSound && !this.collisionSound.isPlaying) {
          this.collisionSound.play();
        }
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
  }
}
