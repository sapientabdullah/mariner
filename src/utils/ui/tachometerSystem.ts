export class TachometerSystem {
  private container!: HTMLDivElement;
  private dialElement!: HTMLDivElement;
  private maxRPM: number;
  private markings: HTMLDivElement[];

  constructor(maxRPM: number = 7000) {
    this.maxRPM = maxRPM;
    this.markings = [];
    this.createTachometerHTML();
  }

  private createTachometerHTML() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 250px;
        width: 100px; 
        height: 100px;
        background: linear-gradient(145deg,
            rgba(0, 0, 0, 0.9) 0%,
            rgba(20, 20, 20, 0.9) 50%,
            rgba(0, 0, 0, 0.9) 100%
        );
        border-radius: 50%;
        border: 2px solid #333333;
        box-shadow:
            0 0 10px rgba(0, 0, 0, 0.5),
            inset 0 0 30px rgba(0, 0, 0, 0.5), 
            inset 0 0 5px rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(3px); 
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
        border: 1px solid rgba(255, 255, 255, 0.1); 
        box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1); 
    `;
    this.dialElement.appendChild(innerRing);

    const unitsLabel = document.createElement("div");
    unitsLabel.style.cssText = `
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: 17px; 
        color: rgba(255, 255, 255, 1);
        font-family: 'Jura', sans-serif;
        font-size: 7px;
        font-weight: normal;
    `;
    unitsLabel.textContent = "x1000 rpm";
    this.container.appendChild(unitsLabel);

    this.container.appendChild(this.dialElement);
    document.body.appendChild(this.container);

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

    for (let i = 0; i <= 14; i++) {
      const marking = document.createElement("div");
      const rotation = -120 + (i * 240) / 14;
      const rpmValue = (i * this.maxRPM) / 14;

      marking.style.cssText = `
            position: absolute;
            width: ${i % 2 === 0 ? "2px" : "1px"};
            height: ${i % 2 === 0 ? "9px" : "6px"};
            background: linear-gradient(to bottom,
                rgba(255, 255, 255, 1) 0%, 
                rgba(200, 200, 200, 0.8) 100% 
            );
            left: 50%;
            bottom: 50%;
            transform-origin: bottom center;
            transform: translateX(-50%) rotate(${rotation}deg) translateY(-40px); 
            box-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
        `;

      if (i % 2 === 0) {
        const label = document.createElement("div");
        label.style.cssText = `
                position: absolute;
                transform: rotate(-${rotation}deg);
                color: rgba(255, 255, 255, 0.9);
                font-size: 8px;
                font-weight: bold;
                margin-top: -12px;
                width: 20px;
                text-align: center;
                margin-left: -10px;
                text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
                font-family: 'Jura', sans-serif;
            `;
        label.textContent = `${Math.round(rpmValue / 1000)}`;
        marking.appendChild(label);
      }

      this.markings.push(marking);
      this.dialElement.appendChild(marking);

      if (i < 14) {
        const minorMarking = document.createElement("div");
        const minorRotation = rotation + 240 / 14 / 2;

        minorMarking.style.cssText = `
            position: absolute;
            width: 1px;
            height: 4px;
            background: linear-gradient(to bottom,
                rgba(255, 255, 255, 0.7) 0%, 
                rgba(200, 200, 200, 0.5) 100% 
            );
            left: 50%;
            bottom: 50%;
            transform-origin: bottom center;
            transform: translateX(-50%) rotate(${minorRotation}deg) translateY(-40px);
            box-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
        `;

        this.markings.push(minorMarking);
        this.dialElement.appendChild(minorMarking);
      }
    }
  }

  update(currentSpeed: number) {
    const IDLE_RPM = 1000;
    const targetRPM = Math.max(
      IDLE_RPM,
      Math.abs(currentSpeed) * (this.maxRPM / 5)
    );

    let oscillatingRPM = targetRPM;
    if (targetRPM >= this.maxRPM * 0.8) {
      const maxShake = this.maxRPM * 0.2;
      const randomShake = Math.random() * maxShake - maxShake / 2;
      oscillatingRPM += randomShake;
    }

    const rpmRatio = oscillatingRPM / this.maxRPM;
    const rotation = -120 + rpmRatio * 240;

    const activeMarkingIndex = Math.floor(
      (rotation + 120) / (240 / this.markings.length)
    );

    this.markings.forEach((marking, index) => {
      if (index <= activeMarkingIndex) {
        const intensity = Math.min(1, (activeMarkingIndex - index) / 10);
        marking.style.background = `linear-gradient(to bottom, 
          rgba(255, ${100 - intensity * 50}, ${100 - intensity * 100}, 1) 0%, 
          rgba(200, ${50 - intensity * 25}, ${50 - intensity * 50}, 0.8) 100%)`;
        marking.style.boxShadow = `0 0 3px rgba(255, ${100 - intensity * 50}, ${
          100 - intensity * 100
        }, 0.5)`;
      } else {
        marking.style.background = `linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(200, 200, 200, 0.8) 100%)`;
        marking.style.boxShadow = `0 0 3px rgba(255, 255, 255, 0.3)`;
      }
    });
  }

  cleanup() {
    this.container.remove();
  }
}
