// bot.js

// --- VARIABLES D'ÉTAT DU BOT ---
let botX = 360;
let botY = 110;
let botDirection = "gauche";
let numBot = 0;
let timerBot = null;
const maxImagesBot = 5;

// --- ÉTAT COMPORTEMENTAL ---
let botEtat = "patrouille"; // "patrouille" | "poursuite" | "repos"
let botReposTimer = 0;
let botCiblePatrouille = { x: 200, y: 135 };

// Seuils de transition
const DIST_DETECTION = 160; // distance à partir de laquelle le bot remarque P1
const DIST_ABANDON   = 220; // distance à partir de laquelle il renonce
const DIST_ATTAQUE   = 50;  // distance à laquelle il considère être "au contact"

// --- VARIABLES DE LA STRATÉGIE HUMAINE ---
let positionHistory = [];
const REACTION_DELAY = 10; // ~160ms à 200ms de retard de réaction

let cibleX_Imprecise = 0;
let cibleY_Imprecise = 0;
let timerDecision = 0; // Temps avant que le bot ne recalcule son imprécision

// --- GESTION DES ANIMATIONS ---
function startAnimBot(botSprite) {
  if (!botSprite || timerBot !== null) return;
  timerBot = setInterval(() => {
    numBot = numBot >= maxImagesBot ? 1 : numBot + 1;
    botSprite.src = `../frontend/assets/man/00${numBot}.png`;
  }, 100);
}

function stopAnimBot(botSprite) {
  if (!botSprite) return;
  clearInterval(timerBot);
  timerBot = null;
  numBot = 0;
  botSprite.src = "../frontend/assets/man/000.png";
}

// --- FONCTION PRINCIPALE APPELÉE PAR LA BOUCLE DE JEU ---
function updateAndDrawBot(ctx) {
  const botSprite = document.querySelector('.j2');
  if (!botSprite) return;

  // 1. SIMULATION DU TEMPS DE RÉACTION
  // Le bot "voit" la position du joueur avec un retard de REACTION_DELAY frames
  positionHistory.push({ x: p1X, y: p1Y });
  if (positionHistory.length > REACTION_DELAY) {
    positionHistory.shift();
  }
  const ciblePercue = positionHistory[0];

  let estEnTrainDeBouger = false;
  const vitesse = 1.85;

  // 2. SIMULATION DE L'IMPRÉCISION (recalculée toutes les ~15 frames / 250ms)
  timerDecision++;
  if (timerDecision > 15 || cibleX_Imprecise === 0) {
    const flouVisuelX = (Math.random() - 0.5) * 30;
    const flouVisuelY = (Math.random() - 0.5) * 30;
    cibleX_Imprecise = ciblePercue.x + flouVisuelX;
    cibleY_Imprecise = ciblePercue.y + flouVisuelY;
    timerDecision = 0;
  }

  // Distance entre le bot et la cible perçue (imprécise)
  const distanceX    = Math.abs(botX - cibleX_Imprecise);
  const distanceY    = Math.abs(botY - cibleY_Imprecise);
  const distanceTotale = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

  // 3. MISE À JOUR DE L'ÉTAT COMPORTEMENTAL
  if (botEtat === "repos") {
    // Le bot attend avant de repartir (simule une pause humaine)
    botReposTimer--;
    if (botReposTimer <= 0) botEtat = "patrouille";

  } else if (botEtat === "patrouille") {
    if (distanceTotale < DIST_DETECTION) {
      botEtat = "poursuite"; // P1 repéré → on fonce
    }

  } else if (botEtat === "poursuite") {
    if (distanceTotale > DIST_ABANDON) {
      botEtat = "patrouille"; // P1 trop loin → on abandonne
    }
    if (distanceTotale < DIST_ATTAQUE) {
      // Contact atteint → pause humaine avant de repartir
      botEtat = "repos";
      botReposTimer = 40 + Math.floor(Math.random() * 30); // 40-70 frames (~0.7-1.2s)
    }
  }

  // 4. MOUVEMENT SELON L'ÉTAT
  let bougeHorizontal = false;
  let bougeVertical   = false;

  if (botEtat === "poursuite" && distanceTotale > DIST_ATTAQUE) {
    // --- Déplacement vers la cible perçue ---

    // Axe Horizontal
    if (distanceX > 8) {
      if (botX > cibleX_Imprecise) {
        botDirection = "gauche";
        botX -= vitesse;
        bougeHorizontal = true;
      } else {
        botDirection = "droite";
        botX += vitesse;
        bougeHorizontal = true;
      }
      estEnTrainDeBouger = true;
    }

    // Axe Vertical
    if (distanceY > 8) {
      if (botY > cibleY_Imprecise) {
        botY -= vitesse;
      } else {
        botY += vitesse;
      }
      bougeVertical = true;
      estEnTrainDeBouger = true;
    }

    // Correction diagonale (lisse la vitesse en cas de mouvement sur les deux axes)
    if (bougeHorizontal && bougeVertical) {
      const correction = vitesse - (vitesse / Math.SQRT2);
      if (botX > cibleX_Imprecise) botX += correction; else botX -= correction;
      if (botY > cibleY_Imprecise) botY += correction; else botY -= correction;
    }

  } else if (botEtat === "patrouille") {
    // --- Déplacement vers un point de patrouille aléatoire ---
    const dCible = Math.hypot(botCiblePatrouille.x - botX, botCiblePatrouille.y - botY);

    if (dCible < 6) {
      // Point atteint → on choisit un nouveau point aléatoire
      botCiblePatrouille = {
        x: 20 + Math.random() * (ctx.canvas.width  - 84),
        y: 20 + Math.random() * (ctx.canvas.height - 84)
      };
    } else {
      // On avance doucement vers le point cible (60% de la vitesse normale)
      botX += (botCiblePatrouille.x - botX) / dCible * (vitesse * 0.6);
      botY += (botCiblePatrouille.y - botY) / dCible * (vitesse * 0.6);
      botDirection = botCiblePatrouille.x < botX ? "gauche" : "droite";
      estEnTrainDeBouger = true;
    }
  }
  // En état "repos" : estEnTrainDeBouger reste false → animation arrêtée

  // --- GESTION DE L'ANIMATION DE MARCHE ---
  if (estEnTrainDeBouger) {
    startAnimBot(botSprite);
  } else {
    stopAnimBot(botSprite);
  }

  // --- LIMITES DU CANVAS (480x270) ---
  if (botX < 0) botX = 0;
  if (botX > ctx.canvas.width  - 64) botX = ctx.canvas.width  - 64;
  if (botY < 0) botY = 0;
  if (botY > ctx.canvas.height - 64) botY = ctx.canvas.height - 64;

  // --- RENDU VISUEL ---
  ctx.save();
  if (botDirection === "gauche") {
    ctx.translate(botX + 64, botY);
    ctx.scale(-1, 1);
    ctx.drawImage(botSprite, 0, 0, 64, 64);
  } else {
    ctx.drawImage(botSprite, botX, botY, 64, 64);
  }
  ctx.restore();
}