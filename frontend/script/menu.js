// On cible la nouvelle classe valide
document.querySelector(".btn-1vs1").addEventListener("click", (e) => {
  // Redirection classique vers la route du serveur multijoueur
  window.location.href = "/ingame";
});

document.querySelector(".btn-vsbot").addEventListener("click", (e) => {
  e.preventDefault();
  alert(
    "Mode Solo vs Bot en cours de maintenance pour mise à jour du protocole réseau ! Choisissez le mode 1vs1.",
  );
});
