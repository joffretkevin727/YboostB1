// --- CONFIGURATION JOUEUR 2 ---
const elmt2 = document.querySelector(".elmt2");
let num2 = 0;
let timer2 = null;
const maxImages2 = 5;

const keysJ2 = {
  ArrowRight: false,
  ArrowLeft: false,
};
let lastKeyJ2 = "";

function startAnimJ2() {
  if (timer2 !== null) return;
  timer2 = setInterval(() => {
    num2 = num2 >= maxImages2 ? 1 : num2 + 1;
    elmt2.src = `../frontend/assets/man/00${num2}.png`;
  }, 100);
}

function stopAnimJ2() {
  clearInterval(timer2);
  timer2 = null;
  elmt2.src = "../frontend/assets/man/000.png";
}

function updateMovementJ2() {
  if (keysJ2.ArrowRight && (lastKeyJ2 === "ArrowRight" || !keysJ2.ArrowLeft)) {
    elmt2.classList.replace("gauche", "droite") ||
      elmt2.classList.add("droite");
    startAnimJ2();
  } else if (
    keysJ2.ArrowLeft &&
    (lastKeyJ2 === "ArrowLeft" || !keysJ2.ArrowRight)
  ) {
    elmt2.classList.replace("droite", "gauche") ||
      elmt2.classList.add("gauche");
    startAnimJ2();
  } else {
    stopAnimJ2();
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "ArrowRight" || key === "ArrowLeft") {
    keysJ2[key] = true;
    lastKeyJ2 = key;
    updateMovementJ2();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key;
  if (key === "ArrowRight" || key === "ArrowLeft") {
    keysJ2[key] = false;
    updateMovementJ2();
  }
});
