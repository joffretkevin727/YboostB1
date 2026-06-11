const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();

let monJoueurLocal = null;
let monBot = null;
let listeJoueursAdverses = {};
let mapObstacles = [];
let boitesPosees = [];
let partieEnCours = false;

// ==========================================
// 1. INITIALISATION DE LA MAP ET DES COLLIDERS
// ==========================================
function initialiserObstacles() {
  const w = canvas.width;
  const h = canvas.height;
  const ep = 25; // Epaisseur des murs de bordure
  return [
    { x: 0, y: 0, w: w, h: ep }, // Mur du Haut
    { x: 0, y: h - ep, w: w, h: ep }, // Mur du Bas
    { x: 0, y: 0, w: ep, h: h }, // Mur de Gauche
    { x: w - ep, y: 0, w: ep, h: h }, // Mur de Droite

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

function dessinerMap(ctx, canvas) {
  const mapImg = document.querySelector(".arena");
  if (mapImg && mapImg.complete) {
    ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#3a4454";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function debugDessinerHitboxes(ctx) {
  ctx.fillStyle = "rgba(255, 0, 0, 0)"; // Garder invisible (opacité 0)
  const tousLesObstacles = [...mapObstacles, ...boitesPosees];
  for (let obs of tousLesObstacles) ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
}

// ==========================================
// 2. CONNEXION ET LANCEMENT DE LA PARTIE
// ==========================================

// Dès que la page Ingame charge, on se connecte avec nos infos du Lobby
window.addEventListener("DOMContentLoaded", () => {
  const mode = localStorage.getItem("modeJeu") || "1vs1";
  const skin = localStorage.getItem("monSkin") || "skin1";
  const equipe = localStorage.getItem("monEquipe") || "A";

  // Cacher le vieux menu interne (au cas où il traîne dans le HTML)
  const overlayLobby = document.getElementById("overlay-lobby");
  if (overlayLobby) overlayLobby.classList.add("hidden");

  // On prévient le serveur qu'on est prêt à spawn dans l'arène
  socket.emit("rejoindre_arene", { mode: mode, skin: skin, equipe: equipe });
});

// Quand le serveur a généré tout le monde (Joueurs et/ou Bot)
socket.on("mise_a_jour_initiale_arene", (serveurJoueurs) => {
  listeJoueursAdverses = {}; // Reset

  for (let id in serveurJoueurs) {
    const sj = serveurJoueurs[id];

    if (id === socket.id) {
      // C'est nous
      monJoueurLocal = new Player({
        startX: sj.x,
        startY: sj.y,
        skin: sj.skin,
        isLocal: true,
        socket: socket,
        id: socket.id,
      });
      monJoueurLocal.equipe = sj.equipe;
    } else {
      // C'est un autre (Humain ou Bot)
      if (sj.isBot) {
        monBot = new Bot({
          startX: sj.x,
          startY: sj.y,
          skin: sj.skin,
          socket: socket,
          id: sj.id,
          target: monJoueurLocal,
        });
        monBot.equipe = sj.equipe;
      } else {
        listeJoueursAdverses[id] = new Player({
          startX: sj.x,
          startY: sj.y,
          skin: sj.skin,
          isLocal: false,
          id: id,
        });
        listeJoueursAdverses[id].equipe = sj.equipe;
      }
    }
  }

  partieEnCours = true;

  // Lancement du Fight !
  const overlayCd = document.getElementById("overlay-countdown");
  const textCd = document.getElementById("countdown-text");

  if (overlayCd && textCd) {
    overlayCd.classList.remove("hidden");
    let compteur = 3;
    textCd.innerText = compteur;

    const timer = setInterval(() => {
      compteur--;
      if (compteur > 0) {
        textCd.innerText = compteur;
      } else if (compteur === 0) {
        textCd.innerText = "FIGHT !";
        textCd.style.color = "#ff4c4c";
      } else {
        clearInterval(timer);
        overlayCd.classList.add("hidden");
        // On débloque les contrôles
        if (monJoueurLocal) monJoueurLocal.verrouille = false;
        if (monBot) monBot.verrouille = false;
      }
    }, 1000);
  }
});

// ==========================================
// 3. SYNCHRONISATION EN TEMPS RÉEL
// ==========================================
socket.on("mise_a_jour_joueurs", (serveurJoueurs) => {
  if (!partieEnCours) return;
  for (let id in serveurJoueurs) {
    const sj = serveurJoueurs[id];

    if (id === socket.id && monJoueurLocal) {
      monJoueurLocal.health = sj.health;
    } else if (monBot && id === monBot.id) {
      monBot.health = sj.health;
    } else if (listeJoueursAdverses[id]) {
      listeJoueursAdverses[id].x = sj.x;
      listeJoueursAdverses[id].y = sj.y;
      listeJoueursAdverses[id].direction = sj.direction;
      listeJoueursAdverses[id].health = sj.health;
      listeJoueursAdverses[id].enMouvement = sj.enMouvement;
    }
  }

  // Suppression des joueurs déconnectés
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

// ==========================================
// 4. FIN DE PARTIE ET BOUTONS
// ==========================================
socket.on("fin_de_partie", (data) => {
  partieEnCours = false;
  const overlayEnd = document.getElementById("overlay-endgame");
  const imgEnd = document.getElementById("endgame-image");

  if (!overlayEnd || !imgEnd || !monJoueurLocal) return;

  if (socket.id === data.vainqueurId) {
    imgEnd.src = `/frontend/assets/party/win/win_${monJoueurLocal.skin}.png`;
  } else {
    imgEnd.src = `/frontend/assets/party/defeat/defeat_${monJoueurLocal.skin}.png`;
  }

  overlayEnd.classList.remove("hidden");
});

const btnRejouer = document.getElementById("btn-rejouer");
if (btnRejouer) {
  // On retourne au lobby pour pouvoir re-choisir si on veut
  btnRejouer.addEventListener("click", () => (window.location.href = "/lobby"));
}

const btnRetourMenu = document.getElementById("btn-retour-menu");
if (btnRetourMenu) {
  btnRetourMenu.addEventListener(
    "click",
    () => (window.location.href = "/menu"),
  );
}

// ==========================================
// 5. RENDU GRAPHIQUE (BOUCLE DE JEU)
// ==========================================
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

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dessinerMap(ctx, canvas);
  debugDessinerHitboxes(ctx);

  if (partieEnCours) {
    const tousLesObstacles = [...mapObstacles, ...boitesPosees];

    // On rassemble tous les adversaires potentiels (Humains + Bot)
    const tableauCibles = [...Object.values(listeJoueursAdverses)];
    if (monBot) tableauCibles.push(monBot);

    // Update Joueur Local
    if (monJoueurLocal && !monJoueurLocal.isDead()) {
      monJoueurLocal.update(ctx, tableauCibles, tousLesObstacles);
    }

    // Update Bot IA
    if (monBot && !monBot.isDead()) {
      monBot.updateAI(ctx, tousLesObstacles);
    }

    // Update Joueurs Distants
    for (let id in listeJoueursAdverses) {
      if (!listeJoueursAdverses[id].isDead()) {
        listeJoueursAdverses[id].update(ctx, [], tousLesObstacles);
      }
    }

    dessinerPremierPlan(ctx);
  }
  requestAnimationFrame(gameLoop);
}

window.onload = () => gameLoop();
