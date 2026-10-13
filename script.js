// ============================================================
// LOFI PONG — COMPLETE JAVASCRIPT
// Pong, CPU AI, abilities, keyboard/mouse controls,
// sound effects, and YouTube lo-fi music.
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

// ============================================================
// HTML ELEMENTS
// ============================================================

const playerScoreEl = document.getElementById("playerScore");
const cpuScoreEl = document.getElementById("cpuScore");
const targetScoreEl = document.getElementById("targetScore");

const startOverlay = document.getElementById("startOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const settingsOverlay = document.getElementById("settingsOverlay");
const endOverlay = document.getElementById("endOverlay");

const difficultySelect = document.getElementById("difficulty");
const winScoreSelect = document.getElementById("winScore");

const settingsDifficulty = document.getElementById("settingsDifficulty");
const settingsWinScore = document.getElementById("settingsWinScore");
const settingsControlMode = document.getElementById("settingsControlMode");

const dashButton = document.getElementById("dashButton");
const warpButton = document.getElementById("warpButton");
const chaosButton = document.getElementById("chaosButton");

const dashStatus = document.getElementById("dashStatus");
const warpStatus = document.getElementById("warpStatus");
const chaosStatus = document.getElementById("chaosStatus");

const howToPlayInfo = document.getElementById("howToPlayInfo");

const soundButton = document.getElementById("soundButton");
const pauseButton = document.getElementById("pauseButton");

const musicPlayButton = document.getElementById("musicPlayButton");
const previousTrackButton = document.getElementById("previousTrackButton");
const nextTrackButton = document.getElementById("nextTrackButton");
const musicVolume = document.getElementById("musicVolume");
const musicVolumeValue = document.getElementById("musicVolumeValue");
const trackName = document.getElementById("trackName");
const trackDescription = document.getElementById("trackDescription");
const musicVisualizer = document.getElementById("musicVisualizer");

// ============================================================
// GAME CONSTANTS
// ============================================================

const PADDLE_W = 13;
const PADDLE_H = 100;
const BALL_SIZE = 12;

// ============================================================
// GAME OBJECTS
// ============================================================

const player = {
    x: 35,
    y: H / 2 - PADDLE_H / 2,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: 440,
    dashTimer: 0
};

const rightPaddle = {
    x: W - 35 - PADDLE_W,
    y: H / 2 - PADDLE_H / 2,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: 330
};

const ball = {
    x: W / 2,
    y: H / 2,
    r: BALL_SIZE / 2,
    vx: 0,
    vy: 0,
    speed: 410,
    curve: 0,
    chaosTimer: 0,
    lastHit: ""
};

// ============================================================
// ABILITIES
// ============================================================

const abilities = {
    dash: {
        cooldown: 5,
        cooldownTimer: 0,
        duration: 0.45
    },

    warp: {
        cooldown: 9,
        cooldownTimer: 0,
        duration: 2.5,
        timer: 0
    },

    chaos: {
        cooldown: 10,
        cooldownTimer: 0,
        duration: 3
    }
};

// ============================================================
// GAME STATE
// ============================================================

const keys = {};

let playerScore = 0;
let cpuScore = 0;
let targetScore = 7;

let gameRunning = false;
let paused = false;
let gameOver = false;

let difficulty = "normal";
let controlMode = "keyboard";

let mouseY = H / 2;
let mouseInsideCanvas = false;

let lastTime = 0;
let animationFrame = null;

let soundEnabled = true;

let audioContext = null;
let masterGain = null;

// ============================================================
// CPU DIFFICULTIES
// ============================================================

const difficultySettings = {
    easy: {
        speed: 250,
        reaction: 0.68,
        error: 80
    },

    normal: {
        speed: 330,
        reaction: 0.82,
        error: 45
    },

    hard: {
        speed: 405,
        reaction: 0.92,
        error: 22
    },

    insane: {
        speed: 470,
        reaction: 1,
        error: 7
    }
};

// ============================================================
// GENERAL HELPERS
// ============================================================

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// ============================================================
// GAME AUDIO
// ============================================================

function createAudio() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return false;
        }

        if (!audioContext) {
            audioContext = new AudioContextClass();

            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.12;
            masterGain.connect(audioContext.destination);
        }

        if (audioContext.state === "suspended") {
            audioContext.resume().catch(() => {});
        }

        return true;
    } catch (error) {
        console.warn("Audio initialization failed:", error);
        return false;
    }
}

