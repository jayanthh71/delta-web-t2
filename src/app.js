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
    health: 100,
    takingDamage: false,
  };

  let frameTime = 0;
  const timeSeed = Math.floor(Date.now().toString().slice(-7));

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
    // Draw grid lines
    ctx.strokeStyle = "#15ff00";
    ctx.lineWidth = 2;

    for (let x = -player.x % 275; x < canvas.width; x += 275) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = -player.y % 275; y < canvas.height; y += 275) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    for (let i = 0; i < Math.ceil(canvas.width / 275) + 1; i++) {
      for (let j = 0; j < Math.ceil(canvas.height / 275) + 1; j++) {
        const cellX = (Math.floor(player.x / 275) + i) * 275;
        const cellY = (Math.floor(player.y / 275) + j) * 275;
        const screenX = cellX - player.x;
        const screenY = cellY - player.y;
        const centerX = screenX + 275 / 2;
        const centerY = screenY + 275 / 2;

        const cellSeed =
          ((Math.abs(cellX) * 13) % 10000) +
          ((Math.abs(cellY) * 17) % 10000) +
          (timeSeed % 10000); // Generate random seed for each cell

        // Utility function to generate random numbers based on seed
        const getSeededRandom = (seed, index) => {
          const val = Math.sin(seed * 1000 + index * 100) * 10000;
          return (val - Math.floor(val)) / 1; // Between 0 and 1
        };

        // Draw grass
        ctx.fillStyle = "#006500";
        ctx.fillRect(screenX + 25, screenY + 25, 225, 225);

        // Draw buildings
        for (let i = 0; i < 4; i++) {
          const buildingWidth = 50 + getSeededRandom(cellSeed, i * 4) * 50;
          const buildingHeight = 50 + getSeededRandom(cellSeed, i * 4 + 1) * 50;
          const maxX = 225 - buildingWidth;
          const maxY = 225 - buildingHeight;
          let buildingX, buildingY;

          if (i === 0) {
            // Make sure first building is on the sentry
            buildingX =
              centerX -
              buildingWidth / 2 +
              getSeededRandom(cellSeed, 100) * 40 -
              20;
            buildingY =
              centerY -
              buildingHeight / 2 +
              getSeededRandom(cellSeed, 101) * 40 -
              20;

            // Ensure it stays within bounds
            buildingX = Math.max(
              screenX + 25,
              Math.min(buildingX, screenX + 25 + maxX)
            );
            buildingY = Math.max(
              screenY + 25,
              Math.min(buildingY, screenY + 25 + maxY)
            );
          } else {
            buildingX =
              screenX + 25 + getSeededRandom(cellSeed, i * 4 + 2) * maxX;
            buildingY =
              screenY + 25 + getSeededRandom(cellSeed, i * 4 + 3) * maxY;
          }
          ctx.fillStyle = "#000000";
          ctx.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);

          // Draw sentry
          ctx.fillStyle = "#79171799";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          const sentryAngle =
            ((cellSeed % 8) * Math.PI) / 4 +
            (cellSeed % 2 === 0 ? 1 : -1) * frameTime;
          ctx.arc(
            centerX,
            centerY,
            137.5,
            sentryAngle,
            sentryAngle + Math.PI / 3
          );
          ctx.lineTo(centerX, centerY);
          ctx.fill();
          ctx.strokeStyle = "#da3333";
          ctx.lineWidth = 1;
          ctx.stroke();

          checkSentry(
            centerX,
            centerY,
            137.5,
            sentryAngle,
            sentryAngle + Math.PI / 3
          );
        }
      }
    }
  }

  function checkSentry(sentryX, sentryY, radius, startAngle, endAngle) {
    const dx = canvas.width / 2 - sentryX;
    const dy = canvas.height / 2 - sentryY;

    if (Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) <= radius) {
      // Normalize angle for comparison
      let normalizedAngle = Math.atan2(dy, dx);
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

      let normalizedStartAngle = startAngle % (Math.PI * 2);
      if (normalizedStartAngle < 0) normalizedStartAngle += Math.PI * 2;

      let normalizedEndAngle = endAngle % (Math.PI * 2);
      if (normalizedEndAngle < 0) normalizedEndAngle += Math.PI * 2;

      // Handle angle wrap-around
      let isInView = false;
      if (normalizedStartAngle <= normalizedEndAngle) {
        isInView =
          normalizedAngle >= normalizedStartAngle &&
          normalizedAngle <= normalizedEndAngle;
      } else {
        isInView =
          normalizedAngle >= normalizedStartAngle ||
          normalizedAngle <= normalizedEndAngle;
      }

      if (isInView) {
        player.takingDamage = true;
        player.health = player.health < 0 ? 0 : player.health - 0.1;
      }
    }
  }

  function drawPlayer() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);

    if (player.takingDamage) {
      ctx.fillStyle = "#da3333";
    } else {
      ctx.fillStyle = "#d1ffcd";
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw direction indicator
    ctx.strokeStyle = "#d1ffcd";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * 20, centerY + Math.sin(angle) * 20);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  function movePlayer() {
    const speed = 5;
    let dx = 0;
    let dy = 0;

    if (keys.w || keys.ArrowUp) dy -= 1;
    if (keys.s || keys.ArrowDown) dy += 1;
    if (keys.a || keys.ArrowLeft) dx -= 1;
    if (keys.d || keys.ArrowRight) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx /= Math.sqrt(2);
      dy /= Math.sqrt(2);
    }

    player.x += dx * speed;
    player.y += dy * speed;
  }

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.takingDamage = false;
    frameTime += 0.016;

    drawGrid();
    drawPlayer();
    movePlayer();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
