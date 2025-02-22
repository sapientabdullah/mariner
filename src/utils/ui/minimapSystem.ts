import * as THREE from "three";

export class MinimapSystem {
  minimapRenderer: THREE.WebGLRenderer;
  minimapCamera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  radarOverlay: HTMLCanvasElement;
  radarContext: CanvasRenderingContext2D;
  radarAngle: number = 0;
  container: HTMLDivElement;
  private enemyPosition: THREE.Vector3 | null = null;
  minePositions: THREE.Vector3[] = [];
  sharkPositions: THREE.Vector3[] = [];
  blinkPhase: number = 0;

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
            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0.2; }
                100% { opacity: 1; }
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

  updateMinePositions(obstacles: THREE.Group[]) {
    this.minePositions = obstacles
      .filter((obstacle) => obstacle.userData.type === "MineObstacle")
      .map((mine) => mine.position.clone());
  }

  updateSharkPositions(sharks: THREE.Object3D[]) {
    this.sharkPositions = sharks.map((shark) => shark.position.clone());
  }

  private drawMineSignals() {
    const centerX = 100;
    const centerY = 100;

    this.blinkPhase += 0.05;
    const blinkIntensity = (Math.sin(this.blinkPhase) + 1) / 2;

    this.radarContext.save();

    for (const minePos of this.minePositions) {
      const dx = minePos.x - this.minimapCamera.position.x;
      const dz = minePos.z - this.minimapCamera.position.z;

      const scale = 0.5;
      const radarX = centerX + dx * scale;
      const radarY = centerY + dz * scale;
      const distanceToCenter = Math.sqrt(
        Math.pow(radarX - centerX, 2) + Math.pow(radarY - centerY, 2)
      );

      if (distanceToCenter <= 100) {
        this.radarContext.beginPath();
        this.radarContext.arc(radarX, radarY, 3, 0, Math.PI * 2);
        this.radarContext.fillStyle = `rgba(255, 50, 50, ${blinkIntensity})`;
        this.radarContext.fill();
        this.radarContext.beginPath();
        this.radarContext.arc(
          radarX,
          radarY,
          6 + blinkIntensity * 2,
          0,
          Math.PI * 2
        );
        this.radarContext.strokeStyle = `rgba(255, 50, 50, ${
          blinkIntensity * 0.5
        })`;
        this.radarContext.stroke();
      }
    }

    this.radarContext.restore();
  }

  private drawSharkSignals() {
    const centerX = 100;
    const centerY = 100;
    const blinkIntensity = (Math.sin(this.blinkPhase * 1.5) + 1) / 2; // Faster blink for sharks

    this.radarContext.save();

    for (const sharkPos of this.sharkPositions) {
      const dx = sharkPos.x - this.minimapCamera.position.x;
      const dz = sharkPos.z - this.minimapCamera.position.z;

      const scale = 0.5;
      const radarX = centerX + dx * scale;
      const radarY = centerY + dz * scale;
      const distanceToCenter = Math.sqrt(
        Math.pow(radarX - centerX, 2) + Math.pow(radarY - centerY, 2)
      );

      if (distanceToCenter <= 100) {
        this.radarContext.beginPath();
        this.radarContext.arc(radarX, radarY, 4, 0, Math.PI * 2);
        this.radarContext.fillStyle = `rgba(255, 255, 0, ${blinkIntensity})`;
        this.radarContext.fill();

        const triangleSize = 8 + blinkIntensity * 3;
        this.radarContext.beginPath();
        this.radarContext.moveTo(radarX, radarY - triangleSize);
        this.radarContext.lineTo(
          radarX - triangleSize / 2,
          radarY + triangleSize / 2
        );
        this.radarContext.lineTo(
          radarX + triangleSize / 2,
          radarY + triangleSize / 2
        );
        this.radarContext.closePath();
        this.radarContext.strokeStyle = `rgba(255, 255, 0, ${
          blinkIntensity * 0.7
        })`;
        this.radarContext.stroke();
      }
    }

    this.radarContext.restore();
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

    const radius = 100;

    ctx.strokeStyle = "rgba(48, 191, 48, 0.2)";
    for (let angle = 0; angle < 360; angle += 10) {
      if (angle % 30 !== 0) {
        const radian = (angle - 90) * (Math.PI / 180);
        const outerX = 100 + (radius - 2) * Math.cos(radian);
        const outerY = 100 + (radius - 2) * Math.sin(radian);
        const innerX = 100 + (radius - 5) * Math.cos(radian);
        const innerY = 100 + (radius - 5) * Math.sin(radian);

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
      }
    }
  }

  updateEnemyPosition(position: THREE.Vector3 | null) {
    this.enemyPosition = position;
  }

  private drawEnemySignal() {
    if (!this.enemyPosition) return;

    const centerX = 100;
    const centerY = 100;
    const blinkIntensity = (Math.sin(this.blinkPhase * 2) + 1) / 2;

    const dx = this.enemyPosition.x - this.minimapCamera.position.x;
    const dz = this.enemyPosition.z - this.minimapCamera.position.z;

    const scale = 0.5;
    const radarX = centerX + dx * scale;
    const radarY = centerY + dz * scale;
    const distanceToCenter = Math.sqrt(
      Math.pow(radarX - centerX, 2) + Math.pow(radarY - centerY, 2)
    );

    if (distanceToCenter <= 100) {
      this.radarContext.beginPath();
      this.radarContext.arc(radarX, radarY, 8, 0, Math.PI * 2);
      this.radarContext.strokeStyle = `rgba(255, 0, 0, ${
        blinkIntensity * 0.8
      })`;
      this.radarContext.lineWidth = 2;
      this.radarContext.stroke();

      this.radarContext.beginPath();
      this.radarContext.moveTo(radarX - 5, radarY);
      this.radarContext.lineTo(radarX + 5, radarY);
      this.radarContext.moveTo(radarX, radarY - 5);
      this.radarContext.lineTo(radarX, radarY + 5);
      this.radarContext.strokeStyle = `rgba(255, 0, 0, ${blinkIntensity})`;
      this.radarContext.lineWidth = 2;
      this.radarContext.stroke();

      this.radarContext.beginPath();
      this.radarContext.arc(radarX, radarY, 12, 0, Math.PI * 2);
      this.radarContext.strokeStyle = `rgba(255, 0, 0, ${
        blinkIntensity * 0.3
      })`;
      this.radarContext.lineWidth = 1;
      this.radarContext.stroke();
    }
  }

  private drawRadarSweep() {
    const noise = this.createNoise(200, 200);

    this.radarContext.clearRect(0, 0, 200, 200);
    this.radarContext.globalCompositeOperation = "source-over";

    const gradient = this.radarContext.createConicGradient(
      this.radarAngle,
      100,
      100
    );
    gradient.addColorStop(0, "rgba(48, 191, 48, 0.2)");
    gradient.addColorStop(0.8, "rgba(48, 191, 48, 0.1)");
    gradient.addColorStop(1, "rgba(48, 191, 48, 0)");

    this.radarContext.beginPath();
    this.radarContext.arc(100, 100, 100, 0, Math.PI * 2);
    this.radarContext.fillStyle = gradient;
    this.radarContext.fill();

    this.radarContext.globalCompositeOperation = "destination-in";
    this.radarContext.drawImage(noise, 0, 0);

    this.radarContext.globalCompositeOperation = "source-over";

    this.drawMineSignals();
    this.drawSharkSignals();
    this.drawEnemySignal();

    this.radarAngle += 0.02;
    if (this.radarAngle > Math.PI * 2) {
      this.radarAngle = 0;
    }
  }

  private createNoise(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = value;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  update(
    boatPosition: THREE.Vector3,
    obstacles: THREE.Group[],
    sharks: THREE.Object3D[],
    enemyPosition: THREE.Vector3 | null
  ) {
    this.minimapCamera.position.set(
      boatPosition.x,
      this.minimapCamera.position.y,
      boatPosition.z
    );

    this.updateMinePositions(obstacles);
    this.updateSharkPositions(sharks);
    this.updateEnemyPosition(enemyPosition);
    this.minimapRenderer.render(this.scene, this.minimapCamera);
    this.drawRadarSweep();
  }

  dispose() {
    document.body.removeChild(this.container);
  }
}
