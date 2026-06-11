const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use("/frontend", express.static(path.join(__dirname, "..", "frontend")));

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

  console.log(`🟢 Joueur connecté : ${socket.id}`);

  // ==========================================
  // NOUVEAU : LOGIQUE D'ATTRIBUTION DES SLOTS LOBBY
  // ==========================================
  socket.on("demander_slot", () => {
    // Détermine le slot libre (p1 ou p2)
    const rolesActuels = Object.values(joueursConnectes).map((j) => j.slot);
    const slot = rolesActuels.includes("p1") ? "p2" : "p1";
    const roleGame = slot === "p1" ? "j1" : "j2";

    // Initialisation complète requise par le lobby et le ingame
    joueursConnectes[socket.id] = {
      id: socket.id,
      slot: slot, // Pour le lobby
      role: roleGame, // Pour le ingame
      x: roleGame === "j1" ? 150 : MAP_W - 200,
      y: roleGame === "j1" ? 150 : MAP_H - 200,
      direction: roleGame === "j1" ? "droite" : "gauche",
      health: 100,
      mursPoses: 0,
      skin: "skin1",
      pseudo: slot === "p1" ? "Joueur 1" : "Joueur 2",
      pret: false, // Suivi du lobby
      ready: false, // Suivi du ingame
    };

    socket.emit("reponse_slot", slot);
    io.emit("mise_a_jour_lobby", joueursConnectes);
  });

  // NOUVEAU : Synchronisation en temps réel des changements de skin et pseudo
  socket.on("update_lobby_info", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j) return;
    j.skin = data.skin;
    j.pseudo = data.pseudo;
    io.emit("mise_a_jour_lobby", joueursConnectes);
  });

  // NOUVEAU : Gestion des états de préparation et lancement du décompte du lobby
  socket.on("joueur_statut_pret", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j) return;

    j.pret = data.pret;
    j.ready = data.pret; // Aligne l'état du moteur de jeu
    j.pseudo = data.pseudo;
    j.skin = data.skin;

    io.emit("mise_a_jour_lobby", joueursConnectes);

    const tousLesJoueurs = Object.values(joueursConnectes);
    if (tousLesJoueurs.length === 2 && tousLesJoueurs.every((p) => p.ready)) {
      console.log("⚔️ Partie lancée !");
      io.emit("lancement_partie", joueursConnectes);
    } else {
      io.emit("attente_file", { connectes: tousLesJoueurs.length });
    }
  });

  // ==========================================
  // LOGIQUE DE SÉCURITÉ ET D'INSTANCES DE JEU INTACTES
  // ==========================================
  socket.emit("init_base", { role: "j1", boites: boitesDynamiques }); // Compatibilité avec ton canvas init_base

  // --- MODE SOLO VS BOT ---
  socket.on("choix_skin_bot", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j) return;
    j.skin = data.skin;
    j.ready = true;

    const botId = "BOT_" + socket.id;
    joueursConnectes[botId] = {
      id: botId,
      role: "j2",
      x: MAP_W - 200,
      y: MAP_H - 200,
      direction: "gauche",
      health: 100,
      mursPoses: 0,
      skin: "skin4",
      ready: true,
      isBot: true,
      enMouvement: false,
    };

    socket.emit("lancement_partie", {
      [socket.id]: joueursConnectes[socket.id],
      [botId]: joueursConnectes[botId],
    });
  });

  // --- ACTIONS EN JEU ---
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
      j.enMouvement = data.enMouvement;
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
    const tireur = joueursConnectes[socket.id];

    if (cible && cible.health > 0) {
      cible.health = Math.max(0, cible.health - data.montant);

      if (cible.health <= 0) {
        console.log(`💀 Fin de partie : ${tireur.id} a éliminé ${cible.id} !`);
        io.emit("fin_de_partie", {
          vainqueurId: vainqueurId,
          perdantId: cible.id,
        });

        boitesDynamiques = [];
        for (let id in joueursConnectes) {
          joueursConnectes[id].pret = false;
          joueursConnectes[id].ready = false;
          joueursConnectes[id].health = 100;
          joueursConnectes[id].mursPoses = 0;
        }
      } else {
        io.emit("mise_a_jour_joueurs", joueursConnectes);
      }
    }
  });

  socket.on("poser_boite", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0 || j.mursPoses >= 5) return;

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
    console.log(`🔴 Joueur déconnecté : ${socket.id}`);
    delete joueursConnectes[socket.id];
    delete joueursConnectes["BOT_" + socket.id];
    if (Object.keys(joueursConnectes).length === 0) boitesDynamiques = [];
    io.emit("mise_a_jour_lobby", joueursConnectes);
    io.emit("mise_a_jour_joueurs", joueursConnectes);
  });
});

server.listen(6969, "0.0.0.0", () => {
  console.log("🚀 Serveur actif sur le port 6969 : http://localhost:6969/menu");
});
