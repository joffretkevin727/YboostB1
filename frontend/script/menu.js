const menuButtons = document.querySelectorAll(".menu-btn");

// 🔊 Chargement du son pour les boutons
const sonBip = new Audio("/frontend/assets/sounds/bip.mp3");

// 🎶 Chargement de la musique de fond du menu
const musiqueFond = new Audio("/frontend/assets/sounds/menu_sound.mp3");
musiqueFond.loop = true; // Pour que la musique tourne en boucle
musiqueFond.volume = 0.3; // Volume à 30% pour ne pas exploser les tympans

let musiqueLancee = false;

// LA MAGIE : Dès que le joueur clique n'importe où sur la page, la musique démarre !
document.body.addEventListener("click", () => {
  if (!musiqueLancee) {
    musiqueFond
      .play()
      .catch((e) => console.log("Musique bloquée par le navigateur :", e));
    musiqueLancee = true;
  }
});

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // On joue le petit bip du bouton
    sonBip.currentTime = 0;
    sonBip.play().catch((e) => console.log("Audio bloqué", e));

    const action = button.dataset.action;

    // Petit délai de 150ms pour laisser le bip résonner avant de changer de page
    setTimeout(() => {
      switch (action) {
        case "pvp":
          sessionStorage.setItem("modeJeu", "1vs1");
          window.location.href = "/lobby";
          break;
        case "2pv2p":
          sessionStorage.setItem("modeJeu", "2vs2");
          window.location.href = "/lobby";
          break;
        case "bot":
          sessionStorage.setItem("modeJeu", "bot");
          window.location.href = "/lobby";
          break;
        case "credits":
          window.location.href = "/frontend/credits.html";
          break;
        case "quit":
          alert("Pour quitter : arrête le serveur Node.");
          window.open("", "_self").close();
          break;
      }
    }, 150);
  });
});
