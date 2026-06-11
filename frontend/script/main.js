const canvas = document.getElementById("monCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const socket = io();

let monRole = null;
let monJoueurLocal = null;
let monBot = null;
let listeJoueursAdverses = {};
let mapObstacles = [];
let boitesPosees = [];
let partieEnCours = false;

function initialiserObstacles() {
  const w = canvas.width;
  const h = canvas.height;
  const ep = 25;
  return [
    { x: 0, y: 0, w: w, h: ep },
    { x: 0, y: h - ep, w: w, h: ep },
    { x: 0, y: 0, w: ep, h: h },
    { x: w - ep, y: 0, w: ep, h: h },
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

socket.on("init_base", (data) => {
  monRole = data.role;
  boitesPosees = data.boites;
  setupSelecteurSkins();
});

function setupSelecteurSkins() {
  const cartesSkins = document.querySelectorAll(".skin-card");
  const modeJeu = localStorage.getItem("modeJeu");

  cartesSkins.forEach((carte) => {
    carte.addEventListener("click", () => {
      const skinChoisi = carte.getAttribute("data-skin");
      document.getElementById("box-selection").classList.add("hidden");
      document.getElementById("box-file-attente").classList.remove("hidden");

      if (modeJeu === "bot") {
        socket.emit("choix_skin_bot", { skin: skinChoisi });
      } else {
        socket.emit("choix_skin_valide", { skin: skinChoisi });
      }
    });
  });
}

socket.on("attente_file", (data) => {
  const texte = document.getElementById("statut-file");
  if (texte)
    texte.innerText = `Joueurs prêts : ${data.connectes}/2. En attente...`;
});

socket.on("lancement_partie", (serveurJoueurs) => {
  document.getElementById("overlay-lobby").classList.add("hidden");

  for (let id in serveurJoueurs) {
    if (id === socket.id) {
      const sj = serveurJoueurs[id];
      monJoueurLocal = new Player({
        startX: sj.x,
        startY: sj.y,
        skin: sj.skin,
        isLocal: true,
        socket: socket,
        id: socket.id,
      });
    }
  }

  for (let id in serveurJoueurs) {
    if (id !== socket.id) {
      const sj = serveurJoueurs[id];
      if (sj.isBot) {
        monBot = new Bot({
          startX: sj.x,
          startY: sj.y,
          skin: sj.skin,
          socket: socket,
          id: sj.id,
          target: monJoueurLocal,
        });
      } else {
        listeJoueursAdverses[id] = new Player({
          startX: sj.x,
          startY: sj.y,
          skin: sj.skin,
          isLocal: false,
          id: id,
        });
      }
    }
  }

  partieEnCours = true;

  const overlayCd = document.getElementById("overlay-countdown");
  const textCd = document.getElementById("countdown-text");
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
      if (monJoueurLocal) monJoueurLocal.verrouille = false;
      if (monBot) monBot.verrouille = false;
    }
  }, 1000);
});

socket.on("mise_a_jour_joueurs", (serveurJoueurs) => {
  if (!partieEnCours) return;
  for (let id in serveurJoueurs) {
    const sj = serveurJoueurs[id];
    if (id === socket.id && monJoueurLocal) monJoueurLocal.health = sj.health;
    else if (monBot && id === monBot.id) monBot.health = sj.health;
    else if (listeJoueursAdverses[id]) {
      listeJoueursAdverses[id].x = sj.x;
      listeJoueursAdverses[id].y = sj.y;
      listeJoueursAdverses[id].direction = sj.direction;
      listeJoueursAdverses[id].health = sj.health;
      listeJoueursAdverses[id].enMouvement = sj.enMouvement;
    }
  }
  for (let id in listeJoueursAdverses)
    if (!serveurJoueurs[id]) delete listeJoueursAdverses[id];
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

socket.on("fin_de_partie", (data) => {
  partieEnCours = false;
  const overlayEnd = document.getElementById("overlay-endgame");
  const imgEnd = document.getElementById("endgame-image");

  if (!overlayEnd || !imgEnd || !monJoueurLocal) return;

  if (socket.id === data.vainqueurId)
    imgEnd.src = `/frontend/assets/party/win/win_${monJoueurLocal.skin}.png`;
  else
    imgEnd.src = `/frontend/assets/party/defeat/defeat_${monJoueurLocal.skin}.png`;

  overlayEnd.classList.remove("hidden");
});

const btnRejouer = document.getElementById("btn-rejouer");
if (btnRejouer)
  btnRejouer.addEventListener("click", () => window.location.reload());

const btnRetourMenu = document.getElementById("btn-retour-menu");
if (btnRetourMenu)
  btnRetourMenu.addEventListener(
    "click",
    () => (window.location.href = "/menu"),
  );

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
  if (imgBox)
    for (let b of boitesPosees) ctx.drawImage(imgBox, b.x, b.y, b.w, b.h);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dessinerMap(ctx, canvas);
  debugDessinerHitboxes(ctx);

  if (partieEnCours) {
    const tousLesObstacles = [...mapObstacles, ...boitesPosees];
    const tableauCibles = [...Object.values(listeJoueursAdverses)];
    if (monBot) tableauCibles.push(monBot);

    if (monJoueurLocal && !monJoueurLocal.isDead())
      monJoueurLocal.update(ctx, tableauCibles, tousLesObstacles);
    if (monBot && !monBot.isDead()) monBot.updateAI(ctx, tousLesObstacles);

    for (let id in listeJoueursAdverses) {
      if (!listeJoueursAdverses[id].isDead())
        listeJoueursAdverses[id].update(ctx, [], tousLesObstacles);
    }
    dessinerPremierPlan(ctx);
  }
  requestAnimationFrame(gameLoop);
}

window.onload = () => gameLoop();
