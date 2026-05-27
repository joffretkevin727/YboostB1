const express = require('express');
const path = require('path');
const app = express();

// On monte la racine du projet pour accéder à /frontend/... et /Backend/...
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));
app.use('/Backend', express.static(path.join(__dirname, '..', 'Backend')));

// Routes
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/ingame', (req, res) => {
    res.sendFile(path.join(__dirname, 'ingame.html'));
});

app.listen(6969, () => console.log("Serveur : http://localhost:6969/home"));
