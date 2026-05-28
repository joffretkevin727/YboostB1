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
  const w = canvas.width; // La vraie largeur actuelle de ton canvas
  const h = canvas.height; // La vraie hauteur actuelle de ton canvas
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
    { x: 510, y: 460, w: 25, h: 160 }, // Mur mid bas gauche vertical
    { x: 1060, y: 460, w: 25, h: 160 }, // Mur mid bas droit vertical
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
const joueur1 = new Player({
  startX: 50,
  startY: 110,
  spriteClass: ".j1",
  keys: { haut: "z", bas: "s", gauche: "q", droite: "d" },
  spritePath: "../frontend/assets/man/",
});

const joueur2 = new Player({
  startX: 320,
  startY: 110,
  spriteClass: ".j2",
  keys: {
    haut: "arrowup",
    bas: "arrowdown",
    gauche: "arrowleft",
    droite: "arrowright",
  },
  spritePath: "../frontend/assets/man/",
});

// ==========================================
// 4. LA BOUCLE DE JEU
// ==========================================
function gameLoop() {
  // 1. On nettoie
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. On dessine le fond
  dessinerMap(ctx, canvas);

  // 3. On affiche les hitboxes rouges (pour t'aider à ajuster)
  debugDessinerHitboxes(ctx);

  // 4. On met à jour et on dessine les joueurs
  // CORRECTION : La logique des adversaires a été corrigée selon le mode de jeu
  if (modeDeJeu === "1vs1") {
    joueur1.update(ctx, [joueur2], mapObstacles);
    joueur2.update(ctx, [joueur1], mapObstacles);
  } else if (modeDeJeu === "vsBot") {
    // Si tu as bien défini une variable 'bot' ailleurs, ça passera par ici
    joueur1.update(ctx, [bot], mapObstacles);
    if (typeof bot !== "undefined") {
      bot.update(ctx, [joueur1], mapObstacles);
    }
  }

  // 5. On boucle
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 5. LANCEMENT
// ==========================================
window.onload = () => {
  gameLoop();
};
