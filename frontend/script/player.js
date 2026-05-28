class Player {
  constructor({ startX, startY, spriteClass, keys, spritePath }) {
    this.x = startX;
    this.y = startY;
    this.direction = startX < 240 ? "droite" : "gauche";
    this.spriteClass = spriteClass;
    this.spritePath = spritePath;
    this.numFrame = 0;
    this.maxFrames = 5;
    this.timerAnim = null;
    this.health = 100;
    this.maxHealth = 100;
    this.keys = {
      haut: keys.haut,
      bas: keys.bas,
      gauche: keys.gauche,
      droite: keys.droite,
    };
    this.pressed = { haut: false, bas: false, gauche: false, droite: false };
    this.lastHorizontal = "";

    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onKeyUp = (e) => this._handleKeyUp(e);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    this.projectiles = [];
    this.shootTimer = null;
    this.projectileSpeed = 6;
    this.projectileDamage = 10;
    this.startAutoShoot();
  }

  _handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === this.keys.droite) {
      this.pressed.droite = true;
      this.lastHorizontal = "droite";
    }
    if (key === this.keys.gauche) {
      this.pressed.gauche = true;
      this.lastHorizontal = "gauche";
    }
    if (key === this.keys.haut) this.pressed.haut = true;
    if (key === this.keys.bas) this.pressed.bas = true;
  }

  _handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === this.keys.droite) this.pressed.droite = false;
    if (key === this.keys.gauche) this.pressed.gauche = false;
    if (key === this.keys.haut) this.pressed.haut = false;
    if (key === this.keys.bas) this.pressed.bas = false;
  }

  startAnim(sprite) {
    if (!sprite || this.timerAnim !== null) return;
    this.timerAnim = setInterval(() => {
      this.numFrame = this.numFrame >= this.maxFrames ? 1 : this.numFrame + 1;
      sprite.src = `${this.spritePath}00${this.numFrame}.png`;
    }, 100);
  }

  stopAnim(sprite) {
    if (!sprite || this.timerAnim === null) return;
    clearInterval(this.timerAnim);
    this.timerAnim = null;
    this.numFrame = 0;
    sprite.src = `${this.spritePath}000.png`;
  }

  checkCollision(futurX, futurY, obstacles) {
    // Hitbox adaptée au sprite de 64x64
    const hitboxWidth = 30;
    const hitboxHeight = 40;
    const offsetX = 17;
    const offsetY = 20;

    const pGauche = futurX + offsetX;
    const pDroite = futurX + offsetX + hitboxWidth;
    const pHaut = futurY + offsetY;
    const pBas = futurY + offsetY + hitboxHeight;

    for (let obs of obstacles) {
      const oGauche = obs.x;
      const oDroite = obs.x + obs.w;
      const oHaut = obs.y;
      const oBas = obs.y + obs.h;

      if (
        pGauche < oDroite &&
        pDroite > oGauche &&
        pHaut < oBas &&
        pBas > oHaut
      ) {
        return true;
      }
    }
    return false;
  }

  startAutoShoot() {
    if (this.shootTimer !== null) return;
    this.shootTimer = setInterval(() => {
      if (this.isDead()) return;
      this.projectiles.push({
        x: this.direction === "droite" ? this.x + 50 : this.x + 10,
        y: this.y + 32, // Milieu du sprite de 64px
        direction: this.direction,
      });
    }, 1000);
  }

  updateProjectiles(ctx, adversaires) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let p = this.projectiles[i];

      if (p.direction === "droite") p.x += this.projectileSpeed;
      else p.x -= this.projectileSpeed;

      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(p.x, p.y, 10, 4);

      let aTouche = false;
      if (adversaires) {
        for (let adv of adversaires) {
          if (
            !adv.isDead() &&
            p.x > adv.x &&
            p.x < adv.x + 64 &&
            p.y > adv.y &&
            p.y < adv.y + 64
          ) {
            adv.takeDamage(this.projectileDamage);
            this.projectiles.splice(i, 1);
            aTouche = true;
            break;
          }
        }
      }

      if (aTouche) continue;
      if (p.x < 0 || p.x > ctx.canvas.width) this.projectiles.splice(i, 1);
    }
  }

  update(ctx, adversaires = [], obstacles = []) {
    const sprite = document.querySelector(this.spriteClass);
    if (!sprite || this.isDead()) return;

    let enMouvement = false;
    let vitesse = 1.85;

    const bougeH =
      (this.pressed.droite &&
        (this.lastHorizontal === "droite" || !this.pressed.gauche)) ||
      (this.pressed.gauche &&
        (this.lastHorizontal === "gauche" || !this.pressed.droite));
    const bougeV = this.pressed.haut || this.pressed.bas;

    if (bougeH && bougeV) vitesse /= Math.SQRT2;

    let futurX = this.x;
    let futurY = this.y;

    if (
      this.pressed.droite &&
      (this.lastHorizontal === "droite" || !this.pressed.gauche)
    ) {
      futurX += vitesse;
      this.direction = "droite";
      enMouvement = true;
    } else if (
      this.pressed.gauche &&
      (this.lastHorizontal === "gauche" || !this.pressed.droite)
    ) {
      futurX -= vitesse;
      this.direction = "gauche";
      enMouvement = true;
    }

    if (!this.checkCollision(futurX, this.y, obstacles)) this.x = futurX;

    if (this.pressed.haut) {
      futurY -= vitesse;
      enMouvement = true;
    } else if (this.pressed.bas) {
      futurY += vitesse;
      enMouvement = true;
    }

    if (!this.checkCollision(this.x, futurY, obstacles)) this.y = futurY;

    enMouvement ? this.startAnim(sprite) : this.stopAnim(sprite);

    ctx.save();
    if (this.direction === "gauche") {
      ctx.translate(this.x + 64, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, 64, 64);
    } else {
      ctx.drawImage(sprite, this.x, this.y, 64, 64);
    }
    ctx.restore();

    this._drawHealthBar(ctx);
    this.updateProjectiles(ctx, adversaires);
  }

  _drawHealthBar(ctx) {
    const largeur = 50;
    const hauteur = 6;
    const barreX = this.x + 32 - largeur / 2;
    const barreY = this.y - 12;
    const pct = Math.max(0, this.health / this.maxHealth);

    ctx.fillStyle = "#ff4c4c";
    ctx.fillRect(barreX, barreY, largeur, hauteur);
    ctx.fillStyle = "#32cd32";
    ctx.fillRect(barreX, barreY, largeur * pct, hauteur);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(barreX, barreY, largeur, hauteur);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }
  isDead() {
    return this.health <= 0;
  }
  distanceTo(other) {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }
  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.stopAnim(document.querySelector(this.spriteClass));
    if (this.shootTimer) clearInterval(this.shootTimer);
  }
}
