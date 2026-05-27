// Player2.js

// --- VARIABLES D'ÉTAT DU JOUEUR 2 ---
let p2X = 360; // Position initiale à droite du canvas
let p2Y = 110; // Position initiale en hauteur (Y)
let p2Direction = "gauche"; // Le joueur 2 regarde à gauche par défaut au départ
let num2 = 0;
let timer2 = null;

// vie
let p2Health = 100;
const p2MaxHealth = 100;

const maxImages2 = 5;

// Configuration des touches (Flèches du clavier)
const keysJ2 = {
  ArrowRight: false,
  ArrowLeft: false,
  ArrowUp: false,
  ArrowDown: false,
};
let lastKeyJ2 = "";

// --- GESTION DES ANIMATIONS (FRAMES) ---
function startAnimJ2(p2Sprite) {
  if (!p2Sprite || timer2 !== null) return;
  timer2 = setInterval(() => {
    num2 = num2 >= maxImages2 ? 1 : num2 + 1;
    p2Sprite.src = `../frontend/assets/man/00${num2}.png`;
  }, 100);
}

function stopAnimJ2(p2Sprite) {
  if (!p2Sprite) return;
  clearInterval(timer2);
  timer2 = null;
  num2 = 0;
  p2Sprite.src = "../frontend/assets/man/000.png";
}

// --- ÉCOUTEURS DE TOUCHES CLAVIER ---
window.addEventListener("keydown", (event) => {
  const key = event.key; // Pas de .toLowerCase() car les noms de flèches ont des majuscules
  if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(key)) {
    keysJ2[key] = true;
    if (key === "ArrowRight" || key === "ArrowLeft") lastKeyJ2 = key; // Enregistre le dernier sens horizontal
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key;
  if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(key)) {
    keysJ2[key] = false;
  }
});

// --- FONCTION PRINCIPALE APPELÉE PAR LA BOUCLE DE JEU (MAIN.JS) ---
function updateAndDrawPlayer2(ctx) {
  // Récupération de la balise image via sa classe .j2
  const p2Sprite = document.querySelector(".j2");

  // Sécurité si l'image n'est pas encore chargée dans le DOM
  if (!p2Sprite) {
    console.warn("En attente du chargement de l'élément avec la classe .j2...");
    return;
  }

  let estEnTrainDeBouger = false;
  let vitesse = 1.85;

  // Détection des mouvements sur chaque axe
  const bougeHorizontal =
    (keysJ2.ArrowRight && (lastKeyJ2 === "ArrowRight" || !keysJ2.ArrowLeft)) ||
    (keysJ2.ArrowLeft && (lastKeyJ2 === "ArrowLeft" || !keysJ2.ArrowRight));
  const bougeVertical = keysJ2.ArrowUp || keysJ2.ArrowDown;

  // Correction de la vitesse en diagonale (division par racine de 2)
  if (bougeHorizontal && bougeVertical) {
    vitesse = vitesse / Math.SQRT2; // Vitesse physique lissée à ~2.12 pixels par axe
  }

  // Mouvement Horizontal (Axe X)
  if (keysJ2.ArrowRight && (lastKeyJ2 === "ArrowRight" || !keysJ2.ArrowLeft)) {
    p2Direction = "droite";
    p2X += vitesse;
    estEnTrainDeBouger = true;
  } else if (
    keysJ2.ArrowLeft &&
    (lastKeyJ2 === "ArrowLeft" || !keysJ2.ArrowRight)
  ) {
    p2Direction = "gauche";
    p2X -= vitesse;
    estEnTrainDeBouger = true;
  }

  // Mouvement Vertical (Axe Y)
  if (keysJ2.ArrowUp) {
    // Monter
    p2Y -= vitesse;
    estEnTrainDeBouger = true;
  } else if (keysJ2.ArrowDown) {
    // Descendre
    p2Y += vitesse;
    estEnTrainDeBouger = true;
  }

  // Gestion du déclenchement/arrêt de l'animation de marche
  if (estEnTrainDeBouger) {
    startAnimJ2(p2Sprite);
  } else {
    stopAnimJ2(p2Sprite);
  }

  // Limites du Canvas (Évite que le joueur ne sorte de l'écran 480x270)
  if (p2X < 0) p2X = 0;
  if (p2X > ctx.canvas.width - 64) p2X = ctx.canvas.width - 64;
  if (p2Y < 0) p2Y = 0;
  if (p2Y > ctx.canvas.height - 64) p2Y = ctx.canvas.height - 64;

  // --- RENDU VISUEL DANS LE CANVAS ---
  ctx.save();
  if (p2Direction === "gauche") {
    // Effet miroir horizontal si le personnage regarde à gauche
    ctx.translate(p2X + 64, p2Y);
    ctx.scale(-1, 1);
    ctx.drawImage(p2Sprite, 0, 0, 64, 64);
  } else {
    // Dessin standard vers la droite
    ctx.drawImage(p2Sprite, p2X, p2Y, 64, 64);
  }
  ctx.restore();

  // --- BARRE DE VIE ---
  const largeurBarre = 50;
  const hauteurBarre = 6;
  const decalageY = 12;

  const barreX = p2X + 32 - largeurBarre / 2;
  const barreY = p2Y - decalageY;

  // 1. Fond de la barre
  ctx.fillStyle = "#ff4c4c";
  ctx.fillRect(barreX, barreY, largeurBarre, hauteurBarre);

  // 2. Vie actuelle
  const pourcentageVie = p2Health / p2MaxHealth;
  ctx.fillStyle = "#32cd32";
  ctx.fillRect(barreX, barreY, largeurBarre * pourcentageVie, hauteurBarre);

  // 3. Contour
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(barreX, barreY, largeurBarre, hauteurBarre); // ✅ CORRIGÉ
}
