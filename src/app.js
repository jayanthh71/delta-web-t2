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

  let sentryTime = 0;
  let bulletTime = 0;
  const timeSeed = Math.floor(Date.now().toString().slice(-7));
  const bullets = [];
  const buildings = [];
  const damagedBuildings = new Map();

  const player = {
    x: 0,
    y: 0,
    health: 100,
    takingDamage: false,
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

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

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

  canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  canvas.addEventListener("click", (e) => {
    fireBullet();
  });

  function drawGrid() {
    buildings.length = 0;

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

          ctx.fillStyle = building.health === 2 ? "#000000" : "#8B0000";
          ctx.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);
        }

        // Only draw sentry if the sentry building exists
        if (sentryBuildingExists) {
          ctx.fillStyle = "#79171799";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          const sentryAngle =
            ((cellSeed % 8) * Math.PI) / 4 +
            (cellSeed % 2 === 0 ? 1 : -1) * sentryTime;
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

    bulletTime = currentTime;
  }

  function drawBullets() {
    ctx.fillStyle = "#FFFF00";

    for (const bullet of bullets) {
      const screenX = canvas.width / 2 + (bullet.x - player.x);
      const screenY = canvas.height / 2 + (bullet.y - player.y);

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

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.takingDamage = false;
    sentryTime += 0.016;

    drawGrid();
    drawPlayer();
    drawBullets();
    movePlayer();
    updateBullets();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
