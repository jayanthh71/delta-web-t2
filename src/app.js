document.addEventListener("DOMContentLoaded", () => {
  let currentGame = null;

  function updateHighScoreDisplay() {
    const highScore = localStorage.getItem("cybescapeHighScore") || "0";
    document.getElementById(
      "main-menu__highscore"
    ).textContent = `High Score: ${parseInt(highScore).toLocaleString()}`;
  }

  updateHighScoreDisplay();

  function showGame() {
    const mainMenu = document.getElementById("main-menu");
    const game = document.getElementById("game");

    mainMenu.classList.add("hidden");
    game.style.display = "";
    void game.offsetWidth;

    setTimeout(() => {
      game.classList.remove("hidden");
      currentGame = startGame();
    }, 50);
  }

  function globalTogglePause() {
    if (currentGame && currentGame.togglePause) {
      currentGame.togglePause();
    }
  }

  function globalResetGame(source) {
    if (currentGame && currentGame.resetGame) {
      currentGame = currentGame.resetGame(source);
    }
  }

  function globalReturnToMainMenu(source) {
    if (currentGame && currentGame.returnToMainMenu) {
      currentGame.returnToMainMenu(source);
    }
  }

  document
    .getElementById("main-menu__button")
    .addEventListener("click", showGame);
  document
    .getElementById("game__pause-button")
    .addEventListener("click", globalTogglePause);
  document
    .getElementById("resume-button")
    .addEventListener("click", globalTogglePause);
  document
    .getElementById("restart-button")
    .addEventListener("click", () => globalResetGame("pause"));
  document
    .getElementById("main-menu-button")
    .addEventListener("click", () => globalReturnToMainMenu("pause"));
  document
    .getElementById("play-again-button")
    .addEventListener("click", () => globalResetGame("game-end"));
  document
    .getElementById("return-to-menu-button")
    .addEventListener("click", () => globalReturnToMainMenu("game-end"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (
        !document.getElementById("game").classList.contains("hidden") &&
        document.getElementById("game").style.display !== "none"
      ) {
        globalTogglePause();
      }
    }
  });
});

const buildingDestory = new Audio("public/building-destroy.mp3");
const button = new Audio("public/button.mp3");
const healthPickup = new Audio("public/health-pickup.mp3");
const deliverFail = new Audio("public/deliver-fail.mp3");
const keyPickup = new Audio("public/key-pickup.mp3");
const deliverSuccess = new Audio("public/deliver-success.mp3");
const shoot = new Audio("public/shoot.mp3");

