document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("main-menu__button")
    .addEventListener("click", showGame);
});

function showGame() {
  const mainMenu = document.getElementById("main-menu");
  const game = document.getElementById("game");

  mainMenu.classList.add("hidden");
  game.style.display = "";
  void game.offsetWidth;

  setTimeout(() => {
    game.classList.remove("hidden");
    startGame();
  }, 50);
}

function startGame() {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const player = {
    x: 0,
    y: 0,
  };

  const mouse = {
    x: 0,
    y: 0,
  };

  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  };

  window.addEventListener("keydown", (e) => {
    if (keys[e.key] !== undefined) {
      keys[e.key] = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (keys[e.key] !== undefined) {
      keys[e.key] = false;
    }
  });

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function drawGrid() {
    ctx.strokeStyle = "#15ff00";
    ctx.lineWidth = 2;

    const startX = -player.x % 275;
    const startY = -player.y % 275;

    for (let x = startX; x < canvas.width; x += 275) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = startY; y < canvas.height; y += 275) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function drawGrass() {
    ctx.fillStyle = "#006500";

    for (let i = 0; i < Math.ceil(canvas.width / 275) + 1; i++) {
      for (let j = 0; j < Math.ceil(canvas.height / 275) + 1; j++) {
        const cellX = (Math.floor(player.x / 275) + i) * 275;
        const cellY = (Math.floor(player.y / 275) + j) * 275;
        const screenX = cellX - player.x + 25;
        const screenY = cellY - player.y + 25;

        ctx.fillRect(screenX, screenY, 225, 225);
      }
    }
  }

  function drawPlayer() {
    ctx.fillStyle = "#d1ffcd";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 20, 0, Math.PI * 2);
    ctx.fill();
    drawDirectionIndicator();
  }

  function drawDirectionIndicator() {
    ctx.strokeStyle = "#d1ffcd";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const angle = Math.atan2(
      mouse.y - canvas.height / 2,
      mouse.x - canvas.width / 2
    );

    ctx.beginPath();
    ctx.moveTo(
      canvas.width / 2 + Math.cos(angle) * 20,
      canvas.height / 2 + Math.sin(angle) * 20
    );
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  function movePlayer() {
    if (keys.w || keys.ArrowUp) {
      player.y -= 5;
    }
    if (keys.a || keys.ArrowLeft) {
      player.x -= 5;
    }
    if (keys.s || keys.ArrowDown) {
      player.y += 5;
    }
    if (keys.d || keys.ArrowRight) {
      player.x += 5;
    }
  }

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    movePlayer();
    drawGrass();
    drawGrid();
    drawPlayer();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