function playTone(
    frequency,
    duration = 0.08,
    type = "sine",
    volume = 0.3
) {
    if (!soundEnabled || !createAudio()) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = type;

        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );

        gain.gain.setValueAtTime(
            Math.max(0.0001, volume),
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        console.warn("Sound effect failed:", error);
    }
}

function playPaddleSound() {
    playTone(360, 0.07, "sine", 0.35);
}

function playWallSound() {
    playTone(240, 0.06, "triangle", 0.25);
}

function playScoreSound() {
    playTone(190, 0.16, "triangle", 0.35);

    setTimeout(() => {
        playTone(290, 0.18, "sine", 0.25);
    }, 100);
}

function playAbilitySound() {
    playTone(520, 0.08, "sine", 0.25);

    setTimeout(() => {
        playTone(760, 0.1, "sine", 0.2);
    }, 65);
}

function updateSoundButton() {
    soundButton.textContent = soundEnabled
        ? "♫ Sound: ON"
        : "♫ Sound: OFF";
}

soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    if (soundEnabled) {
        createAudio();
    }

    updateSoundButton();
});

// ============================================================
// YOUTUBE LO-FI MUSIC PLAYER
// ============================================================

// This is a newer stream ID. YouTube may still restrict playback.
const musicTracks = [
    {
        id: "rFZHOHl-L8A",
        name: "Lofi Hip Hop Radio",
        description: "Beats to relax and study to"
    }
];

let musicTrackIndex = 0;
let musicEnabled = false;
let youtubeMusicPlayer = null;
let youtubePlayerReady = false;
let youtubePlayRequested = false;

// Create the YouTube player without requiring HTML changes.
const youtubeContainer = document.createElement("div");

youtubeContainer.id = "youtubeMusicPlayer";
youtubeContainer.style.width = "240px";
youtubeContainer.style.height = "135px";
youtubeContainer.style.maxWidth = "100%";
youtubeContainer.style.margin = "12px auto";
youtubeContainer.style.borderRadius = "10px";
youtubeContainer.style.overflow = "hidden";

if (musicVisualizer && musicVisualizer.parentElement) {
    musicVisualizer.insertAdjacentElement(
        "afterend",
        youtubeContainer
    );
} else {
    document.body.appendChild(youtubeContainer);
}

function updateTrackDisplay() {
    const track = musicTracks[musicTrackIndex];

    trackName.textContent = track.name;
    trackDescription.textContent = track.description;
}

function updateMusicButton() {
    musicPlayButton.textContent = musicEnabled ? "Ⅱ" : "▶";

    musicPlayButton.title = musicEnabled
        ? "Pause music"
        : "Play music";

    musicVisualizer.classList.toggle(
        "playing",
        musicEnabled
    );
}

function updateMusicVolume() {
    const volume = Number(musicVolume.value);

    musicVolumeValue.textContent = `${volume}%`;

    if (youtubePlayerReady && youtubeMusicPlayer) {
        youtubeMusicPlayer.setVolume(volume);
    }
}

function onYouTubeIframeAPIReady() {
    if (youtubeMusicPlayer) return;

    youtubeMusicPlayer = new YT.Player(
        "youtubeMusicPlayer",
        {
            width: "240",
            height: "135",

            videoId: musicTracks[musicTrackIndex].id,

            playerVars: {
                autoplay: 0,
                controls: 1,
                playsinline: 1,
                rel: 0
            },

            events: {
                onReady: function (event) {
                    youtubePlayerReady = true;

                    event.target.setVolume(
                        Number(musicVolume.value)
                    );

                    updateTrackDisplay();
                    updateMusicButton();
                    updateMusicVolume();

                    if (youtubePlayRequested) {
                        event.target.playVideo();
                    }
                },

                onStateChange: function (event) {
                    if (event.data === YT.PlayerState.PLAYING) {
                        musicEnabled = true;
                    } else if (
                        event.data === YT.PlayerState.PAUSED ||
                        event.data === YT.PlayerState.ENDED
                    ) {
                        musicEnabled = false;
                    }

                    updateMusicButton();
                },

                onError: function (event) {
                    console.warn(
                        "YouTube playback error:",
                        event.data
                    );

                    trackDescription.textContent =
                        "YouTube could not play this stream. Try opening it on YouTube.";
                }
            }
        }
    );
}

