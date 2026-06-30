// ─── Grenade Trajectory Minigame Module ──────────────────────────────────────

let grenadeGameRunning = false;
let grenadeRoundTransitioning = false;
let grenadeLaunchCount = 0;
let grenadeScoreTotal = 0;
let grenadeBestLaunchScore = 0;
let grenadeDistances = [];
let grenadeActive = false;
let grenadeX = 0;
let grenadeY = 0;
let grenadeVx = 0;
let grenadeVy = 0;
const grenadeRadius = 8;
const grenadeElasticity = 0.65;
let grenadeBounces = 0;
let grenadeTrail = [];
let grenadeObstacles = [];
let grenadeTarget = { x: 480, y: 320, r: 25 };
const grenadeLaunchOrigin = { x: 50, y: 330 };
let grenadeTimer = 0;

let grenadeDragging = false;
let grenadeDragStart = { x: 0, y: 0 };
let grenadeDragCurrent = { x: 0, y: 0 };

let explosionActive = false;
let explosionX = 0;
let explosionY = 0;
let explosionRadius = 0;
let explosionMaxRadius = 60;
let explosionParticles = [];

let grenadeCanvas = null;
let grenadeCtx = null;
let grenadeAnimFrameId = null;

function playPinPullSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(1000, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.15);
        
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.15);
    } catch(e) {}
}

function playGrenadeBounceSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
}

function playGrenadeExplosionSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.8);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noiseNode.start();
        noiseNode.stop(ctx.currentTime + 0.8);
    } catch(e) {}
}

function startGrenadeTrainerMenu() {
    stopAllMinigames();
    document.getElementById("minigamesMenu").style.display = "none";
    document.getElementById("grenadeTrainerGame").style.display = "block";
    document.getElementById("grenadeTrainerSetup").style.display = "block";
    document.getElementById("grenadeTrainerPlayground").style.display = "none";
    document.getElementById("grenadeGameOver").style.display = "none";
    
    const localHighScore = parseInt(localStorage.getItem("grenade_highscore") || "0");
    document.getElementById("grenadeGameHighScore").innerText = localHighScore;
}

function startGrenadeGame() {
    stopAllMinigames();
    grenadeGameRunning = true;
    grenadeRoundTransitioning = false;
    grenadeLaunchCount = 1;
    grenadeScoreTotal = 0;
    grenadeBestLaunchScore = 0;
    grenadeDistances = [];
    grenadeActive = false;
    explosionActive = false;
    grenadeTrail = [];
    
    document.getElementById("grenadeTrainerSetup").style.display = "none";
    document.getElementById("grenadeGameOver").style.display = "none";
    document.getElementById("grenadeTrainerPlayground").style.display = "block";
    
    document.getElementById("grenadeLaunchCount").innerText = "1 / 5";
    document.getElementById("grenadeLastDist").innerText = "0 m";
    document.getElementById("grenadeLiveScore").innerText = "0 pts";
    
    document.getElementById("grenadeInstructionOverlay").style.opacity = "1";
    
    grenadeCanvas = document.getElementById("grenadeCanvas");
    grenadeCtx = grenadeCanvas.getContext("2d");
    
    grenadeCanvas.removeEventListener("mousedown", handleGrenadeMouseDown);
    window.removeEventListener("mousemove", handleGrenadeMouseMove);
    window.removeEventListener("mouseup", handleGrenadeMouseUp);
    
    grenadeCanvas.removeEventListener("touchstart", handleGrenadeTouchStart);
    window.removeEventListener("touchmove", handleGrenadeTouchMove);
    window.removeEventListener("touchend", handleGrenadeTouchEnd);
    
    grenadeCanvas.addEventListener("mousedown", handleGrenadeMouseDown);
    window.addEventListener("mousemove", handleGrenadeMouseMove);
    window.addEventListener("mouseup", handleGrenadeMouseUp);
    
    grenadeCanvas.addEventListener("touchstart", handleGrenadeTouchStart, { passive: true });
    window.addEventListener("touchmove", handleGrenadeTouchMove, { passive: true });
    window.addEventListener("touchend", handleGrenadeTouchEnd, { passive: true });
    
    generateGrenadeLayout(1);
    
    if (grenadeAnimFrameId) cancelAnimationFrame(grenadeAnimFrameId);
    grenadeAnimFrameId = requestAnimationFrame(grenadeGameLoop);
}

