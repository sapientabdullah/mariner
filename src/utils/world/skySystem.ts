import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";

export class SkySystem {
  private readonly sun: THREE.Vector3;
  private readonly sky: Sky;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly parameters: { elevation: number; azimuth: number };
  private readonly water: Water;
  private readonly scene: THREE.Scene;
  private elevationSlider: HTMLInputElement | null;
  private elevationValue: HTMLSpanElement | null;

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    water: Water,
    showGUI: boolean = false
  ) {
    this.scene = scene;
    this.water = water;
    this.sun = new THREE.Vector3();

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

    this.elevationSlider = document.getElementById(
      "sun-elevation"
    ) as HTMLInputElement;
    this.elevationValue = document.querySelector(
      ".elevation-value"
    ) as HTMLSpanElement;

    if (this.elevationSlider && this.elevationValue) {
      this.elevationSlider.value = this.parameters.elevation.toString();
      this.elevationValue.textContent = `${this.parameters.elevation}°`;

      this.elevationSlider.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        this.parameters.elevation = parseFloat(target.value);
        this.elevationValue!.textContent = `${Math.round(
          this.parameters.elevation
        )}°`;
        this.updateSun();
      });
    }

    this.updateSun();
    if (showGUI) {
      this.setupGUI();
    }
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

    const skyScene = new THREE.Scene();
    skyScene.add(this.sky);

    const renderTarget = this.pmremGenerator.fromScene(skyScene);
    this.scene.environment = renderTarget.texture;

    skyScene.remove(this.sky);
    this.scene.add(this.sky);
  }

  public setElevation(value: number) {
    if (this.elevationSlider && this.elevationValue) {
      this.parameters.elevation = value;
      this.elevationSlider.value = value.toString();
      this.elevationValue.textContent = `${Math.round(value)}°`;
      this.updateSun();
    }
  }

  public update(camera: THREE.Camera) {
    this.sky.position.copy(camera.position);
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