function startGame() {
  button.cloneNode().play();
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let gameState = {
    paused: false,
    animationFrameId: null,
  };

  let sentryTime = 0;
  let bulletTime = 0;
  let healthTime = Date.now();
  let pausedTime = 0;
  let gameStartTime = Date.now();
  let totalPausedTime = 0;
  const timeSeed = Math.floor(Date.now().toString().slice(-7));
  const bullets = [];
  const keys = [];
  const healthKits = [];
  const buildings = [];
  const damagedBuildings = new Map();

  const player = {
    x: 0,
    y: 0,
    health: 100,
    takingDamage: false,
    keys: 0,
    shards: 0,
  };

  let totalKeysCollected = 0;
  let exchangeDebounce = false;

  let systemHealth = 60;
  let shardsDelivered = 0;
  let baseStation = null;
  let centralHub = null;
  let keysRequired = Math.floor(Math.random() * 5) + 1;

  function initializeBaseStation() {
    if (baseStation === null) {
      const halfGridsX = Math.ceil(canvas.width / 275 / 2) + 1;
      const halfGridsY = Math.ceil(canvas.height / 275 / 2) + 1;

      const cells = [];
      for (let i = -halfGridsX; i <= halfGridsX; i++) {
        for (let j = -halfGridsY; j <= halfGridsY; j++) {
          const cellX = Math.floor(player.x / 275) * 275 + i * 275;
          const cellY = Math.floor(player.y / 275) * 275 + j * 275;
          cells.push({ x: cellX, y: cellY });
        }
      }

      baseStation = cells[Math.floor(Math.random() * cells.length)];
      const ringPositions = [];
      for (let i = -5; i <= 5; i++) {
        for (let j = -5; j <= 5; j++) {
          if (Math.abs(i) === 5 || Math.abs(j) === 5) {
            ringPositions.push({
              x: baseStation.x + i * 275,
              y: baseStation.y + j * 275,
            });
          }
        }
      }
      centralHub =
        ringPositions[Math.floor(Math.random() * ringPositions.length)];
    }
  }

  const mouse = {
    x: 0,
    y: 0,
  };

  const keyBindings = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  };

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  window.addEventListener("keydown", (e) => {
    if (keyBindings[e.key] !== undefined) {
      keyBindings[e.key] = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (keyBindings[e.key] !== undefined) {
      keyBindings[e.key] = false;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  canvas.addEventListener("click", (e) => {
    fireBullet();
  });

  function drawGrid() {
    buildings.length = 0;
    initializeBaseStation();

    const offsetX = player.x % 275;
    const offsetY = player.y % 275;

    // Draw grid lines
    ctx.strokeStyle = "#15ff00";
    ctx.lineWidth = 2;

    for (let x = canvas.width / 2 - offsetX; x < canvas.width; x += 275) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let x = canvas.width / 2 - offsetX - 275; x >= 0; x -= 275) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = canvas.height / 2 - offsetY; y < canvas.height; y += 275) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let y = canvas.height / 2 - offsetY - 275; y >= 0; y -= 275) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw buildings
    const halfGridsX = Math.ceil(canvas.width / 275 / 2) + 1;
    const halfGridsY = Math.ceil(canvas.height / 275 / 2) + 1;

    for (let i = -halfGridsX; i <= halfGridsX; i++) {
      for (let j = -halfGridsY; j <= halfGridsY; j++) {
        const cellX = Math.floor(player.x / 275) * 275 + i * 275;
        const cellY = Math.floor(player.y / 275) * 275 + j * 275;
        const screenX = cellX - player.x + canvas.width / 2;
        const screenY = cellY - player.y + canvas.height / 2;
        const centerX = screenX + 275 / 2;
        const centerY = screenY + 275 / 2;

        if (
          screenX + 275 < 0 ||
          screenX > canvas.width ||
          screenY + 275 < 0 ||
          screenY > canvas.height
        ) {
          continue;
        }

        const cellSeed =
          ((cellX * 13) % 10000) +
          ((Math.abs(cellY) * 17) % 10000) +
          (timeSeed % 10000); // Generate random seed for each cell

        // Utility function to generate random numbers based on seed
        const getSeededRandom = (seed, index) => {
          const val = Math.sin(seed * 1000 + index * 100) * 10000;
          return (val - Math.floor(val)) / 1; // Between 0 and 1
        };

        const isBaseStation =
          baseStation && cellX === baseStation.x && cellY === baseStation.y;

        const isCentralHub =
          centralHub && cellX === centralHub.x && cellY === centralHub.y;

        // Draw background
        if (isBaseStation) {
          ctx.fillStyle = "#00FFFF";
        } else if (isCentralHub) {
          ctx.fillStyle = "#FFA500";
        } else ctx.fillStyle = "#008800";
        ctx.fillRect(screenX + 25, screenY + 25, 225, 225);

        // Draw buildings
        let sentryBuildingExists = false;

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

          const buildingKey = `${cellX},${cellY},${i}`;
          const damageInfo = damagedBuildings.get(buildingKey);
          if (damageInfo && damageInfo.health <= 0) {
            if (i === 0) {
              sentryBuildingExists = false;
            }
            continue;
          }

          const building = {
            x: buildingX - canvas.width / 2 + player.x,
            y: buildingY - canvas.height / 2 + player.y,
            width: buildingWidth,
            height: buildingHeight,
            health: damageInfo ? damageInfo.health : 2,
            key: buildingKey,
          };
          buildings.push(building);

          if (i === 0) {
            sentryBuildingExists = true;
          }

          const shadowOffsetX = 4;
          const shadowOffsetY = 4;

          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(
            buildingX + shadowOffsetX,
            buildingY + shadowOffsetY,
            buildingWidth,
            buildingHeight
          );

          if (building.health === 2) {
            ctx.fillStyle = "#1a1a1a";
          } else {
            ctx.fillStyle = "#4a0e0e";
          }
          ctx.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);

          ctx.strokeStyle = building.health === 2 ? "#00FFFF" : "#FF6600";
          ctx.lineWidth = 1;
          ctx.strokeRect(buildingX, buildingY, buildingWidth, buildingHeight);
        }

        // Draw blue circle
        if (isBaseStation) {
          const shadowOffsetX = 5;
          const shadowOffsetY = 5;
          const radius = 60;

          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.beginPath();
          ctx.arc(
            centerX + shadowOffsetX,
            centerY + shadowOffsetY,
            radius,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Draw main base station with solid color
          ctx.fillStyle = "#0088DD";
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Add border
          ctx.strokeStyle = "#00FFFF";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();

          if (player.shards > 0) {
            ctx.shadowColor = "#000000";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = "#000000";
            ctx.font = "bold 24px Bruno Ace SC";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`+${player.shards.toString() * 10}`, centerX, centerY);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1;
            ctx.strokeText(
              `+${player.shards.toString() * 10}`,
              centerX,
              centerY
            );

            ctx.shadowColor = "#00FFFF";
            ctx.shadowBlur = 12;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(`+${player.shards.toString() * 10}`, centerX, centerY);

            ctx.shadowBlur = 0;
          }
        }

        // Draw red circle
        if (isCentralHub) {
          const shadowOffsetX = 4;
          const shadowOffsetY = 4;
          const radius = 40;

          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.beginPath();
          ctx.arc(
            centerX + shadowOffsetX,
            centerY + shadowOffsetY,
            radius,
            0,
            Math.PI * 2
          );
          ctx.fill();

          ctx.fillStyle = "#DD2222";
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#FF6600";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowColor = "#000000";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          ctx.fillStyle = "#000000";
          ctx.font = "bold 24px Bruno Ace SC";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(keysRequired.toString(), centerX, centerY);

          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.strokeText(keysRequired.toString(), centerX, centerY);

          ctx.shadowColor = "#FF6600";
          ctx.shadowBlur = 12;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(keysRequired.toString(), centerX, centerY);

          ctx.shadowBlur = 0;
        }

        // Draw sentry
        if (sentryBuildingExists && !isBaseStation && !isCentralHub) {
          const sentryAngle =
            ((cellSeed % 8) * Math.PI) / 4 +
            (cellSeed % 2 === 0 ? 1 : -1) * sentryTime;
          const shadowOffsetX = 6;
          const shadowOffsetY = 6;
          const radius = 137.5;

          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.moveTo(centerX + shadowOffsetX, centerY + shadowOffsetY);
          ctx.arc(
            centerX + shadowOffsetX,
            centerY + shadowOffsetY,
            radius,
            sentryAngle,
            sentryAngle + Math.PI / 3
          );
          ctx.lineTo(centerX + shadowOffsetX, centerY + shadowOffsetY);
          ctx.fill();

          ctx.fillStyle = "rgba(139, 0, 0, 0.7)";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(
            centerX,
            centerY,
            radius,
            sentryAngle,
            sentryAngle + Math.PI / 3
          );
          ctx.lineTo(centerX, centerY);
          ctx.fill();

          ctx.strokeStyle = "#FF4444";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(
            centerX,
            centerY,
            radius,
            sentryAngle,
            sentryAngle + Math.PI / 3
          );
          ctx.lineTo(centerX, centerY);
          ctx.stroke();

          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.beginPath();
          ctx.arc(centerX + 2, centerY + 2, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FF0000";
          ctx.beginPath();
          ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#FFAAAA";
          ctx.lineWidth = 2;
          ctx.stroke();

          checkSentry(
            centerX,
            centerY,
            radius,
            sentryAngle,
            sentryAngle + Math.PI / 3
          );
        }
      }
    }
  }

  function drawPlayer() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);

    const shadowOffsetX = 3;
    const shadowOffsetY = 3;

    // Draw player
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.arc(
      centerX + shadowOffsetX,
      centerY + shadowOffsetY,
      20,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (player.takingDamage) {
      ctx.fillStyle = "#da3333";
    } else {
      ctx.fillStyle = "#d1ffcd";
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw direction indicator
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(angle) * 20 + shadowOffsetX,
      centerY + Math.sin(angle) * 20 + shadowOffsetY
    );
    ctx.lineTo(mouse.x + shadowOffsetX, mouse.y + shadowOffsetY);
    ctx.stroke();

    ctx.strokeStyle = "#d1ffcd";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * 20, centerY + Math.sin(angle) * 20);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();

    ctx.setLineDash([]);

    if (baseStation) {
      const baseStationCenterX = baseStation.x + 137.5;
      const baseStationCenterY = baseStation.y + 137.5;

      const baseStationDx = baseStationCenterX - player.x;
      const baseStationDy = baseStationCenterY - player.y;

      const baseAngle = Math.atan2(baseStationDy, baseStationDx);

      const startAngle = baseAngle - Math.PI / 8;
      const endAngle = baseAngle + Math.PI / 8;

      // Draw base station arc
      ctx.strokeStyle = "rgba(0, 100, 100, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        centerX + shadowOffsetX,
        centerY + shadowOffsetY,
        30,
        startAngle,
        endAngle
      );
      ctx.stroke();

      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, startAngle, endAngle);
      ctx.stroke();
    }

    if (centralHub) {
      const hubCenterX = centralHub.x + 137.5;
      const hubCenterY = centralHub.y + 137.5;

      const hubDx = hubCenterX - player.x;
      const hubDy = hubCenterY - player.y;
      const hubAngle = Math.atan2(hubDy, hubDx);

      const startAngle = hubAngle - Math.PI / 8;
      const endAngle = hubAngle + Math.PI / 8;

      // Draw central hub arc
      ctx.strokeStyle = "rgba(100, 50, 0, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        centerX + shadowOffsetX,
        centerY + shadowOffsetY,
        30,
        startAngle,
        endAngle
      );
      ctx.stroke();

      ctx.strokeStyle = "#FFA500";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, startAngle, endAngle);
      ctx.stroke();
    }
  }

  function movePlayer() {
    const speed = 5;
    let dx = 0;
    let dy = 0;

    if (keyBindings.w || keyBindings.ArrowUp) dy -= 1;
    if (keyBindings.s || keyBindings.ArrowDown) dy += 1;
    if (keyBindings.a || keyBindings.ArrowLeft) dx -= 1;
    if (keyBindings.d || keyBindings.ArrowRight) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx /= Math.sqrt(2);
      dy /= Math.sqrt(2);
    }

    const movement = handleCollisions(
      player.x + dx * speed,
      player.y + dy * speed
    );

    player.x += movement.x;
    player.y += movement.y;
  }

  function handleCollisions(targetX, targetY) {
    const moveX = targetX - player.x;
    const moveY = targetY - player.y;

    if (moveX === 0 && moveY === 0) {
      return { x: 0, y: 0 };
    }

    // First check if we can move to the target position directly
    const targetHitBox = {
      x: targetX - 20,
      y: targetY - 20,
      width: 40,
      height: 40,
    };

    // If no collision with any buildings, allow full movement
    let collision = false;
    for (const building of buildings) {
      if (checkBoxIntersection(targetHitBox, building)) {
        collision = true;
        break;
      }
    }

    if (!collision) {
      return { x: moveX, y: moveY };
    }

    // Try X movement only
    const xHitBox = {
      x: targetX - 20,
      y: player.y - 20,
      width: 40,
      height: 40,
    };

    let xCollision = false;
    for (const building of buildings) {
      if (checkBoxIntersection(xHitBox, building)) {
        xCollision = true;
        break;
      }
    }

    // Try Y movement only
    const yHitBox = {
      x: player.x - 20,
      y: targetY - 20,
      width: 40,
      height: 40,
    };

    let yCollision = false;
    for (const building of buildings) {
      if (checkBoxIntersection(yHitBox, building)) {
        yCollision = true;
        break;
      }
    }

    // Allow sliding
    if (!xCollision) {
      return { x: moveX, y: 0 };
    } else if (!yCollision) {
      return { x: 0, y: moveY };
    }

    // No movement possible
    return { x: 0, y: 0 };
  }

  function fireBullet() {
    const currentTime = Date.now();
    if (currentTime - bulletTime < 200) {
      return; // Prevent firing too frequently
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);

    bullets.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(angle) * 7.5,
      dy: Math.sin(angle) * 7.5,
    });

    shoot.cloneNode().play();
    bulletTime = currentTime;
  }

  function drawBullets() {
    const shadowOffsetX = 2;
    const shadowOffsetY = 2;

    for (const bullet of bullets) {
      const screenX = canvas.width / 2 + (bullet.x - player.x);
      const screenY = canvas.height / 2 + (bullet.y - player.y);

      // Draw bullet
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(
        screenX + shadowOffsetX,
        screenY + shadowOffsetY,
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = "#FFFF00";
      ctx.beginPath();
      ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];

      const oldX = bullet.x;
      const oldY = bullet.y;

      bullet.dx *= 0.9899;
      bullet.dy *= 0.9899;

      if (Math.sqrt(bullet.dx * bullet.dx + bullet.dy * bullet.dy) < 2) {
        bullets.splice(i, 1);
        continue;
      }

      bullet.x += bullet.dx;
      bullet.y += bullet.dy;

      const bulletHitBox = {
        x: bullet.x - 2.5,
        y: bullet.y - 2.5,
        width: 5,
        height: 5,
      };

      let collided = false;
      for (let j = 0; j < buildings.length; j++) {
        const building = buildings[j];
        if (checkBoxIntersection(bulletHitBox, building)) {
          const reflectionData = calculateReflection(
            oldX,
            oldY,
            bullet.x,
            bullet.y,
            building
          );

          if (reflectionData) {
            bullet.dx = reflectionData.newDx;
            bullet.dy = reflectionData.newDy;
            bullet.x = reflectionData.newX;
            bullet.y = reflectionData.newY;

            building.health--;
            if (building.health <= 0) {
              buildingDestory.cloneNode().play();
            }

            damagedBuildings.set(building.key, {
              health: building.health,
              x: building.x,
              y: building.y,
            });

            collided = true;
            break;
          }
        }
      }
    }
  }

  function calculateReflection(oldX, oldY, newX, newY, building) {
    const bulletDx = newX - oldX;
    const bulletDy = newY - oldY;

    const bulletCenterX = (oldX + newX) / 2;
    const bulletCenterY = (oldY + newY) / 2;

    const distanceToLeft = Math.abs(bulletCenterX - building.x);
    const distanceToRight = Math.abs(
      bulletCenterX - (building.x + building.width)
    );
    const distanceToTop = Math.abs(bulletCenterY - building.y);
    const distanceToBottom = Math.abs(
      bulletCenterY - (building.y + building.height)
    );

    const minDistance = Math.min(
      distanceToLeft,
      distanceToRight,
      distanceToTop,
      distanceToBottom
    );

    let newDx = bulletDx;
    let newDy = bulletDy;
    let reflectedX = oldX;
    let reflectedY = oldY;

    if (minDistance === distanceToLeft || minDistance === distanceToRight) {
      // Reflect X component
      newDx = -bulletDx;
      reflectedX =
        minDistance === distanceToLeft
          ? building.x - 10
          : building.x + building.width + 10;
      reflectedY = bulletCenterY;
    } else {
      // Reflect Y component
      newDy = -bulletDy;
      reflectedX = bulletCenterX;
      reflectedY =
        minDistance === distanceToTop
          ? building.y - 10
          : building.y + building.height + 10;
    }

    return {
      newDx: newDx,
      newDy: newDy,
      newX: reflectedX,
      newY: reflectedY,
    };
  }

  function checkBoxIntersection(boxA, boxB) {
    return (
      boxA.x < boxB.x + boxB.width &&
      boxA.x + boxA.width > boxB.x &&
      boxA.y < boxB.y + boxB.height &&
      boxA.y + boxA.height > boxB.y
    );
  }

  function checkSentry(sentryX, sentryY, radius, startAngle, endAngle) {
    const playerHitBox = {
      x: player.x - 12.5,
      y: player.y - 12.5,
      width: 25,
      height: 25,
    };

    const worldSentryX = sentryX - canvas.width / 2 + player.x;
    const worldSentryY = sentryY - canvas.height / 2 + player.y;

    const corners = [
      { x: playerHitBox.x, y: playerHitBox.y },
      { x: playerHitBox.x + playerHitBox.width, y: playerHitBox.y },
      { x: playerHitBox.x, y: playerHitBox.y + playerHitBox.height },
      {
        x: playerHitBox.x + playerHitBox.width,
        y: playerHitBox.y + playerHitBox.height,
      },
    ];

    corners.push({
      x: playerHitBox.x + playerHitBox.width / 2,
      y: playerHitBox.y,
    });
    corners.push({
      x: playerHitBox.x + playerHitBox.width / 2,
      y: playerHitBox.y + playerHitBox.height,
    });
    corners.push({
      x: playerHitBox.x,
      y: playerHitBox.y + playerHitBox.height / 2,
    });
    corners.push({
      x: playerHitBox.x + playerHitBox.width,
      y: playerHitBox.y + playerHitBox.height / 2,
    });
    corners.push({
      x: playerHitBox.x + playerHitBox.width / 2,
      y: playerHitBox.y + playerHitBox.height / 2,
    });

    // Normalize angles for comparison
    let normalizedStartAngle = startAngle % (Math.PI * 2);
    if (normalizedStartAngle < 0) normalizedStartAngle += Math.PI * 2;
    let normalizedEndAngle = endAngle % (Math.PI * 2);
    if (normalizedEndAngle < 0) normalizedEndAngle += Math.PI * 2;

    for (const corner of corners) {
      const dx = corner.x - worldSentryX;
      const dy = corner.y - worldSentryY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;

        let inCone = false;
        if (normalizedStartAngle <= normalizedEndAngle) {
          inCone = angle >= normalizedStartAngle && angle <= normalizedEndAngle;
        } else {
          inCone = angle >= normalizedStartAngle || angle <= normalizedEndAngle;
        }

        if (inCone) {
          player.takingDamage = true;
          player.health = Math.max(0, player.health - 0.1);
          return;
        }
      }
    }
  }

  function generateKeys() {
    const halfGridsX = Math.ceil(canvas.width / 275 / 2) + 3;
    const halfGridsY = Math.ceil(canvas.height / 275 / 2) + 3;

    for (let i = -halfGridsX; i <= halfGridsX; i++) {
      for (let j = -halfGridsY; j <= halfGridsY; j++) {
        const cellX = Math.floor(player.x / 275) * 275 + i * 275;
        const cellY = Math.floor(player.y / 275) * 275 + j * 275;

        const cellSeed =
          ((cellX * 13) % 10000) +
          ((Math.abs(cellY) * 17) % 10000) +
          (timeSeed % 10000);

        const getSeededRandom = (seed, index) => {
          const val = Math.sin(seed * 1000 + index * 100) * 10000;
          return (val - Math.floor(val)) / 1;
        };

        // Check if this cell should have a key
        if (getSeededRandom(cellSeed, 999) < 0.25) {
          const keyX = cellX + 50 + getSeededRandom(cellSeed, 1000) * 175;
          const keyY = cellY + 50 + getSeededRandom(cellSeed, 1001) * 175;

          const keyId = `${cellX},${cellY}`;

          // Check if this key hasn't been collected yet
          const existingKey = keys.find((key) => key.id === keyId);
          if (!existingKey) {
            keys.push({
              id: keyId,
              x: keyX,
              y: keyY,
              collected: false,
            });
          }
        }
      }
    }
  }

  function generateHealthKits() {
    const halfGridsX = Math.ceil(canvas.width / 275 / 2) + 3;
    const halfGridsY = Math.ceil(canvas.height / 275 / 2) + 3;

    for (let i = -halfGridsX; i <= halfGridsX; i++) {
      for (let j = -halfGridsY; j <= halfGridsY; j++) {
        const cellX = Math.floor(player.x / 275) * 275 + i * 275;
        const cellY = Math.floor(player.y / 275) * 275 + j * 275;

        const cellSeed =
          ((cellX * 13) % 10000) +
          ((Math.abs(cellY) * 17) % 10000) +
          (timeSeed % 10000);

        const getSeededRandom = (seed, index) => {
          const val = Math.sin(seed * 1000 + index * 100) * 10000;
          return (val - Math.floor(val)) / 1;
        };

        // Check if this cell should have a health kit
        if (getSeededRandom(cellSeed, 1998) < 0.05) {
          const healthKitX = cellX + 50 + getSeededRandom(cellSeed, 1999) * 175;
          const healthKitY = cellY + 50 + getSeededRandom(cellSeed, 2000) * 175;

          const healthKitId = `${cellX},${cellY}`;

          // Check if this health kit hasn't been collected yet
          const existingHealthKit = healthKits.find(
            (kit) => kit.id === healthKitId
          );
          if (!existingHealthKit) {
            healthKits.push({
              id: healthKitId,
              x: healthKitX,
              y: healthKitY,
              collected: false,
            });
          }
        }
      }
    }
  }

  function drawKeys() {
    const shadowOffsetX = 3;
    const shadowOffsetY = 3;

    const time = Date.now() * 0.005;
    const glowIntensity = 0.7 + 0.3 * Math.sin(time);

    for (const key of keys) {
      if (key.collected) continue;

      const screenX = canvas.width / 2 + (key.x - player.x);
      const screenY = canvas.height / 2 + (key.y - player.y);

      if (
        screenX >= -20 &&
        screenX <= canvas.width + 20 &&
        screenY >= -20 &&
        screenY <= canvas.height + 20
      ) {
        ctx.save();
        ctx.globalAlpha = 0.5 * glowIntensity;
        ctx.fillStyle = "#FF00FF";
        ctx.beginPath();
        ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(
          screenX + shadowOffsetX,
          screenY + shadowOffsetY,
          8,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#8A2BE2";
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#BA55D3";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  function drawHealthKits() {
    const shadowOffsetX = 3;
    const shadowOffsetY = 3;

    const time = Date.now() * 0.003;
    const glowIntensity = 0.6 + 0.4 * Math.sin(time);

    for (const healthKit of healthKits) {
      if (healthKit.collected) continue;

      const screenX = canvas.width / 2 + (healthKit.x - player.x);
      const screenY = canvas.height / 2 + (healthKit.y - player.y);

      if (
        screenX >= -20 &&
        screenX <= canvas.width + 20 &&
        screenY >= -20 &&
        screenY <= canvas.height + 20
      ) {
        ctx.save();
        ctx.globalAlpha = 0.4 * glowIntensity;
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(screenX, screenY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(
          screenX + shadowOffsetX,
          screenY + shadowOffsetY,
          10,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#DC143C";
        ctx.beginPath();
        ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#FF6B6B";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(screenX - 5, screenY);
        ctx.lineTo(screenX + 5, screenY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 5);
        ctx.lineTo(screenX, screenY + 5);
        ctx.stroke();
      }
    }
  }

  function checkKeyCollection() {
    if (player.keys >= 12) return;

    const playerHitBox = {
      x: player.x - 20,
      y: player.y - 20,
      width: 40,
      height: 40,
    };

    for (const key of keys) {
      if (key.collected) continue;

      const keyHitBox = {
        x: key.x - 8,
        y: key.y - 8,
        width: 16,
        height: 16,
      };

      if (checkBoxIntersection(playerHitBox, keyHitBox)) {
        key.collected = true;
        player.keys++;
        totalKeysCollected++;
        keyPickup.cloneNode().play();
        if (player.keys >= 12) break;
      }
    }
  }

  function checkHealthKitCollection() {
    if (player.health >= 100) return;

    const playerHitBox = {
      x: player.x - 20,
      y: player.y - 20,
      width: 40,
      height: 40,
    };

    for (const healthKit of healthKits) {
      if (healthKit.collected) continue;

      const healthKitHitBox = {
        x: healthKit.x - 10,
        y: healthKit.y - 10,
        width: 20,
        height: 20,
      };

      if (checkBoxIntersection(playerHitBox, healthKitHitBox)) {
        healthKit.collected = true;
        player.health = Math.min(100, player.health + 20);
        healthPickup.cloneNode().play();
        break;
      }
    }
  }

  function checkCentralHubExchange() {
    if (!centralHub) return;

    const hubCenterX = centralHub.x + 137.5;
    const hubCenterY = centralHub.y + 137.5;
    const redCircleRadius = 40;

    const playerCenterX = player.x;
    const playerCenterY = player.y;
    const distanceToHub = Math.sqrt(
      Math.pow(playerCenterX - hubCenterX, 2) +
        Math.pow(playerCenterY - hubCenterY, 2)
    );

    const isOnHub = distanceToHub <= redCircleRadius;

    if (isOnHub && !exchangeDebounce) {
      if (player.keys >= keysRequired) {
        player.keys -= keysRequired;
        player.shards++;
        keysRequired = Math.floor(Math.random() * 5) + 1;
        deliverSuccess.cloneNode().play();
      } else {
        deliverFail.cloneNode().play();
      }
    }
    exchangeDebounce = isOnHub;
  }

  function checkBaseStationDelivery() {
    if (!baseStation) return;

    const baseCenterX = baseStation.x + 137.5;
    const baseCenterY = baseStation.y + 137.5;
    const blueCircleRadius = 60;

    const playerCenterX = player.x;
    const playerCenterY = player.y;
    const distanceToBase = Math.sqrt(
      Math.pow(playerCenterX - baseCenterX, 2) +
        Math.pow(playerCenterY - baseCenterY, 2)
    );

    if (distanceToBase <= blueCircleRadius) {
      if (player.shards > 0) {
        systemHealth = Math.min(100, systemHealth + player.shards * 10);
        shardsDelivered += player.shards;
        player.shards = 0;
        deliverSuccess.cloneNode().play();
      }
    }
  }

  function updateSystemHealth() {
    const currentTime = Date.now();
    const timeDiff = currentTime - healthTime;

    if (timeDiff >= 1000) {
      const decayRate = Math.max(0.1, 1 - shardsDelivered * 0.1);
      systemHealth = Math.max(0, systemHealth - decayRate);
      healthTime = currentTime;
    }
  }

  function drawPostProcessing() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.max(canvas.width, canvas.height) * 0.85;

    // Draw Vignette
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }

  function drawHUD() {
    drawSystemHealthBar();
    drawKeyIndicators();
    drawPlayerHealthBar();
    drawShardsDisplay();
  }

  function drawSystemHealthBar() {
    const centerX = canvas.width / 2;
    const centerY = 75;
    const width = 300;
    const height = 40;

    const halfWidth = width / 2;
    const quarterHeight = height / 4;
    const halfHeight = height / 2;

    const points = [
      { x: centerX - halfWidth + quarterHeight, y: centerY - halfHeight },
      { x: centerX + halfWidth - quarterHeight, y: centerY - halfHeight },
      { x: centerX + halfWidth, y: centerY + 4 },
      { x: centerX + halfWidth - quarterHeight, y: centerY + halfHeight },
      { x: centerX - halfWidth + quarterHeight, y: centerY + halfHeight },
      { x: centerX - halfWidth, y: centerY + 4 },
    ];

    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#1a1a1a";
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    const healthPercent = systemHealth / 100;
    if (healthPercent > 0) {
      if (systemHealth > 60) {
        ctx.fillStyle = "#00ff00";
      } else if (systemHealth > 30) {
        ctx.fillStyle = "#ffff00";
      } else {
        ctx.fillStyle = "#ff0000";
      }

      const fillEndX = centerX - halfWidth + width * healthPercent;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x + 2, points[0].y + 2);
      ctx.lineTo(points[1].x - 2, points[1].y + 2);
      ctx.lineTo(points[2].x - 2, points[2].y);
      ctx.lineTo(points[3].x - 2, points[3].y - 2);
      ctx.lineTo(points[4].x + 2, points[4].y - 2);
      ctx.lineTo(points[5].x + 2, points[5].y);
      ctx.closePath();
      ctx.clip();
      ctx.fillRect(
        centerX - halfWidth + 2,
        centerY - halfHeight + 2,
        fillEndX - (centerX - halfWidth),
        height - 4
      );
      ctx.restore();
    }

    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Bruno Ace SC";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AUREX", centerX, centerY);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeText("AUREX", centerX, centerY);

    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#000000";
    ctx.fillText("AUREX", centerX, centerY);

    ctx.shadowBlur = 0;
  }

  function drawKeyIndicators() {
    const centerX = canvas.width / 2;
    const centerY = 130;
    const startX = centerX - 275 / 2;

    for (let i = 0; i < 12; i++) {
      const holeX = startX + i * 25;
      const holeY = centerY;

      if (i < player.keys) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(holeX + 3, holeY + 3, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#8A2BE2";
        ctx.beginPath();
        ctx.arc(holeX, holeY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#BA55D3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(holeX, holeY, 8, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.shadowColor = "#00FFFF";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(holeX, holeY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00FFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(holeX, holeY, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function drawPlayerHealthBar() {
    const centerX = canvas.width / 2 - 300;
    const centerY = 75;
    const radius = 50;
    const innerRadius = 45;

    const hexagonVertices = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2 + Math.PI / 6;
      hexagonVertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }

    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#1a1a1a";
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(hexagonVertices[0].x, hexagonVertices[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(hexagonVertices[i].x, hexagonVertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    const healthPercent = player.health / 100;
    if (healthPercent > 0) {
      let healthColor;
      if (player.health > 60) {
        healthColor = "#00ff00";
        ctx.strokeStyle = "#00ff00";
        ctx.shadowColor = "#00ff00";
      } else if (player.health > 30) {
        healthColor = "#ffff00";
        ctx.strokeStyle = "#ffff00";
        ctx.shadowColor = "#ffff00";
      } else {
        healthColor = "#ff0000";
        ctx.strokeStyle = "#ff0000";
        ctx.shadowColor = "#ff0000";
      }

      ctx.shadowBlur = 8;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";

      const innerHexagonVertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2 + Math.PI / 6;
        innerHexagonVertices.push({
          x: centerX + innerRadius * Math.cos(angle),
          y: centerY + innerRadius * Math.sin(angle),
        });
      }

      const fullSegments = Math.floor(healthPercent * 6);
      const partialSegment = healthPercent * 6 - fullSegments;

      for (let i = 0; i < fullSegments; i++) {
        const segmentIndex = (6 - i) % 6;
        const nextIndex = (6 - i - 1) % 6;

        const startVertex = innerHexagonVertices[segmentIndex];
        const endVertex = innerHexagonVertices[nextIndex];

        ctx.beginPath();
        ctx.moveTo(startVertex.x, startVertex.y);
        ctx.lineTo(endVertex.x, endVertex.y);
        ctx.stroke();
      }

      if (partialSegment > 0 && fullSegments < 6) {
        const segmentIndex = (6 - fullSegments) % 6;
        const nextIndex = (6 - fullSegments - 1) % 6;

        const startVertex = innerHexagonVertices[segmentIndex];
        const endVertex = innerHexagonVertices[nextIndex];

        const partialEndX =
          startVertex.x + (endVertex.x - startVertex.x) * partialSegment;
        const partialEndY =
          startVertex.y + (endVertex.y - startVertex.y) * partialSegment;

        ctx.beginPath();
        ctx.moveTo(startVertex.x, startVertex.y);
        ctx.lineTo(partialEndX, partialEndY);
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;

    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Bruno Ace SC";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(player.health), centerX, centerY);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeText(Math.round(player.health), centerX, centerY);

    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(Math.round(player.health), centerX, centerY);

    ctx.shadowBlur = 0;
  }

  function drawShardsDisplay() {
    const centerX = canvas.width / 2 + 300;
    const centerY = 75;
    const radius = 50;

    const hexagonVertices = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2 + Math.PI / 6;
      hexagonVertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }

    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#1a1a1a";
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(hexagonVertices[0].x, hexagonVertices[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(hexagonVertices[i].x, hexagonVertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px Bruno Ace SC";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.shards, centerX, centerY);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    ctx.strokeText(player.shards, centerX, centerY);

    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(player.shards, centerX, centerY);

    ctx.shadowBlur = 0;
  }

  function togglePause() {
    button.cloneNode().play();
    const pauseOverlay = document.getElementById("pause-overlay");
    const isPaused = pauseOverlay.classList.contains("active");

    if (isPaused) {
      pauseOverlay.classList.remove("active");
      gameState.paused = false;

      const pauseDuration = Date.now() - pausedTime;
      totalPausedTime += pauseDuration;
      healthTime += pauseDuration;
      bulletTime += pauseDuration;

      gameLoop();
    } else {
      pauseOverlay.classList.add("active");
      gameState.paused = true;
      pausedTime = Date.now();

      if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
        gameState.animationFrameId = null;
      }
    }
  }

  function resetGame(source) {
    button.cloneNode().play();
    if (source === "pause") {
      document.getElementById("pause-overlay").classList.remove("active");
    } else if (source === "game-end") {
      document.getElementById("game-end-overlay").classList.remove("active");
    }

    gameState.paused = false;
    if (gameState.animationFrameId) {
      cancelAnimationFrame(gameState.animationFrameId);
      gameState.animationFrameId = null;
    }

    return startGame();
  }

  function returnToMainMenu(source) {
    button.cloneNode().play();
    if (source === "pause") {
      document.getElementById("pause-overlay").classList.remove("active");
    } else if (source === "game-end") {
      document.getElementById("game-end-overlay").classList.remove("active");
    }

    gameState.paused = true;
    if (gameState.animationFrameId) {
      cancelAnimationFrame(gameState.animationFrameId);
      gameState.animationFrameId = null;
    }

    const game = document.getElementById("game");
    const mainMenu = document.getElementById("main-menu");

    game.classList.add("hidden");
    setTimeout(() => {
      game.style.display = "none";
      mainMenu.classList.remove("hidden");
      const highScore = localStorage.getItem("cybescapeHighScore") || "0";
      document.getElementById(
        "main-menu__highscore"
      ).textContent = `High Score: ${parseInt(highScore).toLocaleString()}`;
    }, 300);
  }

  function gameLoop() {
    if (gameState.paused) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.takingDamage = false;
    sentryTime += 0.016;

    updateSystemHealth();
    generateKeys();
    generateHealthKits();
    drawGrid();
    drawKeys();
    drawHealthKits();
    drawPlayer();
    drawBullets();
    movePlayer();
    updateBullets();
    checkKeyCollection();
    checkHealthKitCollection();
    checkCentralHubExchange();
    checkBaseStationDelivery();
    drawPostProcessing();
    drawHUD();

    if (systemHealth >= 100) {
      endGame("win");
      return;
    } else if (systemHealth <= 0 || player.health <= 0) {
      endGame("lose");
      return;
    }

    gameState.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function calculateScore(
    completionTimeMs,
    keysCollected,
    shardsUsed,
    isVictory
  ) {
    if (!isVictory) return 0;

    const completionTimeSeconds = completionTimeMs / 1000;
    const baseScore = 5000;

    const timeBonus = Math.max(
      0,
      Math.round(5000 * (300 / (completionTimeSeconds + 60)))
    );
    const keyBonus = keysCollected * 100;
    const efficiencyBonus = Math.max(
      0,
      Math.round(3000 / (1 + shardsUsed * 0.3))
    );

    const totalScore = baseScore + timeBonus + keyBonus + efficiencyBonus;
    return Math.round(totalScore);
  }

  function updateHighScore(score) {
    const currentHighScore = parseInt(
      localStorage.getItem("cybescapeHighScore") || "0"
    );
    if (score > currentHighScore) {
      localStorage.setItem("cybescapeHighScore", score.toString());
      return true;
    }
    return false;
  }

  function endGame(result) {
    gameState.paused = true;
    if (gameState.animationFrameId) {
      cancelAnimationFrame(gameState.animationFrameId);
      gameState.animationFrameId = null;
    }

    const completionTime = Date.now() - gameStartTime - totalPausedTime;
    const score = calculateScore(
      completionTime,
      totalKeysCollected,
      shardsDelivered,
      result === "win"
    );
    const isNewHighScore = updateHighScore(score);
    const gameEndOverlay = document.getElementById("game-end-overlay");
    const gameEndTitle = document.getElementById("game-end-title");
    const gameEndMessage = document.getElementById("game-end-message");
    const gameEndScoreLabel = document.getElementById("game-end-score-label");
    const gameEndScoreValue = document.getElementById("game-end-score-value");

    if (result === "win") {
      gameEndTitle.textContent = "Mission Complete";
      gameEndTitle.style.color = "#00ff00";
      gameEndMessage.textContent = "System Restored";
      gameEndMessage.style.color = "#00ff00";
    } else {
      gameEndTitle.textContent = "Mission Failed";
      gameEndTitle.style.color = "#ff0000";

      if (player.health <= 0) {
        gameEndMessage.textContent = "Player Eliminated";
      } else {
        gameEndMessage.textContent = "System Failed";
      }
      gameEndMessage.style.color = "#ff0000";
    }

    if (isNewHighScore) {
      gameEndScoreLabel.textContent = "NEW HIGH SCORE!";
      gameEndScoreLabel.style.color = "#FFD700";
    } else {
      gameEndScoreLabel.textContent = "Score";
      gameEndScoreLabel.style.color = "#00ff00";
    }

    gameEndScoreValue.textContent = score.toLocaleString();

    gameEndOverlay.classList.add("active");
  }

  gameLoop();

  return {
    togglePause,
    resetGame,
    returnToMainMenu,
  };
}