function generateGrenadeLayout(round) {
    grenadeObstacles = [];
    if (round === 1) {
        grenadeObstacles.push({ x: 270, y: 160, w: 40, h: 220 });
        grenadeTarget = { x: 480, y: 330, r: 25 };
    } else if (round === 2) {
        grenadeObstacles.push({ x: 220, y: 0, w: 100, h: 180 });
        grenadeObstacles.push({ x: 380, y: 260, w: 50, h: 120 });
        grenadeTarget = { x: 500, y: 340, r: 25 };
    } else if (round === 3) {
        grenadeObstacles.push({ x: 260, y: 0, w: 40, h: 140 });
        grenadeObstacles.push({ x: 260, y: 240, w: 40, h: 140 });
        grenadeTarget = { x: 490, y: 340, r: 25 };
    } else if (round === 4) {
        grenadeObstacles.push({ x: 240, y: 120, w: 60, h: 260 });
        grenadeTarget = { x: 460, y: 340, r: 25 };
    } else {
        grenadeObstacles.push({ x: 220, y: 220, w: 50, h: 160 });
        grenadeObstacles.push({ x: 360, y: 0, w: 60, h: 180 });
        grenadeTarget = { x: 520, y: 340, r: 25 };
    }
    grenadeActive = false;
    explosionActive = false;
    grenadeTrail = [];
}

function getCanvasMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function handleGrenadeMouseDown(e) {
    if (!grenadeGameRunning || grenadeActive || explosionActive || grenadeRoundTransitioning) return;
    const pos = getCanvasMousePos(grenadeCanvas, e);
    grenadeDragging = true;
    grenadeDragStart = pos;
    grenadeDragCurrent = pos;
    
    document.getElementById("grenadeInstructionOverlay").style.opacity = "0";
}

function handleGrenadeMouseMove(e) {
    if (!grenadeDragging) return;
    grenadeDragCurrent = getCanvasMousePos(grenadeCanvas, e);
}

function handleGrenadeMouseUp(e) {
    if (!grenadeDragging) return;
    grenadeDragging = false;
    
    const dx = grenadeDragStart.x - grenadeDragCurrent.x;
    const dy = grenadeDragStart.y - grenadeDragCurrent.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 15) {
        document.getElementById("grenadeInstructionOverlay").style.opacity = "0";
        
        grenadeActive = true;
        grenadeX = grenadeLaunchOrigin.x;
        grenadeY = grenadeLaunchOrigin.y;
        
        const maxForce = 150;
        const angle = Math.atan2(dy, dx);
        const force = Math.min(dist, maxForce);
        const speed = force * 0.13;
        
        grenadeVx = Math.cos(angle) * speed;
        grenadeVy = Math.sin(angle) * speed;
        
        grenadeBounces = 0;
        grenadeTrail = [];
        grenadeTimer = 0;
        
        playPinPullSound();
    }
}

function handleGrenadeTouchStart(e) {
    handleGrenadeMouseDown(e);
}
function handleGrenadeTouchMove(e) {
    handleGrenadeMouseMove(e);
}
function handleGrenadeTouchEnd(e) {
    handleGrenadeMouseUp(e);
}

