import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import { Audio, AudioListener, AudioLoader } from "three";

export class OceanSystem {
  water!: Water;
  oceanSound!: Audio;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, audioListener: AudioListener) {
    this.scene = scene;
    this.setupWater();
    this.setupOceanSound(audioListener);
  }

  private setupWater() {
    const waterGeometry = new THREE.PlaneGeometry(100000, 100000);

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        "/Water 0339.jpg",
        function (texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1000, 1000);
        }
      ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);
  }

  private setupOceanSound(audioListener: AudioListener) {
    this.oceanSound = new Audio(audioListener);

    const oceanAudioLoader = new AudioLoader();
    oceanAudioLoader.load("/Gentle Ocean Waves Mix 2018.mp3", (buffer) => {
      this.oceanSound.setBuffer(buffer);
      this.oceanSound.setLoop(true);
      this.oceanSound.setVolume(0.8);
      this.oceanSound.play();
    });
  }

  updateWaterPosition(boatPosition: THREE.Vector3) {
    const waterPosition = new THREE.Vector3(
      Math.floor(boatPosition.x / 2000) * 2000,
      0,
      Math.floor(boatPosition.z / 2000) * 2000
    );
    this.water.position.copy(waterPosition);
  }

  update() {
    this.water.material.uniforms["time"].value += 1.0 / 60.0;
  }

  playOceanSound() {
    if (this.oceanSound && !this.oceanSound.isPlaying) {
      this.oceanSound.play();
    }
  }
}
