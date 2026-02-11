const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Game = require('./models/game'); // Importe ta classe Game
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const game = new Game();
const TICK_RATE = 33; // ~30 images par seconde
const path = require('path');

// Indique à Express d'utiliser le dossier Frontend pour les fichiers statiques
// On remonte d'un niveau (..) puis on entre dans Frontend
app.use(express.static(path.join(__dirname, '../../Frontend')));

// Force l'envoi de index.html si on arrive sur la racine "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Frontend/index.html'));
});

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    // Créer un joueur quand quelqu'un se connecte
    // On le place à des endroits différents selon le nombre de joueurs
    const startX = Object.keys(game.players).length === 0 ? 1 : 6;
    game.players[socket.id] = { id: socket.id, x: startX, y: 3, hp: 100, dmgDealt: 0, hasUlti: false };

    // Écouter les actions du client
    socket.on('action', (action) => {
        game.applyAction(socket.id, action); // Applique l'action au moteur de jeu
    });

    socket.on('disconnect', () => {
        delete game.players[socket.id];
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