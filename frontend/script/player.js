class Player {
  constructor({
    startX,
    startY,
    skin,
    isLocal = false,
    isBot = false,
    socket = null,
    id = null,
  }) {
    this.x = startX;
    this.y = startY;
    this.direction = startX < 800 ? "droite" : "gauche";
    this.isLocal = isLocal;
    this.isBot = isBot;
    this.socket = socket;
    this.id = id;
    this.skin = skin;
    this.verrouille = true; // Empêche les actions durant le décompte initial.

    this.spritePath = `/frontend/assets/man/${skin}/`;
    this.sprite = new Image();
    this.sprite.src = `${this.spritePath}000.png`;

    this.numFrame = 0;
    this.maxFrames = 5;
    this.timerAnim = null;
    this.health = 100;
    this.maxHealth = 100;
    this.pressed = { haut: false, bas: false, gauche: false, droite: false };
    this.lastHorizontal = "";
    this.enMouvement = false;

    this.projectiles = [];
    this.projectileSpeed = 8;
    this.projectileDamage = 10;
    this.shotCooldown = false;

    if (this.isLocal && !this.isBot) this._setupKeyboardListeners();
  }

  _setupKeyboardListeners() {
    // Enregistre les pressions de touches pour le déplacement et les actions de tir/boîte.
    window.addEventListener("keydown", (e) => {
      if (this.health <= 0 || this.verrouille) return;
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
      if (e.key === " " && !this.shotCooldown) this.tirerManuel(); // Utilise e.key directement pour capturer l'espace.
      if (key === "e") this.demanderPoseBoite();
    });

    // Réinitialise l'état des touches de direction au relâchement.
    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (key === "d") this.pressed.droite = false;
      if (key === "q") this.pressed.gauche = false;
      if (key === "z") this.pressed.haut = false;
      if (key === "s") this.pressed.bas = false;
    });
  }

  tirerManuel() {
    // Crée un projectile localement et envoie l'action au serveur via websocket.
    this.shotCooldown = true;
    const pX = this.direction === "droite" ? this.x + 50 : this.x + 10;
    const proj = {
      x: pX,
      y: this.y + 32,
      direction: this.direction,
      ownerId: this.id,
    };
    this.projectiles.push(proj);

    let monSonDeTir = new Audio("/frontend/assets/sounds/tire.mp3");
    monSonDeTir.volume = 0.5; // (Volume réglable)
    monSonDeTir.play();

    if (this.socket && !this.isBot) this.socket.emit("action_tir", proj);
    setTimeout(() => (this.shotCooldown = false), 400);
  }

  demanderPoseBoite() {
    // Émet une requête réseau d'intention de pose de boîte devant le joueur.
    const boiteX = this.direction === "droite" ? this.x + 50 : this.x - 50;
    if (this.socket && !this.isBot)
      this.socket.emit("poser_boite", { x: boiteX, y: this.y + 12 });
  }

  checkCollision(futurX, futurY, obstacles) {
    // Détecte les collisions par boîte englobante (AABB) avec la liste des obstacles.
    const hitboxW = 30;
    const hitboxH = 40;
    const offsetX = 17;
    const offsetY = 20;
    const pGauche = futurX + offsetX;
    const pDroite = futurX + offsetX + hitboxW;
    const pHaut = futurY + offsetY;
    const pBas = futurY + offsetY + hitboxH;
    for (let obs of obstacles) {
      if (
        pGauche < obs.x + obs.w &&
        pDroite > obs.x &&
        pHaut < obs.y + obs.h &&
        pBas > obs.y
      )
        return true;
    }
    return false;
  }

  updateProjectiles(ctx, adversaires, obstacles) {
  // Gère le déplacement, les impacts sur l'environnement et l'envoi des dégâts réseau.
  for (let i = this.projectiles.length - 1; i >= 0; i--) {
    let p = this.projectiles[i];
    p.x += p.direction === "droite" ? this.projectileSpeed : -this.projectileSpeed;
    
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(p.x, p.y, 10, 4);
    let detruit = false;

    // Collision avec les murs/boîtes
    for (let obs of obstacles) {
      if (p.x < obs.x + obs.w && p.x + 10 > obs.x && p.y < obs.y + obs.h && p.y + 4 > obs.y) {
        this.projectiles.splice(i, 1);
        detruit = true;
        break;
      }
    }
    if (detruit) continue;

    // Collision universelle avec les adversaires (Fonctionne pour le Joueur ET pour le Bot)
    if (adversaires) {
      for (let adv of adversaires) {
        if (!adv.isDead() && p.x > adv.x && p.x < adv.x + 64 && p.y > adv.y && p.y < adv.y + 64) {
          
          // Seul le propriétaire du tir (ou l'instance locale du bot) envoie le signal de dégât
          if (this.socket && (this.isLocal || this.isBot)) {
            this.socket.emit("infliger_degat", {
              cibleId: adv.id,
              montant: this.projectileDamage,
              tireurId: p.ownerId || this.id // Utilise l'ID réel enregistré dans le projectile
            });
          }
          this.projectiles.splice(i, 1);
          detruit = true;
          break;
        }
      }
    }
    
    if (!detruit && (p.x < 0 || p.x > ctx.canvas.width)) {
      this.projectiles.splice(i, 1);
    }
  }
}

  update(ctx, adversaires = [], obstacles = []) {
    // Met à jour la position locale, envoie les déplacements au serveur et dessine l'entité.
    if (this.health <= 0) return;

    if (this.isLocal && !this.verrouille) {
      let enMouvement = false;
      let vitesse = 2.5;
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

      this.enMouvement = enMouvement;
      this.enMouvement ? this.startAnim() : this.stopAnim();

      if (this.socket && !this.isBot) {
        this.socket.emit("action_deplacement", {
          x: this.x,
          y: this.y,
          direction: this.direction,
          enMouvement: this.enMouvement,
        });
      }
    }

    if (!this.isLocal) this.enMouvement ? this.startAnim() : this.stopAnim();

    ctx.save();
    if (this.direction === "gauche") {
      ctx.translate(this.x + 64, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.sprite, 0, 0, 64, 64);
    } else {
      ctx.drawImage(this.sprite, this.x, this.y, 64, 64);
    }
    ctx.restore();

    this._drawHealthBar(ctx);
    this.updateProjectiles(ctx, adversaires, obstacles);
  }

  startAnim() {
    // Alterne périodiquement les frames de texture du sprite pour créer l'animation de marche.
    if (this.timerAnim !== null) return;
    this.timerAnim = setInterval(() => {
      this.numFrame = this.numFrame >= this.maxFrames ? 1 : this.numFrame + 1;
      this.sprite.src = `${this.spritePath}00${this.numFrame}.png`;
    }, 100);
  }

  stopAnim() {
    // Interrompt le cycle de l'animation de course et réapplique le sprite statique.
    if (this.timerAnim === null) return;
    clearInterval(this.timerAnim);
    this.timerAnim = null;
    this.numFrame = 0;
    this.sprite.src = `${this.spritePath}000.png`;
  }

  _drawHealthBar(ctx) {
    // Calcule et dessine la barre de vie bicolore proportionnelle au-dessus du joueur.
    const grandeur = 50;
    const barreX = this.x + 32 - grandeur / 2;
    const pct = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = "#ff4c4c";
    ctx.fillRect(barreX, this.y - 12, grandeur, 6);
    ctx.fillStyle = "#32cd32";
    ctx.fillRect(barreX, this.y - 12, grandeur * pct, 6);
  }

  isDead() {
    // Retourne un indicateur booléen spécifiant si l'entité n'a plus de points de vie.
    return this.health <= 0;
  }
}