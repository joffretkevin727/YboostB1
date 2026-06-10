// Backend/server.js
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use("/frontend", express.static(path.join(__dirname, "..", "frontend")));
app.use("/Backend", express.static(path.join(__dirname, "..", "Backend")));

let joueursConnectes = {};
let boitesDynamiques = [];

const MAP_W = 1600;
const MAP_H = 900;
const REBORD = 25;

app.get("/menu", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "menu.html")),
);
app.get("/ingame", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "ingame.html")),
);

io.on("connection", (socket) => {
  // --- NOUVEAU : On limite à 2 joueurs max ! ---
  if (Object.keys(joueursConnectes).length >= 2) {
    console.log(`❌ Rejeté : Serveur plein (${socket.id})`);
    socket.emit("serveur_plein"); // On prévient le client
    socket.disconnect(); // On lui coupe la connexion
    return;
  }

  console.log(`🟢 Joueur connecté : ${socket.id}`);

  let role = "j1";
  if (Object.values(joueursConnectes).some((j) => j.role === "j1")) {
    role = "j2";
  }

  joueursConnectes[socket.id] = {
    id: socket.id,
    role: role,
    x: role === "j1" ? 150 : MAP_W - 200,
    y: role === "j1" ? 150 : MAP_H - 200,
    direction: role === "j1" ? "droite" : "gauche",
    health: 100,
    mursPoses: 0, // NOUVEAU : Compteur de murs initialisé à 0
  };

  socket.emit("init_role", { role: role, boites: boitesDynamiques });
  io.emit("mise_a_jour_joueurs", joueursConnectes);

  socket.on("action_deplacement", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0) return;

    if (
      data.x >= REBORD &&
      data.x <= MAP_W - 64 - REBORD &&
      data.y >= REBORD &&
      data.y <= MAP_H - 64 - REBORD
    ) {
      j.x = data.x;
      j.y = data.y;
      j.direction = data.direction;
      socket.broadcast.emit("mise_a_jour_joueurs", joueursConnectes);
    }
  });

  socket.on("action_tir", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0) return;

    socket.broadcast.emit("remote_tir", {
      ownerId: socket.id,
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  });

  socket.on("infliger_degat", (data) => {
    const cible = joueursConnectes[data.cibleId];
    if (cible && cible.health > 0) {
      cible.health = Math.max(0, cible.health - data.montant);
      io.emit("mise_a_jour_joueurs", joueursConnectes);
    }
  });

  socket.on("poser_boite", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0) return;

    // --- NOUVEAU : Vérification de la limite des 5 murs ---
    if (j.mursPoses >= 5) {
      return; // On bloque la création si la limite est atteinte
    }

    const tropProche = boitesDynamiques.some(
      (b) => Math.hypot(b.x - data.x, b.y - data.y) < 30,
    );

    if (!tropProche) {
      const nouvelleBoite = { x: data.x, y: data.y, w: 40, h: 40 };
      boitesDynamiques.push(nouvelleBoite);
      j.mursPoses++; // On incrémente son compteur
      io.emit("nouvelle_boite_ajoutee", nouvelleBoite);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Joueur déconnecté : ${socket.id}`);
    delete joueursConnectes[socket.id];
    if (Object.keys(joueursConnectes).length === 0) {
      boitesDynamiques = []; // Nettoyage total de la map
    }
    io.emit("mise_a_jour_joueurs", joueursConnectes);
  });
});

// NOUVEAU : On écoute sur "0.0.0.0" pour accepter les connexions d'autres PC
server.listen(6969, "0.0.0.0", () => {
  console.log("🚀 Serveur Multijoueur actif sur le port 6969 !");
});
