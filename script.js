const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const coinCount = document.querySelector("#coin-count");
const distance = document.querySelector("#distance");
const healthCount = document.querySelector("#health-count");
const message = document.querySelector("#message");
const restartButton = document.querySelector("#restart-button");
const gameoverOverlay = document.querySelector("#gameover-overlay");
const gameoverRestart = document.querySelector("#gameover-restart");
const startOverlay = document.querySelector("#start-overlay");
const startButton = document.querySelector("#start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
let worldWidth = 4200;
const keys = new Set();
let stage = 1;
let player;
let camera;
let coins;
let enemies;
let shots;
let hazards;
let healItems;
let gameState;
let audioContext;
let bgmTimer;
let bgmStep = 0;
let jumpRequested = false;

const basePlatforms = [
  { x: 0, y: 440, w: 780, h: 100 }, { x: 900, y: 440, w: 620, h: 100 },
  { x: 1640, y: 440, w: 680, h: 100 }, { x: 2430, y: 440, w: 730, h: 100 },
  { x: 3280, y: 440, w: 920, h: 100 }, { x: 500, y: 350, w: 150, h: 22 },
  { x: 1080, y: 330, w: 160, h: 22 }, { x: 1810, y: 350, w: 160, h: 22 },
  { x: 2670, y: 330, w: 170, h: 22 }, { x: 3500, y: 350, w: 180, h: 22 },
];
let platforms;

const stageThemes = [
  { name: "血染めの荒野", sky: "#d8c58a", mist: "#b88e61", ground: "#593c2d", grass: "#c69d3b", accent: "#f3d21f", enemy: "#171717" },
  { name: "赤い道場", sky: "#5d1717", mist: "#9d2727", ground: "#271717", grass: "#d52b2b", accent: "#fff9d8", enemy: "#f3d21f" },
  { name: "月下の水路", sky: "#101c2b", mist: "#29445b", ground: "#1a2930", grass: "#caa95d", accent: "#f3d21f", enemy: "#d52b2b", ocean: true },
];

const stageLayouts = [
  {
    width: 4250,
    platforms: [
      [0, 440, 620, 100], [760, 440, 520, 100], [1430, 440, 500, 100], [2080, 440, 500, 100],
      [2740, 440, 550, 100], [3440, 440, 810, 100], [330, 350, 150, 20], [900, 320, 170, 20],
      [1540, 300, 160, 20], [2230, 340, 140, 20], [2920, 300, 180, 20], [3650, 340, 190, 20],
    ],
    enemies: [[480, 402, "slime"], [940, 282, "bat"], [1150, 402, "walker"], [1690, 262, "bat"], [2310, 302, "slime"], [3000, 262, "bat"], [3650, 302, "walker"]],
    hazards: [["orb", 660, 375], ["spike", 1300, 418], ["orb", 1950, 360], ["spike", 2600, 418], ["orb", 3310, 360]],
  },
  {
    width: 4650,
    platforms: [
      [0, 440, 460, 100], [600, 390, 260, 150], [1000, 440, 440, 100], [1570, 350, 230, 20],
      [1930, 440, 370, 100], [2440, 320, 220, 20], [2780, 440, 500, 100], [3410, 350, 250, 20],
      [3770, 440, 880, 100], [1180, 300, 150, 20], [3030, 270, 150, 20],
    ],
    enemies: [[330, 402, "walker"], [680, 352, "hopper"], [1180, 252, "bat"], [1660, 312, "turret"], [2110, 402, "slime"], [2500, 282, "bat"], [2940, 402, "hopper"], [3470, 312, "turret"], [4050, 402, "walker"]],
    hazards: [["laser", 870, 250], ["spike", 1450, 418], ["orb", 1820, 350], ["laser", 2320, 240], ["spike", 3300, 418], ["orb", 3660, 330]],
  },
  {
    width: 4900,
    platforms: [
      [0, 440, 520, 100], [650, 400, 230, 140], [1010, 440, 360, 100], [1480, 350, 210, 20],
      [1770, 440, 300, 100], [2150, 370, 260, 20], [2500, 440, 420, 100], [3050, 320, 240, 20],
      [3390, 440, 340, 100], [3860, 360, 220, 20], [4200, 440, 700, 100],
    ],
    enemies: [[350, 402, "crab"], [720, 362, "fish"], [1120, 402, "jelly"], [1530, 312, "fish"], [1880, 402, "crab"], [2240, 332, "jelly"], [2650, 402, "shark"], [3120, 282, "fish"], [3500, 402, "jelly"], [3930, 322, "shark"], [4440, 402, "crab"]],
    hazards: [["bubble", 560, 350], ["spike", 900, 418], ["bubble", 1390, 330], ["current", 1700, 330], ["spike", 2080, 418], ["bubble", 2920, 340], ["current", 3280, 300], ["spike", 3740, 418]],
  },
];

function reset(startImmediately = true) {
  const theme = stageThemes[(stage - 1) % stageThemes.length];
  const layout = stageLayouts[(stage - 1) % stageLayouts.length];
  worldWidth = layout.width + Math.max(0, stage - 3) * 300;
  platforms = layout.platforms.map(([x, y, w, h]) => ({ x, y, w, h }));
  player = { x: 90, y: 380, w: 40, h: 52, vx: 0, vy: 0, grounded: false, jumps: 0, facing: 1, attackCooldown: 0, attackTimer: 0, health: 3, invincible: 0 };
  camera = 0;
  coins = [230, 550, 720, 1020, 1160, 1430, 1800, 1940, 2630, 3550].map((x, i) => ({ x, y: i % 2 ? 290 : 390, taken: false }));
  enemies = layout.enemies.map(([x, y], index) => ({ x, y: y - 14, w: 38, h: 52, vx: index % 2 ? -1 : 1, kind: "swordsman", homeX: x, attackCooldown: 40 + index * 12, attackTimer: 0 }));
  shots = [];
  hazards = layout.hazards.map(([type, x, y], index) => ({ x, y, baseY: y, w: type === "spike" ? 42 : 34, h: type === "spike" ? 22 : 50, phase: index + stage, type }));
  healItems = [760, 1760, 2860, 3900].filter((x) => x < worldWidth - 150).map((x, index) => ({ x, y: 380 - (index % 2) * 70, taken: false }));
  gameState = startImmediately ? "playing" : "ready";
  jumpRequested = false;
  document.querySelector("#stage-label").textContent = `STAGE ${stage} · ${theme.name}`;
  document.querySelector("#next-stage-button").hidden = true;
  gameoverOverlay.hidden = true;
  startOverlay.hidden = startImmediately;
  setMessage("旅をはじめよう！", "← → / A D 移動　SPACE ジャンプ　X 刀攻撃");
  if (startImmediately) startBgm();
}

function startGame() {
  if (gameState !== "ready") return;
  gameState = "playing";
  startOverlay.hidden = true;
  startOverlay.setAttribute("hidden", "");
  startBgm();
  playSound(440, 0.12, "sine", 0.1);
}

function setMessage(title, text) {
  message.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function startBgm() {
  stopBgm();
  bgmStep = 0;
  bgmTimer = setInterval(() => {
    if (!audioContext || gameState !== "playing") return;
    const songs = [
      { melody: [523, 587, 698, 784, 880, 784, 698, 587], bass: [131, 147, 175, 196], chords: [[262, 330, 392], [294, 370, 440]] },
      { melody: [659, 698, 784, 988, 1047, 988, 784, 698], bass: [165, 196, 220, 247], chords: [[330, 415, 494], [349, 440, 523]] },
      { melody: [392, 440, 523, 659, 784, 659, 523, 440], bass: [98, 110, 131, 147], chords: [[196, 247, 294], [220, 277, 330]] },
    ];
    const song = songs[(stage - 1) % songs.length];
    const step = bgmStep++;
    playSound(song.melody[step % song.melody.length], 0.28, "triangle", 0.1);
    if (step % 2 === 0) playSound(song.bass[Math.floor(step / 2) % song.bass.length], 0.3, "sine", 0.08);
    if (step % 4 === 0) song.chords[(step / 4) % song.chords.length].forEach((note) => playSound(note, 0.5, "sine", 0.035));
    playSound(step % 4 === 0 ? 90 : 180, 0.07, "sine", step % 4 === 0 ? 0.12 : 0.045);
  }, 170);
}

function stopBgm() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = undefined; }
}

