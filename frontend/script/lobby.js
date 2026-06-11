const socket = io();

let monSlotJoueur = null; // Sera défini à 'p1' ou 'p2' par le serveur
let indexSkinActuel = 1; 
let localPret = false;
let selecteurSkinVisible = false;

const menuButtons = document.querySelectorAll(".menu-btn");

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    switch (action) {
      case "retour":
        window.location.href = "../frontend/menu.html";
        break;

      case "skin":
        if (!monSlotJoueur) return; // Attente de l'attribution du slot
        
        selecteurSkinVisible = !selecteurSkinVisible;
        const btnPrev = document.getElementById(`prev-skin-${monSlotJoueur}`);
        const btnNext = document.getElementById(`next-skin-${monSlotJoueur}`);

        if (btnPrev && btnNext) {
            if (selecteurSkinVisible) {
                btnPrev.classList.remove("arrow-hidden");
                btnNext.classList.remove("arrow-hidden");
            } else {
                btnPrev.classList.add("arrow-hidden");
                btnNext.classList.add("arrow-hidden");
            }
        }
        break;

      case "isReady":
        localPret = !localPret;
        const span = button.querySelector('span');
        
        if (localPret) {
            span.innerText = "PRÊT";
            button.style.borderColor = "#2ecc71";
        } else {
            span.innerText = "EN ATTENTE";
            button.style.borderColor = "rgb(255, 255, 255)";
        }
        
        socket.emit("joueur_statut_pret", { 
            pret: localPret, 
            pseudo: getPseudo(), 
            skin: `skin${indexSkinActuel}` 
        });
        break;     

      default:
        console.warn("Action de menu inconnue :", action);
    }
  });
});

window.addEventListener("DOMContentLoaded", () => {
    // Écouteurs sur les flèches des deux divs
    document.getElementById("prev-skin-p1").addEventListener("click", () => majMonSkin(-1));
    document.getElementById("next-skin-p1").addEventListener("click", () => majMonSkin(1));
    document.getElementById("prev-skin-p2").addEventListener("click", () => majMonSkin(-1));
    document.getElementById("next-skin-p2").addEventListener("click", () => majMonSkin(1));
    
    // On demande explicitement notre rôle au serveur dès que le HTML est prêt
    socket.emit("demander_slot");
});

// Événement crucial : Le serveur te répond "p1" ou "p2" directement
socket.on("reponse_slot", (slotAssigne) => {
    monSlotJoueur = slotAssigne; 
    remonterInfosLobby(); // Envoie le skin initial une fois le slot connu
});

function majMonSkin(direction) {
    indexSkinActuel += direction;
    if (indexSkinActuel < 1) indexSkinActuel = 4;
    if (indexSkinActuel > 4) indexSkinActuel = 1;

    // Met à jour l'image locale instantanément
    const maPhoto = document.getElementById(`img-preview-${monSlotJoueur}`);
    if (maPhoto) maPhoto.src = `/frontend/assets/man/skin${indexSkinActuel}/000.png`;

    remonterInfosLobby();
}

function getPseudo() {
    const input = document.getElementById("pseudo-local");
    return input ? input.value.trim() : "Joueur 1";
}

function remonterInfosLobby() {
    if (!monSlotJoueur) return;
    socket.emit("update_lobby_info", { 
        slot: monSlotJoueur, // On ajoute le slot pour aider le serveur
        skin: `skin${indexSkinActuel}`, 
        pseudo: getPseudo() 
    });
}

socket.on("mise_a_jour_lobby", (reponseServeur) => {

    const joueurP2Existe = Object.values(reponseServeur).some(
        joueur => joueur.slot === "p2"
    );

    const containerP2 = document.getElementById("skin-container-p2");

    if (containerP2) {
        if (joueurP2Existe) {
            containerP2.classList.remove("hidden");
        } else {
            containerP2.classList.add("hidden");
        }
    }

    const listeIds = Object.keys(reponseServeur);

    listeIds.forEach((id) => {

        const donnéesJoueur = reponseServeur[id];
        const slotId = donnéesJoueur.slot;

        if (!slotId) return;

        const imgPreview = document.getElementById(`img-preview-${slotId}`);

        if (imgPreview) {
            imgPreview.src = `/frontend/assets/man/${donnéesJoueur.skin || "skin1"}/000.png`;
        }

        if (id !== socket.id) {

            const pseudoDistant = document.getElementById("pseudo-distant");

            if (pseudoDistant) {
                pseudoDistant.innerText = donnéesJoueur.pseudo || "Adversaire";
            }

            const statutP2 = document.getElementById("statut-p2");

            if (statutP2) {
                statutP2.innerText = donnéesJoueur.pret ? "Prêt" : "Pas prêt";
                statutP2.style.color = donnéesJoueur.pret
                    ? "#2ecc71"
                    : "#ff3333";
            }
        }
    });
});

socket.on("declencher_decompte", () => {
    const overlayCountdown = document.getElementById("overlay-countdown");
    const countdownText = document.getElementById("countdown-text");
    
    if (overlayCountdown) overlayCountdown.classList.remove("hidden");

    let tempsRestant = 3; // MODIFIÉ : Passage à 3 secondes
    if (countdownText) countdownText.innerText = `Lancement dans ${tempsRestant}`;

    const interval = setInterval(() => {
        tempsRestant--;
        if (tempsRestant > 0) {
            if (countdownText) countdownText.innerText = `Lancement dans ${tempsRestant}`;
        } else {
            clearInterval(interval);
            if (countdownText) countdownText.innerText = "C'est parti !";
            
            // Redirection immédiate vers l'arène de jeu après les 3 secondes
            window.location.href = "/frontend/ingame.html";
        }
    }, 1000);
});