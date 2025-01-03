import * as THREE from "three";

export class MinimapSystem {
  minimapRenderer: THREE.WebGLRenderer;
  minimapCamera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  radarOverlay: HTMLCanvasElement;
  radarContext: CanvasRenderingContext2D;
  radarAngle: number = 0;
  container: HTMLDivElement;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.bottom = "20px";
    this.container.style.right = "20px";
    this.container.style.width = "200px";
    this.container.style.height = "200px";
    this.container.style.borderRadius = "50%";
    this.container.style.overflow = "hidden";
    this.container.style.border = "3px solid #333333";
    this.container.style.boxShadow = `            
            0 0 20px rgba(0, 0, 0, 0.5),
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            inset 0 0 10px rgba(255, 255, 255, 0.1);`;
    this.container.style.backdropFilter = "blur(5px)";

    this.minimapRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.minimapRenderer.setSize(200, 200);
    this.minimapRenderer.setClearColor(0x000000, 0.1);
    const minimapElement = this.minimapRenderer.domElement;
    minimapElement.style.position = "absolute";
    minimapElement.style.opacity = "0.5";
    this.container.appendChild(minimapElement);

    this.radarOverlay = document.createElement("canvas");
    this.radarOverlay.width = 200;
    this.radarOverlay.height = 200;
    this.radarOverlay.style.position = "absolute";
    this.radarOverlay.style.pointerEvents = "none";
    this.radarContext = this.radarOverlay.getContext("2d")!;
    this.container.appendChild(this.radarOverlay);

    const scanline = document.createElement("div");
    scanline.style.position = "absolute";
    scanline.style.top = "0";
    scanline.style.left = "0";
    scanline.style.right = "0";
    scanline.style.bottom = "0";
    scanline.style.background =
      "linear-gradient(transparent, rgba(48, 191, 48, 0.2), transparent)";
    scanline.style.animation = "scan 4s linear infinite";
    this.container.appendChild(scanline);

    const gridOverlay = document.createElement("canvas");
    gridOverlay.width = 200;
    gridOverlay.height = 200;
    gridOverlay.style.position = "absolute";
    const gridContext = gridOverlay.getContext("2d")!;
    this.drawGrid(gridContext);
    this.container.appendChild(gridOverlay);

    const style = document.createElement("style");
    style.textContent = `
            @keyframes scan {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100%); }
            }
        `;
    document.head.appendChild(style);

    document.body.appendChild(this.container);

    this.minimapCamera = new THREE.OrthographicCamera(
      -100,
      100,
      100,
      -100,
      1,
      1000
    );
    this.minimapCamera.position.set(0, 200, 0);
    this.minimapCamera.lookAt(0, 0, 0);
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "rgba(48, 191, 48, 0.3)";
    ctx.lineWidth = 1;

    for (let r = 25; r <= 100; r += 25) {
      ctx.beginPath();
      ctx.arc(100, 100, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.lineTo(100, 200);
    ctx.moveTo(0, 100);
    ctx.lineTo(200, 100);
    ctx.stroke();
  }

  private drawRadarSweep() {
    this.radarContext.clearRect(0, 0, 200, 200);

    const gradient = this.radarContext.createConicGradient(
      this.radarAngle,
      100,
      100
    );
    gradient.addColorStop(0, "rgba(48, 191, 48, 0.2)");
    gradient.addColorStop(0.5, "rgba(48, 191, 48, 0)");
    gradient.addColorStop(1, "rgba(48, 191, 48, 0)");

    this.radarContext.beginPath();
    this.radarContext.arc(100, 100, 100, 0, Math.PI * 2);
    this.radarContext.fillStyle = gradient;
    this.radarContext.fill();

    this.radarAngle += 0.02;
    if (this.radarAngle > Math.PI * 2) {
      this.radarAngle = 0;
    }
  }

  update(boatPosition: THREE.Vector3) {
    this.minimapCamera.position.set(
      boatPosition.x,
      this.minimapCamera.position.y,
      boatPosition.z
    );

    this.minimapRenderer.render(this.scene, this.minimapCamera);

    this.drawRadarSweep();
  }

  dispose() {
    document.body.removeChild(this.container);
  }
}