function startMusic() {
    musicEnabled = true;
    youtubePlayRequested = true;

    updateMusicButton();

    if (youtubePlayerReady && youtubeMusicPlayer) {
        youtubeMusicPlayer.playVideo();
    } else {
        trackDescription.textContent =
            "Loading YouTube music player...";
    }
}

function stopMusic() {
    musicEnabled = false;
    youtubePlayRequested = false;

    if (youtubePlayerReady && youtubeMusicPlayer) {
        youtubeMusicPlayer.pauseVideo();
    }

    updateMusicButton();
}

function toggleMusic() {
    if (musicEnabled) {
        stopMusic();
    } else {
        startMusic();
    }
}

function changeTrack(direction) {
    musicTrackIndex =
        (musicTrackIndex + direction + musicTracks.length) %
        musicTracks.length;

    updateTrackDisplay();

    if (youtubePlayerReady && youtubeMusicPlayer) {
        youtubeMusicPlayer.loadVideoById(
            musicTracks[musicTrackIndex].id
        );

        if (!musicEnabled) {
            youtubeMusicPlayer.pauseVideo();
        }
    }
}

musicPlayButton.addEventListener("click", toggleMusic);

previousTrackButton.addEventListener("click", () => {
    changeTrack(-1);
});

nextTrackButton.addEventListener("click", () => {
    changeTrack(1);
});

musicVolume.addEventListener("input", updateMusicVolume);

// Set the callback before loading YouTube's API.
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

const youtubeApiScript = document.createElement("script");
youtubeApiScript.src = "https://www.youtube.com/iframe_api";
youtubeApiScript.async = true;

document.head.appendChild(youtubeApiScript);

// ============================================================
// CONTROL INSTRUCTIONS
// ============================================================

function updateControlInstructions() {
    if (controlMode === "mouse") {
        howToPlayInfo.innerHTML = `
            <b>Move:</b> Move your mouse over the game<br>
            <b>Dash:</b> Temporarily move faster<br>
            <b>Time Warp:</b> Slow the ball for a moment<br>
            <b>Chaos:</b> Give the ball a wild curve for 3 seconds<br>
            <b>Goal:</b> Get the ball past the CPU paddle
        `;
    } else {
        howToPlayInfo.innerHTML = `
            <b>Move:</b> W / S or arrow keys<br>
            <b>Dash:</b> Temporarily move faster<br>
            <b>Time Warp:</b> Slow the ball for a moment<br>
            <b>Chaos:</b> Give the ball a wild curve for 3 seconds<br>
            <b>Goal:</b> Get the ball past the CPU paddle
        `;
    }
}

// ============================================================
// SCORES AND SETTINGS
// ============================================================

function readSettings() {
    difficulty = difficultySelect.value;
    targetScore = Number(winScoreSelect.value) || 7;

    targetScoreEl.textContent = targetScore;

    playerScore = 0;
    cpuScore = 0;

    updateScores();
}

function updateScores() {
    playerScoreEl.textContent = playerScore;
    cpuScoreEl.textContent = cpuScore;
    targetScoreEl.textContent = targetScore;
}

// ============================================================
// RESET ABILITIES
// ============================================================

function resetAbilities() {
    for (const ability of Object.values(abilities)) {
        ability.cooldownTimer = 0;
    }

    abilities.warp.timer = 0;

    player.dashTimer = 0;

    ball.chaosTimer = 0;
    ball.curve = 0;

    updateAbilityUI();
}

function updateAbilityUI() {
    const items = [
        {
            data: abilities.dash,
            button: dashButton,
            status: dashStatus
        },
        {
            data: abilities.warp,
            button: warpButton,
            status: warpStatus
        },
        {
            data: abilities.chaos,
            button: chaosButton,
            status: chaosStatus
        }
    ];

    for (const item of items) {
        const remaining = item.data.cooldownTimer;
        const ready = remaining <= 0;

        item.button.disabled =
            !ready || !gameRunning || paused || gameOver;

        item.button.classList.toggle("cooling", !ready);

        item.status.textContent = ready
            ? "Ready"
            : `${remaining.toFixed(1)}s`;
    }
}