function updateGrenadePhysics() {
    if (!grenadeActive) return;
    
    grenadeTimer++;
    if (grenadeTimer % 2 === 0) {
        grenadeTrail.push({ x: grenadeX, y: grenadeY });
        if (grenadeTrail.length > 50) grenadeTrail.shift();
    }
    
    grenadeVy += 0.22;
    grenadeVx *= 0.995;
    grenadeVy *= 0.995;
    
    grenadeX += grenadeVx;
    grenadeY += grenadeVy;
    
    const r = grenadeRadius;
    const w = grenadeCanvas.width;
    const h = grenadeCanvas.height;
    
    let hitBorder = false;
    if (grenadeX <= r) {
        grenadeX = r;
        grenadeVx = -grenadeVx * grenadeElasticity;
        hitBorder = true;
    } else if (grenadeX >= w - r) {
        grenadeX = w - r;
        grenadeVx = -grenadeVx * grenadeElasticity;
        hitBorder = true;
    }
    
    if (grenadeY <= r) {
        grenadeY = r;
        grenadeVy = -grenadeVy * grenadeElasticity;
        hitBorder = true;
    } else if (grenadeY >= h - r) {
        grenadeY = h - r;
        grenadeVy = -grenadeVy * grenadeElasticity;
        hitBorder = true;
    }
    
    if (hitBorder) {
        grenadeBounces++;
        playGrenadeBounceSound();
    }
    
    for (const obs of grenadeObstacles) {
        const closestX = Math.max(obs.x, Math.min(grenadeX, obs.x + obs.w));
        const closestY = Math.max(obs.y, Math.min(grenadeY, obs.y + obs.h));
        
        const distDx = grenadeX - closestX;
        const distDy = grenadeY - closestY;
        const distSq = distDx * distDx + distDy * distDy;
        
        if (distSq < r * r) {
            const overlapX = (obs.w / 2) + r - Math.abs(grenadeX - (obs.x + obs.w / 2));
            const overlapY = (obs.h / 2) + r - Math.abs(grenadeY - (obs.y + obs.h / 2));
            
            if (overlapX < overlapY) {
                grenadeVx = -grenadeVx * grenadeElasticity;
                grenadeX = (grenadeX > obs.x + obs.w / 2) ? obs.x + obs.w + r : obs.x - r;
            } else {
                grenadeVy = -grenadeVy * grenadeElasticity;
                grenadeY = (grenadeY > obs.y + obs.h / 2) ? obs.y + obs.h + r : obs.y - r;
            }
            
            grenadeBounces++;
            playGrenadeBounceSound();
            break;
        }
    }
    
    if (grenadeBounces >= 4 || grenadeTimer >= 150) {
        triggerGrenadeExplosion();
    }
}

