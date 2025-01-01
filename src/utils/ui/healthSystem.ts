export class HealthSystem {
  private maxHealth: number;
  private currentHealth: number;
  private healthBarFill: HTMLElement | null;
  private onGameOver: () => void;
  private lastDamageTime: number;
  private readonly REGEN_DELAY: number = 5000;
  private readonly DAMAGE_COOLDOWN: number;
  private lowHealthOverlay: HTMLElement | null;
  private readonly LOW_HEALTH_THRESHOLD: number = 30;

  constructor(maxHealth: number = 100, onGameOver: () => void) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.healthBarFill = null;
    this.onGameOver = onGameOver;
    this.lastDamageTime = 0;
    this.DAMAGE_COOLDOWN = 1000;
    this.createHealthBar();
    this.lowHealthOverlay = null;
    this.createLowHealthOverlay();
  }

  private createLowHealthOverlay(): void {
    const overlay = document.createElement("div");
    overlay.className = "low-health-overlay";
    overlay.style.display = "none";

    const overlayImage = document.createElement("img");
    overlayImage.src = "/textures/health-overlay.png";
    overlayImage.className = "low-health-overlay-image";

    overlay.appendChild(overlayImage);
    document.body.appendChild(overlay);
    this.lowHealthOverlay = overlay;
  }

  private updateLowHealthOverlay(): void {
    if (!this.lowHealthOverlay) return;

    const healthPercent = (this.currentHealth / this.maxHealth) * 100;

    if (healthPercent <= this.LOW_HEALTH_THRESHOLD) {
      this.lowHealthOverlay.style.display = "block";
      // Calculate opacity based on health (more visible as health decreases)
      const opacity =
        (this.LOW_HEALTH_THRESHOLD - healthPercent) / this.LOW_HEALTH_THRESHOLD;
      this.lowHealthOverlay.style.opacity = opacity.toString();
    } else {
      this.lowHealthOverlay.style.display = "none";
    }
  }

  private canTakeDamage(): boolean {
    const currentTime = performance.now();
    if (currentTime - this.lastDamageTime >= this.DAMAGE_COOLDOWN) {
      this.lastDamageTime = currentTime;
      return true;
    }
    return false;
  }

  private createHealthBar(): void {
    const wrapper = document.createElement("div");
    wrapper.className = "health-bar-wrapper";

    const healthIcon = document.createElement("div");
    healthIcon.className = "health-icon";
    healthIcon.innerHTML = "⨮";

    const container = document.createElement("div");
    container.className = "health-bar-container";

    const fill = document.createElement("div");
    fill.className = "health-bar";

    for (let i = 0; i < 10; i++) {
      const segment = document.createElement("div");
      segment.className = "health-segment";
      fill.appendChild(segment);
    }

    container.appendChild(fill);
    wrapper.appendChild(healthIcon);
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    this.healthBarFill = fill;

    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    if (this.healthBarFill) {
      const healthPercent = (this.currentHealth / this.maxHealth) * 100;
      this.healthBarFill.style.width = `${healthPercent}%`;

      const hue = healthPercent * 1.2;
      this.healthBarFill.style.setProperty(
        "--health-color",
        `hsl(${hue}, 100%, 45%)`
      );
    }
    this.updateLowHealthOverlay();
  }

  public takeDamage(amount: number): void {
    if (!this.canTakeDamage()) return;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.updateHealthBar();

    if (this.currentHealth <= 0) {
      this.onGameOver();
    }
  }

  public heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.updateHealthBar();
  }

  public update(deltaTime: number): void {
    if (this.currentHealth < this.maxHealth) {
      const currentTime = performance.now();
      if (currentTime - this.lastDamageTime >= this.REGEN_DELAY) {
        const regenRate = 2;
        this.heal(regenRate * deltaTime);
      }
    }
  }

  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public reset(): void {
    this.currentHealth = this.maxHealth;
    this.updateHealthBar();
  }

  public destroy(): void {
    const wrapper = document.querySelector(".health-bar-wrapper");
    if (wrapper) {
      document.body.removeChild(wrapper);
    }
    if (this.lowHealthOverlay) {
      document.body.removeChild(this.lowHealthOverlay);
    }
  }
}