// ============================================================
// RESET BALL AND PADDLES
// ============================================================

function resetBall(direction = 1) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = 410;

    ball.curve = 0;
    ball.chaosTimer = 0;
    ball.lastHit = "";

    const angle = randomRange(-0.42, 0.42);

    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;
}

function resetPaddles() {
    player.y = H / 2 - player.h / 2;
    rightPaddle.y = H / 2 - rightPaddle.h / 2;

    player.dashTimer = 0;
    mouseY = H / 2;
}

function resetGameState() {
    playerScore = 0;
    cpuScore = 0;

    resetPaddles();
    resetBall(Math.random() < 0.5 ? -1 : 1);
    resetAbilities();

    updateScores();
}

// ============================================================
// START, PAUSE, RESUME AND RESTART
// ============================================================

function startGame() {
    readSettings();

    paused = false;
    gameOver = false;
    gameRunning = true;

    resetGameState();

    startOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    settingsOverlay.classList.add("hidden");
    endOverlay.classList.add("hidden");

    pauseButton.textContent = "Ⅱ Pause";

    createAudio();

    lastTime = performance.now();

    if (animationFrame === null) {
        animationFrame = requestAnimationFrame(gameLoop);
    }

    updateAbilityUI();
}

function restartGame() {
    startGame();
}

function pauseGame() {
    if (!gameRunning || gameOver || paused) return;

    paused = true;

    pauseOverlay.classList.remove("hidden");
    pauseButton.textContent = "▶ Resume";

    updateAbilityUI();
}

function resumeGame() {
    if (!gameRunning || gameOver) return;

    paused = false;

    pauseOverlay.classList.add("hidden");
    settingsOverlay.classList.add("hidden");

    pauseButton.textContent = "Ⅱ Pause";

    lastTime = performance.now();

    updateAbilityUI();
}

function showMainMenu() {
    gameRunning = false;
    paused = false;
    gameOver = false;

    startOverlay.classList.remove("hidden");
    pauseOverlay.classList.add("hidden");
    settingsOverlay.classList.add("hidden");
    endOverlay.classList.add("hidden");

    pauseButton.textContent = "Ⅱ Pause";

    updateAbilityUI();
}

// ============================================================
// END GAME AND SCORING
// ============================================================

function endGame(playerWon) {
    gameOver = true;
    gameRunning = false;
    paused = false;

    endOverlay.classList.remove("hidden");
    pauseOverlay.classList.add("hidden");

    const endTitle = document.getElementById("endTitle");
    const endMessage = document.getElementById("endMessage");
    const finalScore = document.getElementById("finalScore");

    endTitle.innerHTML = playerWon
        ? 'NICE <span>GAME</span>'
        : 'GOOD <span>TRY</span>';

    endMessage.textContent = playerWon
        ? "You outplayed the CPU. Time for another round?"
        : "The CPU takes this round. You can get it next time.";

    finalScore.textContent = `${playerScore} - ${cpuScore}`;

    playTone(playerWon ? 660 : 220, 0.3, "sine", 0.3);

    updateAbilityUI();
}

function scorePoint(scorer) {
    if (scorer === "player") {
        playerScore++;
        playScoreSound();
    } else {
        cpuScore++;
        playScoreSound();
    }

    updateScores();

    if (playerScore >= targetScore || cpuScore >= targetScore) {
        endGame(playerScore >= targetScore);
        return;
    }

    resetPaddles();
    resetAbilities();

    resetBall(scorer === "player" ? 1 : -1);
}

// ============================================================
// ABILITY ACTIVATION
// ============================================================

function activateDash() {
    const ability = abilities.dash;

    if (
        !gameRunning ||
        paused ||
        gameOver ||
        ability.cooldownTimer > 0
    ) return;

    player.dashTimer = ability.duration;
    ability.cooldownTimer = ability.cooldown;

    playAbilitySound();
    updateAbilityUI();
}

function activateWarp() {
    const ability = abilities.warp;

    if (
        !gameRunning ||
        paused ||
        gameOver ||
        ability.cooldownTimer > 0
    ) return;

    ability.timer = ability.duration;
    ability.cooldownTimer = ability.cooldown;

    playAbilitySound();
    updateAbilityUI();
}

