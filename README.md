# 🚀 Spaceship Battle

**Spaceship Battle** est un jeu de tir en arène 2D multijoueur jouable directement dans le navigateur. Affrontez vos amis en duel, faites équipe dans des combats intenses en 2 contre 2, ou entraînez-vous contre l'intelligence artificielle !

---

## 🎮 Fonctionnalités Principales

- **Multijoueur en Temps Réel** : Propulsé par Node.js et Socket.io pour une fluidité d'action instantanée.
- **Système de Lobby Avancé** :
  - Rejoignez un emplacement d'équipe dynamiquement (style _Brawl Stars_).
  - Changez de slot à la volée s'il y a de la place.
  - Décalage automatique des joueurs pour garder les équipes compactes.
  - Sélection de skins personnalisés.
  - Système de "Prêt/En attente" synchronisé avec compte à rebours.
- **3 Modes de Jeu** :
  - ⚔️ **1 VS 1** : Duel classique.
  - 🛡️ **2 VS 2** : Team Deathmatch (Le tir ami est désactivé. L'équipe gagne quand les deux adversaires sont éliminés).
  - 🤖 **VS Bot** : Joueur contre une IA autonome.
- **Mécaniques de Combat** :
  - Déplacements fluides et système de tir par projectiles.
  - Gestion des points de vie (100 HP).
  - Pose de boîtes dynamiques (murs) pour se protéger (limité à 5 par joueur).
  - Gestion complexe des collisions (murs, piliers, boîtes, bordures de map).

---

## 🛠️ Technologies Utilisées

- **Frontend** : HTML5, CSS3, Vanilla JavaScript, HTML5 Canvas API.
- **Backend** : Node.js, Express.
- **WebSockets** : Socket.io (Communication client-serveur bidirectionnelle).

---

## 📁 Architecture du Projet

```text
📦 Spaceship-Battle
 ┣ 📂 Backend
 ┃ ┗ 📜 server.js         # Serveur Node.js gérant le lobby, la synchro et les dégâts
 ┣ 📂 frontend
 ┃ ┣ 📂 assets            # Sprites des skins, maps, fonds, et écrans de victoire/défaite
 ┃ ┣ 📂 css
 ┃ ┃ ┣ 📜 menu.css        # Styles du menu principal et du lobby
 ┃ ┃ ┗ 📜 ingame.css      # Styles de l'arène de combat
 ┃ ┣ 📂 script
 ┃ ┃ ┣ 📜 menu.js         # Logique de redirection du menu
 ┃ ┃ ┣ 📜 lobby.js        # Gestion des emplacements, équipes et choix de skins
 ┃ ┃ ┣ 📜 main.js         # Moteur de jeu principal (Canvas, WebSockets, Boucle de jeu)
 ┃ ┃ ┣ 📜 player.js       # Classe Joueur (Mouvement, Tir, Collisions)
 ┃ ┃ ┗ 📜 bot.js          # Intelligence Artificielle du mode Solo
 ┃ ┣ 📜 menu.html         # Écran titre
 ┃ ┣ 📜 lobby.html        # Salle d'attente
 ┃ ┣ 📜 ingame.html       # Arène de combat
 ┃ ┗ 📜 credits.html      # Remerciements
```
