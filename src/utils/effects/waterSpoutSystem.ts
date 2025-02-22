import * as THREE from "three";

export class WaterSpoutSystem {
  private readonly scene: THREE.Scene;
  private spouts: THREE.Sprite[] = [];
  private readonly spoutTexture: THREE.Texture;
  private nextSpoutTime: number = 0;
  private readonly SPOUT_INTERVAL = 10000;
  private readonly SPOUT_LIFETIME = 3000; // 3 seconds per spout
  private readonly SPOUT_RANGE = 500;
  private readonly boatReference: THREE.Object3D;
  private whaleSounds: THREE.Audio[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    boatReference: THREE.Object3D
  ) {
    this.scene = scene;
    this.boatReference = boatReference;
    const textureLoader = new THREE.TextureLoader();
    this.spoutTexture = textureLoader.load("/textures/water-spout.png");
    this.initializeSounds(camera);
  }

  private async initializeSounds(camera: THREE.Camera) {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const whaleFiles = [
      "/audio/whale-1.mp3",
      "/audio/whale-2.mp3",
      "/audio/whale-3.mp3",
    ];

    const audioLoader = new THREE.AudioLoader();

    try {
      for (const soundFile of whaleFiles) {
        const whaleSound = new THREE.Audio(listener);
        const buffer = await audioLoader.loadAsync(soundFile);
        whaleSound.setBuffer(buffer);
        whaleSound.setVolume(0.5);
        this.whaleSounds.push(whaleSound);
      }
    } catch (error) {
      console.error("Error loading whale sounds:", error);
    }
  }

  private createSpout() {
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.spoutTexture,
      transparent: true,
      opacity: 1,
    });

    const sprite = new THREE.Sprite(spriteMaterial);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.SPOUT_RANGE;
    const x = this.boatReference.position.x + Math.cos(angle) * distance;
    const z = this.boatReference.position.z + Math.sin(angle) * distance;

    sprite.position.set(x, 0, z);
    sprite.scale.set(40, 80, 2);

    sprite.userData.creationTime = performance.now();
    sprite.userData.initialY = 0;
    sprite.userData.maxHeight = 30;

    this.scene.add(sprite);
    this.spouts.push(sprite);

    this.playRandomWhaleSound();
  }
  private playRandomWhaleSound() {
    if (this.whaleSounds.length === 0) return;

    const randomIndex = Math.floor(Math.random() * this.whaleSounds.length);
    const selectedSound = this.whaleSounds[randomIndex];

    if (!selectedSound.isPlaying) {
      selectedSound.play();
    }
  }

  update() {
    const currentTime = performance.now();

    if (currentTime > this.nextSpoutTime) {
      this.createSpout();
      this.nextSpoutTime =
        currentTime + this.SPOUT_INTERVAL + Math.random() * 5000;
    }

    this.spouts = this.spouts.filter((spout) => {
      const age = currentTime - spout.userData.creationTime;

      if (age > this.SPOUT_LIFETIME) {
        this.scene.remove(spout);
        return false;
      }

      const progress = age / this.SPOUT_LIFETIME;

      const heightProgress = Math.sin(progress * Math.PI);
      spout.position.y =
        spout.userData.initialY + spout.userData.maxHeight * heightProgress;

      if (progress > 0.7) {
        const fadeProgress = (1 - progress) / 0.3;
        (spout.material as THREE.SpriteMaterial).opacity = fadeProgress;
      }

      return true;
    });
  }
  public cleanup() {
    this.spouts.forEach((spout) => {
      this.scene.remove(spout);
    });
    this.spouts = [];

    this.whaleSounds.forEach((sound) => {
      sound.disconnect();
    });
    this.whaleSounds = [];
  }
}
