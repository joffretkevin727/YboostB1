// frontend/script/player.js
class Player {
  constructor({
    startX,
    startY,
    spriteClass,
    spritePath,
    isLocal = false,
    socket = null,
  }) {
    this.x = startX;
    this.y = startY;
    this.direction = startX < 800 ? "droite" : "gauche";
    this.spriteClass = spriteClass;
    this.spritePath = spritePath;
    this.isLocal = isLocal; // Distingue le joueur physique des avatars distants reçus du réseau
    this.socket = socket;

    this.numFrame = 0;
    this.maxFrames = 5;
    this.timerAnim = null;
    this.health = 100;
    this.maxHealth = 100;

    // Touches unifiées identiques pour toutes les machines connectées
    this.pressed = { haut: false, bas: false, gauche: false, droite: false };
    this.lastHorizontal = "";

    this.projectiles = [];
    this.projectileSpeed = 8;
    this.projectileDamage = 10;
    this.shotCooldown = false; // Bloque le spam de la touche A

    if (this.isLocal) {
      this._setupKeyboardListeners();
    }
  }

  _setupKeyboardListeners() {
    window.addEventListener("keydown", (e) => {
      if (this.health <= 0) return;
      const key = e.key.toLowerCase();

      if (key === "d") {
        this.pressed.droite = true;
        this.lastHorizontal = "droite";
      }
      if (key === "q") {
        this.pressed.gauche = true;
        this.lastHorizontal = "gauche";
      }
      if (key === "z") this.pressed.haut = true;
      if (key === "s") this.pressed.bas = true;

      // TOUCHE A : Déclenchement manuel du tir
      if (key === "a" && !this.shotCooldown) {
        this.tirerManuel();
      }

      // TOUCHE E : Demande de création d'une boîte d'obstacle devant le joueur
      if (key === "e") {
        this.demanderPoseBoite();
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (key === "d") this.pressed.droite = false;
      if (key === "q") this.pressed.gauche = false;
      if (key === "z") this.pressed.haut = false;
      if (key === "s") this.pressed.bas = false;
    });
  }

  tirerManuel() {
    this.shotCooldown = true;

    // Positionnement initial précis du missile par rapport au sprite du joueur
    const pX = this.direction === "droite" ? this.x + 50 : this.x + 10;
    const pY = this.y + 32;

    const proj = { x: pX, y: pY, direction: this.direction };
    this.projectiles.push(proj);

    // Envoi des informations du tir pour double vérification par le serveur
    if (this.socket) {
      this.socket.emit("action_tir", proj);
    }

    // Cooldown de cadence de tir de 400 millisecondes
    setTimeout(() => (this.shotCooldown = false), 400);
  }

  demanderPoseBoite() {
    // Calcule la position de la boîte juste devant le joueur selon sa direction
    const distanceDevant = 50;
    const boiteX =
      this.direction === "droite"
        ? this.x + distanceDevant
        : this.x - distanceDevant;

    if (this.socket) {
      this.socket.emit("poser_boite", { x: boiteX, y: this.y + 12 });
    }
  }

  checkCollision(futurX, futurY, obstacles) {
    const hitboxWidth = 30;
    const hitboxHeight = 40;
    const offsetX = 17;
    const offsetY = 20;

    const pGauche = futurX + offsetX;
    const pDroite = futurX + offsetX + hitboxWidth;
    const pHaut = futurY + offsetY;
    const pBas = futurY + offsetY + hitboxHeight;

    for (let obs of obstacles) {
      if (
        pGauche < obs.x + obs.w &&
        pDroite > obs.x &&
        pHaut < obs.y + obs.h &&
        pBas > obs.y
      ) {
        return true;
      }
    }
    return false;
  }

  updateProjectiles(ctx, adversaires, obstacles) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let p = this.projectiles[i];

      if (p.direction === "droite") p.x += this.projectileSpeed;
      else p.x -= this.projectileSpeed;

      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(p.x, p.y, 10, 4);

      let détruit = false;

      // Test d'impact sur les murs et boîtes dynamiques
      for (let obs of obstacles) {
        if (
          p.x < obs.x + obs.w &&
          p.x + 10 > obs.x &&
          p.y < obs.y + obs.h &&
          p.y + 4 > obs.y
        ) {
          this.projectiles.splice(i, 1);
          détruit = true;
          break;
        }
      }
      if (détruit) continue;

      // Test d'impact sur le joueur adverse (Uniquement géré localement par l'attaquant)
      if (this.isLocal && adversaires) {
        for (let adv of adversaires) {
          if (
            !adv.isDead() &&
            p.x > adv.x &&
            p.x < adv.x + 64 &&
            p.y > adv.y &&
            p.y < adv.y + 64
          ) {
            if (this.socket) {
              this.socket.emit("infliger_degat", {
                cibleId: adv.id,
                montant: this.projectileDamage,
              });
            }
            this.projectiles.splice(i, 1);
            détruit = true;
            break;
          }
        }
      }

      if (!détruit && (p.x < 0 || p.x > ctx.canvas.width)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  update(ctx, adversaires = [], obstacles = []) {
    const sprite = document.querySelector(this.spriteClass);
    if (!sprite || this.health <= 0) return;

    if (this.isLocal) {
      let enMouvement = false;
      let vitesse = 2.5;

      const bougeH =
        (this.pressed.droite &&
          (this.lastHorizontal === "droite" || !this.pressed.gauche)) ||
        (this.pressed.gauche &&
          (this.lastHorizontal === "gauche" || !this.pressed.droite));
      const bougeV = this.pressed.haut || this.pressed.bas;

      if (bougeH && bougeV) vitesse /= Math.SQRT2; // Normalisation des déplacements diagonaux

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

      // Transmission immédiate au serveur pour double validation
      if (this.socket) {
        this.socket.emit("action_deplacement", {
          x: this.x,
          y: this.y,
          direction: this.direction,
        });
      }
    }

    // Gestion de l'affichage du joueur
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
    this.updateProjectiles(ctx, adversaires, obstacles);
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

  isDead() {
    return this.health <= 0;
  }
}