function playClearMusic() {
  [523, 659, 784, 1047, 1319].forEach((note, index) => setTimeout(() => playSound(note, 0.3, "square", 0.07), index * 150));
}

function update() {
  if (gameState !== "playing") return;
  if (player.invincible > 0) player.invincible--;
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  player.vx = (right ? 4.2 : 0) - (left ? 4.2 : 0);
  if (player.vx) player.facing = Math.sign(player.vx);
  if (jumpRequested) {
    if (player.jumps < 2) {
      player.vy = -11;
      player.grounded = false;
      player.jumps++;
      playSound(player.jumps === 2 ? 700 : 520, 0.08, "sine");
    }
    jumpRequested = false;
  }
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.attackTimer > 0) player.attackTimer--;
  player.vy += 0.5;
  player.x = Math.max(0, Math.min(worldWidth - player.w, player.x + player.vx));
  player.y += player.vy;
  player.grounded = false;
  for (const platform of platforms) {
    if (player.vy >= 0 && player.x + player.w > platform.x && player.x < platform.x + platform.w &&
        player.y + player.h >= platform.y && player.y + player.h - player.vy <= platform.y) {
      player.y = platform.y - player.h; player.vy = 0; player.grounded = true; player.jumps = 0;
    }
  }
  if (player.y > HEIGHT + 40) return lose();
  const previousBottom = player.y + player.h - player.vy;
  for (const enemy of enemies) {
    if (enemy.defeated) { enemy.defeatTimer--; continue; }
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    if (enemy.attackTimer > 0) enemy.attackTimer--;
    const home = platforms.find((p) => enemy.homeX >= p.x && enemy.homeX + enemy.w <= p.x + p.w);
    const distanceToPlayer = player.x - enemy.x;
    if (Math.abs(distanceToPlayer) < 470) {
      enemy.vx = Math.sign(distanceToPlayer) || enemy.vx;
      enemy.x += enemy.vx * (1.1 + stage * 0.1);
      if (Math.abs(distanceToPlayer) < 62 && enemy.attackCooldown === 0) {
        enemy.attackCooldown = 72; enemy.attackTimer = 18; playSound(170, 0.12, "sawtooth", 0.07);
      }
    } else {
      const range = 70;
      enemy.x += enemy.vx * (1 + stage * 0.08);
      if (!home || enemy.x < enemy.homeX - range || enemy.x > enemy.homeX + range) enemy.vx *= -1;
    }
    if (home) enemy.y = Math.min(enemy.y, home.y - enemy.h);
    if (intersects(player, enemy) && player.invincible === 0) {
      if (player.vy > 0 && previousBottom <= enemy.y + 8) {
        enemy.defeated = true; enemy.defeatTimer = 24; player.vy = -8; playSound(260, 0.1, "square"); playSound(620, 0.15, "sine");
      } else damagePlayer();
    }
  }
  for (const hazard of hazards) {
    hazard.phase += 0.06;
    if (hazard.type === "orb" || hazard.type === "bubble") hazard.y = hazard.baseY + Math.sin(hazard.phase) * 35;
    if (hazard.type === "current") hazard.x += Math.sin(hazard.phase) * 1.5;
    if (hazard.type === "laser") hazard.y = hazard.baseY + Math.sin(hazard.phase) * 60;
    if (intersects(player, hazard) && player.invincible === 0) damagePlayer();
  }
  for (const shot of shots) {
    shot.x += shot.vx; shot.life--;
    for (const enemy of enemies) {
      if (!enemy.defeated && intersects(shot, enemy)) {
        enemy.defeated = true; shot.life = 0; playSound(180, 0.12, "square"); playSound(720, 0.16, "sine");
      }
    }
  }
  shots = shots.filter((shot) => shot.life > 0);
  enemies = enemies.filter((enemy) => !enemy.defeated || enemy.defeatTimer > 0);
  for (const coin of coins) if (!coin.taken && intersects(player, { x: coin.x - 12, y: coin.y - 12, w: 24, h: 24 })) {
    coin.taken = true; playSound(880, 0.1, "sine");
  }
  for (const item of healItems) if (!item.taken && player.health < 3 && intersects(player, { x: item.x - 14, y: item.y - 14, w: 28, h: 28 })) {
    item.taken = true; player.health++; playSound(660, 0.12, "sine", 0.1);
  }
  if (player.x > worldWidth - 130 && enemies.length === 0) {
    gameState = "won"; stopBgm(); playClearMusic();
    setMessage("クリア！", `コイン ${coins.filter((coin) => coin.taken).length} / ${coins.length}　|　次の冒険へ進もう`);
    document.querySelector("#next-stage-button").hidden = false;
  }
  camera += (Math.max(0, Math.min(player.x - WIDTH * 0.35, worldWidth - WIDTH)) - camera) * 0.1;
  coinCount.textContent = coins.filter((coin) => coin.taken).length;
  healthCount.textContent = "♥".repeat(player.health) + "♡".repeat(3 - player.health);
  distance.textContent = `${Math.max(0, Math.round((1 - player.x / (worldWidth - 100)) * 100))}%`;
}