function triggerGrenadeExplosion() {
    grenadeRoundTransitioning = true;
    grenadeActive = false;
    explosionActive = true;
    explosionX = grenadeX;
    explosionY = grenadeY;
    explosionRadius = 0;
    
    playGrenadeExplosionSound();
    
    explosionParticles = [];
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        explosionParticles.push({
            x: grenadeX,
            y: grenadeY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.04,
            color: `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
        });
    }
    
    const distToTarget = Math.hypot(grenadeX - grenadeTarget.x, grenadeY - grenadeTarget.y);
    const pixelToMeter = 0.15;
    const distInMeters = (distToTarget * pixelToMeter).toFixed(1);
    
    let points = 0;
    if (distToTarget < grenadeTarget.r) {
        points = Math.round(1000 * (1 - distToTarget / (grenadeTarget.r * 2)));
        points = Math.max(600, points);
    } else if (distToTarget < 85) {
        points = Math.round(500 * (1 - (distToTarget - grenadeTarget.r) / 85));
        points = Math.max(50, points);
    }
    
    grenadeScoreTotal += points;
    if (points > grenadeBestLaunchScore) {
        grenadeBestLaunchScore = points;
    }
    grenadeDistances.push(parseFloat(distInMeters));
    
    document.getElementById("grenadeLastDist").innerText = `${distInMeters} m`;
    document.getElementById("grenadeLiveScore").innerText = `${grenadeScoreTotal} pts`;
    
    setTimeout(() => {
        if (!grenadeGameRunning) return;
        
        if (grenadeLaunchCount >= 5) {
            stopGrenadeGame(true);
        } else {
            grenadeRoundTransitioning = false;
            grenadeLaunchCount++;
            document.getElementById("grenadeLaunchCount").innerText = `${grenadeLaunchCount} / 5`;
            generateGrenadeLayout(grenadeLaunchCount);
        }
    }, 1800);
}

function stopGrenadeGame(finished) {
    grenadeGameRunning = false;
    grenadeRoundTransitioning = false;
    grenadeActive = false;
    explosionActive = false;
    
    if (grenadeAnimFrameId) {
        cancelAnimationFrame(grenadeAnimFrameId);
        grenadeAnimFrameId = null;
    }
    
    if (grenadeCanvas) {
        grenadeCanvas.removeEventListener("mousedown", handleGrenadeMouseDown);
        window.removeEventListener("mousemove", handleGrenadeMouseMove);
        window.removeEventListener("mouseup", handleGrenadeMouseUp);
        grenadeCanvas.removeEventListener("touchstart", handleGrenadeTouchStart);
        window.removeEventListener("touchmove", handleGrenadeTouchMove);
        window.removeEventListener("touchend", handleGrenadeTouchEnd);
    }
    
    if (finished) {
        let sumDist = 0;
        grenadeDistances.forEach(d => sumDist += d);
        const avgDist = (grenadeDistances.length > 0 ? (sumDist / grenadeDistances.length) : 0).toFixed(1);
        
        document.getElementById("grenadeEndScore").innerText = `${grenadeScoreTotal} pts`;
        document.getElementById("grenadeBestLaunch").innerText = `${grenadeBestLaunchScore} pts`;
        document.getElementById("grenadeAvgDist").innerText = `${avgDist} m`;
        
        document.getElementById("grenadeTrainerPlayground").style.display = "none";
        document.getElementById("grenadeGameOver").style.display = "block";
        
        const oldScore = parseInt(localStorage.getItem("grenade_highscore") || "0");
        let isNewHighScore = false;
        if (grenadeScoreTotal > oldScore) {
            localStorage.setItem("grenade_highscore", grenadeScoreTotal);
            document.getElementById("grenadeGameHighScore").innerText = grenadeScoreTotal;
            isNewHighScore = true;
        }
        
        const flash = document.getElementById("newGrenadeHighScoreFlash");
        if (isNewHighScore) {
            flash.style.display = "block";
            playSuccessSound();
        } else {
            flash.style.display = "none";
        }
        
        const auth = JSON.parse(localStorage.getItem("urban_auth") || "null");
        if (auth && auth.session_token) {
            fetch(`${API_URL}/update-minigame-highscore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: auth.username,
                    session_token: auth.session_token,
                    game_type: "grenade",
                    highscore: grenadeScoreTotal
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok" && data.updated) {
                    localStorage.setItem("grenade_highscore", data.highscore);
                    document.getElementById("grenadeGameHighScore").innerText = data.highscore;
                    flash.style.display = "block";
                }
            })
            .catch(err => console.error("Erro ao salvar recorde no banco:", err));
        }
    }
}

