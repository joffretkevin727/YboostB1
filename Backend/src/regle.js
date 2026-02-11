const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// =======================
// Player
// =======================
class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = 100;
    this.shots = 3;
  }
}

// =======================
// Game
// =======================
class Game {
  constructor(width = 10, height = 10) {
    this.width = width;
    this.height = height;

    this.players = [new Player(1, 1, 1), new Player(2, width - 2, height - 2)];

    this.walls = new Set(); // "x,y"
    this.currentPlayerIndex = 0;
    this.gameOver = false;
    this.winner = null;
  }

  // =======================
  // Utils
  // =======================
  isInside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isWall(x, y) {
    return this.walls.has(`${x},${y}`);
  }

  getPlayerAt(x, y) {
    return this.players.find((p) => p.x === x && p.y === y);
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  get enemyPlayer() {
    return this.players[1 - this.currentPlayerIndex];
  }

  endTurn() {
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
  }

  // =======================
  // Actions
  // =======================
  applyAction(playerId, action) {
    if (this.gameOver) return;

    const player = this.currentPlayer;
    if (player.id !== playerId) return;

    switch (action.type) {
      case "MOVE":
        this.move(player, action.direction);
        break;

      case "SHOOT":
        this.shoot(player, action.direction);
        break;

      case "PLACE_WALL":
        this.placeWall(player, action.x, action.y);
        break;
    }

    this.checkGameOver();
    if (!this.gameOver) this.endTurn();
  }

  // =======================
  // Move
  // =======================
  move(player, direction) {
    const d = DIRECTIONS[direction];
    if (!d) return;

    const nx = player.x + d.x;
    const ny = player.y + d.y;

    if (!this.isInside(nx, ny)) return;
    if (this.isWall(nx, ny)) return;
    if (this.getPlayerAt(nx, ny)) return;

    player.x = nx;
    player.y = ny;
  }

  // =======================
  // Shoot
  // =======================
  shoot(player, direction) {
    if (player.shots <= 0) return;

    const d = DIRECTIONS[direction];
    if (!d) return;

    let x = player.x + d.x;
    let y = player.y + d.y;

    while (this.isInside(x, y)) {
      if (this.isWall(x, y)) break;

      const target = this.getPlayerAt(x, y);
      if (target) {
        target.hp -= 1;
        break;
      }

      x += d.x;
      y += d.y;
    }

    player.shots -= 1;
  }

  // =======================
  // Place Wall
  // =======================
  placeWall(player, x, y) {
    if (!this.isInside(x, y)) return;
    if (this.isWall(x, y)) return;
    if (this.getPlayerAt(x, y)) return;

    this.walls.add(`${x},${y}`);
  }

  // =======================
  // Game Over
  // =======================
  checkGameOver() {
    const dead = this.players.find((p) => p.hp <= 0);
    if (dead) {
      this.gameOver = true;
      this.winner = this.players.find((p) => p.hp > 0)?.id || null;
    }
  }

  // =======================
  // State (pour front / IA)
  // =======================
  getState() {
    return {
      width: this.width,
      height: this.height,
      players: this.players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        hp: p.hp,
        shots: p.shots,
      })),
      walls: [...this.walls],
      currentPlayerId: this.currentPlayer.id,
      gameOver: this.gameOver,
      winner: this.winner,
    };
  }
}

module.exports = Game;
