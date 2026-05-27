// Map.js
function dessinerMap(ctx, canvas) {
    // 1. On récupère l'image du décor via sa classe
    const mapImg = document.querySelector('.arena');

    // 2. Sécurité : Si l'image est trouvée, on la dessine
    if (mapImg) {
        // drawImage(image, x, y, largeur, hauteur)
        ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
    } else {
        // Plan de secours en couleur si l'image a un problème de chargement
        ctx.fillStyle = "#3a4454";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}