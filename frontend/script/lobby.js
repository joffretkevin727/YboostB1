const socket = io();
const modeJeu = localStorage.getItem("modeJeu") || "1vs1";

let monSlotJoueur = null;
let monEquipe = null;
let indexSkinActuel = 1;
let localPret = false;
const TOUS_LES_SLOTS = ["A1", "A2", "B1", "B2"];

window.addEventListener("DOMContentLoaded", () => {
  const btnReady = document.getElementById("btn-Ready");
  if (btnReady) btnReady.querySelector("span").innerText = "PRÊT";

  // On masque les slots 2 en 1v1 ou contre Bot
  if (modeJeu !== "2vs2") {
    document.getElementById("slot-A2").style.display = "none";
    document.getElementById("slot-B2").style.display = "none";
  }

  // Association des événements sur les boutons "+" et les flèches
  TOUS_LES_SLOTS.forEach((slot) => {
    document
      .getElementById(`btn-add-${slot}`)
      ?.addEventListener("click", () => {
        socket.emit("changer_slot", slot); // Demande au serveur de bouger à cette place
      });
    document
      .getElementById(`prev-skin-${slot}`)
      ?.addEventListener("click", () => majMonSkin(-1));
    document
      .getElementById(`next-skin-${slot}`)
      ?.addEventListener("click", () => majMonSkin(1));
  });

  socket.emit("demander_slot_lobby", modeJeu);
});

document.querySelectorAll(".menu-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "retour") window.location.href = "/menu";
    else if (action === "skin") {
      if (!monSlotJoueur) return;
      const btnPrev = document.getElementById(`prev-skin-${monSlotJoueur}`);
      const btnNext = document.getElementById(`next-skin-${monSlotJoueur}`);
      if (btnPrev) btnPrev.classList.toggle("hidden");
      if (btnNext) btnNext.classList.toggle("hidden");
    } else if (action === "isReady") {
      localPret = !localPret;
      const span = button.querySelector("span");
      span.innerText = localPret ? "EN ATTENTE" : "PRÊT";
      button.style.borderColor = localPret ? "#2ecc71" : "white";
      remonterInfosLobby();
    }
  });
});

function majMonSkin(direction) {
  indexSkinActuel += direction;
  if (indexSkinActuel < 1) indexSkinActuel = 4;
  if (indexSkinActuel > 4) indexSkinActuel = 1;
  remonterInfosLobby();
}

function remonterInfosLobby() {
  if (!monSlotJoueur) return;
  socket.emit("update_lobby_info", {
    skin: `skin${indexSkinActuel}`,
    pret: localPret,
  });
}

socket.on("mise_a_jour_lobby", (reponse) => {
  const joueurs = Object.values(reponse);
  const prets = joueurs.filter((j) => j.pret).length;
  let totalRequis = modeJeu === "2vs2" ? 4 : modeJeu === "bot" ? 1 : 2;

  // Identifier mes propres données actualisées par le serveur
  const moi = joueurs.find((j) => j.id === socket.id);
  if (moi) {
    monSlotJoueur = moi.slot;
    monEquipe = moi.equipe;

    // Si le serveur a annulé mon état prêt (car j'ai changé de slot)
    if (!moi.pret && localPret) {
      localPret = false;
      document.querySelector("#btn-Ready span").innerText = "PRÊT";
      document.getElementById("btn-Ready").style.borderColor = "white";
    }
  }

  const btnReady = document.getElementById("btn-Ready");
  if (btnReady && localPret) {
    btnReady.querySelector("span").innerText =
      `EN ATTENTE (${prets}/${totalRequis})`;
  }

  // Réinitialisation de tout l'affichage
  TOUS_LES_SLOTS.forEach((slot) => {
    const divGlobal = document.getElementById(`slot-${slot}`);
    if (!divGlobal) return;

    divGlobal.classList.remove("hidden");
    document.getElementById(`btn-add-${slot}`).classList.remove("hidden"); // Affiche le '+'
    document.getElementById(`content-${slot}`).classList.add("hidden"); // Cache le skin
    document.getElementById(`prev-skin-${slot}`).classList.add("hidden");
    document.getElementById(`next-skin-${slot}`).classList.add("hidden");
  });

  // Affichage des joueurs connectés
  joueurs.forEach((j) => {
    document.getElementById(`btn-add-${j.slot}`).classList.add("hidden"); // Cache le '+'
    document.getElementById(`content-${j.slot}`).classList.remove("hidden"); // Affiche le joueur
    document.getElementById(`img-${j.slot}`).src =
      `/frontend/assets/man/${j.skin}/000.png`;

    // Si c'est mon perso, je garde les flèches visibles si je ne suis pas prêt
    if (j.id === socket.id && !localPret) {
      document.getElementById(`prev-skin-${j.slot}`).classList.remove("hidden");
      document.getElementById(`next-skin-${j.slot}`).classList.remove("hidden");
    }
  });
});

socket.on("lancement_partie_lobby", () => {
  const overlayCountdown = document.getElementById("overlay-countdown");
  const countdownText = document.getElementById("countdown-text");
  if (overlayCountdown) overlayCountdown.classList.remove("hidden");

  let tempsRestant = 3;
  if (countdownText) countdownText.innerText = `Lancement dans ${tempsRestant}`;

  const interval = setInterval(() => {
    tempsRestant--;
    if (tempsRestant > 0) {
      if (countdownText)
        countdownText.innerText = `Lancement dans ${tempsRestant}`;
    } else {
      clearInterval(interval);
      localStorage.setItem("monSkin", `skin${indexSkinActuel}`);
      localStorage.setItem("monEquipe", monEquipe);
      window.location.href = "/ingame";
    }
  }, 1000);
});
