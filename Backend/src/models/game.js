const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = 100;
    this.dmgDone = 0; // Pour débloquer l'Ulti
    this.hasUlti = false;
    this.lastDirection = "UP"; // Utile pour placer les murs
  }
}

class Game {
  constructor() {
    this.width = 8;
    this.height = 8;
    this.minX = 0; // Limites de la zone
    this.maxX = 7;
    this.minY = 0;
    this.maxY = 7;

    this.players = {}; // { socketId: Player }
    this.walls = new Map(); // Key: "x,y", Value: hp
    this.rmc = 9;
    this.timer = 0;
    this.zoneLevel = 0;
    this.gameOver = false;
    this.winner = null;
  }

  // --- LOGIQUE TEMPS RÉEL (Appelé à 30 IPS) ---
  update(deltaTime) {
    if (this.gameOver) return;
    this.timer += deltaTime;

    // Régénération RMC (Toutes les 2s)
    if (Math.floor(this.timer % 2) === 0 && this.timer % 2 < deltaTime && this.rmc < 9) {
      this.rmc++;
    }

    // Réduction de Zone (Toutes les 30s)
    if (Math.floor(this.timer / 30) > this.zoneLevel) {
      this.zoneLevel++;
      this.reduceZone();
    }

    this.checkZoneDamage();
    this.checkGameOver();
  }

  // --- ACTIONS ---
  applyAction(playerId, action) {
    const player = this.players[playerId];
    if (!player || this.gameOver) return;

    switch (action.type) {
      case "MOVE":
        this.move(player, action.direction);
        break;
      case "SHOOT":
        if (this.rmc >= 1) {
          this.shoot(player, action.direction, false);
          this.rmc--;
        }
        break;
      case "ULTI":
        if (player.hasUlti) {
          this.shoot(player, action.direction, true);
          player.hasUlti = false;
          player.dmgDone = 0; // Reset progression
        }
        break;
      case "PLACE_WALL":
        if (this.rmc >= 1) {
          this.placeWall(player, action.direction);
          this.rmc--;
        }
        break;
    }
  }

  move(player, dir) {
    const d = DIRECTIONS[dir];
    player.lastDirection = dir;
    const nx = player.x + d.x;
    const ny = player.y + d.y;

    if (this.isInside(nx, ny) && !this.walls.has(`${nx},${ny}`)) {
      player.x = nx;
      player.y = ny;
    }
  }

  shoot(player, dir, isUlti) {
    const d = DIRECTIONS[dir];
    let x = player.x + d.x;
    let y = player.y + d.y;

    while (this.isInside(x, y)) {
      // Collision Mur
      if (this.walls.has(`${x},${y}`)) {
        if (!isUlti) {
          const currentHp = this.walls.get(`${x},${y}`);
          if (currentHp <= 5) this.walls.delete(`${x},${y}`);
          else this.walls.set(`${x},${y}`, currentHp - 5);
          break; // Le tir classique s'arrête
        }
        // L'ulti traverse mais ne détruit pas forcément le mur
      }

      // Collision Joueur
      const target = Object.values(this.players).find(p => p.x === x && p.y === y && p.id !== player.id);
      if (target) {
        target.hp -= 5;
        player.dmgDone += 5;
        if (player.dmgDone >= 20) player.hasUlti = true;
        if (!isUlti) break;
      }
      x += d.x;
      y += d.y;
    }
  }

  placeWall(player, dir) {
    const d = DIRECTIONS[dir];
    const wx = player.x + d.x;
    const wy = player.y + d.y;

    if (this.isInside(wx, wy) && !this.walls.has(`${wx},${wy}`)) {
      this.walls.set(`${wx},${wy}`, 15);
    }
  }

  // --- ZONE ET FIN DE PARTIE ---
  reduceZone() {
    if (this.zoneLevel < 7) {
      this.minX++; this.maxX--;
      this.minY++; this.maxY--;
    }
  }

  checkZoneDamage() {
    Object.values(this.players).forEach(p => {
      if (p.x < this.minX || p.x > this.maxX || p.y < this.minY || p.y > this.maxY) {
        p.hp -= 0.5; // Dégâts continus
      }
    });
  }

  isInside(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  checkGameOver() {
    const playersArr = Object.values(this.players);
    if (playersArr.length < 2) return;

    const dead = playersArr.find(p => p.hp <= 0);
    const timeOut = this.timer >= 210;

    if (dead || timeOut) {
      this.gameOver = true;
      // Logique de victoire (PV max ou dernier survivant)
      this.winner = playersArr.sort((a, b) => b.hp - a.hp)[0].id;
    }
  }
  
  getState() {
      return {
          players: this.players,
          walls: Array.from(this.walls.entries()),
          rmc: this.rmc,
          timer: Math.floor(this.timer),
          zone: { minX: this.minX, maxX: this.maxX, minY: this.minY, maxY: this.maxY }
      };
  }
}

module.exports = Game;