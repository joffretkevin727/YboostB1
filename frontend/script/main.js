const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();

let monRole = null;
let monJoueurLocal = null;
let listeJoueursAdverses = {};
let mapObstacles = [];
let boitesPosees = [];
let partieEnCours = false;

// Initialisation de tes collisions internes
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

// OUTIL DE DEBUG : Dessine les Hitboxes pour t'aider à les caler sur le vaisseau
function debugDessinerHitboxes(ctx) {
  ctx.fillStyle = "rgba(255, 0, 0, 0)";
  const tousLesObstacles = [...mapObstacles, ...boitesPosees];
  for (let obs of tousLesObstacles) ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
}

socket.on("init_base", (data) => {
  monRole = data.role;
  boitesPosees = data.boites;
  setupSelecteurSkins();
});

function setupSelecteurSkins() {
  document.querySelectorAll(".skin-card").forEach((carte) => {
    carte.addEventListener("click", () => {
      const skinChoisi = carte.getAttribute("data-skin");
      document.getElementById("box-selection").classList.add("hidden");
      document.getElementById("box-file-attente").classList.remove("hidden");
      socket.emit("choix_skin_valide", { skin: skinChoisi });
    });
  });
}

socket.on("attente_file", (data) => {
  document.getElementById("statut-file").innerText =
    `Joueurs prêts : ${data.connectes}/2. En attente...`;
});

socket.on("lancement_partie", (serveurJoueurs) => {
  document.getElementById("overlay-lobby").classList.add("hidden");
  for (let id in serveurJoueurs) {
    const sj = serveurJoueurs[id];
    if (id === socket.id) {
      monJoueurLocal = new Player({
        startX: sj.x,
        startY: sj.y,
        skin: sj.skin,
        isLocal: true,
        socket: socket,
      });
    } else {
      listeJoueursAdverses[id] = new Player({
        startX: sj.x,
        startY: sj.y,
        skin: sj.skin,
        isLocal: false,
      });
      listeJoueursAdverses[id].id = id;
    }
  }
  partieEnCours = true;
});

socket.on("mise_a_jour_joueurs", (serveurJoueurs) => {
  if (!partieEnCours) return;
  for (let id in serveurJoueurs) {
    const sj = serveurJoueurs[id];
    if (id === socket.id) {
      if (monJoueurLocal) monJoueurLocal.health = sj.health;
    } else if (listeJoueursAdverses[id]) {
      listeJoueursAdverses[id].x = sj.x;
      listeJoueursAdverses[id].y = sj.y;
      listeJoueursAdverses[id].direction = sj.direction;
      listeJoueursAdverses[id].health = sj.health;
    }
  }
  for (let id in listeJoueursAdverses) {
    if (!serveurJoueurs[id]) delete listeJoueursAdverses[id];
  }
});

socket.on("remote_tir", (data) => {
  if (partieEnCours && listeJoueursAdverses[data.ownerId]) {
    listeJoueursAdverses[data.ownerId].projectiles.push({
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  }
});

socket.on("nouvelle_boite_ajoutee", (boite) => boitesPosees.push(boite));

const piliersForeground = [
  { id: "img-pilier1", x: 320, y: 219, w: 35, h: 170 },
  { id: "img-pilier2", x: 1260, y: 221, w: 40, h: 110 },
  { id: "img-pilier3", x: 590, y: 710, w: 40, h: 120 },
  { id: "img-pilier4", x: 965, y: 710, w: 47, h: 120 },
  { id: "img-mur1", x: 510, y: 460, w: 20, h: 160 },
  { id: "img-mur1", x: 1067, y: 460, w: 20, h: 160 },
];

function dessinerPremierPlan(ctx) {
  for (let p of piliersForeground) {
    const img = document.getElementById(p.id);
    if (img) ctx.drawImage(img, p.x, p.y, p.w, p.h);
  }
  const imgBox = document.getElementById("img-box");
  if (imgBox) {
    for (let b of boitesPosees) ctx.drawImage(imgBox, b.x, b.y, b.w, b.h);
  }
}

// --- GESTION DE LA FIN DE PARTIE ---
socket.on("fin_de_partie", (data) => {
  // 1. On fige le jeu en passant la variable à false
  partieEnCours = false;

  const overlayEnd = document.getElementById("overlay-endgame");
  const imgEnd = document.getElementById("endgame-image");

  // On récupère le skin de notre joueur (ex: "skin1", "skin2")
  // Note: on y accède via notre instance Player locale, qu'on stockait dans this.spritePath,
  // mais on peut le retrouver directement s'il a été passé.
  // Pour être sûr, on utilise le chemin de l'image coupé pour retrouver le nom :
  const monSkin = monJoueurLocal.spritePath.split("/")[3]; // Récupère le mot "skin1", etc.

  // 2. On vérifie si c'est NOUS le vainqueur
  if (socket.id === data.vainqueurId) {
    // VICTOIRE : On charge l'image win du skin
    imgEnd.src = `/frontend/assets/party/win/win_${monSkin}.png`;
  } else {
    // DÉFAITE : On charge l'image defeat du skin
    imgEnd.src = `/frontend/assets/party/defeat/defeat_${monSkin}.png`;
  }

  // 3. On affiche l'écran de fin
  overlayEnd.classList.remove("hidden");
});

// Action du bouton "Retour au Menu"
document.getElementById("btn-retour-menu").addEventListener("click", () => {
  // On recharge la page proprement pour se déconnecter et retourner au menu
  window.location.href = "/menu";
});

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dessinerMap(ctx, canvas);

  // ACTIVÉ : Tu verras tes murs en rouge. Tu pourras supprimer cette ligne quand tes murs seront alignés.
  debugDessinerHitboxes(ctx);

  if (partieEnCours) {
    const tousLesObstacles = [...mapObstacles, ...boitesPosees];
    const adversairesTableau = Object.values(listeJoueursAdverses);

    if (monJoueurLocal && !monJoueurLocal.isDead()) {
      monJoueurLocal.update(ctx, adversairesTableau, tousLesObstacles);
    }
    for (let id in listeJoueursAdverses) {
      if (!listeJoueursAdverses[id].isDead())
        listeJoueursAdverses[id].update(ctx, [], tousLesObstacles);
    }
    dessinerPremierPlan(ctx);
  }

  requestAnimationFrame(gameLoop);
}

window.onload = () => gameLoop();
