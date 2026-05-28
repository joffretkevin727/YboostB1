// ==========================================
// 1. INITIALISATION DU CANVAS
// ==========================================
const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");

// CORRECTION : La variable est bien déclarée maintenant !
let modeDeJeu = "1vs1"; // "1vs1" ou "vsBot"

// LA LIGNE MAGIQUE : Empêche le jeu d'être flou (Anti-aliasing désactivé)
ctx.imageSmoothingEnabled = false;

// ==========================================
// 2. LES OBSTACLES DE LA MAP (DYNAMIQUES)
// ==========================================
let mapObstacles = [];

function creerObstacles() {
  const w = canvas.width; // La vraie largeur actuelle du canvas
  const h = canvas.height; // La vraie hauteur actuelle du canvas
  const epaisseur = 25; // L'épaisseur des murs du vaisseau

  mapObstacles = [
    // --- LES MURS EXTÉRIEURS (S'adaptent 100% à la taille de la map) ---
    { x: 0, y: 0, w: w, h: epaisseur }, // Mur du Haut
    { x: 0, y: h - epaisseur, w: w, h: epaisseur }, // Mur du Bas
    { x: 0, y: 0, w: epaisseur, h: h }, // Mur de Gauche
    { x: w - epaisseur, y: 0, w: epaisseur, h: h }, // Mur de Droite

    // --- LES OBSTACLES INTERNES ---
    { x: 320, y: 310, w: 40, h: 80 }, // Pilier gauche mid haut
    { x: 1260, y: 260, w: 40, h: 80 }, // Pilier droit mid haut
    { x: 587, y: 760, w: 50, h: 80 }, // Pilier gauche mid bas
    { x: 965, y: 760, w: 50, h: 80 }, // Pilier droit mid bas
    { x: 520, y: 80, w: 40, h: 80 }, // Pilier haut gauche
    { x: 1040, y: 80, w: 40, h: 80 }, // Pilier haut droit
    { x: 100, y: 500, w: 140, h: 60 }, // Mur mid gauche gauche
    { x: 1360, y: 330, w: 140, h: 60 }, // Mur droit haut
    { x: 1360, y: 500, w: 140, h: 60 }, // Mur droit bas

    // -- mid --
    { x: 510, y: 225, w: 240, h: 60 }, // Mur mid haut gauche horizontal
    { x: 510, y: 280, w: 25, h: 110 }, // Mur mid haut gauche vertical
    { x: 960, y: 210, w: 130, h: 70 }, // Mur mid haut droit horizontal
    { x: 1060, y: 280, w: 25, h: 105 }, // Mur mid haut droit vertical
    { x: 510, y: 510, w: 25, h: 100 }, // Mur mid bas gauche vertical
    { x: 1060, y: 510, w: 25, h: 100 }, // Mur mid bas droit vertical
    { x: 350, y: 610, w: 150, h: 60 }, // Mur mid bas gauche horizontal
    { x: 345, y: 500, w: 40, h: 170 }, // Mur mid bas gauche gauche vertical
    { x: 1100, y: 610, w: 150, h: 70 }, // Mur mid bas droit horizontal
    { x: 850, y: 620, w: 110, h: 60 }, // Mur mid bas droit droit horizontal
    { x: 745, y: 640, w: 110, h: 40 }, // Mur mid bas droit gauche horizontal

    // -- contours --
    { x: 20, y: 20, w: 2000, h: 90 }, // haut
    { x: 20, y: 800, w: 2000, h: 90 }, // bas
    { x: 20, y: 20, w: 100, h: 1000 }, // gauche
    { x: 1470, y: 20, w: 100, h: 1000 }, // droit
  ];
}

// On génère la liste des obstacles tout de suite
creerObstacles();

// Outil de debug pour voir les murs (à effacer plus tard)
function debugDessinerHitboxes(ctx) {
  ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
  for (let obs of mapObstacles) {
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  }
}

// ==========================================
// 3. CRÉATION DES JOUEURS
// ==========================================

// Joueur 1 : Coin en Haut à Gauche
const joueur1 = new Player({
  startX: 150, // Proche du mur gauche
  startY: 150, // Proche du mur haut
  spriteClass: ".j1",
  keys: { haut: "z", bas: "s", gauche: "q", droite: "d" },
  spritePath: "../frontend/assets/man/",
});

// Joueur 2 (Humain) : Coin en Bas à Droite
const joueur2 = new Player({
  // On prend la largeur/hauteur totale, et on recule de 100 pixels pour ne pas être coincé dans le mur
  startX: canvas.width - 200,
  startY: canvas.height - 200,
  spriteClass: ".j2",
  keys: {
    haut: "arrowup",
    bas: "arrowdown",
    gauche: "arrowleft",
    droite: "arrowright",
  },
  spritePath: "../frontend/assets/man/",
});

// Bot (IA) : Coin en Bas à Droite (même endroit que le J2)
const bot = new Bot({
  startX: canvas.width - 200,
  startY: canvas.height - 200,
  spriteClass: ".j2", // Utilise le même sprite que le joueur 2
  keys: {}, // L'IA n'a pas besoin de touches
  spritePath: "../frontend/assets/man/",
});

// ==========================================
// 4. LA BOUCLE DE JEU
// ==========================================
function gameLoop() {
  // 1. On nettoie l'écran
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. On dessine la map du FOND (sol, murs de base)
  dessinerMap(ctx, canvas);

  // 3. On met à jour et on DESSINE LES JOUEURS
  if (modeDeJeu === "1vs1") {
    joueur1.update(ctx, [joueur2], mapObstacles);
    joueur2.update(ctx, [joueur1], mapObstacles);
  } else if (modeDeJeu === "1vsbot") {
    joueur1.update(ctx, [bot], mapObstacles);
    if (typeof bot !== "undefined") {
      bot.update(ctx, [joueur1], mapObstacles);
    }
  }

  // 4. On dessine le PREMIER PLAN (par-dessus les joueurs !)
  dessinerPremierPlan(ctx);

  // 5. On boucle
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 5. LANCEMENT
// ==========================================
window.onload = () => {
  gameLoop();
};

// ==========================================
// DÉCORS DE PREMIER PLAN (Piliers)
// ==========================================
const piliersForeground = [
  // Remplace les x, y, w, h par les bonnes coordonnées sur ta map
  { id: "img-pilier1", x: 320, y: 219, w: 35, h: 170 },
  { id: "img-pilier2", x: 1260, y: 221, w: 40, h: 110 },
  { id: "img-pilier3", x: 590, y: 710, w: 40, h: 120 },
  { id: "img-pilier4", x: 965, y: 710, w: 47, h: 120 },
  { id: "img-mur1", x: 510, y: 460, w: 20, h: 160 },
  { id: "img-mur1", x: 1067, y: 460, w: 20, h: 160 },
];

function dessinerPremierPlan(ctx) {
  for (let pilier of piliersForeground) {
    const img = document.getElementById(pilier.id);
    if (img) {
      ctx.drawImage(img, pilier.x, pilier.y, pilier.w, pilier.h);
    }
  }
}
