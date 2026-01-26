const canvas = document.getElementById("map");

const ctx = canvas.getContext('2d');

const rowCount = 9;

const columnCount = 9;

const squareSize = 55;

const squareGap = 5;

const colorSquare = "#E8F5E9";

const colorWallNull = "#aaaaaa";

const colorWallActive = "#5D4037";

const squareOffset = 4;

// LET 

let horizontaleWalls = Array(rowCount - 1).fill().map(() => Array(columnCount).fill(false));

let verticaleWalls = Array(rowCount).fill().map(() => Array(columnCount - 1).fill(false));

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let row = 0 ; row < rowCount; row++) {
        for( let col = 0; col < columnCount ; col ++) {
            const x = col*(squareSize + squareGap) + squareOffset;

            const y = row * (squareSize + squareGap) + squareOffset;

            ctx.fillStyle = colorSquare;

            ctx.fillRect(x,y,squareSize,squareSize);

            if (col < columnCount - 1) {
                ctx.fillStyle = verticaleWalls[row][col] ? colorWallActive : colorWallNull;
                ctx.fillRect(x + squareSize, y, squareGap, squareSize);
            }

            if (row < rowCount - 1) {
                ctx.fillStyle = horizontaleWalls[row][col] ? colorWallActive : colorWallNull;
                ctx.fillRect(x, y + squareSize, squareSize, squareGap);
            }
        }
    }
}
drawGrid();

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 1. On cherche sur quelle colonne et ligne se trouve la souris
    const col = Math.floor((x - squareOffset) / (squareSize + squareGap));
    const row = Math.floor((y - squareOffset) / (squareSize + squareGap));

    // 2. On calcule la position locale à l'intérieur de cette cellule
    const localX = (x - squareOffset) % (squareSize + squareGap);
    const localY = (y - squareOffset) % (squareSize + squareGap);

    // Détection mur vertical (clic à droite du carré)
    if (localX > squareSize && col < columnCount - 1 && row < rowCount) {
        verticaleWalls[row][col] = true;
        console.log(`Mur vertical placé en : ${row}, ${col}`);
    } 
    // Détection mur horizontal (clic en dessous du carré)
    else if (localY > squareSize && row < rowCount - 1 && col < columnCount) {
        horizontaleWalls[row][col] = true;
        console.log(`Mur horizontal placé en : ${row}, ${col}`);
    }

    drawGrid(); // Mise à jour visuelle
});