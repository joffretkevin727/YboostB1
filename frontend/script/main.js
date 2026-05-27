// main.js

const canvas = document.getElementById('monCanvas');
const ctx    = canvas.getContext('2d');

// ─────────────────────────────────────────────
// MODE DE JEU
// Valeurs possibles : "1vs1" | "vsBot"
// ─────────────────────────────────────────────
let modeDeJeu = "1vs1";

// ─────────────────────────────────────────────
// INSTANCIATION DES JOUEURS
// ─────────────────────────────────────────────

// Joueur 1 — touches ZQSD
const p1 = new Player({
  startX:      50,
  startY:      110,
  spriteClass: ".j1",
  spritePath:  "../frontend/assets/man/",
  keys: {
    haut:   "z",
    bas:    "s",
    gauche: "q",
    droite: "d",
  },
});

// Joueur 2 — touches Flèches
const p2 = new Player({
  startX:      360,
  startY:      110,
  spriteClass: ".j2",
  spritePath:  "../frontend/assets/man/",
  keys: {
    haut:   "arrowup",
    bas:    "arrowdown",
    gauche: "arrowleft",
    droite: "arrowright",
  },
});

// Bot — cible p1 par défaut
// (créé dans tous les cas, mais utilisé seulement en mode vsBot)
const bot = new Bot(
  {
    startX:      360,
    startY:      110,
    spriteClass: ".j2",   // réutilise le même sprite que J2
    spritePath:  "../frontend/assets/man/",
  },
  p1  // référence de la cible
);

// ─────────────────────────────────────────────
// BOUCLE DE JEU
// ─────────────────────────────────────────────

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dessinerMap(ctx, canvas); // Fond de carte

  p1.update(ctx);           // Joueur 1 (ZQSD)

  if (modeDeJeu === "1vs1") {
    p2.update(ctx);         // Joueur 2 humain (Flèches)
  } else if (modeDeJeu === "vsBot") {
    bot.update(ctx);        // Bot IA
  }

  requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────
// DÉMARRAGE
// ─────────────────────────────────────────────

window.onload = () => {
  gameLoop();
};