function drawGrenadePreview() {
    if (!grenadeDragging) return;
    
    const dx = grenadeDragStart.x - grenadeDragCurrent.x;
    const dy = grenadeDragStart.y - grenadeDragCurrent.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 15) return;
    
    const maxForce = 150;
    const angle = Math.atan2(dy, dx);
    const force = Math.min(dist, maxForce);
    const speed = force * 0.13;
    
    let tempVx = Math.cos(angle) * speed;
    let tempVy = Math.sin(angle) * speed;
    
    let tempX = grenadeLaunchOrigin.x;
    let tempY = grenadeLaunchOrigin.y;
    
    grenadeCtx.save();
    grenadeCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    grenadeCtx.lineWidth = 2;
    grenadeCtx.setLineDash([4, 6]);
    grenadeCtx.beginPath();
    grenadeCtx.moveTo(tempX, tempY);
    
    for (let step = 0; step < 60; step++) {
        tempVy += 0.22;
        tempVx *= 0.995;
        tempVy *= 0.995;
        
        tempX += tempVx;
        tempY += tempVy;
        
        if (tempX < 0 || tempX > grenadeCanvas.width || tempY < 0 || tempY > grenadeCanvas.height) {
            grenadeCtx.lineTo(tempX, tempY);
            break;
        }
        
        let hitObstacle = false;
        for (const obs of grenadeObstacles) {
            if (tempX >= obs.x && tempX <= obs.x + obs.w && tempY >= obs.y && tempY <= obs.y + obs.h) {
                hitObstacle = true;
                break;
            }
        }
        if (hitObstacle) {
            grenadeCtx.lineTo(tempX, tempY);
            break;
        }
        
        grenadeCtx.lineTo(tempX, tempY);
    }
    grenadeCtx.stroke();
    grenadeCtx.restore();
    
    grenadeCtx.save();
    grenadeCtx.strokeStyle = "rgba(255, 85, 0, 0.5)";
    grenadeCtx.lineWidth = 3;
    grenadeCtx.beginPath();
    grenadeCtx.moveTo(grenadeLaunchOrigin.x, grenadeLaunchOrigin.y);
    grenadeCtx.lineTo(grenadeLaunchOrigin.x - Math.cos(angle) * force * 0.5, grenadeLaunchOrigin.y - Math.sin(angle) * force * 0.5);
    grenadeCtx.stroke();
    
    grenadeCtx.fillStyle = "#ffaa00";
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeLaunchOrigin.x - Math.cos(angle) * force * 0.5, grenadeLaunchOrigin.y - Math.sin(angle) * force * 0.5, 6, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.restore();
}

