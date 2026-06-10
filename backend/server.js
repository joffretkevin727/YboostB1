const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Chemins absolus pour servir les fichiers statiques
app.use("/frontend", express.static(path.join(__dirname, "..", "frontend")));

let joueursConnectes = {};
let boitesDynamiques = [];

const MAP_W = 1600;
const MAP_H = 900;
const REBORD = 25;

// Routes principales
app.get("/menu", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "menu.html")),
);
app.get("/ingame", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "ingame.html")),
);

io.on("connection", (socket) => {
  // 1. Rejet si le serveur est déjà plein (2 joueurs max)
  if (Object.keys(joueursConnectes).length >= 2) {
    socket.emit("serveur_plein");
    socket.disconnect();
    return;
  }

  console.log(`🟢 Joueur connecté : ${socket.id}`);

  // 2. Attribution automatique du rôle
  let role = "j1";
  if (Object.values(joueursConnectes).some((j) => j.role === "j1")) {
    role = "j2";
  }

  // 3. Initialisation de l'état du joueur
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

  socket.emit("init_base", { role: role, boites: boitesDynamiques });

  // 4. Matchmaking : Validation du Skin
  socket.on("choix_skin_valide", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j) return;

    j.skin = data.skin;
    j.ready = true;
    console.log(`👤 ${socket.id} est prêt avec le ${data.skin}`);

    const tousLesJoueurs = Object.values(joueursConnectes);
    if (tousLesJoueurs.length === 2 && tousLesJoueurs.every((p) => p.ready)) {
      console.log("⚔️ Partie lancée !");
      io.emit("lancement_partie", joueursConnectes);
    } else {
      io.emit("attente_file", { connectes: tousLesJoueurs.length });
    }
  });

  // 5. Mouvements sécurisés
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

  // 6. Tirs
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

  // 7. Gestion des dégâts et FIN DE PARTIE
  socket.on("infliger_degat", (data) => {
    const cible = joueursConnectes[data.cibleId];
    const tireur = joueursConnectes[socket.id]; // Celui qui a tiré

    if (cible && cible.health > 0) {
      cible.health = Math.max(0, cible.health - data.montant);

      // VÉRIFICATION DE LA MORT
      if (cible.health <= 0) {
        console.log(`💀 Fin de partie : ${tireur.id} a éliminé ${cible.id} !`);

        // On annonce à tout le monde qui a gagné
        io.emit("fin_de_partie", {
          vainqueurId: tireur.id,
          perdantId: cible.id,
        });

        // (Optionnel) On réinitialise l'état du serveur pour les prochains joueurs
        boitesDynamiques = [];
        for (let id in joueursConnectes) {
          joueursConnectes[id].ready = false;
          joueursConnectes[id].health = 100;
          joueursConnectes[id].mursPoses = 0;
        }
      } else {
        // S'il n'est pas mort, on met juste à jour la vie
        io.emit("mise_a_jour_joueurs", joueursConnectes);
      }
    }
  });

  // 8. Obstacles dynamiques (Limite de 5 murs)
  socket.on("poser_boite", (data) => {
    const j = joueursConnectes[socket.id];
    if (!j || j.health <= 0 || !j.ready || j.mursPoses >= 5) return;

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

  // 9. Déconnexion et nettoyage
  socket.on("disconnect", () => {
    console.log(`🔴 Joueur déconnecté : ${socket.id}`);
    delete joueursConnectes[socket.id];
    if (Object.keys(joueursConnectes).length === 0) boitesDynamiques = [];
    io.emit("mise_a_jour_joueurs", joueursConnectes);
  });
});

server.listen(6969, "0.0.0.0", () => {
  console.log("🚀 Serveur Multijoueur actif sur : http://localhost:6969/menu");
});
