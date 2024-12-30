import * as THREE from "three";
const textureLoader = new THREE.TextureLoader();

const muzzleFlashTexture = textureLoader.load("/muzzle-flash.png");

export function createMuzzleFlash(gun: THREE.Object3D) {
  const flashGeometry = new THREE.PlaneGeometry(5, 5);
  const flashMaterial = new THREE.MeshBasicMaterial({
    map: muzzleFlashTexture,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);

  if (gun) {
    const gunWorldPos = new THREE.Vector3();
    const gunWorldDir = new THREE.Vector3();

    gun.getWorldPosition(gunWorldPos);
    gun.getWorldDirection(gunWorldDir);

    const muzzleOffset = gunWorldDir.clone().multiplyScalar(3.2);
    flashMesh.position.copy(gunWorldPos).add(muzzleOffset);

    flashMesh.lookAt(gunWorldPos.clone().add(gunWorldDir));

    flashMesh.rotation.z = Math.random() * Math.PI * 2;

    flashMesh.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1);
  }

  return flashMesh;
}
