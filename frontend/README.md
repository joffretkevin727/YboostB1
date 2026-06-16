# 🤖 Intelligence Artificielle du Bot (Bot.js)

Ce module implémente une IA équilibrée, fluide et "humanisée" pour les entités bots, en interdisant toute triche physique (pas de téléportation, pas de vitesse magique) et en s'alignant strictement sur les capacités du joueur humain.

---

## 🛠️ Fonctionnalités Principales

### 1. Contraintes Physiques Équitables
* **Marche en Escalier (Anti-Diagonale) :** Le bot ne peut pas se déplacer en diagonale. Il alterne les axes X et Y par segments de 3 pas maximum pour intercepter sa cible.
* **Latence de Clavier (20ms) :** Un délai de 20ms simule le temps de pression mécanique des doigts sur les touches lors des changements de direction.

### 2. Séquenceur d'Actions Unique
Le bot ne peut pas cumuler les actions physiques (courir, tirer et poser un mur en même temps).
* **Hors Combat (10ms) :** S'immobilise 10ms avant l'action (tir/mur) et 10ms après avant de reprendre sa course.
* **Au Corps à Corps (30ms) :** En cas de stress (proximité < 150px), ce temps d'arrêt passe à 30ms, le rendant plus lent et prévisible.

### 3. Comportement au Corps à Corps (< 150px)
* **Perte de précision :** Le cooldown de tir passe de 400ms à **800ms**.
* **Distanciation :** Le bot arrête d'orbiter et privilégie une fuite rectiligne pour recréer une distance de sécurité confortable.

### 4. Hésitations et Erreurs Humaines (5% de chance)
* En dehors de la phase d'approche initiale, le bot a 5% de chances par frame de se tromper : il inverse ses touches directionnelles et subit une rallonge de pause de 30ms.

### 5. Système Anti-Loop Dynamique (Seuil : 100 Ticks)
* Si le bot reste coincé dans le même état décisionnel ou contre un angle de mur pendant 100 frames, il casse ses verrous, inverse ses axes de déplacement et force un contournement manuel de 40 frames vers le centre.

---

## 📊 Structure de l'Arbre de Décision (`updateAI`)

[Vérification Système Anti-Loop (100 Ticks)]
│
├──► [Distance < 150px] ──► Fuite rectiligne + Tir lent (800ms cooldown)
│
├──► [PV Bot < 50%] ─────► Mode Berserk : Traque agressive + Tir continu
│
├──► [ PV Joueur < 50%] ──► Mode Traque : Interception verticale + Tir
│
└──► [PV Stables] ────────► Mode Standard :
├── Approche (Joueur ou Centre)
└── Combat :
├── Vue bloquée ──► Contournement escalier
└── Alignement ───► Tir statique (400ms)

---

## 💾 Logs & Optimisation Console
Les logs ne spamment plus la console à chaque frame :
* `[BOT-LOOP-SUMMARY]` : S'affiche **uniquement à la fin d'un état** pour résumer le nombre total d'itérations passées dans cette action.
* `[BOT-LOOP-END]` : Un avertissement unique généré si le système anti-loop a dû intervenir pour débloquer le bot.