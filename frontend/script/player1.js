// --- CONFIGURATION JOUEUR 1 ---
const elmt1 = document.querySelector(".elmt");
let num1 = 0;
let timer1 = null;
const maxImages1 = 5;

const keysJ1 = {
  d: false,
  q: false,
};
let lastKeyJ1 = "";

function startAnimJ1() {
  if (timer1 !== null) return;
  timer1 = setInterval(() => {
    num1 = num1 >= maxImages1 ? 1 : num1 + 1;
    elmt1.src = `../frontend/assets/man/00${num1}.png`;
  }, 100);
}

function stopAnimJ1() {
  clearInterval(timer1);
  timer1 = null;
  elmt1.src = "../frontend/assets/man/000.png";
}

function updateMovementJ1() {
  if (keysJ1.d && (lastKeyJ1 === "d" || !keysJ1.q)) {
    elmt1.classList.replace("gauche", "droite") ||
      elmt1.classList.add("droite");
    startAnimJ1();
  } else if (keysJ1.q && (lastKeyJ1 === "q" || !keysJ1.d)) {
    elmt1.classList.replace("droite", "gauche") ||
      elmt1.classList.add("gauche");
    startAnimJ1();
  } else {
    stopAnimJ1();
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "d" || key === "q") {
    keysJ1[key] = true;
    lastKeyJ1 = key;
    updateMovementJ1();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "d" || key === "q") {
    keysJ1[key] = false;
    updateMovementJ1();
  }
});
