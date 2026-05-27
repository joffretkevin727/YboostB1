// Bot.js
// Le Bot hérite de Player mais remplace le clavier par une IA

class Bot extends Player {
  /**
   * @param {object} config  - Même config que Player, sans `keys`
   * @param {Player} target  - Référence au joueur ciblé (p1)
   */
  constructor({ startX, startY, spriteClass, spritePath }, target) {
    // On passe des touches vides — le bot ne lit pas le clavier
    super({
      startX, startY, spriteClass, spritePath,
      keys: { haut: "", bas: "", gauche: "", droite: "" }
    });

    // Retire les listeners clavier inutiles
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup",   this._onKeyUp);

    // --- Cible ---
    this.target = target;

    // --- State Machine ---
    this.etat        = "patrouille"; // "patrouille" | "poursuite" | "repos"
    this.reposTimer  = 0;
    this.ciblePatrouille = { x: 200, y: 135 };

    // --- Seuils comportementaux ---
    this.DIST_DETECTION = 160;
    this.DIST_ABANDON   = 220;
    this.DIST_ATTAQUE   = 50;

    // --- Simulation du temps de réaction ---
    this.positionHistory = [];
    this.REACTION_DELAY  = 10; // ~160ms

    // --- Imprécision ---
    this.cibleX_Imprecise = 0;
    this.cibleY_Imprecise = 0;
    this.timerDecision    = 0;
  }

  // ─────────────────────────────────────────────
  // MISE À JOUR (remplace update() du parent)
  // ─────────────────────────────────────────────

  update(ctx) {
    const sprite = document.querySelector(this.spriteClass);
    if (!sprite) return;

    // 1. HISTORIQUE DE POSITION (retard de réaction)
    this.positionHistory.push({ x: this.target.x, y: this.target.y });
    if (this.positionHistory.length > this.REACTION_DELAY) {
      this.positionHistory.shift();
    }
    const ciblePercue = this.positionHistory[0] || { x: this.target.x, y: this.target.y };

    // 2. IMPRÉCISION (recalculée toutes les ~15 frames)
    this.timerDecision++;
    if (this.timerDecision > 15 || this.cibleX_Imprecise === 0) {
      this.cibleX_Imprecise = ciblePercue.x + (Math.random() - 0.5) * 30;
      this.cibleY_Imprecise = ciblePercue.y + (Math.random() - 0.5) * 30;
      this.timerDecision    = 0;
    }

    const distanceX      = Math.abs(this.x - this.cibleX_Imprecise);
    const distanceY      = Math.abs(this.y - this.cibleY_Imprecise);
    const distanceTotale = Math.hypot(distanceX, distanceY);

    // 3. STATE MACHINE
    if (this.etat === "repos") {
      this.reposTimer--;
      if (this.reposTimer <= 0) this.etat = "patrouille";

    } else if (this.etat === "patrouille") {
      if (distanceTotale < this.DIST_DETECTION) this.etat = "poursuite";

    } else if (this.etat === "poursuite") {
      if (distanceTotale > this.DIST_ABANDON)   this.etat = "patrouille";
      if (distanceTotale < this.DIST_ATTAQUE) {
        this.etat       = "repos";
        this.reposTimer = 40 + Math.floor(Math.random() * 30);
      }
    }

    // 4. MOUVEMENT SELON L'ÉTAT
    let enMouvement = false;
    const vitesse   = 1.85;

    if (this.etat === "poursuite" && distanceTotale > this.DIST_ATTAQUE) {
      let bougeH = false;
      let bougeV = false;

      if (distanceX > 8) {
        if (this.x > this.cibleX_Imprecise) { this.x -= vitesse; this.direction = "gauche"; }
        else                                { this.x += vitesse; this.direction = "droite"; }
        bougeH = true;
      }
      if (distanceY > 8) {
        if (this.y > this.cibleY_Imprecise) this.y -= vitesse;
        else                                this.y += vitesse;
        bougeV = true;
      }

      // Correction diagonale (corrigée)
      if (bougeH && bougeV) {
        const correction = vitesse - (vitesse / Math.SQRT2);
        if (this.x > this.cibleX_Imprecise) this.x += correction; else this.x -= correction;
        if (this.y > this.cibleY_Imprecise) this.y += correction; else this.y -= correction;
      }

      enMouvement = bougeH || bougeV;

    } else if (this.etat === "patrouille") {
      const dCible = Math.hypot(
        this.ciblePatrouille.x - this.x,
        this.ciblePatrouille.y - this.y
      );
      if (dCible < 6) {
        this.ciblePatrouille = {
          x: 20 + Math.random() * (ctx.canvas.width  - 84),
          y: 20 + Math.random() * (ctx.canvas.height - 84)
        };
      } else {
        const v = vitesse * 0.6;
        this.x += (this.ciblePatrouille.x - this.x) / dCible * v;
        this.y += (this.ciblePatrouille.y - this.y) / dCible * v;
        this.direction = this.ciblePatrouille.x < this.x ? "gauche" : "droite";
        enMouvement    = true;
      }
    }

    // Animation
    enMouvement ? this.startAnim(sprite) : this.stopAnim(sprite);

    // Limites canvas
    this.x = Math.max(0, Math.min(ctx.canvas.width  - 64, this.x));
    this.y = Math.max(0, Math.min(ctx.canvas.height - 64, this.y));

    // Dessin
    ctx.save();
    if (this.direction === "gauche") {
      ctx.translate(this.x + 64, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, 64, 64);
    } else {
      ctx.drawImage(sprite, this.x, this.y, 64, 64);
    }
    ctx.restore();

    // Barre de vie (héritée)
    this._drawHealthBar(ctx);
  }
}