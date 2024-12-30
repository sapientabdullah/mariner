import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AudioListener } from "three";

class ThreeManager {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  audioListener: AudioListener;
  private isRunning: boolean = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      1,
      20000
    );
    this.camera.position.set(30, 30, 100);

    this.audioListener = new AudioListener();
    this.camera.add(this.audioListener);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 10, 0);
    this.controls.minDistance = 40.0;
    this.controls.maxDistance = 200.0;
    this.controls.update();

    window.addEventListener("resize", this.handleResize.bind(this));
    this.start();
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
  }

  render() {
    if (this.isRunning) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export const threeManager = new ThreeManager();
