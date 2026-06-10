// frontend/script/main.js
const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Initialisation de la connexion temps réel Socket.io
const socket = io();

let monRole = null;
let monJoueurLocal = null;
let listeJoueursAdverses = {};
let mapObstacles = [];
let boitesPosees = []; // Tableau contenant les boîtes générées via la touche E

// Chargement des structures rigides initiales de la map
function initialiserObstacles() {
  const w = canvas.width;
  const h = canvas.height;
  const epaisseur = 25;

  return [
    { x: 0, y: 0, w: w, h: epaisseur }, // Mur du Haut

    { x: 0, y: h - epaisseur, w: w, h: epaisseur }, // Mur du Bas

    { x: 0, y: 0, w: epaisseur, h: h }, // Mur de Gauche

    { x: w - epaisseur, y: 0, w: epaisseur, h: h }, // Mur de Droite

    // --- LES OBSTACLES INTERNES ---

    { x: 320, y: 310, w: 40, h: 80 }, // Pilier gauche mid haut

    { x: 1260, y: 260, w: 40, h: 80 }, // Pilier droit mid haut

    { x: 587, y: 760, w: 50, h: 80 }, // Pilier gauche mid bas

    { x: 965, y: 760, w: 50, h: 80 }, // Pilier droit mid bas

    { x: 520, y: 80, w: 40, h: 80 }, // Pilier haut gauche

    { x: 1040, y: 80, w: 40, h: 80 }, // Pilier haut droit

    { x: 100, y: 500, w: 140, h: 60 }, // Mur mid gauche gauche

    { x: 1360, y: 330, w: 140, h: 60 }, // Mur droit haut

    { x: 1360, y: 500, w: 140, h: 60 }, // Mur droit bas

    // -- mid --

    { x: 510, y: 225, w: 240, h: 60 }, // Mur mid haut gauche horizontal

    { x: 510, y: 280, w: 25, h: 110 }, // Mur mid haut gauche vertical

    { x: 960, y: 210, w: 130, h: 70 }, // Mur mid haut droit horizontal

    { x: 1060, y: 280, w: 25, h: 105 }, // Mur mid haut droit vertical

    { x: 510, y: 510, w: 25, h: 100 }, // Mur mid bas gauche vertical

    { x: 1060, y: 510, w: 25, h: 100 }, // Mur mid bas droit vertical

    { x: 350, y: 610, w: 150, h: 60 }, // Mur mid bas gauche horizontal

    { x: 345, y: 500, w: 40, h: 170 }, // Mur mid bas gauche gauche vertical

    { x: 1100, y: 610, w: 150, h: 70 }, // Mur mid bas droit horizontal

    { x: 850, y: 620, w: 110, h: 60 }, // Mur mid bas droit droit horizontal

    { x: 745, y: 640, w: 110, h: 40 }, // Mur mid bas droit gauche horizontal

    // -- contours --

    { x: 20, y: 20, w: 2000, h: 90 }, // haut

    { x: 20, y: 800, w: 2000, h: 90 }, // bas

    { x: 20, y: 20, w: 100, h: 1000 }, // gauche

    { x: 1470, y: 20, w: 100, h: 1000 }, // droit
  ];
}

mapObstacles = initialiserObstacles();

// Réception de la configuration du rôle attribué par le serveur
socket.on("init_role", (data) => {
  monRole = data.role;
  boitesPosees = data.boites;

  monJoueurLocal = new Player({
    startX: monRole === "j1" ? 150 : canvas.width - 200,
    startY: monRole === "j1" ? 150 : canvas.height - 200,
    spriteClass: monRole === "j1" ? ".j1" : ".j2",
    spritePath: "../frontend/assets/man/",
    isLocal: true,
    socket: socket,
  });
});

// Réception synchrone de l'état global de l'ensemble des joueurs
socket.on("mise_a_jour_joueurs", (serveurJoueurs) => {
  for (let id in serveurJoueurs) {
    const sj = serveurJoueurs[id];
    if (id === socket.id) {
      if (monJoueurLocal) monJoueurLocal.health = sj.health;
    } else {
      if (!listeJoueursAdverses[id]) {
        listeJoueursAdverses[id] = new Player({
          startX: sj.x,
          startY: sj.y,
          spriteClass: sj.role === "j1" ? ".j1" : ".j2",
          spritePath: "../frontend/assets/man/",
          isLocal: false,
        });
        listeJoueursAdverses[id].id = id;
      }
      // Injection directe des coordonnées validées par le serveur
      listeJoueursAdverses[id].x = sj.x;
      listeJoueursAdverses[id].y = sj.y;
      listeJoueursAdverses[id].direction = sj.direction;
      listeJoueursAdverses[id].health = sj.health;
    }
  }

  // Suppression des entités déconnectées
  for (let id in listeJoueursAdverses) {
    if (!serveurJoueurs[id]) delete listeJoueursAdverses[id];
  }
});

// Écoute des tirs initiés par l'adversaire distant
socket.on("remote_tir", (data) => {
  if (listeJoueursAdverses[data.ownerId]) {
    listeJoueursAdverses[data.ownerId].projectiles.push({
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  }
});

// Ajout en temps réel d'un nouvel obstacle suite à la validation du serveur
socket.on("nouvelle_boite_ajoutee", (boite) => {
  boitesPosees.push(boite);
});

// Décors de premier plan en 2.5D (Piliers + Boîtes dynamiques)
const piliersForeground = [
  { id: "img-pilier1", x: 320, y: 219, w: 35, h: 170 },
  { id: "img-pilier2", x: 1260, y: 221, w: 40, h: 110 },
  { id: "img-pilier3", x: 590, y: 710, w: 40, h: 120 },
  { id: "img-pilier4", x: 965, y: 710, w: 47, h: 120 },
  { id: "img-mur1", x: 510, y: 460, w: 20, h: 160 },
  { id: "img-mur1", x: 1067, y: 460, w: 20, h: 160 },
];

function dessinerPremierPlan(ctx) {
  // 1. Dessin des piliers statiques d'origine
  for (let pilier of piliersForeground) {
    const img = document.getElementById(pilier.id);
    if (img) ctx.drawImage(img, pilier.x, pilier.y, pilier.w, pilier.h);
  }
  // 2. Dessin des boîtes d'obstacles générées dynamiquement par les joueurs
  const imgBox = document.getElementById("img-box");
  if (imgBox) {
    for (let b of boitesPosees) {
      ctx.drawImage(imgBox, b.x, b.y, b.w, b.h);
    }
  }
}

// Boucle principale de rendu graphique
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dessinerMap(ctx, canvas);

  // Fusion des obstacles immuables et des boîtes utilisateur pour les calculs de collisions
  const tousLesObstacles = [...mapObstacles, ...boitesPosees];
  const adversairesTableau = Object.values(listeJoueursAdverses);

  // Mise à jour et dessin de l'entité contrôlée localement
  if (monJoueurLocal && !monJoueurLocal.isDead()) {
    monJoueurLocal.update(ctx, adversairesTableau, tousLesObstacles);
  }

  // Mise à jour et dessin des avatars des joueurs distants
  for (let id in listeJoueursAdverses) {
    if (!listeJoueursAdverses[id].isDead()) {
      listeJoueursAdverses[id].update(ctx, [], tousLesObstacles);
    }
  }

  // Application de la surcouche de décors de premier plan
  dessinerPremierPlan(ctx);
  requestAnimationFrame(gameLoop);
}

window.onload = () => gameLoop();
