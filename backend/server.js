const express = require("express");
const app = express();

// Middleware pour servir tes fichiers statiques (HTML, CSS, JS client)
app.use(express.static("public"));

// Si tu as besoin de gérer des données joueurs sans temps réel,
// tu peux utiliser une API REST classique :
const players = {};

app.get("/players", (req, res) => {
  res.json(players);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