function activateChaos() {
    const ability = abilities.chaos;

    if (
        !gameRunning ||
        paused ||
        gameOver ||
        ability.cooldownTimer > 0
    ) return;

    ball.chaosTimer = ability.duration;
    ball.curve = randomRange(-0.12, 0.12);

    ability.cooldownTimer = ability.cooldown;

    playAbilitySound();
    updateAbilityUI();
}

// ============================================================
// PLAYER MOVEMENT
// ============================================================

function movePlayerKeyboard(delta) {
    let direction = 0;

    if (keys["w"] || keys["arrowup"]) direction -= 1;
    if (keys["s"] || keys["arrowdown"]) direction += 1;

    let speed = player.speed;

    if (player.dashTimer > 0) {
        speed *= 2.1;
    }

    player.y += direction * speed * delta;
}

function movePlayerMouse() {
    const rect = canvas.getBoundingClientRect();

    if (!rect.height) return;

    const scaleY = H / rect.height;
    const canvasMouseY = (mouseY - rect.top) * scaleY;

    player.y = canvasMouseY - player.h / 2;
}

function updatePlayer(delta) {
    if (controlMode === "mouse") {
        movePlayerMouse();
    } else {
        movePlayerKeyboard(delta);
    }

    player.y = clamp(player.y, 0, H - player.h);

    if (player.dashTimer > 0) {
        player.dashTimer -= delta;

        if (player.dashTimer < 0) {
            player.dashTimer = 0;
        }
    }
}

// ============================================================
// CPU MOVEMENT
// ============================================================

function predictBallY() {
    if (ball.vx <= 0) return ball.y;

    const distance = rightPaddle.x - ball.x;
    const timeToPaddle = distance / Math.max(1, ball.vx);

    let predictedY = ball.y + ball.vy * timeToPaddle;

    while (predictedY < ball.r || predictedY > H - ball.r) {
        if (predictedY < ball.r) {
            predictedY = ball.r + (ball.r - predictedY);
        }

        if (predictedY > H - ball.r) {
            predictedY =
                H - ball.r - (predictedY - (H - ball.r));
        }
    }

    return predictedY;
}

function updateCPU(delta) {
    const settings =
        difficultySettings[difficulty] ||
        difficultySettings.normal;

    rightPaddle.speed = settings.speed;

    let targetY;

    if (ball.vx > 0) {
        targetY = predictBallY();
    } else {
        targetY = H / 2 + randomRange(
            -settings.error,
            settings.error
        );
    }

    targetY +=
        randomRange(-settings.error, settings.error) *
        (1 - settings.reaction);

    targetY -= rightPaddle.h / 2;

    const difference = targetY - rightPaddle.y;
    const maxMove = rightPaddle.speed * delta;

    rightPaddle.y += clamp(
        difference * settings.reaction,
        -maxMove,
        maxMove
    );

    rightPaddle.y = clamp(
        rightPaddle.y,
        0,
        H - rightPaddle.h
    );
}

// ============================================================
// COLLISION DETECTION
// ============================================================

function checkPaddleCollision(paddle, isPlayer) {
    const overlapsX =
        ball.x + ball.r > paddle.x &&
        ball.x - ball.r < paddle.x + paddle.w;

    const overlapsY =
        ball.y + ball.r > paddle.y &&
        ball.y - ball.r < paddle.y + paddle.h;

    if (!overlapsX || !overlapsY) return;

    if (isPlayer && ball.vx >= 0) return;
    if (!isPlayer && ball.vx <= 0) return;

    if (isPlayer) {
        ball.x = paddle.x + paddle.w + ball.r;
        ball.lastHit = "player";
    } else {
        ball.x = paddle.x - ball.r;
        ball.lastHit = "cpu";
    }

    const paddleCenter = paddle.y + paddle.h / 2;

    const hitOffset =
        (ball.y - paddleCenter) / (paddle.h / 2);

    const angle = hitOffset * 0.95;

    ball.speed = Math.min(ball.speed + 18, 690);

    const direction = isPlayer ? 1 : -1;

    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;

    ball.vy += isPlayer ? 0 : randomRange(-15, 15);

    playPaddleSound();
}

// ============================================================
// BALL PHYSICS
// ============================================================

