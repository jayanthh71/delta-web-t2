document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("main-menu__button")
    .addEventListener("click", showPlayerSelect);
});

function showPlayerSelect() {
  const mainMenu = document.getElementById("main-menu");
  const playerSelect = document.getElementById("player-select");

  mainMenu.classList.add("hidden");
  playerSelect.style.display = "";
  void playerSelect.offsetWidth;

  setTimeout(() => {
    playerSelect.classList.remove("hidden");
  }, 50);
}
