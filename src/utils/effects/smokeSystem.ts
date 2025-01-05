import * as THREE from "three";

class SmokeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
  camera: THREE.Camera;

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
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;

    if (this.life <= 0) return false;

    const lifeRatio = this.life / this.maxLife;

    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.mesh.position.y += deltaTime * 2;

    const scale = this.initialScale * (1 + (1 - lifeRatio) * 2);
    this.mesh.scale.setScalar(scale);

    (this.mesh.material as THREE.Material).opacity = lifeRatio * 0.5;

    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    this.mesh.lookAt(cameraPosition);

    this.mesh.rotateZ(deltaTime * 0.5);

    return true;
  }
}

export class SmokeSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private particles: SmokeParticle[] = [];
  private smokeTexture: THREE.Texture;
  private smokeGeometry: THREE.PlaneGeometry;
  private smokeMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    const textureLoader = new THREE.TextureLoader();
    this.smokeTexture = textureLoader.load("/textures/smoke.png");

    this.smokeGeometry = new THREE.PlaneGeometry(1, 1);
    this.smokeMaterial = new THREE.MeshBasicMaterial({
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }

  createSmoke(position: THREE.Vector3, direction: THREE.Vector3) {
    const particleCount = 5;
    const forwardVector = direction.clone().normalize();
    const upVector = new THREE.Vector3(0, 1, 0);
    const rightVector = new THREE.Vector3()
      .crossVectors(forwardVector, upVector)
      .normalize();

    for (let i = 0; i < particleCount; i++) {
      const spreadAngle = Math.PI / 6;
      const horizontalAngle = (Math.random() - 0.5) * spreadAngle;
      const verticalAngle = (Math.random() - 0.5) * spreadAngle;

      let randomVelocity = new THREE.Vector3().copy(forwardVector);
      randomVelocity.applyAxisAngle(upVector, horizontalAngle);
      randomVelocity.applyAxisAngle(rightVector, verticalAngle);
      randomVelocity.multiplyScalar(Math.random() * 2 + 1);

      randomVelocity.add(new THREE.Vector3(0, 0.5, 0));

      const particle = new SmokeParticle(
        this.smokeGeometry,
        this.smokeMaterial,
        position.clone(),
        randomVelocity,
        Math.random() * 2 + 1,
        Math.random() * 0.5 + 0.5,
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