function updateBall(delta) {
    let speedMultiplier = 1;

    if (abilities.warp.timer > 0) {
        speedMultiplier = 0.55;
        abilities.warp.timer -= delta;

        if (abilities.warp.timer < 0) {
            abilities.warp.timer = 0;
        }
    }

    const dx = ball.vx * speedMultiplier * delta;
    const dy = ball.vy * speedMultiplier * delta;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(distance / 2));

    for (let i = 0; i < steps; i++) {
        ball.x += dx / steps;
        ball.y += dy / steps;

        if (ball.y - ball.r <= 0) {
            ball.y = ball.r;
            ball.vy = Math.abs(ball.vy);
            playWallSound();
        }

        if (ball.y + ball.r >= H) {
            ball.y = H - ball.r;
            ball.vy = -Math.abs(ball.vy);
            playWallSound();
        }

        checkPaddleCollision(player, true);
        checkPaddleCollision(rightPaddle, false);

        if (ball.x + ball.r < 0) {
            scorePoint("cpu");
            return;
        }

        if (ball.x - ball.r > W) {
            scorePoint("player");
            return;
        }
    }

    if (ball.chaosTimer > 0) {
        ball.chaosTimer -= delta;
        ball.vy += ball.curve * delta * 1000;

        const maxVerticalSpeed = ball.speed * 1.35;

        ball.vy = clamp(
            ball.vy,
            -maxVerticalSpeed,
            maxVerticalSpeed
        );

        if (ball.chaosTimer <= 0) {
            ball.chaosTimer = 0;
            ball.curve = 0;
        }
    }

    const currentSpeed = Math.sqrt(
        ball.vx * ball.vx + ball.vy * ball.vy
    );

    if (currentSpeed > 0) {
        ball.vx = (ball.vx / currentSpeed) * ball.speed;
        ball.vy = (ball.vy / currentSpeed) * ball.speed;
    }
}

// ============================================================
// ABILITY COOLDOWNS
// ============================================================

function updateCooldowns(delta) {
    for (const ability of Object.values(abilities)) {
        if (ability.cooldownTimer > 0) {
            ability.cooldownTimer -= delta;

            if (ability.cooldownTimer < 0) {
                ability.cooldownTimer = 0;
            }
        }
    }

    updateAbilityUI();
}

// ============================================================
// DRAWING
// ============================================================

function drawBackground() {
    ctx.fillStyle = "#101320";
    ctx.fillRect(0, 0, W, H);

    const gradient = ctx.createRadialGradient(
        W / 2,
        H / 2,
        20,
        W / 2,
        H / 2,
        W * 0.65
    );

    gradient.addColorStop(0, "#1b2036");
    gradient.addColorStop(1, "#101320");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.save();

    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = "#45415f";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = "#87d7ff12";
    ctx.fillRect(0, 0, W / 2, H);

    ctx.fillStyle = "#ff91c808";
    ctx.fillRect(W / 2, 0, W / 2, H);
}

function drawPaddle(paddle, color) {
    ctx.save();

    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;

    ctx.beginPath();

    ctx.roundRect(
        paddle.x,
        paddle.y,
        paddle.w,
        paddle.h,
        6
    );

    ctx.fill();
    ctx.restore();
}

