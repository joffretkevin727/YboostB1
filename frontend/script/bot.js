// Bot.js
class Bot extends Player {
  /**
   * @param {object} config  - Même config que Player, sans `keys`
   * @param {Player} target  - Référence au joueur ciblé (p1)
   */
  constructor({ startX, startY, spriteClass, spritePath }, target) {
    super({
      startX, startY, spriteClass, spritePath,
      keys: { haut: "", bas: "", gauche: "", droite: "" }
    });

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);

    this.target = target;
    this.etat = "patrouille";
    this.reposTimer = 0;
    this.ciblePatrouille = { x: 200, y: 135 };

    // --- Seuils comportementaux ---
    this.DIST_DETECTION = 160;
    this.DIST_ABANDON   = 220;
    this.DIST_ATTAQUE   = 50;

    // --- Simulation du temps de réaction ---
    this.positionHistory = [];
    this.REACTION_DELAY  = 10;

    // --- Imprécision ---
    this.cibleX_Imprecise = 0;
    this.cibleY_Imprecise = 0;
    this.timerDecision    = 0;

    // --- Système de marche en escalier ---
    this.escalierId = 0; // Palier actuel de la marche
    this.escalierTotal = 0; // Nombre total de marches à faire
    this.departEscalier = { x: 0, y: 0 }; // Point de départ du segment
  }

  /** Choisit un point stratégique (fuite ou mur le plus proche) */
  _calculerPatrouilleIntelligente(ctx) {
    const dJoueur = this.distanceTo(this.target);
    const marge = 40; // Marge pour ne pas coller le pixel 0 du bord
    
    if (dJoueur < 300) {
      // Stratégie 1 : Fuir à l'opposé du joueur
      const dirX = this.x - this.target.x;
      const dirY = this.y - this.target.y;
      const norme = Math.hypot(dirX, dirY) || 1;
      
      // Projette un point loin dans la direction opposée
      let fuiteX = this.x + (dirX / norme) * 150;
      let fuiteY = this.y + (dirY / norme) * 150;
      
      return {
        x: Math.max(marge, Math.min(ctx.canvas.width - 64 - marge, fuiteX)),
        y: Math.max(marge, Math.min(ctx.canvas.height - 64 - marge, fuiteY))
      };
    } else {
      // Stratégie 2 : Se diriger vers le mur le plus proche
      const dists = [
        { x: marge, y: this.y }, // Gauche
        { x: ctx.canvas.width - 64 - marge, y: this.y }, // Droite
        { x: this.x, y: marge }, // Haut
        { x: this.x, y: ctx.canvas.height - 64 - marge } // Bas
      ];
      
      return dists.reduce((proche, actuel) => 
        Math.hypot(actuel.x - this.x, actuel.y - this.y) < Math.hypot(proche.x - this.x, proche.y - this.y) ? actuel : proche
      );
    }
  }

  /** Calcule les paliers d'escalier pour le déplacement */
  _avancerEnEscalier(vitesse) {
    if (this.escalierTotal <= 0) return;

    // Progression actuelle (de 0 à 1)
    const deltaX = this.ciblePatrouille.x - this.departEscalier.x;
    const deltaY = this.ciblePatrouille.y - this.departEscalier.y;
    
    // Détermine sur quelle marche on se trouve
    const distanceParcourueX = this.x - this.departEscalier.x;
    const progressionH = Math.abs(distanceParcourueX / deltaX) || 0;
    const marcheActuelle = Math.floor(progressionH * this.escalierTotal);

    // Alterne le mouvement : marches paires = Horizontal, marches impaires = Vertical
    if (marcheActuelle % 2 === 0) {
      // Marche Horizontale vers le prochain palier
      const cibleX = this.departEscalier.x + ((marcheActuelle + 1) / this.escalierTotal) * deltaX;
      if (Math.abs(this.x - cibleX) > vitesse) {
        this.x += this.x < cibleX ? vitesse : -vitesse;
        this.direction = this.x < cibleX ? "droite" : "gauche";
      } else {
        this.x = cibleX;
      }
    } else {
      // Marche Verticale vers le prochain palier
      const cibleY = this.departEscalier.y + ((marcheActuelle + 1) / this.escalierTotal) * deltaY;
      if (Math.abs(this.y - cibleY) > vitesse) {
        this.y += this.y < cibleY ? vitesse : -vitesse;
      } else {
        this.y = cibleY;
      }
    }
  }

  /** Boucle de mise à jour principale */
  update(ctx) {
    const sprite = document.querySelector(this.spriteClass);
    if (!sprite) return;

    // 1. HISTORIQUE DE POSITION
    this.positionHistory.push({ x: this.target.x, y: this.target.y });
    if (this.positionHistory.length > this.REACTION_DELAY) this.positionHistory.shift();
    const ciblePercue = this.positionHistory[0] || { x: this.target.x, y: this.target.y };

    // 2. IMPRÉCISION
    this.timerDecision++;
    if (this.timerDecision > 15 || this.cibleX_Imprecise === 0) {
      this.cibleX_Imprecise = ciblePercue.x + (Math.random() - 0.5) * 30;
      this.cibleY_Imprecise = ciblePercue.y + (Math.random() - 0.5) * 30;
      this.timerDecision = 0;
    }

    const distanceX = Math.abs(this.x - this.cibleX_Imprecise);
    const distanceY = Math.abs(this.y - this.cibleY_Imprecise);
    const distanceTotale = Math.hypot(distanceX, distanceY);

    // 3. STATE MACHINE
    if (this.etat === "repos") {
      this.reposTimer--;
      if (this.reposTimer <= 0) this.etat = "patrouille";
    } else if (this.etat === "patrouille") {
      if (distanceTotale < this.DIST_DETECTION) this.etat = "poursuite";
    } else if (this.etat === "poursuite") {
      if (distanceTotale > this.DIST_ABANDON) this.etat = "patrouille";
      if (distanceTotale < this.DIST_ATTAQUE) {
        this.etat = "repos";
        this.reposTimer = 40 + Math.floor(Math.random() * 30);
      }
    }

    // 4. MOUVEMENT SELON L'ÉTAT
    let enMouvement = false;
    const vitesse = 1.85;

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

      if (bougeH && bougeV) {
        const correction = vitesse - (vitesse / Math.SQRT2);
        if (this.x > this.cibleX_Imprecise) this.x += correction; else this.x -= correction;
        if (this.y > this.cibleY_Imprecise) this.y += correction; else this.y -= correction;
      }
      enMouvement = bougeH || bougeV;

    } else if (this.etat === "patrouille") {
      const dCible = Math.hypot(this.ciblePatrouille.x - this.x, this.ciblePatrouille.y - this.y);
      
      // Si la cible est atteinte ou si on commence, on en recalcule une intelligente
      if (dCible < 8 || this.escalierTotal === 0) {
        this.ciblePatrouille = this._calculerPatrouilleIntelligente(ctx);
        this.departEscalier = { x: this.x, y: this.y };
        
        // Nombre de marches proportionnel à la distance (1 marche par tranche de 40px, min 2)
        const distanceNouveauParcours = Math.hypot(this.ciblePatrouille.x - this.x, this.ciblePatrouille.y - this.y);
        this.escalierTotal = Math.max(2, Math.floor(distanceNouveauParcours / 40) * 2);
      } else {
        // Avancer en escalier à vitesse réduite (60%)
        this._avancerEnEscalier(vitesse * 0.6);
        enMouvement = true;
      }
    }

    // Animation, Limites & Rendu
    enMouvement ? this.startAnim(sprite) : this.stopAnim(sprite);
    this.x = Math.max(0, Math.min(ctx.canvas.width - 64, this.x));
    this.y = Math.max(0, Math.min(ctx.canvas.height - 64, this.y));

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
  }
}