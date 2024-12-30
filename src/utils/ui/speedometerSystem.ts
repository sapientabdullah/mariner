export class SpeedometerSystem {
  private speedElement!: HTMLDivElement;
  private dialElement!: HTMLDivElement;
  private needleElement!: HTMLDivElement;
  private speedTextElement!: HTMLDivElement;
  private maxSpeed: number;

  constructor(maxSpeed: number) {
    this.maxSpeed = maxSpeed;
    this.createSpeedometerHTML();
  }

  private createSpeedometerHTML() {
    this.speedElement = document.createElement("div");
    this.speedElement.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 200px;
        height: 200px;
        background: linear-gradient(145deg,
            rgba(0, 0, 0, 0.9) 0%,
            rgba(20, 20, 20, 0.9) 50%,
            rgba(0, 0, 0, 0.9) 100%
        );
        border-radius: 50%;
        border: 3px solid #333333;
        box-shadow:
            0 0 20px rgba(0, 0, 0, 0.5),
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            inset 0 0 10px rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(5px);
    `;

    this.dialElement = document.createElement("div");
    this.dialElement.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background:
            radial-gradient(circle at center,
                rgba(40, 40, 40, 0.6) 0%,
                rgba(20, 20, 20, 0.8) 80%,
                rgba(0, 0, 0, 0.8) 100%
            );
    `;

    const innerRing = document.createElement("div");
    innerRing.style.cssText = `
        position: absolute;
        width: 85%;
        height: 85%;
        left: 7.5%;
        top: 7.5%;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.1);
        box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
    `;
    this.dialElement.appendChild(innerRing);

    this.needleElement = document.createElement("div");
    this.needleElement.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        left: 50%;
        bottom: 50%;
        transform-origin: 50% 100%;
        transform: rotate(-120deg);
        transition: transform 0.1s ease-out;
    `;

    const needleShape = document.createElement("div");
    needleShape.style.cssText = `
        position: absolute;
        bottom: 0;
        left: -2px;
        width: 4px;
        height: 85px;
        background: linear-gradient(to top,
            #ff3333 0%,
            #ff3333 95%,
            transparent 95%,
            transparent 100%
        );
        clip-path: polygon(50% 0%, 100% 90%, 50% 100%, 0% 90%);
    `;

    const needleCap = document.createElement("div");
    needleCap.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: radial-gradient(circle at center,
            #ffffff 0%,
            #dddddd 40%,
            #999999 100%
        );
        bottom: -10px;
        left: -10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;

    this.needleElement.appendChild(needleShape);
    this.needleElement.appendChild(needleCap);

    this.speedTextElement = document.createElement("div");
    this.speedTextElement.style.cssText = `
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: 50px;
        color: #ffffff;
        font-family: 'Jura', sans-serif;
        font-size: 28px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    `;

    const unitsLabel = document.createElement("div");
    unitsLabel.style.cssText = `
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: 35px;
        color: rgba(255, 255, 255, 1);
        font-family: 'Jura', sans-serif;
        font-size: 14px;
        font-weight: normal;
    `;
    unitsLabel.textContent = "KTS";
    this.speedElement.appendChild(unitsLabel);

    this.speedElement.appendChild(this.dialElement);
    this.speedElement.appendChild(this.needleElement);
    this.speedElement.appendChild(this.speedTextElement);
    document.body.appendChild(this.speedElement);

    this.createDialMarkings();
  }

  private createDialMarkings() {
    const dialBackground = document.createElement("div");
    dialBackground.style.cssText = `
        position: absolute;
        width: 90%;
        height: 90%;
        left: 5%;
        top: 5%;
        border-radius: 50%;
        background: linear-gradient(145deg,
            rgba(0, 0, 0, 0.5) 0%,
            rgba(40, 40, 40, 0.3) 50%,
            rgba(0, 0, 0, 0.5) 100%
        );
    `;
    this.dialElement.appendChild(dialBackground);

    for (let i = 0; i <= 12; i++) {
      const marking = document.createElement("div");
      const rotation = -120 + (i * 240) / 12;

      marking.style.cssText = `
            position: absolute;
            width: ${i % 3 === 0 ? "3px" : "1.5px"};
            height: ${i % 3 === 0 ? "18px" : "12px"};
            background: linear-gradient(to bottom,
                rgba(255, 255, 255, 1) 0%,
                rgba(255, 255, 255, 0.8) 100%
            );
            left: 50%;
            bottom: 50%;
            transform-origin: bottom center;
            transform: translateX(-50%) rotate(${rotation}deg) translateY(-80px);
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
        `;

      if (i % 3 === 0) {
        const label = document.createElement("div");
        label.style.cssText = `
                position: absolute;
                transform: rotate(-${rotation}deg);
                color: rgba(255, 255, 255, 0.9);
                font-size: 16px;
                font-weight: bold;
                margin-top: -25px;
                width: 40px;
                text-align: center;
                margin-left: -20px;
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
                font-family: 'Jura', sans-serif;
            `;
        label.textContent = `${Math.round((i / 12) * this.maxSpeed)}`;
        marking.appendChild(label);
      }

      this.dialElement.appendChild(marking);
    }
  }

  public update(currentSpeed: number) {
    const speedRatio = currentSpeed / this.maxSpeed;
    const rotation = -120 + speedRatio * 240;

    this.needleElement.style.transform = `rotate(${rotation}deg)`;

    const speedValue = Math.abs(Math.round(currentSpeed * 10));
    if (this.speedTextElement.textContent !== `${speedValue}`) {
      this.speedTextElement.style.transform = "scale(1.1)";
      this.speedTextElement.style.transition = "transform 0.1s ease-out";
      setTimeout(() => {
        this.speedTextElement.style.transform = "scale(1)";
      }, 50);
    }
    this.speedTextElement.textContent = `${speedValue}`;
  }
}
