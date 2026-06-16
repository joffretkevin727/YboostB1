const menuButtons = document.querySelectorAll(".menu-btn");

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

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
  });
});
