export class TachometerSystem {
  private container!: HTMLDivElement;
  private displayElement!: HTMLDivElement;
  private progressRing!: HTMLDivElement;
  private readonly maxRPM: number;
  private readonly markings: HTMLDivElement[] = [];

  constructor(maxRPM: number = 7000) {
    this.maxRPM = maxRPM;
    this.createTachometerHTML();
  }

  private createTachometerHTML() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
        position: fixed;
        bottom: 72.5px;
        left: 193px;
        width: 100px;
        height: 100px;
        rotate: 89deg;
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
        overflow: hidden;
        z-index: 50;
    `;

    this.displayElement = document.createElement("div");
    this.displayElement.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at center,
            rgba(40, 40, 40, 0.6) 0%,
            rgba(20, 20, 20, 0.8) 80%,
            rgba(0, 0, 0, 0.8) 100%
        );
        overflow: hidden;
    `;

    const trackRing = document.createElement("div");
    trackRing.style.cssText = `
        position: absolute;
        width: 90%;
        height: 90%;
        top: 5%;
        left: 5%;
        border-radius: 50%;
        background: conic-gradient(
            from 210deg,
            rgba(40, 40, 40, 0.3) 0deg,
            rgba(40, 40, 40, 0.3) 240deg,
            rgba(40, 40, 40, 0.1) 240deg
        );
    `;

    this.progressRing = document.createElement("div");
    this.progressRing.style.cssText = `
        position: absolute;
        width: 90%;
        height: 90%;
        top: 5%;
        left: 5%;
        border-radius: 50%;
        background: conic-gradient(
            from 210deg,
            #00ffff 0deg,
            #00ffff 0deg,
            transparent 0deg
        );
        transition: background 0.1s ease;
    `;

    const centerOverlay = document.createElement("div");
    centerOverlay.style.cssText = `
        position: absolute;
        width: 70%;
        height: 70%;
        top: 15%;
        left: 15%;
        border-radius: 50%;
        background: radial-gradient(circle at center,
            rgba(20, 20, 20, 0.9) 0%,
            rgba(0, 0, 0, 0.95) 100%
        );
        z-index: 1;
    `;

    const cap = document.createElement("div");
    cap.style.cssText = `
    position: absolute;
    width: 20px;
    height: 20px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle at center,
        #ffffff 0%,
        #dddddd 40%,
        #999999 100%
    );
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    z-index: 2;
`;

    this.container.appendChild(this.displayElement);
    this.displayElement.appendChild(trackRing);
    this.displayElement.appendChild(this.progressRing);
    this.createDialMarkings();
    this.displayElement.appendChild(centerOverlay);
    this.displayElement.appendChild(cap);
    document.body.appendChild(this.container);
  }

  private createDialMarkings() {
    for (let i = 0; i <= 14; i++) {
      const marking = document.createElement("div");
      const rotation = -120 + (i * 240) / 14;
      const rpmValue = (i * this.maxRPM) / 14;

      marking.style.cssText = `
        position: absolute;
        width: ${i % 2 === 0 ? "2px" : "1px"};
        height: ${i % 2 === 0 ? "8px" : "5px"};
        background: linear-gradient(to bottom,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(200, 200, 200, 0.6) 100%
        );
        left: 50%;
        bottom: 50%;
        transform-origin: bottom center;
        transform: translateX(-50%) rotate(${rotation}deg) translateY(-38px);
        box-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
        z-index: 3;
      `;

      if (i % 2 === 0) {
        const label = document.createElement("div");
        label.style.cssText = `
          position: absolute;
          transform: rotate(-${rotation}deg);
          color: rgba(255, 255, 255, 0.8);
          font-family: 'Jura', monospace;
          font-size: 7px;
          margin-top: -12px;
          width: 20px;
          text-align: center;
          margin-left: -10px;
          text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
        `;
        label.textContent = `${Math.round(rpmValue / 1000)}`;
        marking.appendChild(label);
      }

      this.markings.push(marking);
      this.displayElement.appendChild(marking);

      if (i < 14) {
        const minorMarking = document.createElement("div");
        const minorRotation = rotation + 240 / 14 / 2;

        minorMarking.style.cssText = `
          position: absolute;
          width: 1px;
          height: 4px;
          background: linear-gradient(to bottom,
              rgba(255, 255, 255, 0.6) 0%,
              rgba(200, 200, 200, 0.4) 100%
          );
          left: 50%;
          bottom: 50%;
          transform-origin: bottom center;
          transform: translateX(-50%) rotate(${minorRotation}deg) translateY(-38px);
          box-shadow: 0 0 1px rgba(255, 255, 255, 0.1);
          z-index: 3;
        `;

        this.markings.push(minorMarking);
        this.displayElement.appendChild(minorMarking);
      }
    }
  }

  update(currentSpeed: number) {
    const IDLE_RPM = 1000;
    const TARGET_RPM = 6500;
    const targetRPM = Math.max(
      IDLE_RPM,
      Math.abs(currentSpeed) * (this.maxRPM / 5)
    );

    let oscillatingRPM = targetRPM;
    if (currentSpeed === 0) {
      oscillatingRPM = IDLE_RPM;
    } else {
      oscillatingRPM = Math.min(targetRPM, TARGET_RPM);

      const maxShake = 100;
      const randomShake = Math.random() * maxShake - maxShake / 2;
      oscillatingRPM = Math.max(0, oscillatingRPM + randomShake);
    }

    const rpmRatio = oscillatingRPM / this.maxRPM;
    const progressDegrees = Math.min(240 * rpmRatio, 240);

    let gradient;
    if (rpmRatio < 0.6) {
      gradient = `conic-gradient(from 240deg, #00bfff 0deg, #00ffff ${progressDegrees}deg, transparent ${progressDegrees}deg)`;
    } else if (rpmRatio < 0.8) {
      gradient = `conic-gradient(from 240deg, #00ffff 0deg, #ffff00 ${progressDegrees}deg, transparent ${progressDegrees}deg)`;
    } else {
      gradient = `conic-gradient(from 240deg, #ffff00 0deg, #ff4500 ${progressDegrees}deg, transparent ${progressDegrees}deg)`;
    }

    this.progressRing.style.background = gradient;
  }

  cleanup() {
    this.container.remove();
  }
}
