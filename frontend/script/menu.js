const menuButtons = document.querySelectorAll(".menu-btn");

menuButtons.forEach((button) => {
  // Écoute les clics sur chaque bouton du menu principal pour aiguiller le joueur.
  button.addEventListener("click", () => {
    const action = button.dataset.action; // Récupère l'identifiant de l'action via l'attribut HTML data-action.

    switch (action) {
      case "pvp":
        // Stocke la configuration du mode de jeu et redirige l'utilisateur vers la page du lobby.
        sessionStorage.setItem("modeJeu", "1vs1");
        window.location.href = "/lobby";
        break;
      case "2pv2p":
        // Stocke la configuration du mode par équipe et amorce le changement de page.
        sessionStorage.setItem("modeJeu", "2vs2");
        window.location.href = "/lobby";
        break;
      case "bot":
        // Stocke l'intention d'affronter une Intelligence Artificielle avant de rejoindre le lobby.
        sessionStorage.setItem("modeJeu", "bot");
        window.location.href = "/lobby";
        break;
      case "credits":
        // Redirige directement le navigateur vers la page statique des crédits du projet.
        window.location.href = "/frontend/credits.html";
        break;
      case "quit":
        // Affiche une boîte de dialogue explicative puis tente de fermer l'onglet actif du navigateur.
        alert("Pour quitter : arrête le serveur Node.");
        window.open("", "_self").close();
        break;
    }
  });
});