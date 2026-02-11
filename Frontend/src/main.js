const socket = io("http://localhost:8080"); 

// On récupère le canvas HTML
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE_SIZE = 50; // Taille d'une case en pixels

// --- LA FONCTION DE DESSIN ---
function renderGame(state) {
    // 1. On vide le canvas à chaque image
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. On dessine la zone toxique (fond sombre)
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. On dessine les murs
    state.walls.forEach(([coords, hp]) => {
        const [x, y] = coords.split(',').map(Number);
        ctx.fillStyle = "#95a5a6"; // Gris pour le mur
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Petite barre de vie pour le mur
        ctx.fillStyle = "red";
        ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 40, (hp/15) * 40, 5);
    });

    // 4. On dessine les joueurs
    Object.values(state.players).forEach(p => {
        ctx.fillStyle = p.id === socket.id ? "#3498db" : "#e74c3c"; // Bleu pour toi, Rouge pour l'autre
        ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Texte : HP et Munitions
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(`HP: ${Math.floor(p.hp)}`, p.x * TILE_SIZE, p.y * TILE_SIZE - 5);
        
        if (p.hasUlti) {
            ctx.fillStyle = "#f1c40f"; // Jaune pour l'Ulti
            ctx.fillText("ULTI READY", p.x * TILE_SIZE, p.y * TILE_SIZE + 65);
        }
    });

    // 5. Interface (HUD)
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`Munitions (RMC): ${state.rmc}/9`, 10, 20);
    ctx.fillText(`Temps: ${state.timer}s`, 300, 20);
}

// Écouter les mises à jour
socket.on('stateUpdate', (gameState) => {
    renderGame(gameState); 
});

// Contrôles au clavier
window.addEventListener('keydown', (e) => {
    let action = null;
    
    // Déplacements
    if (e.key === "ArrowUp") action = { type: "MOVE", direction: "UP" };
    if (e.key === "ArrowDown") action = { type: "MOVE", direction: "DOWN" };
    if (e.key === "ArrowLeft") action = { type: "MOVE", direction: "LEFT" };
    if (e.key === "ArrowRight") action = { type: "MOVE", direction: "RIGHT" };
    
    // Tir (Touche T ou Espace)
    if (e.key === "f") action = { type: "SHOOT", direction: "UP" }; // À améliorer avec la dernière direction
    
    // Poser un mur (Touche M ou W)
    if (e.key === "w") action = { type: "PLACE_WALL", direction: "UP" };

    if (action) {
        socket.emit('action', action);
    }
});