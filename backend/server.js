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
  if (Object.keys(joueursConnectes).length >= 2) {
    socket.emit("serveur_plein");
    socket.disconnect();
    return;
  }

  console.log(`🟢 Session connectée : ${socket.id}`);

  let role = "j1";
  if (Object.values(joueursConnectes).some((j) => j.role === "j1")) {
    role = "j2";
  }

  // État initial : le joueur n'a pas encore choisi son skin et n'est pas prêt
  joueursConnectes[socket.id] = {
    id: socket.id,
    role: role,
    x: role === "j1" ? 150 : MAP_W - 200,
    y: role === "j1" ? 150 : MAP_H - 200,
    direction: role === "j1" ? "droite" : "gauche",
    health: 100,
    mursPoses: 0,
    skin: null,
    ready: false,
  };

  // Envoi des données de base (les boîtes déjà existantes s'il y en a)
  socket.emit("init_base", { role: role, boites: boitesDynamiques });

  // Événement quand un joueur valide son skin depuis l'interface
  socket.on("choix_skin_valide", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j) return;

    j.skin = data.skin; // Ex: "skin1", "skin2", "skin3", "skin4"
    j.ready = true;

    console.log(`👤 ${socket.id} (${j.role}) a choisi le skin : ${data.skin}`);

    // On vérifie si on a 2 joueurs connectés ET que les deux sont prêts
    const tousLesJoueurs = Object.values(joueursConnectes);
    if (
      tousLesJoueurs.length === 2 &&
      tousLesJoueurs.every((p) => p.ready === true)
    ) {
      console.log("⚔️ Les deux joueurs sont prêts. Lancement de la partie !");
      io.emit("lancement_partie", joueursConnectes);
    } else {
      // Sinon, on notifie qu'on attend toujours dans la file d'attente
      io.emit("attente_file", { connectes: tousLesJoueurs.length });
    }
  });

  // Déplacements avec double vérification
  socket.on("action_deplacement", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0 || !j.ready) return;

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

  // Tirs avec double vérification
  socket.on("action_tir", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0 || !j.ready) return;

    socket.broadcast.emit("remote_tir", {
      ownerId: socket.id,
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  });

  // Dégâts avec double vérification
  socket.on("infliger_degat", (data) => {
    const cible = joueursConnectes[data.cibleId];
    if (cible && cible.health > 0) {
      cible.health = Math.max(0, cible.health - data.montant);
      io.emit("mise_a_jour_joueurs", joueursConnectes);
    }
  });

  // Poser une boîte (max 5) avec double vérification
  socket.on("poser_boite", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0 || j.mursPoses >= 5 || !j.ready) return;

    const tropProche = boitesDynamiques.some(
      (b) => Math.hypot(b.x - data.x, b.y - data.y) < 30,
    );

    if (!tropProche) {
      const nouvelleBoite = { x: data.x, y: data.y, w: 40, h: 40 };
      boitesDynamiques.push(nouvelleBoite);
      j.mursPoses++;
      io.emit("nouvelle_boite_ajoutee", nouvelleBoite);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Session déconnectée : ${socket.id}`);
    delete joueursConnectes[socket.id];
    if (Object.keys(joueursConnectes).length === 0) {
      boitesDynamiques = [];
    }
    io.emit("mise_a_jour_joueurs", joueursConnectes);
  });
});

server.listen(6969, "0.0.0.0", () => {
  console.log("🚀 Serveur Multijoueur actif sur : http://localhost:6969/menu");
});
