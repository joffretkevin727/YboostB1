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
  - 🤖 **VS Bot** : Joueur contre une IA autonome. Un README est a disposition pour le comportement du bot, situé dans "frontend".
- **Mécaniques de Combat** :
  - Déplacements fluides et système de tir par projectiles.
  - Gestion des points de vie (100 HP).
  - Pose de boîtes dynamiques (murs) pour se protéger (limité à 5 par joueur).
  - Gestion complexe des collisions (murs, piliers, boîtes, bordures de map).

---

## 📁 Architecture du Projet

```text
📦 YBOOSTB1
 ┣ 📂 backend
 ┃ ┗ 📜 server.js         # Serveur gérant les WebSockets, la création des murs et le tir ami
 ┣ 📂 frontend
 ┃ ┣ 📂 assets
 ┃ ┃ ┣ 📂 arena
 ┃ ┃ ┃ ┗ 🖼️ spaceship.png # Texture de la carte ou d'un élément d'arène
 ┃ ┃ ┣ 📂 background      # Décors et arrière-plans du jeu
 ┃ ┃ ┣ 📂 man             # Dossier des skins et frames d'animations du personnage
 ┃ ┃ ┣ 📂 party           # Ressources pour les écrans de fin ou d'équipes
 ┃ ┃ ┣ 📂 piliers         # Sprites des obstacles et murs fixes
 ┃ ┃ ┣ 📂 sounds          # Effets sonores (tirs, impacts, musiques)
 ┃ ┃ ┣ 🖼️ icon.png        # Icône du jeu / Favicon
 ┃ ┃ ┗ 🖼️ title.png       # Logo ou bannière de l'écran titre
 ┃ ┣ 📂 css
 ┃ ┃ ┣ 🎨 credit.css      # Mise en page des remerciements
 ┃ ┃ ┣ 🎨 ingame.css      # Interface de l'arène de combat et du HUD
 ┃ ┃ ┣ 🎨 lobby.css       # Design des salons d'attente et choix des équipes
 ┃ ┃ ┣ 🎨 menu.css        # Styles visuels de l'écran d'accueil
 ┃ ┃ ┗ 🎨 perso.css       # Personnalisation des avatars et skins
 ┃ ┣ 📂 script
 ┃ ┃ ┣ 📜 arene.js        # Gestion de l'affichage de la carte et des obstacles
 ┃ ┃ ┣ 📜 bot.js          # Comportement de l'IA (escalier, pauses 10ms, anti-loop)
 ┃ ┃ ┣ 📜 lobby.js        # Gestion du salon, choix des skins et communication réseau
 ┃ ┃ ┣ 📜 main.js         # Moteur principal, Canvas 2D et boucle de rendu (gameLoop)
 ┃ ┃ ┣ 📜 menu.js         # Navigation et boutons de l'écran de départ
 ┃ ┃ ┗ 📜 player.js       # Entité de base (mouvements locaux, projectiles, santé)
 ┃ ┣ 📄 credits.html      # Page des remerciements et contributeurs
 ┃ ┣ 📄 ingame.html       # Fenêtre principale du Canvas de jeu
 ┃ ┣ 📄 lobby.html        # Interface de configuration d'avant-partie
 ┃ ┣ 📄 menu.html         # Point d'entrée principal du jeu
 ┃ ┗ 📝 README.md         # Documentation spécifique à la partie Frontend / Bot
 ┣ ⚙️ .gitignore          # Fichiers exclus du suivi Git (node_modules, etc.)
 ┣ 📜 LICENSE             # Licence d'utilisation du projet
 ┗ 📝 README.md           # Documentation globale du dépôt racine
```

---

## 🛠️ Technologies Utilisées

- **Frontend** : HTML5, CSS3, Vanilla JavaScript, HTML5 Canvas API.
- **Backend** : Node.js, Express.
- **WebSockets** : Socket.io (Communication client-serveur bidirectionnelle).
