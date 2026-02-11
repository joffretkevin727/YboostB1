const socket = io();

// Éléments HTML
const menu = document.getElementById('menu');
const gameContainer = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');

// Configuration
const TILE_SIZE = 50;
let isGameRunning = false;

/**
 * Envoie la demande de connexion au lobby
 */
function joinGame() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput ? nameInput.value : "Anonyme";
    
    socket.emit('joinLobby', { name: name });
    
    if (statusText) {
        statusText.innerText = "Attente d'un adversaire...";
    }
}

/**
 * Fonction de dessin principale
 */
function renderGame(state) {
    // 1. Nettoyage
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Fond (Zone toxique)
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Dessin des murs
    if (state.walls) {
        state.walls.forEach(([coords, hp]) => {
            const [x, y] = coords.split(',').map(Number);
            ctx.fillStyle = "#95a5a6";
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            // Barre de vie du mur
            ctx.fillStyle = "red";
            ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 42, (hp / 15) * 40, 4);
        });
    }

    // 4. Dessin des joueurs
    Object.values(state.players).forEach(p => {
        // Couleur : Bleu pour local, Rouge pour les autres
        ctx.fillStyle = p.id === socket.id ? "#3498db" : "#e74c3c";
        ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Pseudo et HP
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`HP: ${Math.floor(p.hp)}`, p.x * TILE_SIZE + TILE_SIZE/2, p.y * TILE_SIZE - 5);
        
        if (p.hasUlti) {
            ctx.fillStyle = "#f1c40f";
            ctx.fillText("ULTI READY", p.x * TILE_SIZE + TILE_SIZE/2, p.y * TILE_SIZE + 65);
        }
    });

    // 5. HUD (Interface)
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`Munitions (RMC): ${state.rmc}/9`, 10, 25);
    ctx.fillText(`Temps: ${state.timer}s`, canvas.width - 100, 25);
}

// --- ÉCOUTEURS SOCKET ---

// Mise à jour de l'affichage du lobby
socket.on('lobbyUpdate', (count) => {
    if (statusText) {
        statusText.innerText = `${count} joueur(s) dans le lobby...`;
    }
});

// Lancement de la partie
socket.on('gameStart', () => {
    isGameRunning = true;
    if (menu) menu.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'flex';
});

// Réception des frames de jeu
socket.on('stateUpdate', (gameState) => {
    if (isGameRunning) {
        renderGame(gameState);
    }
});

// --- ENTRÉES CLAVIER ---

window.addEventListener('keydown', (e) => {
    if (!isGameRunning) return; // Bloque les touches si on est au menu

    let action = null;
    
    // Mouvements
    if (e.key === "ArrowUp")    action = { type: "MOVE", direction: "UP" };
    if (e.key === "ArrowDown")  action = { type: "MOVE", direction: "DOWN" };
    if (e.key === "ArrowLeft")  action = { type: "MOVE", direction: "LEFT" };
    if (e.key === "ArrowRight") action = { type: "MOVE", direction: "RIGHT" };
    
    // Actions spéciales
    if (e.key === "f")          action = { type: "SHOOT", direction: "UP" };
    if (e.key === "w")          action = { type: "PLACE_WALL", direction: "UP" };

    if (action) {
        socket.emit('action', action);
    }
});