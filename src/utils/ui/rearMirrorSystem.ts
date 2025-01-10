import * as THREE from "three";

export class RearViewMirrorSystem {
  private readonly rearCamera: THREE.PerspectiveCamera;
  private mirrorWidth: number;
  private mirrorHeight: number;
  private readonly boat: THREE.Object3D;

  constructor(boat: THREE.Object3D) {
    this.boat = boat;
    this.mirrorWidth = window.innerWidth / 3;
    this.mirrorHeight = this.mirrorWidth / 4;

    this.rearCamera = new THREE.PerspectiveCamera(
      75,
      this.mirrorWidth / this.mirrorHeight,
      1,
      65000
    );
  }

  update() {
    if (!this.boat) return;

    const boatDirection = new THREE.Vector3(
      -Math.sin(this.boat.rotation.y),
      0,
      -Math.cos(this.boat.rotation.y)
    ).normalize();

    const cameraHeight = 25;
    const cameraDistance = 50;

    const cameraPosition = new THREE.Vector3(
      this.boat.position.x + boatDirection.x * cameraDistance,
      this.boat.position.y + cameraHeight,
      this.boat.position.z + boatDirection.z * cameraDistance
    );

    this.rearCamera.position.copy(cameraPosition);

    const lookDistance = 100;
    const lookAtPosition = new THREE.Vector3(
      this.boat.position.x + boatDirection.x * lookDistance,
      this.boat.position.y + 5,
      this.boat.position.z + boatDirection.z * lookDistance
    );

    this.rearCamera.lookAt(lookAtPosition);
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    const currentViewport = renderer.getViewport(new THREE.Vector4());

    const x = (window.innerWidth - this.mirrorWidth) / 2;
    const y = window.innerHeight - this.mirrorHeight - 65;

    renderer.setViewport(x, y, this.mirrorWidth, this.mirrorHeight);
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, this.mirrorWidth, this.mirrorHeight);

    renderer.render(scene, this.rearCamera);

    renderer.setScissorTest(false);
    renderer.setViewport(currentViewport);
  }

  handleResize() {
    this.mirrorWidth = window.innerWidth / 3;
    this.mirrorHeight = this.mirrorWidth / 4;

    this.rearCamera.aspect = this.mirrorWidth / this.mirrorHeight;
    this.rearCamera.updateProjectionMatrix();
  }
}
