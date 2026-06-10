// frontend/script/arene.js
function dessinerMap(ctx, canvas) {
  const mapImg = document.querySelector(".arena");
  if (mapImg) {
    ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#3a4454";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
