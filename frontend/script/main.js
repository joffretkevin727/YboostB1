// main.js

// Initialisation globale du canvas
const canvas = document.getElementById('monCanvas');
const ctx = canvas.getContext('2d');

// La boucle de jeu (s'exécute ~60 fois par seconde)
function gameLoop() {
    // 1. On nettoie tout l'écran précédent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. On dessine la carte en premier (arrière-plan)
    dessinerMap(ctx, canvas);

    // 3. On met à jour et on dessine le Joueur 1 par-dessus
    updateAndDrawPlayer1(ctx);

    updateAndDrawPlayer2(ctx);

    // 4. On demande au navigateur de planifier la prochaine image
    requestAnimationFrame(gameLoop);
}

// On attend que la page (images comprises) soit prête pour lancer le jeu
window.onload = () => {
    gameLoop();
};