function lose() {
  gameState = "lost";
  stopBgm();
  [392, 330, 262, 196].forEach((note, index) => setTimeout(() => playSound(note, 0.25, "triangle", 0.06), index * 130));
  gameoverOverlay.hidden = false;
  setMessage("ざんねん…", "障害物に気をつけて、ボタンでリスタート");
}

function damagePlayer() {
  player.health--;
  player.invincible = 70;
  player.vx = -player.facing * 4;
  playSound(110, 0.18, "sawtooth", 0.1);
  if (player.health <= 0) lose();
}

function attack() {
  if (gameState !== "playing" || player.attackCooldown > 0) return;
  player.attackCooldown = 18; player.attackTimer = 8;
  const hitbox = { x: player.facing > 0 ? player.x + player.w - 4 : player.x - 58, y: player.y + 3, w: 62, h: player.h - 6 };
  for (const enemy of enemies) if (!enemy.defeated && intersects(hitbox, enemy)) {
    enemy.defeated = true; enemy.defeatTimer = 24;
  }
  playSound(420, 0.08, "sawtooth", 0.1);
}

function playSound(frequency, duration, type, volume = 0.08) {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#b8e7f5"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save(); ctx.translate(-camera, 0);
  drawBackground();
  const theme = stageThemes[(stage - 1) % stageThemes.length];
  for (const platform of platforms) {
    ctx.fillStyle = theme.grass; ctx.fillRect(platform.x, platform.y, platform.w, 10);
    ctx.fillStyle = theme.ground; ctx.fillRect(platform.x, platform.y + 10, platform.w, platform.h - 10);
    ctx.fillStyle = theme.mist;
    for (let x = platform.x + 12; x < platform.x + platform.w; x += 38) ctx.fillRect(x, platform.y + 28, 16, 5);
  }
  for (const coin of coins) if (!coin.taken) {
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(coin.x, coin.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff1a8"; ctx.fillRect(coin.x - 2, coin.y - 7, 4, 14);
  }
  for (const item of healItems) if (!item.taken) {
    ctx.fillStyle = "#ff8fb3"; ctx.fillRect(item.x - 10, item.y - 5, 20, 10); ctx.fillRect(item.x - 5, item.y - 10, 10, 20);
    ctx.fillStyle = "#fff9d8"; ctx.fillRect(item.x - 3, item.y - 5, 6, 10); ctx.fillRect(item.x - 5, item.y - 3, 10, 6);
  }
  for (const enemy of enemies) {
    const defeated = enemy.defeated;
    ctx.save();
    if (defeated) { ctx.translate(enemy.x + 19, enemy.y + 38); ctx.scale(1.25, Math.max(.15, enemy.defeatTimer / 24)); ctx.translate(-enemy.x - 19, -enemy.y - 38); }
    ctx.fillStyle = "#050509"; ctx.fillRect(enemy.x + 9, enemy.y + 9, 20, 34);
    ctx.fillStyle = "#080812"; ctx.beginPath(); ctx.moveTo(enemy.x + 19, enemy.y); ctx.lineTo(enemy.x + 35, enemy.y + 16); ctx.lineTo(enemy.x + 19, enemy.y + 32); ctx.lineTo(enemy.x + 3, enemy.y + 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff325d"; ctx.fillRect(enemy.x + 10, enemy.y + 14, 6, 3); ctx.fillRect(enemy.x + 22, enemy.y + 14, 6, 3);
    ctx.fillStyle = "#ff325d"; ctx.fillRect(enemy.x + 14, enemy.y + 24, 10, 3);
    ctx.fillStyle = "#050509"; ctx.fillRect(enemy.x + 1, enemy.y + 23, 9, 20); ctx.fillRect(enemy.x + 29, enemy.y + 23, 9, 20);
    ctx.strokeStyle = "#ff325d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(enemy.x + 36, enemy.y + 25); ctx.lineTo(enemy.x + 56, enemy.y + 4); ctx.stroke();
    if (defeated) { ctx.fillStyle = theme.accent; ctx.font = "bold 20px sans-serif"; ctx.fillText("✦", enemy.x + 30, enemy.y - 16); }
    if (enemy.attackTimer > 0) { ctx.strokeStyle = "#fff9d8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(enemy.x + 37, enemy.y + 25, 22, -1.2, 1.2); ctx.stroke(); }
    ctx.restore();
  }
  for (const hazard of hazards) {
    ctx.fillStyle = theme.accent;
    if (hazard.type === "orb" || hazard.type === "bubble") { ctx.beginPath(); ctx.arc(hazard.x + 17, hazard.y + 25, 19, 0, Math.PI * 2); ctx.fill(); }
    else if (hazard.type === "laser") { ctx.fillRect(hazard.x, hazard.y, 34, 8); ctx.fillStyle = "#fff8e8"; ctx.fillRect(hazard.x + 8, hazard.y + 2, 18, 3); }
    else if (hazard.type === "current") { ctx.strokeStyle = theme.accent; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hazard.x, hazard.y + 24); ctx.quadraticCurveTo(hazard.x + 18, hazard.y, hazard.x + 36, hazard.y + 24); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(hazard.x + 21, hazard.y); ctx.lineTo(hazard.x + 42, hazard.y + 22); ctx.lineTo(hazard.x, hazard.y + 22); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "#fff8e8"; ctx.beginPath(); ctx.arc(hazard.x + 11, hazard.y + 19, 4, 0, Math.PI * 2); ctx.arc(hazard.x + 23, hazard.y + 19, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const shot of shots) {
    ctx.fillStyle = "#ff6b9a";
    ctx.beginPath(); ctx.arc(shot.x + 11, shot.y + 7, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff8e8"; ctx.fillRect(shot.x + 7, shot.y + 4, 4, 4);
  }
  ctx.fillStyle = "#171717"; ctx.fillRect(worldWidth - 110, 220, 7, 220);
  ctx.fillStyle = "#fff9d8"; ctx.beginPath(); ctx.moveTo(worldWidth - 103, 220); ctx.lineTo(worldWidth - 28, 244); ctx.lineTo(worldWidth - 103, 268); ctx.fill();
  drawBride(worldWidth - 94, 364);
  ctx.save();
  ctx.globalAlpha = player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0 ? 0.38 : 1;
  ctx.fillStyle = "#f3d21f"; ctx.fillRect(player.x + 8, player.y + 14, 24, 38);
  ctx.beginPath(); ctx.moveTo(player.x + 20, player.y - 6); ctx.lineTo(player.x + 38, player.y + 15); ctx.lineTo(player.x + 2, player.y + 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fffb9a"; ctx.fillRect(player.x + 13, player.y + 23, 14, 14);
  ctx.fillStyle = "#171717"; ctx.fillRect(player.x + 16, player.y + 27, 3, 3); ctx.fillRect(player.x + 22, player.y + 27, 3, 3);
  ctx.fillStyle = "#f3d21f"; ctx.fillRect(player.x, player.y + 25, 8, 18); ctx.fillRect(player.x + 32, player.y + 25, 8, 18);
  ctx.strokeStyle = "#fff9d8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(player.x + (player.facing > 0 ? 34 : 6), player.y + 29); ctx.lineTo(player.x + (player.facing > 0 ? 70 : -30), player.y + 1); ctx.stroke();
  ctx.restore();
  if (player.attackTimer > 0) {
    ctx.strokeStyle = "#f3d21f"; ctx.lineWidth = 5; ctx.beginPath();
    ctx.arc(player.x + (player.facing > 0 ? 38 : 2), player.y + 25, 22, player.facing > 0 ? -1.2 : 2.35, player.facing > 0 ? 1.2 : 3.95); ctx.stroke();
  }
  ctx.restore();
}

function drawBackground() {
  const theme = stageThemes[(stage - 1) % stageThemes.length];
  ctx.fillStyle = theme.sky; ctx.fillRect(0, 0, worldWidth, HEIGHT);
  ctx.fillStyle = "#3a1718";
  for (let x = 120; x < worldWidth; x += 520) {
    ctx.fillRect(x, 225, 250, 130);
    ctx.fillStyle = "#f3d21f"; ctx.globalAlpha = 0.45;
    for (let windowX = x + 28; windowX < x + 230; windowX += 42) ctx.fillRect(windowX, 250, 22, 58);
    ctx.globalAlpha = 1; ctx.fillStyle = "#3a1718";
  }
  ctx.fillStyle = "#d52b2b";
  for (let x = 60; x < worldWidth; x += 360) ctx.fillRect(x, 174, 8, 106);
  ctx.fillStyle = theme.mist;
  for (let x = -100; x < worldWidth; x += 240) {
    ctx.beginPath(); ctx.arc(x + 100, 420, 140, Math.PI, 0); ctx.fill();
  }

  function drawBride(x, y) {
    ctx.fillStyle = "#fff9d8";
    ctx.beginPath(); ctx.moveTo(x + 17, y + 12); ctx.lineTo(x - 10, y + 76); ctx.lineTo(x + 44, y + 76); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d52b2b"; ctx.fillRect(x + 5, y + 25, 24, 5);
    ctx.fillStyle = "#f3d21f"; ctx.fillRect(x + 12, y + 6, 10, 5);
    ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.7; ctx.fillRect(x - 1, y - 8, 36, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = "#171717"; ctx.fillRect(x + 11, y + 15, 4, 4); ctx.fillRect(x + 21, y + 15, 4, 4);
    ctx.fillStyle = "#d52b2b"; ctx.fillRect(x + 15, y + 21, 7, 3);
  }
  ctx.fillStyle = theme.accent;
  for (let x = 80; x < worldWidth; x += 370) { ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.arc(x, 100 + (x % 90), 5 + (stage % 3) * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#ffffff";
  for (let x = 150; x < worldWidth; x += 290) { ctx.beginPath(); ctx.arc(x, 170 + (x % 120), 2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 1, 170 + (x % 120) - 12, 2, 24); ctx.fillRect(x - 12, 170 + (x % 120) - 1, 24, 2); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.mist;
  for (let x = 180; x < worldWidth; x += 620) { ctx.fillRect(x, 210, 18, 230); ctx.beginPath(); ctx.arc(x + 9, 210, 45, Math.PI, 0); ctx.fill(); }
  if (theme.ocean) {
    ctx.strokeStyle = theme.accent; ctx.globalAlpha = 0.28; ctx.lineWidth = 3;
    for (let x = 100; x < worldWidth; x += 180) {
      ctx.beginPath(); ctx.arc(x, 300 + (x % 80), 45, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 65, 370, 18, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
window.addEventListener("keydown", (event) => {
  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
  if (["x", "X", "j", "J"].includes(event.key) && !event.repeat) attack();
  if ([" ", "ArrowUp", "w", "W"].includes(event.key) && !event.repeat) jumpRequested = true;
  if (!audioContext) playSound(1, 0.01, "sine");
  keys.add(event.key.toLowerCase());
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
restartButton.addEventListener("click", reset);
document.querySelector("#next-stage-button").addEventListener("click", () => { stage++; reset(); });
gameoverRestart.addEventListener("click", reset);
startButton.addEventListener("click", startGame);
reset(false);
loop();
