const socket = io(); // Initialise la connexion WebSocket avec le serveur.
const modeJeu = sessionStorage.getItem("modeJeu") || "1vs1";

let monSlotJoueur = null;
let monEquipe = null;
let indexSkinActuel = 1;
let localPret = false;
const TOUS_LES_SLOTS = ["A1", "A2", "B1", "B2"];

window.addEventListener("DOMContentLoaded", () => {
  const btnReady = document.getElementById("btn-Ready");
  if (btnReady) btnReady.querySelector("span").innerText = "PRÊT";

  // Masque visuellement les slots de l'équipe B2/A2 si le mode n'est pas un 2vs2.
  if (modeJeu !== "2vs2") {
    document.getElementById("slot-A2").style.display = "none";
    document.getElementById("slot-B2").style.display = "none";
  }

  // Attache les événements de changement de slot et de défilement de skin à chaque emplacement.
  TOUS_LES_SLOTS.forEach((slot) => {
    document
      .getElementById(`btn-add-${slot}`)
      ?.addEventListener("click", () => {
        // Communication : Demande au serveur de déplacer le joueur sur ce slot précis.
        socket.emit("changer_slot", slot);
      });
    document
      .getElementById(`prev-skin-${slot}`)
      ?.addEventListener("click", () => majMonSkin(-1));
    document
      .getElementById(`next-skin-${slot}`)
      ?.addEventListener("click", () => majMonSkin(1));
  });

  // Communication : Signale l'entrée dans le lobby et demande l'attribution d'un slot initial selon le mode.
  socket.emit("demander_slot_lobby", modeJeu);
});

document.querySelectorAll(".menu-btn").forEach((button) => {
  // Gère les actions du menu principal : retour, bascule visuelle des skins ou changement de statut (Prêt).
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
  // Alterne l'index du skin de manière circulaire entre 1 et 4.
  indexSkinActuel += direction;
  if (indexSkinActuel < 1) indexSkinActuel = 4;
  if (indexSkinActuel > 4) indexSkinActuel = 1;
  remonterInfosLobby();
}

function remonterInfosLobby() {
  if (!monSlotJoueur) return;
  // Communication : Envoie l'état de préparation et le skin sélectionné pour synchroniser le serveur.
  socket.emit("update_lobby_info", {
    skin: `skin${indexSkinActuel}`,
    pret: localPret,
  });
}

// Communication (Écouteur) : Reçoit l'état global du lobby envoyé par le serveur dès qu'un joueur interagit.
socket.on("mise_a_jour_lobby", (reponse) => {
  const joueurs = Object.values(reponse);
  const prets = joueurs.filter((j) => j.pret).length;
  let totalRequis = modeJeu === "2vs2" ? 4 : modeJeu === "bot" ? 1 : 2;

  // Identifie le profil du joueur actuel dans la liste pour mettre à jour ses variables locales.
  const moi = joueurs.find((j) => j.id === socket.id);
  if (moi) {
    monSlotJoueur = moi.slot;
    monEquipe = moi.equipe;

    // Force la réinitialisation visuelle si le serveur a invalidé le statut "Prêt".
    if (!moi.pret && localPret) {
      localPret = false;
      document.querySelector("#btn-Ready span").innerText = "PRÊT";
      document.getElementById("btn-Ready").style.borderColor = "white";
    }
  }

  // Actualise le compteur textuel du bouton de préparation.
  const btnReady = document.getElementById("btn-Ready");
  if (btnReady && localPret) {
    btnReady.querySelector("span").innerText =
      `EN ATTENTE (${prets}/${totalRequis})`;
  }

  // Réinitialise l'affichage par défaut de tous les slots (état vide avec bouton d'ajout).
  TOUS_LES_SLOTS.forEach((slot) => {
    const divGlobal = document.getElementById(`slot-${slot}`);
    if (!divGlobal) return;

    divGlobal.classList.remove("hidden");
    document.getElementById(`btn-add-${slot}`).classList.remove("hidden");
    document.getElementById(`content-${slot}`).classList.add("hidden");
    document.getElementById(`prev-skin-${slot}`).classList.add("hidden");
    document.getElementById(`next-skin-${slot}`).classList.add("hidden");
  });

  // Injecte les données (sprites, flèches de skin) pour chaque slot actuellement occupé par un joueur.
  joueurs.forEach((j) => {
    document.getElementById(`btn-add-${j.slot}`).classList.add("hidden");
    document.getElementById(`content-${j.slot}`).classList.remove("hidden");
    document.getElementById(`img-${j.slot}`).src =
      `/frontend/assets/man/${j.skin}/000.png`;

    if (j.id === socket.id && !localPret) {
      document.getElementById(`prev-skin-${j.slot}`).classList.remove("hidden");
      document.getElementById(`next-skin-${j.slot}`).classList.remove("hidden");
    }
  });
});

// Communication (Écouteur) : Reçoit le signal de démarrage lorsque tous les joueurs requis sont prêts.
socket.on("lancement_partie_lobby", () => {
  const overlayCountdown = document.getElementById("overlay-countdown");
  const countdownText = document.getElementById("countdown-text");
  if (overlayCountdown) overlayCountdown.classList.remove("hidden");

  let tempsRestant = 3;
  if (countdownText) countdownText.innerText = `Lancement dans ${tempsRestant}`;

  // Démarre un compte à rebours visuel de 3 secondes avant la redirection vers la partie.
  const interval = setInterval(() => {
    tempsRestant--;
    if (tempsRestant > 0) {
      if (countdownText)
        countdownText.innerText = `Lancement dans ${tempsRestant}`;
    } else {
      clearInterval(interval);
      // Stocke les configurations finales dans la session pour qu'elles soient lues par le fichier `ingame`.
      sessionStorage.setItem("monSkin", `skin${indexSkinActuel}`);
      sessionStorage.setItem("monEquipe", monEquipe);
      window.location.href = "/ingame"; // Redirection de page vers le moteur de jeu.
    }
  }, 1000);
});