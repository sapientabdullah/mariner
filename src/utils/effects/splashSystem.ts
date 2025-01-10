import * as THREE from "three";

export class WaterSplashSystem {
  private readonly splashTexture: THREE.Texture;
  private readonly splashes: THREE.Sprite[] = [];
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.splashTexture = new THREE.TextureLoader().load(
      "/textures/boat-splash.png"
    );
  }

  private createSplashSprite(position: THREE.Vector3): THREE.Sprite {
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.splashTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      rotation: Math.PI / 2,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(8, 8, 1);
    sprite.position.copy(position);
    sprite.position.y = 1;

    const randomScale = 15 + Math.random() * 4;
    const randomLife = 0.8 + Math.random() * 0.4;

    sprite.userData = {
      age: 0,
      maxAge: randomLife,
      initialScale: randomScale,
      opacity: 0.5 + Math.random() * 0.4,
    };

    sprite.position.x += (Math.random() - 0.5) * 2;
    sprite.position.z += (Math.random() - 0.5) * 2;

    this.scene.add(sprite);
    this.splashes.push(sprite);
    return sprite;
  }

  public createSplashEffect(position: THREE.Vector3, direction: THREE.Vector3) {
    const rightOffset = new THREE.Vector3()
      .copy(direction)
      .cross(new THREE.Vector3(0, 1, 0))
      .multiplyScalar(15);
    const leftOffset = rightOffset.clone().multiplyScalar(-1);

    this.createSplashSprite(position.clone().add(rightOffset));
    this.createSplashSprite(position.clone().add(leftOffset));
  }

  public update(deltaTime: number) {
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i];
      splash.userData.age += deltaTime;

      const lifeRatio = splash.userData.age / splash.userData.maxAge;
      const scale = splash.userData.initialScale * (1 + lifeRatio * 0.5);
      splash.scale.set(scale, scale, 1);

      const material = splash.material as THREE.SpriteMaterial;
      material.opacity = splash.userData.opacity * (1 - lifeRatio);

      if (splash.userData.age >= splash.userData.maxAge) {
        this.scene.remove(splash);
        this.splashes.splice(i, 1);
      }
    }
  }
}
