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

  showControls();
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

function showControls() {
  const controls = document.getElementById("controls");
  if (controls) {
    controls.style.display = "block";
    setTimeout(() => {
      controls.classList.add("visible");
    }, 10);

    setTimeout(() => {
      controls.classList.remove("visible");
      setTimeout(() => {
        controls.style.display = "none";
      }, 500);
    }, 5000);
  }
}
