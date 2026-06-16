class Bot extends Player {
  constructor(config) {
    super({ ...config, isLocal: true, isBot: true });
    this.target = config.target;
    this.state = "APPROCHE";
    this.equipe = "B";

    this.mapWidth = 1600; 
    this.mapHeight = 900; 

    // Suivi et affichage propre des logs par paquets uniques
    this.loopCounter = 0; 
    this.lastLoopState = ""; 
    this.dernierLogAffiche = "";
    this.isEmergencyDisengageMode = false; 
    this.emergencyTimer = 0; 

    // Latence et mémoire tampon des touches (20ms)
    this.reactionDelayMs = 20; 
    this.lastDirectionChangeTime = 0;
    this.previousPressed = { haut: false, bas: false, gauche: false, droite: false };

    // Séquenceur d'actions (Pauses exclusives de 10ms ou 30ms)
    this.actionSequenceStage = 0; 
    this.actionSequenceTimer = 0; 
    this.pendingActionType = null; 
    this.currentRequiredPauseDuration = 10; 

    // Système de marche en escalier sans diagonale
    this.stepCounter = 0; 
    this.currentStepAxis = "Y"; 

    // Système Anti-Stuck standard
    this.lastPosition = { x: this.x, y: this.y };
    this.stuckTimer = 0; 
    this.isDegaeMode = false; 
    this.degaeTimer = 0; 
    this.degaeDir = { x: 0, y: 0 }; 
    this.stuckConsecutifCount = 0; 
    this.vitesseDegaeMultiplier = 1.0; 

    this.lastHealth = this.health;
    this.degatReactionTimer = 0; 
    this.cibleInitialeType = Math.floor(Math.random() * 2); 

    console.log(`[BOT-INIT] Spawn en (${this.x}, ${this.y}). CibleType: ${this.cibleInitialeType === 0 ? "Joueur" : "Centre"}`);
  }

  _estLigneDeVueBloquee(obstacles) {
    if (!this.target) return false;
    const segments = 10;
    for (let i = 1; i < segments; i++) {
      const testX = this.x + (this.target.x - this.x) * (i / segments);
      const testY = this.y + (this.target.y - this.y) * (i / segments);
      for (let obs of obstacles) {
        if (testX >= obs.x && testX <= obs.x + obs.w && testY >= obs.y && testY <= obs.y + obs.h) return true;
      }
    }
    return false;
  }

  _yALesMursAProximite(obstacles, rayon = 80) {
    for (let obs of obstacles) {
      const procheX = this.x + 32 > obs.x - rayon && this.x < obs.x + obs.w + rayon;
      const procheY = this.y + 32 > obs.y - rayon && this.y < obs.y + obs.h + rayon;
      if (procheX && procheY) return true;
    }
    return false;
  }

  _initierSequencePoseBoite(obstacles, pauseCustom = 10) {
    if (this.wallCooldown || this.actionSequenceStage > 0) return;
    if (this._yALesMursAProximite(obstacles, 80)) return;
    this.actionSequenceStage = 1;
    this.actionSequenceTimer = performance.now();
    this.currentRequiredPauseDuration = pauseCustom;
    this.pendingActionType = "BOITE";
  }

  _initierSequenceTir(pauseCustom = 10) {
    if (this.shotCooldown || this.actionSequenceStage > 0) return;
    this.actionSequenceStage = 1;
    this.actionSequenceTimer = performance.now();
    this.currentRequiredPauseDuration = pauseCustom;
    this.pendingActionType = "TIR";
  }

  _executerActionPhysique(auCorpsACorps = false) {
    if (this.pendingActionType === "BOITE") {
      const boiteX = this.direction === "droite" ? this.x + 50 : this.x - 50;
      this.wallCooldown = true;
      if (this.socket) this.socket.emit("poser_boite", { x: boiteX, y: this.y + 12 });
      setTimeout(() => (this.wallCooldown = false), 2000);
    } else if (this.pendingActionType === "TIR") {
      this.shotCooldown = true;
      const pX = this.direction === "droite" ? this.x + 50 : this.x + 10;
      const proj = { x: pX, y: this.y + 32, direction: this.direction, ownerId: "BOT_" + this.socket.id };
      this.projectiles.push(proj);
      if (this.socket) this.socket.emit("action_tir", proj);
      
      const delaiRecul = auCorpsACorps ? 800 : 400;
      setTimeout(() => (this.shotCooldown = false), delaiRecul);
    }
    this.actionSequenceStage = 2;
    this.actionSequenceTimer = performance.now();
  }

  _appliquerMarcheEscalier(intention, distX, distY, procheX, procheY) {
    if (this.stepCounter >= 3) {
      this.stepCounter = 0;
      this.currentStepAxis = this.currentStepAxis === "X" ? "Y" : "X";
    }

    if (this.currentStepAxis === "Y") {
      if (!procheY) {
        intention.bas = distY > 0;
        intention.haut = distY <= 0;
        this.stepCounter++;
      } else {
        this.currentStepAxis = "X";
        this.stepCounter = 0;
      }
    }

    if (this.currentStepAxis === "X" && !intention.bas && !intention.haut) {
      if (!procheX) {
        intention.droite = distX > 0;
        intention.gauche = distX <= 0;
        this.stepCounter++;
      } else {
        this.currentStepAxis = "Y";
        this.stepCounter = 0;
      }
    }
  }

  updateAI(ctx, obstacles) {
    const maintenant = performance.now();

    if (this.health <= 0 || this.verrouille || !this.target || this.target.health <= 0) {
      this.pressed = { haut: false, bas: false, gauche: false, droite: false };
      super.update(ctx, [this.target], obstacles);
      return;
    }

    const centreArenaX = this.mapWidth / 2; 
    const centreArenaY = this.mapHeight / 2; 

    const vueBloqueeActuelle = this._estLigneDeVueBloquee(obstacles);
    const distYActuelle = this.target.y - this.y;
    const aligneHActuel = Math.abs(distYActuelle) < 30;

    // --- ENREGISTREMENT ET COMPTAGE DES LOGS PAR PAQUETS UNIQUES ---
    const currentLoopSignature = `State:${this.state}_VueBloquee:${vueBloqueeActuelle}_AligneH:${aligneHActuel}`;
    if (currentLoopSignature === this.lastLoopState) {
      this.loopCounter++;
      if (this.loopCounter >= 100 && !this.isEmergencyDisengageMode) {
        const messageUrgence = `[BOT-LOOP-END] Boucle rompue de force. État: [${currentLoopSignature}] | Frames coincées: ${this.loopCounter}`;
        if (messageUrgence !== this.dernierLogAffiche) {
          console.warn(messageUrgence);
          this.dernierLogAffiche = messageUrgence;
        }
        this.isEmergencyDisengageMode = true;
        this.emergencyTimer = 40; 
        this.loopCounter = 0;
        this.actionSequenceStage = 0; 
        this.currentStepAxis = this.currentStepAxis === "X" ? "Y" : "X"; 
      }
    } else {
      if (this.loopCounter > 5) {
        console.log(`[BOT-LOOP-SUMMARY] Changement d'état : l'action [${this.lastLoopState}] a tourné pendant ${this.loopCounter} frames.`);
      }
      this.loopCounter = 1;
      this.lastLoopState = currentLoopSignature;
    }

    // --- MODE DE SECOURS PAR CONTOURNEMENT STANDARD (SANS TRICHE) ---
    if (this.isEmergencyDisengageMode) {
      this.emergencyTimer--;
      if (this.emergencyTimer <= 0) this.isEmergencyDisengageMode = false;

      this.pressed = { haut: false, bas: false, gauche: false, droite: false };
      if (vueBloqueeActuelle) {
        this.pressed.gauche = (centreArenaX - this.x) <= 0;
        this.pressed.droite = (centreArenaX - this.x) > 0;
      } else {
        this.pressed.haut = (centreArenaY - this.y) <= 0;
        this.pressed.bas = (centreArenaY - this.y) > 0;
      }

      if (this.socket) {
        this.socket.emit("action_deplacement", { x: this.x, y: this.y, direction: this.direction, enMouvement: true });
      }
      super.update(ctx, [this.target], obstacles);
      return;
    }

    const distX = this.target.x - this.x;
    const distY = this.target.y - this.y;
    const distance = Math.hypot(distX, distY);
    const auCorpsACorps = distance < 150; 

    // --- VÉRIFICATION DES PAUSES DE SÉQUENCES D'ACTIONS (10MS) ---
    if (this.actionSequenceStage > 0) {
      this.pressed = { haut: false, bas: false, gauche: false, droite: false }; 
      if (this.actionSequenceStage === 1 && maintenant - this.actionSequenceTimer >= this.currentRequiredPauseDuration) {
        this._executerActionPhysique(auCorpsACorps);
      } else if (this.actionSequenceStage === 2 && maintenant - this.actionSequenceTimer >= this.currentRequiredPauseDuration) {
        this.actionSequenceStage = 0;
        this.pendingActionType = null;
      }
      super.update(ctx, [this.target], obstacles);
      return;
    }

    let degatSubiCeTour = false;
    if (this.health < this.lastHealth) {
      console.log(`[BOT-EVENT] Dégâts reçus ! Sante: ${this.health}%`);
      this.lastHealth = this.health;
      degatSubiCeTour = true;
    }

    if (this.bloquePourReaction) {
      if (maintenant - this.lastDirectionChangeTime < this.reactionDelayMs) {
        this.pressed = { ...this.previousPressed };
        super.update(ctx, [this.target], obstacles);
        return;
      }
      this.bloquePourReaction = false;
    }

    const intentionPressed = { haut: false, bas: false, gauche: false, droite: false };
    let intentionTirer = false;

    const procheX = Math.abs(distX) < 15;
    const procheY = Math.abs(distY) < 15;

    let estEnTrainDHeziter = false;
    let pauseSequenceModifiee = auCorpsACorps ? 30 : 10; 

    if (this.state !== "APPROCHE" && !auCorpsACorps && Math.random() < 0.05) {
      estEnTrainDHeziter = true;
      pauseSequenceModifiee = 30; 
      console.log("[BOT-EVENT] Hésitation humaine déclenchée (Sécurité 30ms).");
    }

    // Forcer la transition de combat immédiate si le joueur reste statique
    if (this.state === "APPROCHE" && distance < 450 && aligneHActuel && !vueBloqueeActuelle) {
      this.state = "COMBAT";
    }

    // MOTEUR LOGIQUE PRINCIPAL
    if (auCorpsACorps && this.health >= 50 && this.target.health >= 50) {
      intentionPressed.gauche = distX > 0;
      intentionPressed.droite = distX <= 0;
      if (aligneHActuel) {
        this.direction = distX > 0 ? "droite" : "gauche";
        intentionTirer = true; 
      }
    }
    else if (this.health < 50) {
      this.direction = distX > 0 ? "droite" : "gauche";
      intentionTirer = true;
      this._appliquerMarcheEscalier(intentionPressed, distX, distY, procheX, procheY);
    }
    else if (degatSubiCeTour || this.degatReactionTimer > 0) {
      if (degatSubiCeTour) {
        this.degatReactionTimer = 45;
        this.direction = distX > 0 ? "droite" : "gauche";
        this._initierSequencePoseBoite(obstacles, pauseSequenceModifiee);
      }
      this.degatReactionTimer--;
      if (!procheY && this.actionSequenceStage === 0) {
        intentionPressed.haut = distY <= 0; 
        intentionPressed.bas = distY > 0;
      }
    }
    else if (this.target.health < 50) {
      this._appliquerMarcheEscalier(intentionPressed, distX, distY, procheX, procheY);
      if (aligneHActuel) {
        this.direction = distX > 0 ? "droite" : "gauche";
        intentionTirer = true;
      }
    }
    else {
      if (this.state === "APPROCHE") {
        if (this.cibleInitialeType === 0) {
          this._appliquerMarcheEscalier(intentionPressed, distX, distY, procheX, procheY);
        } else {
          const VersCentreX = centreArenaX - this.x;
          const VersCentreY = centreArenaY - this.y;
          this._appliquerMarcheEscalier(intentionPressed, VersCentreX, VersCentreY, Math.abs(VersCentreX) < 15, Math.abs(VersCentreY) < 15);
        }
        if (distance < 500) this.state = "COMBAT";
      }

      if (this.state === "COMBAT") {
        if (vueBloqueeActuelle) {
          if (distance < 120) {
            intentionPressed.haut = Math.random() < 0.5;
            intentionPressed.bas = !intentionPressed.haut;
            this.cibleInitialeType = Math.floor(Math.random() * 2);
            this.state = "APPROCHE";
          } else {
            this._appliquerMarcheEscalier(intentionPressed, distX, distY, procheX, procheY);
          }
        } else if (aligneHActuel) {
          this.direction = distX > 0 ? "droite" : "gauche";
          intentionTirer = true;

          if (this.target.enMouvement) {
            const decisionDede = Math.floor(Math.random() * 3);
            if (decisionDede === 0) {
              this._initierSequencePoseBoite(obstacles, pauseSequenceModifiee);
            } else if (decisionDede === 1) {
              if (!procheY) {
                intentionPressed.haut = distY > 0;
                intentionPressed.bas = distY <= 0;
              }
            } else {
              if (!procheX) {
                intentionPressed.gauche = distX > 0;
                intentionPressed.droite = distX <= 0;
              }
              intentionTirer = true;
            }
          } else {
            if (!procheX) {
              intentionPressed.droite = distX > 0;
              intentionPressed.gauche = distX <= 0;
            }
          }
        } else {
          intentionPressed.bas = distY > 0;
          intentionPressed.haut = distY <= 0;
        }
      }
    }

    if (estEnTrainDHeziter && (intentionPressed.haut || intentionPressed.bas || intentionPressed.gauche || intentionPressed.droite)) {
      const temporaireHaut = intentionPressed.haut;
      intentionPressed.haut = intentionPressed.bas;
      intentionPressed.bas = temporaireHaut;
      const temporaireGauche = intentionPressed.gauche;
      intentionPressed.gauche = intentionPressed.droite;
      intentionPressed.droite = temporaireGauche;
    }

    const directionChangee = 
      intentionPressed.haut !== this.previousPressed.haut ||
      intentionPressed.bas !== this.previousPressed.bas ||
      intentionPressed.gauche !== this.previousPressed.gauche ||
      intentionPressed.droite !== this.previousPressed.droite;

    if (directionChangee) {
      if (maintenant - this.lastDirectionChangeTime >= this.reactionDelayMs) {
        this.lastDirectionChangeTime = maintenant;
        this.previousPressed = { ...intentionPressed };
      }
    } else {
      this.previousPressed = { ...intentionPressed };
    }

    this.pressed = { ...this.previousPressed };

    if (intentionTirer && this.actionSequenceStage === 0) {
      this._initierSequenceTir(pauseSequenceModifiee);
    }

    if (this.socket && (this.pressed.haut || this.pressed.bas || this.pressed.gauche || this.pressed.droite)) {
      this.socket.emit("action_deplacement", { x: this.x, y: this.y, direction: this.direction, enMouvement: true });
    }

    super.update(ctx, [this.target], obstacles);
  }
}