function drawBall() {
    ctx.save();

    ctx.shadowColor =
        ball.chaosTimer > 0 ? "#b5a0ff" : "#ffffff";

    ctx.shadowBlur =
        ball.chaosTimer > 0 ? 25 : 15;

    ctx.fillStyle =
        ball.chaosTimer > 0 ? "#b5a0ff" : "#ffffff";

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function draw() {
    drawBackground();

    drawPaddle(player, "#87d7ff");
    drawPaddle(rightPaddle, "#ff91c8");

    drawBall();

    if (controlMode === "mouse" && gameRunning && !paused && !gameOver) {
        ctx.save();

        ctx.strokeStyle = "#87d7ff35";
        ctx.setLineDash([4, 8]);

        ctx.beginPath();
        ctx.moveTo(0, player.y + player.h / 2);
        ctx.lineTo(W, player.y + player.h / 2);
        ctx.stroke();

        ctx.restore();
    }
}

// ============================================================
// MAIN GAME LOOP
// ============================================================

function gameLoop(timestamp) {
    animationFrame = null;

    const delta = Math.min(
        (timestamp - lastTime) / 1000 || 0,
        0.035
    );

    lastTime = timestamp;

    if (gameRunning && !paused && !gameOver) {
        updatePlayer(delta);
        updateCPU(delta);
        updateBall(delta);
        updateCooldowns(delta);
    }

    draw();

    animationFrame = requestAnimationFrame(gameLoop);
}

// ============================================================
// SETTINGS
// ============================================================

function openSettings() {
    settingsDifficulty.value = difficultySelect.value;
    settingsWinScore.value = winScoreSelect.value;
    settingsControlMode.value = controlMode;

    settingsOverlay.classList.remove("hidden");
}

function saveSettings() {
    const wasRunning = gameRunning;

    difficultySelect.value = settingsDifficulty.value;
    winScoreSelect.value = settingsWinScore.value;

    difficulty = settingsDifficulty.value;
    controlMode = settingsControlMode.value;

    updateControlInstructions();

    if (wasRunning) {
        targetScore = Number(winScoreSelect.value) || 7;
        targetScoreEl.textContent = targetScore;
    }

    settingsOverlay.classList.add("hidden");

    if (paused) {
        pauseOverlay.classList.remove("hidden");
    }

    updateAbilityUI();
}

function closeSettings() {
    settingsOverlay.classList.add("hidden");

    if (paused) {
        pauseOverlay.classList.remove("hidden");
    }
}

// ============================================================
// MOUSE CONTROLS
// ============================================================

function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();

    mouseY = event.clientY;

    mouseInsideCanvas =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
}

canvas.addEventListener("pointermove", updateMousePosition);
canvas.addEventListener("pointerenter", updateMousePosition);

canvas.addEventListener("pointerleave", () => {
    mouseInsideCanvas = false;
});

// ============================================================
// KEYBOARD INPUT
// ============================================================

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (
        key === "arrowup" ||
        key === "arrowdown" ||
        key === " "
    ) {
        event.preventDefault();
    }

    keys[key] = true;

    if (event.repeat) return;

    if (key === "escape") {
        if (!settingsOverlay.classList.contains("hidden")) {
            closeSettings();
        } else if (paused) {
            resumeGame();
        } else {
            pauseGame();
        }

        return;
    }

    if (key === "1") activateDash();
    if (key === "2") activateWarp();
    if (key === "3") activateChaos();
});

document.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    for (const key of Object.keys(keys)) {
        keys[key] = false;
    }
});

// ============================================================
// BUTTON LISTENERS
// ============================================================

document.getElementById("startButton").addEventListener(
    "click",
    startGame
);

pauseButton.addEventListener("click", () => {
    if (paused) {
        resumeGame();
    } else {
        pauseGame();
    }
});

document.getElementById("resumeButton").addEventListener(
    "click",
    resumeGame
);

document.getElementById("restartButton").addEventListener(
    "click",
    restartGame
);

document.getElementById("pauseMenuButton").addEventListener(
    "click",
    showMainMenu
);

document.getElementById("playAgainButton").addEventListener(
    "click",
    startGame
);

document.getElementById("endMenuButton").addEventListener(
    "click",
    showMainMenu
);

document.getElementById("settingsButton").addEventListener(
    "click",
    openSettings
);

document.getElementById("saveSettingsButton").addEventListener(
    "click",
    saveSettings
);

document.getElementById("closeSettingsButton").addEventListener(
    "click",
    closeSettings
);

dashButton.addEventListener("click", activateDash);
warpButton.addEventListener("click", activateWarp);
chaosButton.addEventListener("click", activateChaos);

// ============================================================
// SETTINGS CHANGE LISTENERS
// ============================================================

difficultySelect.addEventListener("change", () => {
    settingsDifficulty.value = difficultySelect.value;
});

winScoreSelect.addEventListener("change", () => {
    settingsWinScore.value = winScoreSelect.value;
});

// ============================================================
// INITIALIZATION
// ============================================================

function initializeGame() {
    readSettings();

    controlMode = "keyboard";
    settingsControlMode.value = controlMode;

    updateControlInstructions();
    updateSoundButton();

    updateTrackDisplay();
    updateMusicButton();
    updateMusicVolume();

    updateAbilityUI();

    resetPaddles();
    resetBall(1);

    draw();

    lastTime = performance.now();

    animationFrame = requestAnimationFrame(gameLoop);
}

initializeGame();
