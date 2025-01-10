import * as THREE from "three";

class MuzzleFlashParticle {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
  camera: THREE.Camera;
  rotationSpeed: number;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    scale: number,
    life: number,
    camera: THREE.Camera
  ) {
    this.mesh = new THREE.Mesh(geometry, material.clone());
    this.mesh.position.copy(position);
    this.velocity = velocity;
    this.life = life;
    this.maxLife = life;
    this.initialScale = scale;
    this.camera = camera;
    this.mesh.scale.setScalar(scale);
    this.rotationSpeed = (Math.random() - 0.5) * 20;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;

    if (this.life <= 0) return false;

    const lifeRatio = this.life / this.maxLife;

    const expansionCurve = Math.pow(1 - lifeRatio, 0.5);
    const scale = this.initialScale * (1 + expansionCurve * 1.5);
    this.mesh.scale.setScalar(scale);

    (this.mesh.material as THREE.Material).opacity = Math.pow(lifeRatio, 0.5);

    const speedMultiplier = Math.pow(lifeRatio, 0.3);
    this.mesh.position.add(
      this.velocity.clone().multiplyScalar(deltaTime * speedMultiplier)
    );

    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    this.mesh.lookAt(cameraPosition);

    this.mesh.rotateZ(this.rotationSpeed * deltaTime);

    return true;
  }
}

export class MuzzleFlashSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private particles: MuzzleFlashParticle[] = [];
  private flashTexture: THREE.Texture;
  private flashGeometry: THREE.PlaneGeometry;
  private flashMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    const textureLoader = new THREE.TextureLoader();
    this.flashTexture = textureLoader.load("/textures/muzzle-flash.png");

    this.flashGeometry = new THREE.PlaneGeometry(10, 10);
    this.flashMaterial = new THREE.MeshBasicMaterial({
      map: this.flashTexture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      color: 0xffff80,
    });
  }

  createFlash(position: THREE.Vector3, direction: THREE.Vector3) {
    const particleCount = 3;
    const forwardVector = direction.clone().normalize();
    const upVector = new THREE.Vector3(0, 1, 0);
    const rightVector = new THREE.Vector3()
      .crossVectors(forwardVector, upVector)
      .normalize();

    for (let i = 0; i < particleCount; i++) {
      const spreadAngle = Math.PI / 12;
      const horizontalAngle = (Math.random() - 0.5) * spreadAngle;
      const verticalAngle = (Math.random() - 0.5) * spreadAngle;

      const randomVelocity = new THREE.Vector3().copy(forwardVector);
      randomVelocity.applyAxisAngle(upVector, horizontalAngle);
      randomVelocity.applyAxisAngle(rightVector, verticalAngle);
      randomVelocity.multiplyScalar(Math.random() * 5 + 8);

      const particle = new MuzzleFlashParticle(
        this.flashGeometry,
        this.flashMaterial,
        position.clone(),
        randomVelocity,
        Math.random() * 1.5 + 0.5,
        Math.random() * 0.1 + 0.05,
        this.camera
      );

      this.particles.push(particle);
      this.scene.add(particle.mesh);
    }
  }

  update(deltaTime: number) {
    this.particles = this.particles.filter((particle) => {
      const isAlive = particle.update(deltaTime);
      if (!isAlive) {
        this.scene.remove(particle.mesh);
        particle.mesh.material.dispose();
      }
      return isAlive;
    });
  }

  cleanup() {
    this.particles.forEach((particle) => {
      this.scene.remove(particle.mesh);
      particle.mesh.material.dispose();
    });
    this.particles = [];
  }
}
