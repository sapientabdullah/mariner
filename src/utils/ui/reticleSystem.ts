export class ReticleSystem {
  private reticleX: number;
  private reticleY: number;
  private reticleElement: SVGElement | null = null;
  private readonly RETICLE_SIZE = 100;
  private reticleOffsetX: number;
  private reticleOffsetY: number;

  constructor(offsetX = 0, offsetY = 0) {
    this.reticleOffsetX = offsetX;
    this.reticleOffsetY = offsetY;
    this.reticleX = window.innerWidth / 2 + this.reticleOffsetX;
    this.reticleY = window.innerHeight / 2 + this.reticleOffsetY;
    this.createReticle();
  }

  private createReticle(): void {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", `${this.RETICLE_SIZE}`);
    svg.setAttribute("height", `${this.RETICLE_SIZE}`);
    svg.setAttribute("class", "reticle");
    svg.style.position = "fixed";
    svg.style.pointerEvents = "none";
    svg.style.transform = "translate(-50%, -50%)";
    svg.style.left = `${this.reticleX}px`;
    svg.style.top = `${this.reticleY}px`;

    const reticleElements = [
      this.createSVGElement("circle", {
        cx: "50",
        cy: "50",
        r: "40",
        class: "reticle-circle",
      }),
      this.createSVGElement("circle", {
        cx: "50",
        cy: "50",
        r: "0.5",
        class: "reticle-center",
      }),
      this.createSVGElement("line", {
        x1: "0",
        y1: "50",
        x2: "100",
        y2: "50",
        class: "reticle-line",
      }),
      this.createSVGElement("line", {
        x1: "50",
        y1: "0",
        x2: "50",
        y2: "100",
        class: "reticle-line",
      }),
      ...[-20, -10, 10, 20].map((offset) =>
        this.createSVGElement("line", {
          x1: `${50 + offset}`,
          y1: "47.5",
          x2: `${50 + offset}`,
          y2: "52.5",
          class: "reticle-range-mark",
        })
      ),
      ...[-20, -10, 10, 20].map((offset) =>
        this.createSVGElement("line", {
          x1: "47.5",
          y1: `${50 + offset}`,
          x2: "52.5",
          y2: `${50 + offset}`,
          class: "reticle-range-mark",
        })
      ),
    ];

    reticleElements.forEach((element) => svg.appendChild(element));
    document.body.appendChild(svg);
    this.reticleElement = svg;

    const style = document.createElement("style");
    style.textContent = `
      .reticle {
        z-index: 9999;
      }
      .reticle-circle {
        fill: none;
        stroke: #00ff00;
        stroke-width: 0.5;
        opacity: 0.8;
      }
      .reticle-center {
        fill: #00ff00;
        opacity: 0.8;
      }
      .reticle-line {
        stroke: #00ff00;
        stroke-width: 0.5;
        opacity: 0.8;
      }
      .reticle-range-mark {
        stroke: #00ff00;
        stroke-width: 0.5;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
  }

  private createSVGElement(
    type: string,
    attributes: { [key: string]: string }
  ): SVGElement {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      type
    );
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }

  public updatePosition(movementX: number, movementY: number): void {
    if (this.reticleElement) {
      this.reticleX = Math.max(
        0,
        Math.min(this.reticleX + movementX, window.innerWidth)
      );
      this.reticleY = Math.max(
        0,
        Math.min(this.reticleY + movementY, window.innerHeight)
      );

      this.reticleElement.style.left = `${this.reticleX}px`;
      this.reticleElement.style.top = `${this.reticleY}px`;
    }
  }

  public handleResize(): void {
    this.centerReticle();
  }

  public toggleVisibility(visible: boolean): void {
    if (this.reticleElement) {
      this.reticleElement.style.display = visible ? "block" : "none";
    }
  }

  public centerReticle(): void {
    this.reticleX = window.innerWidth / 2 + this.reticleOffsetX;
    this.reticleY = window.innerHeight / 2 + this.reticleOffsetY;
    if (this.reticleElement) {
      this.reticleElement.style.left = `${this.reticleX}px`;
      this.reticleElement.style.top = `${this.reticleY}px`;
    }
  }
}
