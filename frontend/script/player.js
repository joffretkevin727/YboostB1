// Player.js

class Player {
  /**
   * @param {object} config
   * @param {number} config.startX       - Position X initiale
   * @param {number} config.startY       - Position Y initiale
   * @param {string} config.spriteClass  - Classe CSS de la balise <img> (.j1, .j2)
   * @param {object} config.keys         - Touches { haut, bas, gauche, droite }
   * @param {string} config.spritePath   - Chemin de base des sprites
   */
  constructor({ startX, startY, spriteClass, keys, spritePath }) {
    // --- Position & direction ---
    this.x         = startX;
    this.y         = startY;
    this.direction = startX < 240 ? "droite" : "gauche"; // selon le côté de départ

    // --- Sprite & animation ---
    this.spriteClass = spriteClass;
    this.spritePath  = spritePath;
    this.numFrame    = 0;
    this.maxFrames   = 5;
    this.timerAnim   = null;

    // --- Vie ---
    this.health    = 100;
    this.maxHealth = 100;

    // --- Touches assignées ---
    this.keys = {
      haut:   keys.haut,
      bas:    keys.bas,
      gauche: keys.gauche,
      droite: keys.droite,
    };

    // --- État des touches (pressées ou non) ---
    this.pressed = {
      haut:   false,
      bas:    false,
      gauche: false,
      droite: false,
    };

    // Dernière touche horizontale (pour gérer les conflits gauche+droite)
    this.lastHorizontal = "";

    // --- Enregistrement des listeners (pour pouvoir les retirer si besoin) ---
    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onKeyUp   = (e) => this._handleKeyUp(e);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup",   this._onKeyUp);
  }

  // ─────────────────────────────────────────────
  // GESTION CLAVIER
  // ─────────────────────────────────────────────

  _handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === this.keys.droite) { this.pressed.droite = true;  this.lastHorizontal = "droite"; }
    if (key === this.keys.gauche) { this.pressed.gauche = true;  this.lastHorizontal = "gauche"; }
    if (key === this.keys.haut)     this.pressed.haut   = true;
    if (key === this.keys.bas)      this.pressed.bas    = true;
  }

  _handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === this.keys.droite) this.pressed.droite = false;
    if (key === this.keys.gauche) this.pressed.gauche = false;
    if (key === this.keys.haut)   this.pressed.haut   = false;
    if (key === this.keys.bas)    this.pressed.bas    = false;
  }

  // ─────────────────────────────────────────────
  // ANIMATION
  // ─────────────────────────────────────────────

  startAnim(sprite) {
    if (!sprite || this.timerAnim !== null) return;
    this.timerAnim = setInterval(() => {
      this.numFrame = this.numFrame >= this.maxFrames ? 1 : this.numFrame + 1;
      sprite.src = `${this.spritePath}00${this.numFrame}.png`;
    }, 100);
  }

  stopAnim(sprite) {
    if (!sprite) return;
    clearInterval(this.timerAnim);
    this.timerAnim = null;
    this.numFrame  = 0;
    sprite.src = `${this.spritePath}000.png`;
  }

  // ─────────────────────────────────────────────
  // MISE À JOUR & DESSIN (appelé par la boucle)
  // ─────────────────────────────────────────────

  update(ctx) {
    const sprite = document.querySelector(this.spriteClass);
    if (!sprite) return;

    let enMouvement = false;
    let vitesse = 1.85;

    // Détection des axes actifs
    const bougeH = (this.pressed.droite && (this.lastHorizontal === "droite" || !this.pressed.gauche))
                || (this.pressed.gauche && (this.lastHorizontal === "gauche" || !this.pressed.droite));
    const bougeV = this.pressed.haut || this.pressed.bas;

    // Correction diagonale
    if (bougeH && bougeV) vitesse /= Math.SQRT2;

    // Mouvement horizontal
    if (this.pressed.droite && (this.lastHorizontal === "droite" || !this.pressed.gauche)) {
      this.x        += vitesse;
      this.direction = "droite";
      enMouvement    = true;
    } else if (this.pressed.gauche && (this.lastHorizontal === "gauche" || !this.pressed.droite)) {
      this.x        -= vitesse;
      this.direction = "gauche";
      enMouvement    = true;
    }

    // Mouvement vertical
    if (this.pressed.haut)  { this.y -= vitesse; enMouvement = true; }
    if (this.pressed.bas)   { this.y += vitesse; enMouvement = true; }

    // Animation
    enMouvement ? this.startAnim(sprite) : this.stopAnim(sprite);

    // Limites canvas
    this.x = Math.max(0, Math.min(ctx.canvas.width  - 64, this.x));
    this.y = Math.max(0, Math.min(ctx.canvas.height - 64, this.y));

    // Dessin du sprite
    ctx.save();
    if (this.direction === "gauche") {
      ctx.translate(this.x + 64, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, 64, 64);
    } else {
      ctx.drawImage(sprite, this.x, this.y, 64, 64);
    }
    ctx.restore();

    // Barre de vie
    this._drawHealthBar(ctx);
  }

  // ─────────────────────────────────────────────
  // BARRE DE VIE
  // ─────────────────────────────────────────────

  _drawHealthBar(ctx) {
    const largeur  = 50;
    const hauteur  = 6;
    const barreX   = this.x + 32 - largeur / 2;
    const barreY   = this.y - 12;
    const pct      = Math.max(0, this.health / this.maxHealth);

    ctx.fillStyle = "#ff4c4c";
    ctx.fillRect(barreX, barreY, largeur, hauteur);

    ctx.fillStyle = "#32cd32";
    ctx.fillRect(barreX, barreY, largeur * pct, hauteur);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth   = 1;
    ctx.strokeRect(barreX, barreY, largeur, hauteur);
  }

  // ─────────────────────────────────────────────
  // UTILITAIRES
  // ─────────────────────────────────────────────

  /** Distance euclidienne vers un autre joueur/bot */
  distanceTo(other) {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  /** Infliger des dégâts */
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  /** Vrai si le joueur est mort */
  isDead() {
    return this.health <= 0;
  }

  /** Nettoyage (retire les listeners) */
  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup",   this._onKeyUp);
    this.stopAnim(document.querySelector(this.spriteClass));
  }
}