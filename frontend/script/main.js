// ==========================================
// 1. INITIALISATION DU MOTEUR GRAPHIQUE
// ==========================================
const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Maintient le style Pixel Art net

const socket = io();

// Variables d'état global du jeu
let monRole = null;
let monJoueurLocal = null;
let listeJoueursAdverses = {};
let mapObstacles = [];
let boitesPosees = [];
let partieEnCours = false;

// ==========================================
// 2. GESTION DES OBSTACLES ET COLLIDERS
// ==========================================
function initialiserObstacles() {
  const w = canvas.width;
  const h = canvas.height;
  const ep = 25; // Épaisseur des murs extérieurs

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

// Outil de debug pour afficher les collisions en rouge
function debugDessinerHitboxes(ctx) {
  // Mis sur 0 d'opacité pour cacher les murs rouges, mets 0.4 si tu veux les revoir
  ctx.fillStyle = "rgba(255, 0, 0, 0)";
  const tousLesObstacles = [...mapObstacles, ...boitesPosees];
  for (let obs of tousLesObstacles) ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
}

// ==========================================
// 3. LOGIQUE RÉSEAU ET MATCHMAKING
// ==========================================

socket.on("init_base", (data) => {
  monRole = data.role;
  boitesPosees = data.boites;
  setupSelecteurSkins();
});

function setupSelecteurSkins() {
  const cartesSkins = document.querySelectorAll(".skin-card");

  if (cartesSkins.length === 0) {
    console.error(
      "❌ ERREUR : Impossible de trouver .skin-card dans le HTML !",
    );
    return;
  }

  console.log(
    "✅ Attachement des clics sur les",
    cartesSkins.length,
    "cartes de skins.",
  );

  cartesSkins.forEach((carte) => {
    carte.addEventListener("click", () => {
      const skinChoisi = carte.getAttribute("data-skin");
      console.log("👉 Skin choisi par clic :", skinChoisi);

      // Cache la sélection, affiche la file d'attente
      document.getElementById("box-selection").classList.add("hidden");
      document.getElementById("box-file-attente").classList.remove("hidden");

      // Informe le serveur du choix
      socket.emit("choix_skin_valide", { skin: skinChoisi });
    });
  });
}

socket.on("attente_file", (data) => {
  const texte = document.getElementById("statut-file");
  if (texte)
    texte.innerText = `Joueurs prêts : ${data.connectes}/2. En attente...`;
});

socket.on("lancement_partie", (serveurJoueurs) => {
  // Ferme le lobby
  document.getElementById("overlay-lobby").classList.add("hidden");

  // Génère les entités des joueurs
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

// Synchronisation des déplacements
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

  // Nettoyage des déconnexions
  for (let id in listeJoueursAdverses) {
    if (!serveurJoueurs[id]) delete listeJoueursAdverses[id];
  }
});

// Réception des tirs adverses
socket.on("remote_tir", (data) => {
  if (partieEnCours && listeJoueursAdverses[data.ownerId]) {
    listeJoueursAdverses[data.ownerId].projectiles.push({
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  }
});

// Ajout d'obstacles dynamiques
socket.on("nouvelle_boite_ajoutee", (boite) => boitesPosees.push(boite));

// ==========================================
// 4. GESTION DE LA FIN DE PARTIE
// ==========================================
socket.on("fin_de_partie", (data) => {
  partieEnCours = false; // Fige les déplacements et les mises à jour

  const overlayEnd = document.getElementById("overlay-endgame");
  const imgEnd = document.getElementById("endgame-image");

  if (!overlayEnd || !imgEnd || !monJoueurLocal) return;

  // Récupération fiable du skin depuis l'instance locale
  const monSkin = monJoueurLocal.skin;

  // Détermination de l'image de fin (Victoire ou Défaite)
  if (socket.id === data.vainqueurId) {
    imgEnd.src = `/frontend/assets/party/win/win_${monSkin}.png`;
  } else {
    imgEnd.src = `/frontend/assets/party/defeat/defeat_${monSkin}.png`;
  }

  // On affiche l'écran de fin par-dessus l'arène
  overlayEnd.classList.remove("hidden");
});

// --- ÉCOUTEURS DES DEUX BOUTONS DE FIN ---

const btnRejouer = document.getElementById("btn-rejouer");
if (btnRejouer) {
  btnRejouer.addEventListener("click", () => {
    // Relance la page : ça réinitialise le jeu et te remet dans le lobby
    window.location.reload();
  });
}

const btnRetourMenu = document.getElementById("btn-retour-menu");
if (btnRetourMenu) {
  btnRetourMenu.addEventListener("click", () => {
    window.location.href = "/menu";
  });
}

// ==========================================
// 5. RENDU DU PREMIER PLAN (PROFONDEUR 2.5D)
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
  // 1. Dessin des structures murales de premier plan
  for (let p of piliersForeground) {
    const img = document.getElementById(p.id);
    if (img) ctx.drawImage(img, p.x, p.y, p.w, p.h);
  }
  // 2. Rendu des boîtes d'obstacles dynamiques posées par les joueurs
  const imgBox = document.getElementById("img-box");
  if (imgBox) {
    for (let b of boitesPosees) {
      ctx.drawImage(imgBox, b.x, b.y, b.w, b.h);
    }
  }
}

// ==========================================
// 6. BOUCLE DE RENDU PRINCIPALE (MOTEUR)
// ==========================================
function gameLoop() {
  // Nettoyage de l'écran précédent
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dessin du sol/décor de fond arrière
  dessinerMap(ctx, canvas);

  // Outil d'affichage des hitboxes (Utile pour caler tes murs)
  debugDessinerHitboxes(ctx);

  if (partieEnCours) {
    const tousLesObstacles = [...mapObstacles, ...boitesPosees];
    const adversairesTableau = Object.values(listeJoueursAdverses);

    // Mise à jour de l'entité locale du joueur connecté
    if (monJoueurLocal && !monJoueurLocal.isDead()) {
      monJoueurLocal.update(ctx, adversairesTableau, tousLesObstacles);
    }

    // Rendu passif des instances des joueurs distants reçus du réseau
    for (let id in listeJoueursAdverses) {
      if (!listeJoueursAdverses[id].isDead()) {
        listeJoueursAdverses[id].update(ctx, [], tousLesObstacles);
      }
    }

    // Ajout de la couche supérieure (Piliers + caisses) par-dessus les joueurs
    dessinerPremierPlan(ctx);
  }

  // Demande au navigateur d'exécuter la boucle à 60 FPS
  requestAnimationFrame(gameLoop);
}

// Lancement automatique du moteur graphique dès que la page HTML est prête
window.onload = () => gameLoop();