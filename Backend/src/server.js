const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Game = require('./models/game'); // Importe ta classe Game
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Autorise tous les joueurs à se connecter
    methods: ["GET", "POST"]
  }
});

const game = new Game();
const TICK_RATE = 33; // ~30 images par seconde
const path = require('path');
const lobby = new Set(); // Stocke les IDs des joueurs prêts
// Indique à Express d'utiliser le dossier Frontend pour les fichiers statiques
// On remonte d'un niveau (..) puis on entre dans Frontend
app.use(express.static(path.join(__dirname, '../../Frontend')));

// Force l'envoi de index.html si on arrive sur la racine "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Frontend/index.html'));
});

io.on('connection', (socket) => {
    console.log(`Socket connecté : ${socket.id}`);

    // On n'ajoute PAS le joueur à game.players ici.
    // On attend qu'il clique sur "Rejoindre".

    socket.on('joinLobby', (data) => {
    if (Object.keys(game.players).length >= 2) {
        socket.emit('error', 'Partie pleine');
        return;
    }

    const startX = Object.keys(game.players).length === 0 ? 1 : 6;
    // Correction : on utilise data.name pour correspondre au client
    game.players[socket.id] = { 
        id: socket.id, 
        name: data.name || "Joueur", 
        x: startX, 
        y: 3, 
        hp: 100, 
        dmgDealt: 0, 
        hasUlti: false 
    };

    console.log(`${data.name} a rejoint le lobby.`);
    
    // Correction : on envoie juste le nombre pour matcher socket.on('lobbyUpdate', (count) => ...
    io.emit('lobbyUpdate', Object.keys(game.players).length);

    if (Object.keys(game.players).length === 2) {
        io.emit('gameStart'); 
    }
});

    socket.on('action', (action) => {
        if (game.players[socket.id]) {
            game.applyAction(socket.id, action);
        }
    });

    socket.on('disconnect', () => {
        delete game.players[socket.id];
        io.emit('lobbyUpdate', { count: Object.keys(game.players).length });
        console.log(`Joueur déconnecté : ${socket.id}`);
    });
});

// --- LA BOUCLE DE JEU (Toutes les 33ms) ---
setInterval(() => {
    game.update(TICK_RATE / 1000); // Met à jour le temps, la RMC et la Zone
    io.emit('stateUpdate', game.getState()); // Envoie le plateau à TOUS les joueurs
}, TICK_RATE);

server.listen(8080, () => {
    console.log("Serveur lancé sur le port 8080");
});