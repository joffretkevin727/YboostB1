const menuButtons = document.querySelectorAll(".menu-btn");

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    switch (action) {
      case "pvp":
        window.location.href = "../frontend/lobby.html";
        break;
        case "2pv2p":
        window.location.href = "../frontend/lobby.html";
        break;
      case "bot":
        window.location.href = "../frontend/ingame.html";
        break;
      case "credits":
        window.location.href = "../frontend/credits.html";
        break;
      case "quit":
        alert(
          "Pour quitter : arrête le serveur Node (server.js), puis ferme cette page.",
        );
        window.open("", "_self").close();
        setTimeout(() => {
          window.location.href = "about:blank";
        }, 100);
        break;
      default:
        console.warn("Action de menu inconnue :", action);
    }
  });
});
