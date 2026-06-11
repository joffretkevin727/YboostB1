const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use("/frontend", express.static(path.join(__dirname, "..", "frontend")));

let lobbyJoueurs = {};
let joueursEnJeu = {};
let boitesDynamiques = [];

const MAP_W = 1600;
const MAP_H = 900;
const ORDRE_SLOTS = ["A1", "B1", "A2", "B2"]; // Ordre de remplissage naturel

app.get("/menu", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "menu.html")),
);
app.get("/ingame", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "ingame.html")),
);
app.get("/lobby", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "lobby.html")),
);

// 🔄 FONCTION MAGIQUE : Décaler A2 sur A1 ou B2 sur B1 s'il y a un trou
function verifierDecalageBrawlStars() {
  ["A", "B"].forEach((equipe) => {
    const joueur1 = Object.values(lobbyJoueurs).find(
      (j) => j.slot === equipe + "1",
    );
    const joueur2 = Object.values(lobbyJoueurs).find(
      (j) => j.slot === equipe + "2",
    );

    // Si la place 1 est vide mais que la place 2 est prise, le joueur avance d'une case !
    if (!joueur1 && joueur2) {
      joueur2.slot = equipe + "1";
    }
  });
}

io.on("connection", (socket) => {
  console.log(`🟢 Connecté : ${socket.id}`);

  // ==========================================
  // LOBBY BRAWL STARS - CONNEXION
  // ==========================================
  socket.on("demander_slot_lobby", (modeJeu) => {
    // Cherche le premier slot libre dans l'ordre (A1, puis B1, puis A2, puis B2)
    const slotsPris = Object.values(lobbyJoueurs).map((j) => j.slot);
    const slotChoisi = ORDRE_SLOTS.find((s) => !slotsPris.includes(s));

    if (!slotChoisi) return; // Full

    lobbyJoueurs[socket.id] = {
      id: socket.id,
      slot: slotChoisi,
      equipe: slotChoisi.startsWith("A") ? "A" : "B",
      pret: false,
      skin: "skin1",
      mode: modeJeu,
    };

    io.emit("mise_a_jour_lobby", lobbyJoueurs);
  });

  // ==========================================
  // CLIC SUR UN "+" POUR CHANGER DE PLACE
  // ==========================================
  socket.on("changer_slot", (targetSlot) => {
    const j = lobbyJoueurs[socket.id];
    if (!j) return;

    const slotsPris = Object.values(lobbyJoueurs).map((p) => p.slot);

    // Si la place cliquée est bien libre
    if (!slotsPris.includes(targetSlot)) {
      j.slot = targetSlot;
      j.equipe = targetSlot.startsWith("A") ? "A" : "B";
      j.pret = false; // On décoche Prêt par sécurité

      verifierDecalageBrawlStars(); // Vérifie s'il y a laissé un trou derrière lui
      io.emit("mise_a_jour_lobby", lobbyJoueurs);
    }
  });

  // ==========================================
  // MISE À JOUR (Skin, Prêt)
  // ==========================================
  socket.on("update_lobby_info", (data) => {
    if (lobbyJoueurs[socket.id]) {
      lobbyJoueurs[socket.id].pret = data.pret;
      lobbyJoueurs[socket.id].skin = data.skin;
    }
    io.emit("mise_a_jour_lobby", lobbyJoueurs);

    const tous = Object.values(lobbyJoueurs);
    if (tous.length === 0) return;

    const mode = tous[0].mode;
    const tousPrets = tous.every((j) => j.pret);

    // Lancement de la game
    if (
      (mode === "1vs1" && tous.length === 2 && tousPrets) ||
      (mode === "bot" && tous.length === 1 && tousPrets) ||
      (mode === "2vs2" && tous.length === 4 && tousPrets)
    ) {
      io.emit("lancement_partie_lobby");
      lobbyJoueurs = {};
    }
  });

  // ==========================================
  // ARÈNE (JEU EN COURS) - AUCUN CHANGEMENT
  // ==========================================
  socket.on("rejoindre_arene", (data) => {
    const nbInTeam = Object.values(joueursEnJeu).filter(
      (j) => j.equipe === data.equipe,
    ).length;
    let startX, startY, startDir;

    if (data.equipe === "A") {
      startX = 150 + nbInTeam * 100;
      startY = 150 + nbInTeam * 100;
      startDir = "droite";
    } else {
      startX = MAP_W - 200 - nbInTeam * 100;
      startY = MAP_H - 200 - nbInTeam * 100;
      startDir = "gauche";
    }

    joueursEnJeu[socket.id] = {
      id: socket.id,
      role: data.equipe === "A" ? "j1" : "j2",
      equipe: data.equipe,
      x: startX,
      y: startY,
      direction: startDir,
      health: 100,
      mursPoses: 0,
      skin: data.skin,
      ready: true,
    };

    if (data.mode === "bot") {
      const botId = "BOT_" + socket.id;
      joueursEnJeu[botId] = {
        id: botId,
        role: "j2",
        equipe: "B",
        x: MAP_W - 200,
        y: MAP_H - 200,
        direction: "gauche",
        health: 100,
        mursPoses: 0,
        skin: "skin4",
        ready: true,
        isBot: true,
      };
    }

    io.emit("mise_a_jour_initiale_arene", joueursEnJeu);
  });

  socket.on("action_deplacement", (data) => {
    const j = joueursEnJeu[socket.id];
    if (j && j.health > 0) {
      j.x = data.x;
      j.y = data.y;
      j.direction = data.direction;
      j.enMouvement = data.enMouvement;
      socket.broadcast.emit("mise_a_jour_joueurs", joueursEnJeu);
    }
  });

  socket.on("action_tir", (data) => {
    socket.broadcast.emit("remote_tir", {
      ownerId: socket.id,
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  });

  socket.on("infliger_degat", (data) => {
    const cible = joueursEnJeu[data.cibleId];
    const tireur = joueursEnJeu[socket.id] || joueursEnJeu[data.tireurId];

    if (cible && tireur && cible.health > 0) {
      if (cible.equipe === tireur.equipe) return; // Friendly Fire DÉSACTIVÉ

      cible.health = Math.max(0, cible.health - data.montant);
      if (cible.health <= 0) {
        io.emit("fin_de_partie", {
          vainqueurId: data.tireurId,
          perdantId: cible.id,
        });
        boitesDynamiques = [];
        joueursEnJeu = {};
      } else {
        io.emit("mise_a_jour_joueurs", joueursEnJeu);
      }
    }
  });

  socket.on("poser_boite", (data) => {
    const j = joueursEnJeu[socket.id];
    if (j && j.mursPoses < 5) {
      boitesDynamiques.push({ x: data.x, y: data.y, w: 40, h: 40 });
      j.mursPoses++;
      io.emit("nouvelle_boite_ajoutee", { x: data.x, y: data.y, w: 40, h: 40 });
    }
  });

  socket.on("disconnect", () => {
    if (lobbyJoueurs[socket.id]) {
      delete lobbyJoueurs[socket.id];
      verifierDecalageBrawlStars(); // Le fameux glissement !
      io.emit("mise_a_jour_lobby", lobbyJoueurs);
    }

    delete joueursEnJeu[socket.id];
    delete joueursEnJeu["BOT_" + socket.id];
    io.emit("mise_a_jour_joueurs", joueursEnJeu);
  });
});

server.listen(6969, "0.0.0.0", () => {
  console.log("🚀 Serveur actif sur http://localhost:6969/menu");
});
