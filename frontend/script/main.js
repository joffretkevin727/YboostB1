// main.js
const canvas = document.getElementById('monCanvas');
const ctx = canvas.getContext('2d');

// "1vs1" pour jouer à deux au clavier, ou "vsBot" pour activer le bot
let modeDeJeu = "vsBot"; 

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dessinerMap(ctx, canvas); // 1. Le fond
    updateAndDrawPlayer1(ctx); // 2. Le Joueur 1 (Z, Q, S, D)

    // 3. Aiguillage automatique selon le mode choisi
    if (modeDeJeu === "1vs1") {
        updateAndDrawPlayer2(ctx); // Appel du joueur humain (Flèches)
    } else if (modeDeJeu === "vsBot") {
        updateAndDrawBot(ctx); // Appel du Bot automatique
    }

    requestAnimationFrame(gameLoop);
}

window.onload = () => {
    gameLoop();
};