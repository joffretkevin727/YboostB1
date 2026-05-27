// Player1.js

// --- VARIABLES D'ÉTAT DU JOUEUR 1 ---
let p1X = 50;
let p1Y = 110; // Position initiale en hauteur (Y)
let p1Direction = "droite";
let num1 = 0;
let timer1 = null;
const maxImages1 = 5;

// Configuration des touches (Z, Q, S, D)
const keysJ1 = {
  d: false,
  q: false,
  z: false,
  s: false
};
let lastKeyJ1 = "";

// --- GESTION DES ANIMATIONS (FRAMES) ---
function startAnimJ1(p1Sprite) {
  if (!p1Sprite || timer1 !== null) return; 
  timer1 = setInterval(() => {
    num1 = num1 >= maxImages1 ? 1 : num1 + 1;
    p1Sprite.src = `../frontend/assets/man/00${num1}.png`;
  }, 100);
}

function stopAnimJ1(p1Sprite) {
  if (!p1Sprite) return; 
  clearInterval(timer1);
  timer1 = null;
  num1 = 0;
  p1Sprite.src = "../frontend/assets/man/000.png";
}

// --- ÉCOUTEURS DE TOUCHES CLAVIER ---
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["d", "q", "z", "s"].includes(key)) {
    keysJ1[key] = true;
    if (key === "d" || key === "q") lastKeyJ1 = key; // Enregistre le dernier sens horizontal
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (["d", "q", "z", "s"].includes(key)) {
    keysJ1[key] = false;
  }
});

// --- FONCTION PRINCIPALE APPELÉE PAR LA BOUCLE DE JEU (MAIN.JS) ---
function updateAndDrawPlayer1(ctx) {
  // Récupération de la balise image via sa classe .j1
  const p1Sprite = document.querySelector('.j1');

  // Sécurité si l'image n'est pas encore chargée dans le DOM
  if (!p1Sprite) {
    console.warn("En attente du chargement de l'élément avec la classe .j1...");
    return; 
  }

  let estEnTrainDeBouger = false;
  let vitesse = 1.85;

  // Détection des mouvements sur chaque axe
  const bougeHorizontal = (keysJ1.d && (lastKeyJ1 === "d" || !keysJ1.q)) || (keysJ1.q && (lastKeyJ1 === "q" || !keysJ1.d));
  const bougeVertical = keysJ1.z || keysJ1.s;

  // Correction de la vitesse en diagonale (division par racine de 2)
  if (bougeHorizontal && bougeVertical) {
    vitesse = vitesse / Math.SQRT2; // Vitesse physique lissée à ~2.12 pixels par axe
  }

  // Mouvement Horizontal (Axe X)
  if (keysJ1.d && (lastKeyJ1 === "d" || !keysJ1.q)) {
    p1Direction = "droite";
    p1X += vitesse; 
    estEnTrainDeBouger = true;
  } else if (keysJ1.q && (lastKeyJ1 === "q" || !keysJ1.d)) {
    p1Direction = "gauche";
    p1X -= vitesse; 
    estEnTrainDeBouger = true;
  }

  // Mouvement Vertical (Axe Y)
  if (keysJ1.z) {       // Monter
    p1Y -= vitesse;     
    estEnTrainDeBouger = true;
  } else if (keysJ1.s) { // Descendre
    p1Y += vitesse;     
    estEnTrainDeBouger = true;
  }

  // Gestion du déclenchement/arrêt de l'animation de marche
  if (estEnTrainDeBouger) {
    startAnimJ1(p1Sprite);
  } else {
    stopAnimJ1(p1Sprite);
  }

  // Limites du Canvas (Évite que le joueur ne sorte de l'écran 480x270)
  if (p1X < 0) p1X = 0;
  if (p1X > ctx.canvas.width - 64) p1X = ctx.canvas.width - 64;
  if (p1Y < 0) p1Y = 0;
  if (p1Y > ctx.canvas.height - 64) p1Y = ctx.canvas.height - 64;

  // --- RENDU VISUEL DANS LE CANVAS ---
  ctx.save();
  if (p1Direction === "gauche") {
    // Effet miroir horizontal si le personnage regarde à gauche
    ctx.translate(p1X + 64, p1Y);
    ctx.scale(-1, 1);
    ctx.drawImage(p1Sprite, 0, 0, 64, 64);
  } else {
    // Dessin standard vers la droite
    ctx.drawImage(p1Sprite, p1X, p1Y, 64, 64);
  }
  ctx.restore();
}