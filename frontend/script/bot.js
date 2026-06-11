class Bot extends Player {
  constructor(config) {
    super({ ...config, isLocal: true, isBot: true });
    this.target = config.target;
    this.state = "CHASE";
    this.moveTimer = 0;
    this.dodgeDirection = 1;
  }

  updateAI(ctx, obstacles) {
    if (
      this.health <= 0 ||
      this.verrouille ||
      !this.target ||
      this.target.health <= 0
    ) {
      this.pressed = { haut: false, bas: false, gauche: false, droite: false };
      super.update(ctx, [this.target], obstacles);
      return;
    }

    const distX = this.target.x - this.x;
    const distY = this.target.y - this.y;
    const distance = Math.hypot(distX, distY);

    this.pressed = { haut: false, bas: false, gauche: false, droite: false };

    if (this.health <= 30) this.state = "FLEE";
    else if (Math.abs(distY) < 40 && distance < 600) this.state = "SHOOT";
    else this.state = "CHASE";

    if (this.state === "FLEE") {
      if (distX > 0) this.pressed.gauche = true;
      else this.pressed.droite = true;
      if (distY > 0) this.pressed.haut = true;
      else this.pressed.bas = true;
    } else if (this.state === "CHASE") {
      if (distX > 350) this.pressed.droite = true;
      else if (distX < -350) this.pressed.gauche = true;
      if (distY > 15) this.pressed.bas = true;
      else if (distY < -15) this.pressed.haut = true;
    } else if (this.state === "SHOOT") {
      this.direction = distX > 0 ? "droite" : "gauche";

      this.moveTimer++;
      if (this.moveTimer > 30) {
        this.dodgeDirection *= -1;
        this.moveTimer = 0;
      }
      if (this.dodgeDirection > 0) this.pressed.haut = true;
      else this.pressed.bas = true;

      if (!this.shotCooldown) this.tirerManuel();
    }

    super.update(ctx, [this.target], obstacles);
  }
}