function grenadeGameLoop() {
    if (!grenadeGameRunning) return;
    
    updateGrenadePhysics();
    
    grenadeCtx.clearRect(0, 0, grenadeCanvas.width, grenadeCanvas.height);
    
    grenadeCtx.save();
    const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.005);
    grenadeCtx.strokeStyle = "rgba(0, 255, 153, 0.15)";
    grenadeCtx.lineWidth = 3;
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeTarget.x, grenadeTarget.y, grenadeTarget.r * 2 * pulse, 0, Math.PI * 2);
    grenadeCtx.stroke();
    
    grenadeCtx.strokeStyle = "rgba(0, 255, 153, 0.5)";
    grenadeCtx.fillStyle = "rgba(0, 255, 153, 0.08)";
    grenadeCtx.lineWidth = 2;
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeTarget.x, grenadeTarget.y, grenadeTarget.r, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.stroke();
    
    grenadeCtx.fillStyle = "#00ff99";
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeTarget.x, grenadeTarget.y, 4, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.restore();
    
    grenadeCtx.save();
    grenadeCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
    grenadeCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    grenadeCtx.lineWidth = 2;
    grenadeCtx.beginPath();
    grenadeCtx.arc(grenadeLaunchOrigin.x, grenadeLaunchOrigin.y, 14, 0, Math.PI * 2);
    grenadeCtx.fill();
    grenadeCtx.stroke();
    grenadeCtx.restore();
    
    grenadeObstacles.forEach(obs => {
        grenadeCtx.save();
        grenadeCtx.fillStyle = "#1e293b";
        grenadeCtx.fillRect(obs.x + 3, obs.y + 3, obs.w, obs.h);
        
        grenadeCtx.fillStyle = "#0f172a";
        grenadeCtx.strokeStyle = "#a855f7";
        grenadeCtx.lineWidth = 2;
        grenadeCtx.fillRect(obs.x, obs.y, obs.w, obs.h);
        grenadeCtx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        
        grenadeCtx.strokeStyle = "rgba(168, 85, 247, 0.2)";
        grenadeCtx.beginPath();
        grenadeCtx.moveTo(obs.x, obs.y);
        grenadeCtx.lineTo(obs.x + obs.w, obs.y + obs.h);
        grenadeCtx.moveTo(obs.x + obs.w, obs.y);
        grenadeCtx.lineTo(obs.x, obs.y + obs.h);
        grenadeCtx.stroke();
        grenadeCtx.restore();
    });
    
    drawGrenadePreview();
    
    if (grenadeActive && grenadeTrail.length > 1) {
        grenadeCtx.save();
        grenadeCtx.strokeStyle = "rgba(255, 85, 0, 0.35)";
        grenadeCtx.lineWidth = 3;
        grenadeCtx.lineCap = "round";
        grenadeCtx.beginPath();
        grenadeCtx.moveTo(grenadeTrail[0].x, grenadeTrail[0].y);
        for (let i = 1; i < grenadeTrail.length; i++) {
            grenadeCtx.lineTo(grenadeTrail[i].x, grenadeTrail[i].y);
        }
        grenadeCtx.stroke();
        grenadeCtx.restore();
    }
    
    if (grenadeActive) {
        grenadeCtx.save();
        grenadeCtx.fillStyle = "rgba(0,0,0,0.5)";
        grenadeCtx.beginPath();
        grenadeCtx.arc(grenadeX + 2, grenadeY + 2, grenadeRadius, 0, Math.PI * 2);
        grenadeCtx.fill();
        
        grenadeCtx.fillStyle = "#334155";
        grenadeCtx.strokeStyle = "#1e293b";
        grenadeCtx.lineWidth = 1;
        grenadeCtx.beginPath();
        grenadeCtx.arc(grenadeX, grenadeY, grenadeRadius, 0, Math.PI * 2);
        grenadeCtx.fill();
        grenadeCtx.stroke();
        
        const glowPulse = Math.abs(Math.sin(Date.now() * 0.02));
        grenadeCtx.fillStyle = `rgba(255, 0, 0, ${0.4 + glowPulse * 0.6})`;
        grenadeCtx.beginPath();
        grenadeCtx.arc(grenadeX, grenadeY - 2, 2, 0, Math.PI * 2);
        grenadeCtx.fill();
        grenadeCtx.restore();
    }
    
    if (explosionActive) {
        explosionRadius += 3;
        if (explosionRadius > explosionMaxRadius) {
            explosionActive = false;
        } else {
            grenadeCtx.save();
            const grad = grenadeCtx.createRadialGradient(explosionX, explosionY, 2, explosionX, explosionY, explosionRadius);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            grad.addColorStop(0.3, "rgba(255, 170, 0, 0.8)");
            grad.addColorStop(0.7, "rgba(255, 68, 0, 0.5)");
            grad.addColorStop(1, "rgba(255, 0, 0, 0)");
            
            grenadeCtx.fillStyle = grad;
            grenadeCtx.beginPath();
            grenadeCtx.arc(explosionX, explosionY, explosionRadius, 0, Math.PI * 2);
            grenadeCtx.fill();
            
            explosionParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.life -= p.decay;
                
                if (p.life > 0) {
                    grenadeCtx.fillStyle = p.color;
                    grenadeCtx.globalAlpha = p.life;
                    grenadeCtx.beginPath();
                    grenadeCtx.arc(p.x, p.y, 2 + p.life * 3, 0, Math.PI * 2);
                    grenadeCtx.fill();
                }
            });
            grenadeCtx.restore();
        }
    }
    
    grenadeAnimFrameId = requestAnimationFrame(grenadeGameLoop);
}

function playSuccessSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
        console.error(e);
    }
}


