import * as THREE from "three";

interface ScorePopup {
  sprite: THREE.Sprite;
  lifetime: number;
  velocity: THREE.Vector3;
  opacity: number;
  scale: number;
}

export class ScoreSystem {
  private score: number = 0;
  private readonly scene: THREE.Scene;
  private activePopups: ScorePopup[] = [];
  private multiplier: number = 1;
  private multiplierTimer: number = 0;
  private readonly POPUP_LIFETIME = 2;
  private readonly FADE_START = 1.5;
  private readonly CHECKPOINT_SCORE = 100;
  private readonly ENEMY_KILL_SCORE = 150;
  private readonly SHARK_KILL_SCORE = 75;
  private readonly TIME_BONUS_MULTIPLIER = 10;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private drawIcon(
    context: CanvasRenderingContext2D,
    type: string,
    x: number,
    y: number,
    color: string,
    size: number = 40
  ) {
    context.strokeStyle = "#000000";
    context.lineWidth = 3;
    context.fillStyle = color;

    context.shadowColor = color;
    context.shadowBlur = 8;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;

    switch (type) {
      case "checkpoint":
        context.beginPath();
        context.moveTo(x, y + size);
        context.lineTo(x, y);

        context.bezierCurveTo(
          x + size * 0.4,
          y + size * 0.1,
          x + size * 0.4,
          y + size * 0.4,
          x + size * 0.8,
          y + size * 0.3
        );
        context.lineTo(x, y + size * 0.6);
        context.closePath();
        context.fill();
        context.stroke();
        break;

      case "enemy":
        context.beginPath();
        context.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
        context.stroke();

        context.beginPath();
        context.rect(x + size * 0.45, y + size * 0.2, size * 0.1, size * 0.6);
        context.fill();
        context.stroke();

        context.beginPath();
        context.rect(x + size * 0.2, y + size * 0.45, size * 0.6, size * 0.1);
        context.fill();
        context.stroke();
        break;

      case "shark":
        context.beginPath();
        context.moveTo(x, y + size);
        context.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.2,
          x + size,
          y + size
        );
        context.moveTo(x + size * 0.3, y + size * 0.7);
        context.quadraticCurveTo(
          x + size * 0.5,
          y + size * 0.4,
          x + size * 0.7,
          y + size * 0.7
        );
        context.fill();
        context.stroke();
        break;

      case "timeBonus":
        context.beginPath();
        context.arc(x + size / 2, y + size / 2, size / 2.2, 0, Math.PI * 2);
        context.stroke();

        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI) / 6;
          const startRadius = size / 2.5;
          const endRadius = size / 2.2;
          const startX = x + size / 2 + Math.sin(angle) * startRadius;
          const startY = y + size / 2 - Math.cos(angle) * startRadius;
          const endX = x + size / 2 + Math.sin(angle) * endRadius;
          const endY = y + size / 2 - Math.cos(angle) * endRadius;
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
        }
        context.moveTo(x + size / 2, y + size / 2);
        context.lineTo(x + size / 2, y + size * 0.3);
        context.moveTo(x + size / 2, y + size / 2);
        context.lineTo(x + size * 0.7, y + size / 2);
        context.stroke();
        break;
    }

    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  }

  private createScorePopup(
    text: string,
    position: THREE.Vector3,
    color: string = "#ffffff",
    type: string = "default"
  ): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;

    if (context) {
      context.font = "bold 48px Jura";
      const textMetrics = context.measureText(text);
      const textWidth = textMetrics.width;

      const totalWidth = textWidth + 60;
      const startX = (canvas.width - totalWidth) / 2;
      const iconX = startX;
      const textX = startX + 60;
      const centerY = canvas.height / 2;

      this.drawIcon(context, type, iconX, centerY - 20, color);

      context.fillStyle = color;
      context.textAlign = "left";
      context.strokeStyle = "#000000";
      context.lineWidth = 4;

      context.strokeText(text, textX, centerY + 16);
      context.fillText(text, textX, centerY + 16);

      context.shadowColor = color;
      context.shadowBlur = 15;
      context.fillText(text, textX, centerY + 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(100, 25, 1);

    return sprite;
  }

  private createFloatingText(
    score: number,
    position: THREE.Vector3,
    type: string = "default"
  ) {
    let text = "";
    let color = "#ffffff";

    const multiplierText = this.multiplier > 1 ? ` x${this.multiplier}` : "";

    switch (type) {
      case "checkpoint":
        text = `+${score} ${multiplierText}`;
        color = "#00ff00";
        break;
      case "enemy":
        text = `+${score} ${multiplierText}`;
        color = "#ff0000";
        break;
      case "shark":
        text = `+${score} ${multiplierText}`;
        color = "#ff9900";
        break;
      case "timeBonus":
        text = `+${score}`;
        color = "#00ffff";
        break;
      default:
        text = `+${score} ${multiplierText}`;
    }

    const sprite = this.createScorePopup(text, position, color, type);
    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    );

    this.activePopups.push({
      sprite,
      lifetime: this.POPUP_LIFETIME,
      velocity: spread,
      opacity: 1,
      scale: 0.1,
    });

    this.scene.add(sprite);
  }

  public update(deltaTime: number) {
    if (this.multiplier > 1) {
      this.multiplierTimer -= deltaTime;
      if (this.multiplierTimer <= 0) {
        this.multiplier = 1;
      }
    }

    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const popup = this.activePopups[i];
      popup.lifetime -= deltaTime;

      popup.sprite.position.add(popup.velocity.multiplyScalar(deltaTime));
      popup.velocity.y += deltaTime * 2;

      if (popup.scale < 1) {
        popup.scale += deltaTime * 4;
        popup.sprite.scale.set(100 * popup.scale, 25 * popup.scale, 1);
      }

      if (popup.lifetime < this.FADE_START) {
        popup.opacity = popup.lifetime / this.FADE_START;
        (popup.sprite.material as THREE.SpriteMaterial).opacity = popup.opacity;
      }

      if (popup.lifetime <= 0) {
        this.scene.remove(popup.sprite);
        this.activePopups.splice(i, 1);
      }
    }
  }

  public addCheckpointScore(position: THREE.Vector3, remainingTime: number) {
    const timeBonus = Math.floor(remainingTime * this.TIME_BONUS_MULTIPLIER);
    const checkpointScore = this.CHECKPOINT_SCORE * this.multiplier;

    this.createFloatingText(checkpointScore, position, "checkpoint");
    if (timeBonus > 0) {
      const timeBonusPosition = position
        .clone()
        .add(new THREE.Vector3(0, 50, -100));
      this.createFloatingText(timeBonus, timeBonusPosition, "timeBonus");
    }

    this.score += checkpointScore + timeBonus;
    this.increaseMultiplier();
    return checkpointScore + timeBonus;
  }

  public addEnemyKillScore(position: THREE.Vector3) {
    const score = this.ENEMY_KILL_SCORE * this.multiplier;
    this.createFloatingText(score, position, "enemy");
    this.score += score;
    this.increaseMultiplier();
    return score;
  }

  public addSharkKillScore(position: THREE.Vector3) {
    const score = this.SHARK_KILL_SCORE * this.multiplier;
    this.createFloatingText(score, position, "shark");
    this.score += score;
    this.increaseMultiplier();
    return score;
  }

  private increaseMultiplier() {
    this.multiplier = Math.min(this.multiplier + 0.5, 4);
    this.multiplierTimer = 5;
  }

  public getScore(): number {
    return this.score;
  }

  public getRank(score: number): string {
    if (score >= 10000) {
      return "Admiral";
    } else if (score >= 5000) {
      return "Captain";
    } else if (score >= 2000) {
      return "Commander";
    } else if (score >= 1000) {
      return "Lieutenant Commander";
    } else if (score >= 500) {
      return "Lieutenant";
    } else if (score >= 200) {
      return "Ensign";
    } else {
      return "Seaman";
    }
  }

  public reset() {
    this.score = 0;
    this.multiplier = 1;
    this.multiplierTimer = 0;

    this.activePopups.forEach((popup) => {
      this.scene.remove(popup.sprite);
    });
    this.activePopups = [];
  }

  public cleanup() {
    this.reset();
  }
}
