import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";

export class SkySystem {
  private sun: THREE.Vector3;
  private sky: Sky;
  private pmremGenerator: THREE.PMREMGenerator;
  private parameters: { elevation: number; azimuth: number };
  private water: Water;
  private scene: THREE.Scene;
  private lastUpdateTime: number;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, water: Water) {
    this.scene = scene;
    this.water = water;
    this.sun = new THREE.Vector3();
    this.lastUpdateTime = Date.now();

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);

    const skyUniforms = this.sky.material.uniforms;
    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    this.parameters = {
      elevation: 0,
      azimuth: 180,
    };

    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.updateSun();
    this.setupGUI();
  }

  private updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - this.parameters.elevation);
    const theta = THREE.MathUtils.degToRad(this.parameters.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
    this.water.material.uniforms["sunDirection"].value
      .copy(this.sun)
      .normalize();

    if (this.scene.environment) this.scene.environment.dispose();

    const renderTarget = this.pmremGenerator.fromScene(this.sky);
    this.scene.environment = renderTarget.texture;
  }

  public update(camera: THREE.Camera) {
    this.sky.position.copy(camera.position);

    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime >= 60000) {
      if (this.parameters.elevation < 3) {
        this.parameters.elevation += 0.1;
        this.updateSun();
      }
      this.lastUpdateTime = currentTime;
    }
  }

  private setupGUI() {
    const gui = new GUI();
    const folderSky = gui.addFolder("Sky");

    folderSky
      .add(this.parameters, "elevation", 0, 90, 0.1)
      .onChange(() => this.updateSun())
      .listen();

    folderSky
      .add(this.parameters, "azimuth", -180, 180, 0.1)
      .onChange(() => this.updateSun());

    folderSky.open();

    const waterUniforms = this.water.material.uniforms;
    const folderWater = gui.addFolder("Water");

    folderWater
      .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
      .name("distortionScale");

    folderWater
      .add(waterUniforms.size, "value", 0.1, 10, 0.1)
      .name("size")
      .listen();

    folderWater.open();
  }
}
