// --- CONFIGURATION INITIALE ET SOCKET ---
const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();

// --- VARIABLES D'ÉTAT GLOBALES ---
let monRole = null;
let monJoueurLocal = null;
let listeJoueursAdverses = {};
let mapObstacles = [];
let boitesPosees = [];
let partieEnCours = false;

let skinSelectionne = "skin1"; // Valeur par défaut pour le lobby
let localPret = false; // État "Prêt" du joueur local

// --- LOGIQUE DU LOBBY (GESTION MULTIJOUEUR) ---

// Gère les clics sur les skins, le pseudo et le bouton Prêt
function setupLobby() {
  document.querySelectorAll(".skin-card").forEach((carte) => {
    carte.addEventListener("click", () => {
      document.querySelectorAll(".skin-card").forEach(c => c.classList.remove("selected"));
      carte.classList.add("selected");
      skinSelectionne = carte.getAttribute("data-skin");
      
      // Envoie le changement de skin au serveur en temps réel
      socket.emit("update_lobby_info", { skin: skinSelectionne, pseudo: getPseudo() });
    });
  });

  const btnPret = document.getElementById("btn-pret");
  btnPret.addEventListener("click", () => {
    localPret = !localPret;
    if (localPret) {
      btnPret.innerText = "Prêt";
      btnPret.style.backgroundColor = "#2ecc71";
    } else {
      btnPret.innerText = "En attente";
      btnPret.style.backgroundColor = "#ffcc00";
    }
    socket.emit("joueur_statut_pret", { pret: localPret, pseudo: getPseudo(), skin: skinSelectionne });
  });

  document.getElementById("pseudo-local").addEventListener("input", () => {
    socket.emit("update_lobby_info", { skin: skinSelectionne, pseudo: getPseudo() });
  });
}

// Retourne le pseudo saisi ou un nom générique
function getPseudo() {
  return document.getElementById("pseudo-local").value.trim() || "Joueur Local";
}

// Réception des mises à jour des états des joueurs dans le lobby
socket.on("mise_a_jour_lobby", (reponseServeur) => {
  const ids = Object.keys(reponseServeur);
  const adversaireId = ids.find(id => id !== socket.id);

  if (adversaireId) {
    const adv = reponseServeur[adversaireId];
    document.getElementById("pseudo-distant").innerText = adv.pseudo || "Adversaire";
    document.getElementById("preview-p2").innerText = adv.skin || "?";
    document.getElementById("statut-p2").innerText = adv.pret ? "Prêt" : "Pas prêt";
    document.getElementById("statut-p2").style.color = adv.pret ? "#2ecc71" : "#ff3333";
  } else {
    document.getElementById("pseudo-distant").innerText = "En attente d'un joueur...";
    document.getElementById("preview-p2").innerText = "?";
    document.getElementById("statut-p2").innerText = "Pas prêt";
    document.getElementById("statut-p2").style.color = "#ff3333";
  }
});

// Déclenchement visuel du décompte avant le match
socket.on("declencher_decompte", () => {
  const overlayCountdown = document.getElementById("overlay-countdown");
  const countdownText = document.getElementById("countdown-text");
  overlayCountdown.classList.remove("hidden");

  let tempsRestant = 5;
  countdownText.innerText = `Lancement dans ${tempsRestant}`;

  const interval = setInterval(() => {
    tempsRestant--;
    if (tempsRestant > 0) {
      countdownText.innerText = `Lancement dans ${tempsRestant}`;
    } else {
      clearInterval(interval);
      countdownText.innerText = "C'est parti !";
    }
  }, 1000);
});

// --- ENTRÉE DANS L'ARÈNE ET JEU ---

socket.on("init_base", (data) => {
  monRole = data.role;
  boitesPosees = data.boites;
  setupLobby();
});

socket.on("lancement_partie", (serveurJoueurs) => {
  document.getElementById("lobby-container").classList.add("hidden");
  document.getElementById("overlay-countdown").classList.add("hidden");
  
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

// --- GESTION DE LA CARTE, DES OBSTACLES ET DESSIN ---

function initialiserObstacles() {
  const w = canvas.width;
  const h = canvas.height;
  const epaisseur = 25;
  return [
    { x: 0, y: 0, w: w, h: epaisseur }, 
    { x: 0, y: h - epaisseur, w: w, h: epaisseur }, 
    { x: 0, y: 0, w: epaisseur, h: h }, 
    { x: w - epaisseur, y: 0, w: epaisseur, h: h }, 

    { x: 320, y: 310, w: 40, h: 80 }, 
    { x: 1260, y: 260, w: 40, h: 80 }, 
    { x: 587, y: 760, w: 50, h: 80 }, 
    { x: 965, y: 760, w: 50, h: 80 }, 
    { x: 520, y: 80, w: 40, h: 80 }, 
    { x: 1040, y: 80, w: 40, h: 80 }, 
    { x: 100, y: 500, w: 140, h: 60 }, 
    { x: 1360, y: 330, w: 140, h: 60 }, 
    { x: 1360, y: 500, w: 140, h: 60 }, 

    { x: 510, y: 225, w: 240, h: 60 }, 
    { x: 510, y: 280, w: 25, h: 110 }, 
    { x: 960, y: 210, w: 130, h: 70 }, 
    { x: 1060, y: 280, w: 25, h: 105 }, 
    { x: 510, y: 510, w: 25, h: 100 }, 
    { x: 1060, y: 510, w: 25, h: 100 }, 
    { x: 350, y: 610, w: 150, h: 60 }, 
    { x: 345, y: 500, w: 40, h: 170 }, 
    { x: 1100, y: 610, w: 150, h: 70 }, 
    { x: 850, y: 620, w: 110, h: 60 }, 
    { x: 745, y: 640, w: 110, h: 40 }, 

    { x: 20, y: 20, w: 2000, h: 90 }, 
    { x: 20, y: 800, w: 2000, h: 90 }, 
    { x: 20, y: 20, w: 100, h: 1000 }, 
    { x: 1470, y: 20, w: 100, h: 1000 }, 
  ];
}
mapObstacles = initialiserObstacles();

function debugDessinerHitboxes(ctx) {
  ctx.fillStyle = "rgba(255, 0, 0, 0)";
  const tousLesObstacles = [...mapObstacles, ...boitesPosees];
  for (let obs of tousLesObstacles) ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
}

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

// --- FIN DE PARTIE ---

socket.on("fin_de_partie", (data) => {
  partieEnCours = false;
  const overlayEnd = document.getElementById("overlay-endgame");
  const imgEnd = document.getElementById("endgame-image");
  const monSkin = monJoueurLocal.spritePath.split("/")[3]; 

  if (socket.id === data.vainqueurId) {
    imgEnd.src = `/frontend/assets/party/win/win_${monSkin}.png`;
  } else {
    imgEnd.src = `/frontend/assets/party/defeat/defeat_${monSkin}.png`;
  }
  overlayEnd.classList.remove("hidden");
});

document.getElementById("btn-retour-menu").addEventListener("click", () => {
  window.location.href = "/menu";
});

// --- BOUCLE DE RENDU PRINCIPALE ---

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dessinerMap(ctx, canvas);
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