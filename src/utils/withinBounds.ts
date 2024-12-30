import * as THREE from "three";

export function isWithinBounds(position: THREE.Vector3): boolean {
  const maxX = 4700;
  const maxZ = 4700;

  return Math.abs(position.x) < maxX && Math.abs(position.z) < maxZ;
}
