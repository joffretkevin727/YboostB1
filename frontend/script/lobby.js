const menuButtons = document.querySelectorAll(".menu-btn");

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    switch (action) {
      case "retour":
        window.location.href = "../frontend/menu.html";
        break;
        case "skin":
        //put logic skin interface in lobby;
        break;
      case "isReady":
        //put logic if player is ready to play
        break;     
      default:
        console.warn("Action de menu inconnue :", action);
    }
  });
});