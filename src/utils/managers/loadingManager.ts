import * as THREE from "three";
import { startGame } from "../../main";

export const loadingManager = new THREE.LoadingManager();

let isLoading = true;

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  isLoading = true;
  console.log(
    `Started loading file: ${url}.\nLoaded ${itemsLoaded} of ${itemsTotal} files.`
  );
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  console.log(`Loading file: ${url}.\nProgress: ${progress.toFixed(2)}%`);
  updateProgressBar(progress);
};

loadingManager.onLoad = () => {
  console.log("All resources loaded!");
  isLoading = false;
  document.getElementById("loading-screen")?.remove();

  // setTimeout(() => {
  //   const interfaceElement = document.getElementById("controls");
  //   if (interfaceElement) {
  //     interfaceElement.classList.remove("hidden");
  //   }
  // }, 1000);
  startGame();
};

loadingManager.onError = (url) => {
  console.error(`There was an error loading ${url}`);
};

function updateProgressBar(progress: number) {
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  if (progressText) {
    progressText.textContent = `${Math.round(progress)}%`;
  }
}

export function isLoadingComplete() {
  return !isLoading;
}
