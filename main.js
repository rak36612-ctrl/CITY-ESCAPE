import * as THREE from 'three';

const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a0b2e, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 5, 10);
camera.lookAt(0, 2, -10);

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile }); // Disable antialias on mobile for performance
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio); // Cap pixel ratio on mobile
renderer.shadowMap.enabled = true;
if (isMobile) {
    renderer.shadowMap.type = THREE.BasicShadowMap; // Cheaper shadows on mobile
} else {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // High quality on desktop
}

const vertexShader = `
varying vec3 vWorldPosition;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorldPosition = w.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragmentShader = `
uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent;
varying vec3 vWorldPosition;
void main() { float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0); }
`;
const uniforms = { topColor: { value: new THREE.Color(0x4a6583) }, bottomColor: { value: new THREE.Color(0x1a0b2e) }, offset: { value: 33 }, exponent: { value: 0.6 } };
const skyGeo = new THREE.SphereGeometry(200, 32, 15);
const skyMat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vertexShader, fragmentShader: fragmentShader, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Add Sun
const sunGeo = new THREE.SphereGeometry(10, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee, fog: false });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.position.set(0, 40, -150); // Far back in the background
scene.add(sunMesh);

const ambientLight = new THREE.AmbientLight(0xd9b3ff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffeebb, 0.8);
dirLight.position.set(15, 30, 10); dirLight.castShadow = true;
dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -20; dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20; dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

const laneWidth = 3.5;

// Asphalt Base
const floorGeom = new THREE.PlaneGeometry(200, 400);
// AAA Asphalt Road updates
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x050508, 
    roughness: 0.2, 
    metalness: 0.8, // Puddle-like wet sheen
});
const floor = new THREE.Mesh(floorGeom, floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.z = -100; floor.receiveShadow = true; scene.add(floor);

// Reflective Puddles
const puddleMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.4 });
const puddle = new THREE.Mesh(floorGeom, puddleMat);
puddle.rotation.x = -Math.PI / 2; puddle.position.set(0, 0.02, -100); puddle.receiveShadow = true; scene.add(puddle);

// Lane markings
const trackGeom = new THREE.PlaneGeometry(0.2, 400);
const dashCanvas = document.createElement('canvas'); dashCanvas.width = 64; dashCanvas.height = 256;
const dashCtx = dashCanvas.getContext('2d');
dashCtx.fillStyle = '#222222'; dashCtx.fillRect(0,0,64,256);
dashCtx.fillStyle = '#ffffff'; dashCtx.fillRect(16,0,32,128);
const dashTex = new THREE.CanvasTexture(dashCanvas);
dashTex.wrapT = THREE.RepeatWrapping; dashTex.repeat.set(1, 100);

const trackMat = new THREE.MeshStandardMaterial({ map: dashTex, roughness: 0.9, transparent: true, blending: THREE.AdditiveBlending });
for (let i = -0.5; i <= 0.5; i+=1) {
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.rotation.x = -Math.PI / 2; track.position.set(i * laneWidth, 0.03, -100);
    track.receiveShadow = true; scene.add(track);
}

// Sidewalks
const walkGeom = new THREE.BoxGeometry(20, 0.5, 400);
const walkMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9, metalness: 0.1 });
const walkL = new THREE.Mesh(walkGeom, walkMat);
walkL.position.set(-15, 0.25, -100); walkL.receiveShadow = true; scene.add(walkL);
const walkR = new THREE.Mesh(walkGeom, walkMat);
walkR.position.set(15, 0.25, -100); walkR.receiveShadow = true; scene.add(walkR);

// -------------------------------------------------------------
// NEW PROCEDURAL SMOOTH CHARACTER (Capsules/Spheres)
// -------------------------------------------------------------
const playerGroup = new THREE.Group();
const parts = {};
const skinMat = new THREE.MeshStandardMaterial({ color: 0xE8C99A, roughness: 0.5 }); // Warm beige
const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }); // White Athletic Shirt
const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a4db5, roughness: 0.8 }); // Royal Blue Shorts
const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }); // Black Shoes

parts.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 16, 16), shirtMat);
parts.torso.position.y = 1.3; parts.torso.castShadow = true; playerGroup.add(parts.torso);

parts.head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), skinMat);
parts.head.position.y = 0.7; parts.head.castShadow = true; parts.torso.add(parts.head);

parts.shoulderL = new THREE.Group(); parts.shoulderL.position.set(-0.45, 0.3, 0); parts.torso.add(parts.shoulderL);
parts.shoulderR = new THREE.Group(); parts.shoulderR.position.set(0.45, 0.3, 0); parts.torso.add(parts.shoulderR);

const armGeom = new THREE.CapsuleGeometry(0.12, 0.5, 10, 10);
parts.armL = new THREE.Mesh(armGeom, skinMat); parts.armL.position.y = -0.3; parts.armL.castShadow = true; parts.shoulderL.add(parts.armL);
parts.armR = new THREE.Mesh(armGeom, skinMat); parts.armR.position.y = -0.3; parts.armR.castShadow = true; parts.shoulderR.add(parts.armR);

parts.hipL = new THREE.Group(); parts.hipL.position.set(-0.18, -0.4, 0); parts.torso.add(parts.hipL);
parts.hipR = new THREE.Group(); parts.hipR.position.set(0.18, -0.4, 0); parts.torso.add(parts.hipR);

const legGeom = new THREE.CapsuleGeometry(0.15, 0.6, 10, 10);
parts.legL = new THREE.Mesh(legGeom, pantsMat); parts.legL.position.y = -0.4; parts.legL.castShadow = true; parts.hipL.add(parts.legL);
parts.legR = new THREE.Mesh(legGeom, pantsMat); parts.legR.position.y = -0.4; parts.legR.castShadow = true; parts.hipR.add(parts.legR);

const shoeGeom = new THREE.CapsuleGeometry(0.18, 0.2, 10, 10);
parts.shoeL = new THREE.Mesh(shoeGeom, shoeMat); parts.shoeL.position.set(0, -0.4, 0.1); 
parts.shoeL.rotation.x = Math.PI/2; parts.shoeL.castShadow = true; parts.legL.add(parts.shoeL);
parts.shoeR = new THREE.Mesh(shoeGeom, shoeMat); parts.shoeR.position.set(0, -0.4, 0.1); 
parts.shoeR.rotation.x = Math.PI/2; parts.shoeR.castShadow = true; parts.legR.add(parts.shoeR);

scene.add(playerGroup);

// Speed Aura
const auraGeom = new THREE.PlaneGeometry(0.05, 3);
const auraMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
parts.auraLines = [];
for(let i=0; i<6; i++) {
    const arr = new THREE.Mesh(auraGeom, auraMat);
    arr.rotation.x = Math.PI/2;
    arr.position.set((i%2===0?1:-1)*(0.6 + Math.random()*0.5), Math.random()*2, -Math.random()*4);
    arr.visible = false; playerGroup.add(arr); parts.auraLines.push(arr);
}

// Blob Shadow
const shadowTexCanvas = document.createElement('canvas'); shadowTexCanvas.width = 64; shadowTexCanvas.height = 64;
const sCtx = shadowTexCanvas.getContext('2d');
const sGrad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
sGrad.addColorStop(0, 'rgba(0,0,0,0.8)'); sGrad.addColorStop(1, 'rgba(0,0,0,0)');
sCtx.fillStyle = sGrad; sCtx.fillRect(0,0,64,64);
const shadowTex = new THREE.CanvasTexture(shadowTexCanvas);
const shadowBlob = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.8, depthWrite: false }));
shadowBlob.rotation.x = -Math.PI/2; shadowBlob.position.y = 0.05; scene.add(shadowBlob);

// STATE & PROFILE
let gameState = 'SPLASH'; // SPLASH, MENU, SETUP, COUNTDOWN, PLAYING
let baseSpeed = 35; let speed = 35; let isGameOver = false; let distanceScore = 0; let coinCount = 0;
let consecutiveCoins = 0; let coinComboMultiplier = 1; let lastMilestone = 0;
let currentLane = 0; let isJumping = false; let jumpVelocity = 0; const gravity = -45;
let isSliding = false; let slideTimer = 0;
const entities = []; 
let profileInfo = JSON.parse(localStorage.getItem('ce_profile')) || null;
let savedHighScore = parseInt(localStorage.getItem('ce_highscore')) || 0;
document.getElementById('highScoreVal').innerText = savedHighScore.toString().padStart(6,'0');

// Power-up States
const activePowers = { jet: 0, magnet: 0, shield: false, mult: 0 };
const puUI = {
    jet: { wrap: document.getElementById('pu-jet'), fill: document.getElementById('pu-jet').querySelector('.pu-circle-fill'), max: 8 },
    magnet: { wrap: document.getElementById('pu-magnet'), fill: document.getElementById('pu-magnet').querySelector('.pu-circle-fill'), max: 10 },
    shield: { wrap: document.getElementById('pu-shield'), fill: null },
    mult: { wrap: document.getElementById('pu-mult'), fill: document.getElementById('pu-mult').querySelector('.pu-circle-fill'), max: 10 }
};

let lastScoreDisplay = 0;
function updateScoreUI(score) {
    const sStr = Math.floor(score).toString().padStart(6,'0');
    const b = document.getElementById('scoreBox');
    if (b.innerText !== sStr) {
        b.innerHTML = '';
        for(let i=0; i<6; i++) {
            const span = document.createElement('span');
            span.className = 'digit'; span.innerText = sStr[i];
            b.appendChild(span);
        }
        gsap.fromTo(b.lastChild, {y: -10, opacity: 0}, {y: 0, opacity: 1, duration: 0.1});
    }
}

// Character Power-Up Visuals
const jetpackGroup = new THREE.Group();
const jetBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
jetBody.rotation.x = Math.PI/2; jetBody.position.set(0, 1.4, -0.4); jetpackGroup.add(jetBody);
const jetCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2), new THREE.MeshStandardMaterial({ color: 0xff3300 }));
jetCone.rotation.x = Math.PI/2; jetCone.position.set(0, 1.4, -0.7); jetpackGroup.add(jetCone);
jetpackGroup.visible = false; playerGroup.add(jetpackGroup);

const shieldBubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 2), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4, wireframe: true }));
shieldBubble.visible = false; playerGroup.add(shieldBubble);

function applyPowerup(type) {
    playSound('coin'); // temporary
    if(type === 'jet') { activePowers.jet = puUI.jet.max; puUI.jet.wrap.classList.remove('hidden'); jetpackGroup.visible = true; speed += 20; puUI.jet.wrap.classList.add('active'); }
    else if(type === 'magnet') { activePowers.magnet = puUI.magnet.max; puUI.magnet.wrap.classList.remove('hidden'); puUI.magnet.wrap.classList.add('active'); }
    else if(type === 'shield') { activePowers.shield = true; puUI.shield.wrap.classList.remove('hidden'); shieldBubble.visible = true; puUI.shield.wrap.classList.add('active'); }
    else if(type === 'mult') { activePowers.mult = puUI.mult.max; puUI.mult.wrap.classList.remove('hidden'); document.getElementById('multiplierBadge').classList.remove('hidden'); document.getElementById('multiplierBadge').classList.add('show'); puUI.mult.wrap.classList.add('active'); }
}

// Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); const now = audioCtx.currentTime;
    if(type === 'jump') { osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now+0.2); gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.2); osc.start(now); osc.stop(now+0.2); } 
    else if(type === 'coin') { osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now+0.1); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.2); osc.start(now); osc.stop(now+0.2); } 
    else if(type === 'swipe') { osc.type = 'triangle'; osc.frequency.setValueAtTime(250, now); osc.frequency.exponentialRampToValueAtTime(100, now+0.1); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1); osc.start(now); osc.stop(now+0.1); } 
    else if(type === 'crash') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now+0.5); gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.5); osc.start(now); osc.stop(now+0.5); }
    else if(type === 'land') { osc.type = 'triangle'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(50, now+0.1); gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1); osc.start(now); osc.stop(now+0.1); }
}

const uis = { splash: document.getElementById('splashScreen'), menu: document.getElementById('mainMenu'), setup: document.getElementById('setupModal'), countdown: document.getElementById('countdownScreen'), hud: document.getElementById('gameHUD'), over: document.getElementById('gameover') };
const btnPlay = document.getElementById('playBtn'); const btnSave = document.getElementById('saveProfileBtn'); const btnSettings = document.getElementById('settingsBtn'); 

let themeMode = 'auto'; // 'auto', 'light', 'dark'
let targetTimeFactor = 0.5;

// setup theme buttons
document.getElementById('themeLightBtn').addEventListener('click', () => { setTheme('light'); playSound('swipe'); });
document.getElementById('themeDarkBtn').addEventListener('click', () => { setTheme('dark'); playSound('swipe'); });
document.getElementById('themeAutoBtn').addEventListener('click', () => { setTheme('auto'); playSound('swipe'); });

function setTheme(t) {
    themeMode = t;
    document.getElementById('themeLightBtn').classList.remove('selected');
    document.getElementById('themeDarkBtn').classList.remove('selected');
    document.getElementById('themeAutoBtn').classList.remove('selected');
    if(t === 'light') document.getElementById('themeLightBtn').classList.add('selected');
    if(t === 'dark') document.getElementById('themeDarkBtn').classList.add('selected');
    if(t === 'auto') document.getElementById('themeAutoBtn').classList.add('selected');
}

function applyProfile() {
    if(profileInfo) {
        document.getElementById('playerNameDisplay').innerText = profileInfo.name || "RUNNER";
        shirtMat.color.setHex(profileInfo.color); baseSpeed = parseInt(profileInfo.diff);
    }
}
if(profileInfo) applyProfile();

gsap.from(".logo-text", { y: -200, opacity: 0, duration: 1.2, ease: "bounce.out" });
gsap.to(".logo-text", { scale: 1.05, duration: 0.1, yoyo: true, repeat: 5, delay: 1.2 });
gsap.to(".logo-glow", { opacity: 1, duration: 1, repeat: -1, yoyo: true, delay: 1 });
setTimeout(() => { gsap.to(uis.splash, { opacity: 0, duration: 1, onComplete: () => { uis.splash.classList.add('hidden'); uis.menu.classList.remove('hidden'); gameState = 'MENU'; }}); }, 2500);

btnPlay.addEventListener('click', () => { playSound('coin'); uis.menu.classList.add('hidden'); if(!profileInfo) { uis.setup.classList.remove('hidden'); gameState = 'SETUP'; } else { startCountdown(); } });
btnSettings.addEventListener('click', () => { playSound('swipe'); uis.menu.classList.add('hidden'); uis.setup.classList.remove('hidden'); gameState = 'SETUP'; });

const avBtns = document.querySelectorAll('.avatar-btn'); let selColor = 0xff0000;
avBtns.forEach(btn => btn.addEventListener('click', (e) => { avBtns.forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); selColor = parseInt(btn.dataset.color); shirtMat.color.setHex(selColor); }));

const difBtns = document.querySelectorAll('.diff-btn'); let selDiff = 35;
difBtns.forEach(btn => btn.addEventListener('click', (e) => { difBtns.forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); selDiff = parseInt(btn.dataset.diff); }));

btnSave.addEventListener('click', () => { playSound('coin'); const name = document.getElementById('playerNameInput').value || "RUNNER"; profileInfo = { name, color: selColor, diff: selDiff }; localStorage.setItem('ce_profile', JSON.stringify(profileInfo)); applyProfile(); uis.setup.classList.add('hidden'); startCountdown(); });

const btnRunAgain = document.getElementById('btnRunAgain');
const btnMenu = document.getElementById('btnMenu');

function handleGameOverSequence() {
    uis.over.style.display = 'flex';
    uis.hud.classList.add('hidden');
    
    // Canvas desaturate and blur
    canvas.style.filter = "grayscale(80%) blur(4px)";
    document.getElementById('goVignette').style.opacity = '1';
    
    // Cinematic camera rotate
    gsap.to(camera.position, {
        x: playerGroup.position.x + 8,
        y: playerGroup.position.y + 4,
        z: playerGroup.position.z + 8,
        duration: 1.5,
        ease: "power2.out"
    });
    gsap.to(camera.rotation, { x: -0.3, y: 0.8, z: 0, duration: 1.5, ease: "power2.out" });

    // Stats
    const finalDist = Math.floor(distanceScore);
    document.getElementById('goDist').innerText = finalDist;
    document.getElementById('goCoins').innerText = coinCount;
    
    let isNewRecord = false;
    if(finalDist > savedHighScore) { 
        isNewRecord = true;
        savedHighScore = finalDist; 
        localStorage.setItem('ce_highscore', savedHighScore); 
        document.getElementById('highScoreVal').innerText = savedHighScore.toString().padStart(6,'0'); 
    }
    document.getElementById('goBest').innerText = savedHighScore;
    
    const title = document.getElementById('goTitle');
    const stats = document.getElementById('goStats');
    const badge = document.getElementById('newRecordBadge');
    const btns = document.getElementById('goBtns');

    badge.style.display = isNewRecord ? 'inline-block' : 'none';

    // Title crash down
    gsap.fromTo(title, { y: -300, opacity: 0, scale: 1.5 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "bounce.out" });
    
    // Impact shake
    gsap.to(camera.position, { y: "+=1", yoyo: true, repeat: 5, duration: 0.05, delay: 0.1 });
    
    // Stats panel slide up
    gsap.fromTo(stats, { y: 200, opacity: 0, rotationX: 15 }, { y: 0, opacity: 1, rotationX: 0, duration: 0.8, ease: "back.out(1.5)", delay: 0.8 });
    
    if (isNewRecord) {
        setTimeout(launchConfetti, 1000);
    }
    
    // Buttons fade in
    gsap.to(btns, { y: 0, opacity: 1, duration: 0.5, delay: 1.5 });
}

function launchConfetti() {
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.style.position = 'absolute';
        conf.style.width = '10px';
        conf.style.height = '15px';
        conf.style.backgroundColor = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00'][Math.floor(Math.random()*4)];
        conf.style.top = '50%';
        conf.style.left = '50%';
        conf.style.zIndex = '85';
        uis.over.appendChild(conf);
        
        gsap.to(conf, {
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 600 + 200,
            rotation: Math.random() * 360,
            opacity: 0,
            duration: 2 + Math.random(),
            ease: "power2.out",
            onComplete: () => conf.remove()
        });
    }
}

btnRunAgain.addEventListener('click', () => { playSound('coin'); resetGame(); startCountdown(); });
btnMenu.addEventListener('click', () => { playSound('swipe'); resetGame(); canvas.classList.remove('canvas-clear'); canvas.style.filter = ''; document.getElementById('goVignette').style.opacity = '0'; uis.over.style.display = 'none'; uis.menu.classList.remove('hidden'); gameState = 'MENU'; });

function startCountdown() {
    gameState = 'COUNTDOWN'; uis.countdown.classList.remove('hidden'); canvas.classList.add('canvas-clear');
    gsap.to(camera.position, {x: 0, y: 4.5, z: 12, duration: 2, ease: "power2.inOut"});
    gsap.to(camera.rotation, {x: -0.15, y: 0, z: 0, duration: 2, ease: "power2.inOut"});

    let count = 3; uis.countdown.innerText = count; gsap.fromTo(uis.countdown, {scale: 0.1, opacity: 0}, {scale: 1, opacity: 1, duration: 0.5});
    const countInt = setInterval(() => {
        count--;
        if(count > 0) { uis.countdown.innerText = count; playSound('swipe'); gsap.fromTo(uis.countdown, {scale: 0.1, opacity: 0}, {scale: 1, opacity: 1, duration: 0.5}); } 
        else if(count === 0) {
            uis.countdown.innerText = "RUN!"; uis.countdown.style.color = "#00ffff"; playSound('jump');
            gsap.fromTo(uis.countdown, {scale: 0.5, opacity: 1}, {scale: 1.5, opacity: 0, duration: 1, onComplete: () => { uis.countdown.classList.add('hidden'); uis.hud.classList.remove('hidden'); speed = baseSpeed; distanceScore = 0; coinCount = 0; document.getElementById('coins').innerText = '0'; gameState = 'PLAYING'; }});
            clearInterval(countInt);
        }
    }, 1000);
}

const trainColors = [0x0055ff, 0xff8800, 0x11aa33];

// Coins
const coinGeom = new THREE.TorusGeometry(0.4, 0.15, 16, 32);
const coinMat = new THREE.MeshStandardMaterial({ 
    color: 0xffdd00, 
    emissive: 0xff8800, 
    emissiveIntensity: 1.0, 
    metalness: 1.0, 
    roughness: 0.05 
});

// Sparkle array (Optimized with basic limiter for mobile)
const sparks = [];
const sparkTex = createSparkleTex(); // Cache texture globally so we don't recreate it every coin pickup
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, blending: THREE.AdditiveBlending, map: sparkTex, depthWrite: false });
const sparkGeom = new THREE.PlaneGeometry(1, 1);
function createSparkle(pos) {
    if (isMobile && Math.random() > 0.5) return; // Cut spark creation on mobile
    const sp = new THREE.Mesh(sparkGeom, sparkMat);
    sp.position.copy(pos); scene.add(sp);
    sparks.push({ m: sp, life: 1 });
}
function createSparkleTex() {
    const c = document.createElement('canvas'); c.width=32; c.height=32; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16,16,0,16,16,16); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,32,32); return new THREE.CanvasTexture(c);
}

const winCanvas = document.createElement('canvas'); winCanvas.width = 128; winCanvas.height = 128; const winCtx = winCanvas.getContext('2d'); winCtx.fillStyle = '#000000'; winCtx.fillRect(0,0,128,128); winCtx.fillStyle = '#ffddaa'; 
for(let x=8; x<128; x+=24) { for(let y=8; y<128; y+=24) { if(Math.random()>0.2) winCtx.fillRect(x,y,12,16); } }
const baseWinTex = new THREE.CanvasTexture(winCanvas); baseWinTex.wrapS = THREE.RepeatWrapping; baseWinTex.wrapT = THREE.RepeatWrapping;
const buildColors = [0x111115, 0x050510, 0x1a1a24, 0x0a101f, 0x222233]; // Glassy corporate colors

// Power-Up Geometries
const puGeoms = {
    jet: new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
    magnet: new THREE.TorusGeometry(0.4, 0.15, 8, 16, Math.PI),
    shield: new THREE.IcosahedronGeometry(0.5, 0),
    mult: new THREE.OctahedronGeometry(0.4, 0)
};
const puMats = {
    jet: new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xaa3300 }),
    magnet: new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xaa00aa }),
    shield: new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0055aa }),
    mult: new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00 })
};

function createTrain(lane, tSpeed) {
    const group = new THREE.Group(); 
    // Ultra Realistic Moving Train
    const mat = new THREE.MeshStandardMaterial({ color: trainColors[Math.floor(Math.random()*trainColors.length)], metalness: 0.9, roughness: 0.1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 12), mat); body.position.y = 1.75; body.castShadow = true; group.add(body);
    
    // Windows with emissive properties
    const winMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.9, emissive: 0x111111 });
    const frontWin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.1), winMat); frontWin.position.set(0, 2.2, 6.01); group.add(frontWin);
    for(let z=-4; z<=4; z+=2.5) { const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.0, 1.5), winMat); sideWin.position.set(0, 2.2, z); group.add(sideWin); }
    
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const hR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), lightMat); hR.position.set(0.8, 0.8, 6.01); group.add(hR);
    const hL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), lightMat); hL.position.set(-0.8, 0.8, 6.01); group.add(hL);
    
    const pointR = new THREE.PointLight(0xffffee, 2, 20); pointR.position.set(0.8, 0.8, 6.2); group.add(pointR);
    const pointL = new THREE.PointLight(0xffffee, 2, 20); pointL.position.set(-0.8, 0.8, 6.2); group.add(pointL);
    
    group.position.set(lane * laneWidth, 0, -200); group.userData = { type: 'train', zSpeed: tSpeed, warning: false }; return group;
}

function createBarrier(lane, bType) {
    const group = new THREE.Group();
    if(bType === 'scaffold') {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 });
        const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), poleMat); pL.position.set(-1.4, 1.5, 0); pL.castShadow = true; group.add(pL);
        const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), poleMat); pR.position.set(1.4, 1.5, 0); pR.castShadow = true; group.add(pR);
        const beamMat = new THREE.MeshStandardMaterial({ color: 0xddff00, roughness: 0.7 });
        const beam = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 0.6), beamMat); beam.position.set(0, 3.0, 0); beam.castShadow = true; group.add(beam);
        
        // Add hanging vines on the scaffold
        const vineMat = new THREE.MeshStandardMaterial({ color: 0x116611, roughness: 0.9 });
        for(let i=0; i<3; i++) {
            const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 1.5 + Math.random(), 4), vineMat);
            vine.position.set((Math.random()-0.5)*3, 2.0 - Math.random(), 0);
            vine.rotation.z = (Math.random()-0.5)*0.2;
            group.add(vine);
        }
        
        group.userData = { type: 'highBarrier', zSpeed: 0, warning: false };
    } else if (bType === 'market') {
        // Concrete Debris block
        const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 1.0 });
        const block = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), mat); 
        block.position.set(0, 1.25, 0); block.rotation.set(Math.random(), Math.random(), Math.random());
        block.castShadow = true; group.add(block);
        
        const block2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);
        block2.position.set(1.0, 0.75, 1.0); block2.rotation.set(Math.random(), Math.random(), Math.random());
        block2.castShadow = true; group.add(block2);
        
        group.userData = { type: 'train', zSpeed: 0, warning: false }; // Full blocker
    } else if (bType === 'car') {
        // Detailed Collapsed Vehicle
        const cMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.6 });
        const car = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 4.5), cMat); car.position.set(0, 0.5, 0); car.castShadow = true; group.add(car);
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 2.2), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 }));
        top.position.set(0, 1.4, -0.2); top.castShadow = true; group.add(top);
        
        // Add headlights
        const hL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0xaa2211 })); hL.position.set(-0.8, 0.6, 2.3); group.add(hL);
        const hR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0xaa2211 })); hR.position.set(0.8, 0.6, 2.3); group.add(hR);
        
        // Fire particles effect
        const fire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 8), new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.8 }));
        fire.position.set(0.5, 1.0, -1.5);
        gsap.to(fire.scale, { x: 1.2, y: 1.5, z: 1.2, duration: 0.1 + Math.random()*0.1, repeat: -1, yoyo: true });
        group.add(fire);
        
        group.rotation.y = (Math.random()-0.5)*1.5; // Highly skewed broken down
        group.rotation.z = Math.random()*0.2; // Slightly tipped
        group.position.y += 0.2;
        group.userData = { type: 'train', zSpeed: 0, warning: false }; // Full blocker
    } else {
        // High quality construction barrier (Must jump)
        const barMat = new THREE.MeshStandardMaterial({ color: 0xdd6600, roughness: 0.8 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.5), barMat); base.position.set(0, 0.6, 0); base.castShadow = true; group.add(base);
        // Concrete base
        const conc = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.8), new THREE.MeshStandardMaterial({color: 0x888888})); conc.position.set(0, 0.15, 0); conc.castShadow = true; group.add(conc);
        
        // Orange blinking lights (No setInterval inside loop to prevent memory leaks/jitter over time)
        const lMat1 = new THREE.MeshBasicMaterial({ color: 0xff5500 });
        const lMat2 = new THREE.MeshBasicMaterial({ color: 0xff5500 });
        const l1 = new THREE.Mesh(new THREE.SphereGeometry(0.2), lMat1); l1.position.set(-1.2, 1.1, 0); group.add(l1);
        const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.2), lMat2); l2.position.set(1.2, 1.1, 0); group.add(l2);
        
        gsap.to(lMat1.color, { r: 1, g: 0.3, b: 0, duration: 0.3, repeat: -1, yoyo: true });
        gsap.to(lMat2.color, { r: 0.2, g: 0.1, b: 0, duration: 0.3, repeat: -1, yoyo: true, delay: 0.3 });
        
        group.userData = { type: 'lowBarrier', zSpeed: 0, warning: false };
    }
    group.position.set(lane * laneWidth, 0, -200); return group;
}

function spawnPattern() {
    if (gameState !== 'PLAYING') return;
    const lane = Math.floor(Math.random() * 3) - 1;
    const rType = Math.random();
    
    if (rType > 0.45) { 
        const obsType = Math.random();
        let obs;
        if(obsType < 0.25) obs = createTrain(lane, speed - 10 + Math.random()*20); // Massive City Train
        else if(obsType < 0.4) obs = createBarrier(lane, 'car'); // Crashed Flaming Vehicle
        else if(obsType < 0.55) obs = createBarrier(lane, 'market'); // Concrete Debris Roadblocks
        else if(obsType < 0.75) obs = createBarrier(lane, 'construct'); // Low construction jumping barrier
        else obs = createBarrier(lane, 'scaffold'); // High hanging scaffold bridge
        
        scene.add(obs); entities.push(obs); 
    } 
    else if (rType > 0.05) { 
        const pattern = Math.floor(Math.random() * 3);
        const startZ = -180;
        for (let i = 0; i < 5; i++) { 
            const coin = new THREE.Mesh(coinGeom, coinMat); 
            let cx = lane*laneWidth;
            let cy = 1.2;
            if (pattern === 1) { cy = 1.2 + Math.sin(i * Math.PI / 4) * 2; }
            if (pattern === 2) { cx = (lane===0 ? (i%2===0?-1:1)*laneWidth : lane*laneWidth); }
            
            coin.position.set(cx, cy, startZ - (i*3)); coin.castShadow = true; coin.userData = { type: 'coin', zSpeed: 0 }; scene.add(coin); entities.push(coin); 
        } 
    }
    else {
        // Spawn Power-Up
        const puTypes = ['jet', 'magnet', 'shield', 'mult'];
        const pType = puTypes[Math.floor(Math.random() * puTypes.length)];
        const puMesh = new THREE.Mesh(puGeoms[pType], puMats[pType]);
        puMesh.position.set(lane * laneWidth, 1.5, -180);
        puMesh.castShadow = true;
        
        // Pointing magnet down
        if (pType === 'magnet') puMesh.rotation.z = Math.PI;
        
        const wrapList = new THREE.Group();
        wrapList.add(puMesh);
        
        // Add aura/glow
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: puMats[pType].emissive, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
        wrapList.add(glow);
        gsap.to(glow.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.5, yoyo: true, repeat: -1 });

        wrapList.position.set(puMesh.position.x, puMesh.position.y, puMesh.position.z);
        puMesh.position.set(0,0,0); glow.position.set(0,0,0);
        
        wrapList.userData = { type: 'powerup', puType: pType, zSpeed: 0 };
        scene.add(wrapList); entities.push(wrapList);
    }
    
    // Roadside props (Lively street vegetation and objects)
    if(Math.random() > 0.1) {
        const side = Math.random() > 0.5 ? 1 : -1;
        // 50% chance for a lush green bush, 50% for standard prop
        if (Math.random() > 0.5) {
            const bushGeo = new THREE.DodecahedronGeometry(1.5 + Math.random(), 1);
            const bushMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0.1 });
            const bush = new THREE.Mesh(bushGeo, bushMat);
            bush.position.set(side * (5 + Math.random() * 4), 1.0 + Math.random()*0.5, -180);
            bush.castShadow = true; bush.receiveShadow = true;
            bush.userData = { type: 'bg', zSpeed: 0 }; 
            scene.add(bush); entities.push(bush);
        } else {
            const geom = new THREE.BoxGeometry(1, 1.5, 1);
            const prop = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({color: 0x883333, metalness: 0.5, roughness: 0.5 }));
            prop.position.set(side * 6, 0.75, -180); prop.castShadow = true; prop.userData = { type: 'bg', zSpeed: 0 }; 
            scene.add(prop); entities.push(prop);
        }
    }
    
    for(let depth = 1; depth <= 4; depth++) {
        if(Math.random() > 0.1) {
            const spawnB = (xPos) => {
                const w = 8 + Math.random()*8; const d = 8 + Math.random()*8; const h = 20 + Math.random()*80 + (depth*10);
                const tex = baseWinTex.clone(); tex.needsUpdate = true; tex.repeat.set(w/4, h/4);
                // Ultra realistic skyscraper materials
                const bMat = new THREE.MeshStandardMaterial({
                    color: buildColors[Math.floor(Math.random()*buildColors.length)], 
                    emissiveMap: tex, 
                    emissive: 0xffffff, 
                    emissiveIntensity: 0.6 + Math.random()*0.8,
                    metalness: 0.9,
                    roughness: 0.1
                });
                const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), bMat);
                b.scale.y = h; b.position.set(xPos, h/2, -180 + Math.random()*20); b.castShadow = true; 
                b.userData = {type: 'bg', zSpeed: -(depth * 0.2 * speed)}; scene.add(b); entities.push(b);
            };
            spawnB(-20 - (depth*15)); spawnB(20 + (depth*15));
        }
    }
}

let spawnTimer = 0;

window.addEventListener('keydown', (e) => {
    if (gameState === 'GAMEOVER' && e.key.toLowerCase() === 'r') { resetGame(); startCountdown(); }
    if (gameState !== 'PLAYING') return;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { if (currentLane > -1) { currentLane--; playSound('swipe'); } } 
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { if (currentLane < 1) { currentLane++; playSound('swipe'); } } 
    else if ((e.key === 'ArrowUp' || e.key === ' ' || e.key.toLowerCase() === 'w') && !isJumping && !isSliding) { 
        isJumping = true; jumpVelocity = 18; playSound('jump');
        // Pre-jump squash effect
        gsap.to(parts.torso.scale, {y: 0.7, x: 1.2, z: 1.2, duration: 0.1, yoyo: true, repeat: 1});
    }
    else if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && !isJumping && !isSliding) {
        isSliding = true; slideTimer = 0.8; playSound('swipe');
    }
});

/* --- Mobile Swipe Controls --- */
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

window.addEventListener('touchstart', (e) => {
    // Basic hit test to allow button clicks instead of swipe
    if (e.target.tagName === 'BUTTON') return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    // Prevent scrolling and pull-to-refresh on mobile while playing
    if(gameState === 'PLAYING') e.preventDefault(); 
}, {passive: false});

window.addEventListener('touchend', (e) => {
    if (gameState !== 'PLAYING') {
        // Tap to restart if game over
        if (gameState === 'GAMEOVER' && Math.abs(e.changedTouches[0].screenX - touchStartX) < 10) {
            resetGame(); startCountdown();
        }
        return;
    }
    if (e.target.tagName === 'BUTTON') return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
            if (dx > 0 && currentLane < 1) { currentLane++; playSound('swipe'); vibrate(15); } // Right
            else if (dx < 0 && currentLane > -1) { currentLane--; playSound('swipe'); vibrate(15); } // Left
        }
    } else {
        // Vertical swipe
        if (Math.abs(dy) > SWIPE_THRESHOLD) {
            if (dy < 0 && !isJumping && !isSliding) { // Up
                isJumping = true; jumpVelocity = 18; playSound('jump');
                gsap.to(parts.torso.scale, {y: 0.7, x: 1.2, z: 1.2, duration: 0.1, yoyo: true, repeat: 1});
                vibrate(20);
            } else if (dy > 0 && !isJumping && !isSliding) { // Down
                isSliding = true; slideTimer = 0.8; playSound('swipe');
                vibrate(20);
            }
        }
    }
});

function vibrate(ms) {
    if (navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (err) {}
    }
}

function resetGame() {
    isGameOver = false; speed = baseSpeed; distanceScore = 0; coinCount = 0; currentLane = 0; isSliding = false; isJumping = false;
    timeScale = 1.0; deathCamAngle = 0;
    consecutiveCoins = 0; coinComboMultiplier = 1; lastMilestone = 0;
    activePowers.jet = 0; activePowers.magnet = 0; activePowers.shield = false; activePowers.mult = 0;
    jetpackGroup.visible = false; shieldBubble.visible = false;
    ['jet', 'magnet', 'shield', 'mult'].forEach(p => puUI[p].wrap.classList.add('hidden')); document.getElementById('multiplierBadge').classList.add('hidden');
    playerGroup.position.set(0, 0, 0); uis.over.style.display = 'none'; uis.hud.classList.add('hidden');
    
    // Reset Game Over Styles
    canvas.style.filter = '';
    document.getElementById('goVignette').style.opacity = '0';
    document.getElementById('goTitle').style.opacity = '0';
    document.getElementById('goStats').style.opacity = '0';
    document.getElementById('goBtns').style.opacity = '0';
    
    entities.forEach(ent => scene.remove(ent)); entities.length = 0;
    parts.torso.position.y = 1.3; parts.torso.rotation.set(0,0,0); parts.torso.scale.set(1,1,1); parts.head.rotation.set(0,0,0);
}

const clock = new THREE.Clock();

// DUST PARTICLES (Optimized with Object Pooling)
const dustGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2); const dustMat = new THREE.MeshBasicMaterial({color: 0xcccccc});
const dustArray = [];
const dustPool = [];
function spawnDust(x, z) {
    const pCount = isMobile ? 2 : 6; // Drastically reduce particles on mobile to stop GC jitter
    if (isMobile && Math.random() > 0.4) return;
    for(let i=0; i<pCount; i++) {
        let d;
        if (dustPool.length > 0) {
            d = dustPool.pop();
            d.m.visible = true;
        } else {
            d = {m: new THREE.Mesh(dustGeom, dustMat)};
            scene.add(d.m);
        }
        d.m.position.set(x + (Math.random()-0.5), 0.2, z + (Math.random()-0.5));
        d.vx = (Math.random()-0.5)*5; d.vy = Math.random()*3 + 2; d.vz = (Math.random()-0.5)*5; d.life = 1.0;
        d.m.scale.setScalar(1);
        dustArray.push(d);
    }
}

let timeScale = 1.0;
let deathCamAngle = 0;
function animate() {
    requestAnimationFrame(animate); 
    let rawDelta = clock.getDelta(); 
    // Clamp delta to prevent massive physics jumps on lag spikes
    rawDelta = Math.min(rawDelta, 0.05);
    
    const elTime = clock.getElapsedTime();
    const delta = rawDelta * timeScale;
    timeScale = THREE.MathUtils.lerp(timeScale, 1.0, rawDelta * 5); // Recover from slow-mo

    // Animate dust
    for(let i=dustArray.length-1; i>=0; i--) {
        const d = dustArray[i];
        d.m.position.x += d.vx * delta; d.m.position.y += d.vy * delta; d.m.position.z += d.vz * delta;
        d.vy -= 10 * delta; d.life -= 2 * delta; d.m.scale.setScalar(d.life);
        if(d.life <= 0) { d.m.visible = false; dustPool.push(d); dustArray.splice(i, 1); }
    }

    // Animate sparks
    for(let i=sparks.length-1; i>=0; i--) {
        const sp = sparks[i];
        sp.m.position.y += 2*delta; sp.m.scale.setScalar(sp.life*2);
        sp.life -= 3*delta; 
        if(sp.life <= 0) { scene.remove(sp.m); sparks.splice(i, 1); }
    }

    // Time of day transition
    let curTimeFactor = 0;
    if (themeMode === 'auto') {
        const cycle = (elTime * 0.02) % (Math.PI*2);
        curTimeFactor = (Math.sin(cycle) + 1) * 0.5; // 0 to 1
    } else if (themeMode === 'light') {
        curTimeFactor = 1.0;
    } else if (themeMode === 'dark') {
        curTimeFactor = 0.0;
    }
    
    targetTimeFactor = THREE.MathUtils.lerp(targetTimeFactor, curTimeFactor, 2 * delta);

    // Dynamic Cinematic City Life & Particles
    if (Math.random() < 0.05 && speed > 20) {
        // Birds passing by
        const bird = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 3), new THREE.MeshBasicMaterial({color: 0x111111}));
        bird.position.set((Math.random() - 0.5) * 40, 15 + Math.random() * 10, -100 - Math.random() * 50);
        bird.rotation.x = Math.PI / 2;
        bird.rotation.z = Math.random() * Math.PI;
        scene.add(bird);
        entities.push(bird);
        bird.userData = { type: 'bg', zSpeed: 60 };
    }

    // Ultra Bright Cinematic Light Mode (Vibrant Day / Atmospheric Night)
    uniforms.topColor.value.lerpColors(new THREE.Color(0x05051a), new THREE.Color(0x3B82F6), targetTimeFactor); // Rich blue daytime sky
    uniforms.bottomColor.value.lerpColors(new THREE.Color(0x000005), new THREE.Color(0x93C5FD), targetTimeFactor); // Bright warm horizon
    ambientLight.color.lerpColors(new THREE.Color(0x111122), new THREE.Color(0xffffff), targetTimeFactor);
    ambientLight.intensity = 0.3 + targetTimeFactor * 0.9; // Massive boost in daytime ambient lighting
    
    // Adjust lights and sun visibility
    dirLight.intensity = 0.2 + targetTimeFactor * 2.5; // Strong directional sunlight
    dirLight.color.lerpColors(new THREE.Color(0x4466aa), new THREE.Color(0xfff7e6), targetTimeFactor); // Warm golden sun
    scene.fog.color.copy(uniforms.bottomColor.value);
    
    // Reduce fog density in light mode for better visibility
    scene.fog.density = THREE.MathUtils.lerp(0.012, 0.0015, targetTimeFactor); // Deep night fog vs very clear day

    // Sun movement and fading
    const sunY = THREE.MathUtils.lerp(-40, 80, targetTimeFactor);
    sunMesh.position.y = sunY;
    sunMesh.material.color.setHex(0xffffff); // pure bright sun
    // Optional glow transition
    sunMesh.scale.set(targetTimeFactor * 1.5, targetTimeFactor * 1.5, targetTimeFactor * 1.5);

    if (gameState === 'MENU' || gameState === 'SETUP') {
        const camTime = elTime * 0.2;
        camera.position.x = Math.sin(camTime) * 12; camera.position.z = Math.cos(camTime) * 12; camera.position.y = 8;
        camera.lookAt(0, 2, 0);

        // IDLE LOOP
        const t = elTime * 2;
        parts.torso.position.y = 1.3 + Math.sin(t)*0.06; // Breathing
        parts.torso.rotation.x = 0; // Upright
        parts.head.rotation.y = Math.sin(t*0.5)*0.3; // Occasional look
        parts.shoulderL.rotation.x = 0; parts.shoulderR.rotation.x = 0;
        parts.hipL.rotation.x = 0; parts.hipR.rotation.x = 0;
        parts.torso.rotation.z = Math.sin(t)*0.03; // Weight shift
    } 
    else if (gameState === 'PLAYING') {
        if (!isGameOver) {
            
            spawnTimer -= delta;
            if (spawnTimer <= 0) {
                spawnPattern();
                // Tighten spawn cycle based on speed curve
                spawnTimer = Math.max(0.2, 0.6 * (baseSpeed / speed));
            }

            // PowerUp Tick logic
            if (activePowers.jet > 0) {
                activePowers.jet -= delta;
                puUI.jet.fill.style.strokeDashoffset = 100 - (activePowers.jet / puUI.jet.max) * 100;
                if(Math.random() > 0.5) spawnDust(playerGroup.position.x, playerGroup.position.z-0.5); // fire particles
                if(activePowers.jet <= 0) { jetpackGroup.visible = false; puUI.jet.wrap.classList.add('hidden'); puUI.jet.wrap.classList.remove('active'); speed -= 20; }
            }
            if (activePowers.magnet > 0) {
                activePowers.magnet -= delta;
                puUI.magnet.fill.style.strokeDashoffset = 100 - (activePowers.magnet / puUI.magnet.max) * 100;
                if(activePowers.magnet <= 0) { puUI.magnet.wrap.classList.add('hidden'); puUI.magnet.wrap.classList.remove('active'); }
            }
            if (activePowers.mult > 0) {
                activePowers.mult -= delta;
                puUI.mult.fill.style.strokeDashoffset = 100 - (activePowers.mult / puUI.mult.max) * 100;
                if(activePowers.mult <= 0) { puUI.mult.wrap.classList.add('hidden'); puUI.mult.wrap.classList.remove('active'); document.getElementById('multiplierBadge').classList.remove('show'); setTimeout(()=>document.getElementById('multiplierBadge').classList.add('hidden'), 500); }
            }

            distanceScore += (speed * delta) * 0.5 * (activePowers.mult > 0 ? 2 : 1); 
            updateScoreUI(distanceScore);
            document.getElementById('distance').innerText = Math.floor(distanceScore);
            
            // Milestone check
            if (Math.floor(distanceScore) >= (lastMilestone + 1) * 500) {
                lastMilestone++;
                playSound('jump'); // Or a new sound
                const msFloat = document.createElement('div');
                msFloat.className = 'milestone-float';
                msFloat.innerText = `${lastMilestone * 500}M!`;
                document.getElementById('gameHUD').appendChild(msFloat);
                gsap.fromTo(msFloat, {scale: 0.1, opacity: 1}, {scale: 2, opacity: 0, duration: 2, ease: 'easeOut', onComplete: () => msFloat.remove()});
                
                // Milestone burst
                for(let i=0; i<30; i++) {
                    const sp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: THREE.AdditiveBlending, map: createSparkleTex() }));
                    sp.position.set(playerGroup.position.x + (Math.random()-0.5)*10, Math.random()*5, playerGroup.position.z - 5);
                    scene.add(sp);
                    sparks.push({ m: sp, life: 1 });
                }
            }

            speed += 0.2 * delta;
            
            // UI Speed Bar Update
            const speedRatio = Math.min((speed / 80) * 100, 100);
            document.getElementById('speedBarFill').style.width = speedRatio + '%';
            if (speedRatio > 85) document.getElementById('speedBarFill').classList.add('redline');
            else document.getElementById('speedBarFill').classList.remove('redline');

            // Player Horizontal Lerp & Lean (Optimized for ultra-smooth buttery transition)
            const targetX = currentLane * laneWidth;
            // Eased realistic track switching speed
            const moveFactor = 1.0 - Math.exp(-6 * delta); 
            playerGroup.position.x += (targetX - playerGroup.position.x) * moveFactor;
            
            const tilt = (targetX - playerGroup.position.x) * -0.15;
            parts.torso.rotation.z = THREE.MathUtils.lerp(parts.torso.rotation.z, tilt, 8 * delta);

            const runTime = elTime * (speed * 0.4);

            if (isSliding) {
                slideTimer -= delta; if(slideTimer <= 0) isSliding = false;
                parts.torso.position.y = THREE.MathUtils.lerp(parts.torso.position.y, 0.3, 20*delta);
                parts.torso.rotation.x = THREE.MathUtils.lerp(parts.torso.rotation.x, Math.PI/2, 20*delta);
                parts.head.rotation.x = -Math.PI/2;
                parts.shoulderL.rotation.x = Math.PI; parts.shoulderR.rotation.x = Math.PI; // superman slide
                parts.hipL.rotation.x = 0; parts.hipR.rotation.x = 0;
                parts.legL.rotation.x = -Math.PI/2; parts.legR.rotation.x = -Math.PI/2;
                parts.torso.scale.set(1, 0.5, 1); // visually compress to fit under beams
            } else if (isJumping) {
                playerGroup.position.y += jumpVelocity * delta; jumpVelocity += gravity * delta; 
                parts.torso.rotation.x = 0.1; parts.torso.position.y = 1.3; parts.head.rotation.x = -0.2;
                parts.shoulderL.rotation.x = Math.PI - 0.5; parts.shoulderR.rotation.x = Math.PI - 0.5; // Arms up
                parts.hipL.rotation.x = 0; parts.hipR.rotation.x = 0;
                
                // Squash stretch based on velocity
                const stretch = 1 + (Math.abs(jumpVelocity) * 0.015);
                parts.torso.scale.set(1/stretch, stretch, 1/stretch);

                if (playerGroup.position.y <= 0) { 
                    playerGroup.position.y = 0; isJumping = false; playSound('land');
                    spawnDust(playerGroup.position.x, playerGroup.position.z);
                    gsap.to(parts.torso.scale, {y: 0.8, x: 1.1, z: 1.1, duration: 0.1, yoyo: true, repeat: 1}); // Land squash
                }
            } else {
                // SPRINTING
                playerGroup.position.y = 0; parts.torso.scale.set(1,1,1);
                parts.torso.position.y = 1.3 + Math.abs(Math.sin(runTime))*0.15; // Bounce
                parts.torso.rotation.x = 0.25; // Lean forward
                parts.head.rotation.x = -0.1;
                
                parts.shoulderL.rotation.x = Math.cos(runTime)*1.5; parts.shoulderR.rotation.x = -Math.cos(runTime)*1.5;
                parts.hipL.rotation.x = -Math.cos(runTime)*1.5; parts.hipR.rotation.x = Math.cos(runTime)*1.5;
                
                // Extra knee/elbow bend approximation
                parts.armL.rotation.x = -0.2 + (Math.cos(runTime) > 0 ? -0.5 : 0);
                parts.armR.rotation.x = -0.2 + (-Math.cos(runTime) > 0 ? -0.5 : 0);
                parts.legL.rotation.x = (Math.cos(runTime) < 0 ? 0.8 : 0);
                parts.legR.rotation.x = (-Math.cos(runTime) < 0 ? 0.8 : 0);
            }

            // Speed Aura Lines
            if(speed > 42) {
                parts.auraLines.forEach(arr => {
                    arr.visible = true; arr.position.z += speed*3*delta;
                    if(arr.position.z > 2) arr.position.z = -8 - Math.random()*5;
                });
            } else { parts.auraLines.forEach(arr => arr.visible = false); }

            // Camera speed zoom & bob
            const targetFov = 60 + Math.min(15, (speed - baseSpeed)*0.5);
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 2*delta);
            camera.updateProjectionMatrix();

            const targetCamZ = 10 + Math.min(3, (speed - baseSpeed)*0.1);
            const bob = Math.abs(Math.sin(runTime))*0.2;
            
            camera.position.x += ((playerGroup.position.x * 0.6) - camera.position.x) * 10 * delta;
            camera.position.y += ((playerGroup.position.y + 4.5 + bob) - camera.position.y) * 10 * delta;
            camera.position.z += (targetCamZ - camera.position.z) * 5 * delta;
            camera.lookAt(playerGroup.position.x * 0.5, playerGroup.position.y + 1, -15);
            
            // Random shake offsets (Removed to fix constant camera jitter)
        } else {
            // RAGDOLL CRASH ANIMATION
            parts.torso.rotation.x += 15 * delta; parts.torso.rotation.y += 8 * delta;
            parts.shoulderL.rotation.z += 10 * delta; parts.shoulderR.rotation.z -= 10 * delta;
            parts.hipL.rotation.x += 10 * delta; parts.hipR.rotation.z += 10 * delta;
            playerGroup.position.z -= speed * 0.5 * delta; playerGroup.position.y -= 5*delta;
            if(playerGroup.position.y < 0) playerGroup.position.y = 0;
            
            // Death cam arc
            deathCamAngle += 0.5 * rawDelta;
            const camDist = Math.max(3, 10 - deathCamAngle * 5); // slow zoom in
            const cx = playerGroup.position.x + Math.sin(deathCamAngle) * camDist;
            const cz = playerGroup.position.z + Math.cos(deathCamAngle) * camDist;
            camera.position.lerp(new THREE.Vector3(cx, playerGroup.position.y + 2, cz), 5*rawDelta);
            camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z);
        }

        // Environment Move
        let dangerL = false; let dangerC = false; let dangerR = false;

        for (let i = entities.length - 1; i >= 0; i--) {
            const ent = entities[i]; ent.position.z += (speed + ent.userData.zSpeed) * delta;
            
            // Danger UI projection
            if(!isGameOver && (ent.userData.type === 'train' || ent.userData.type === 'lowBarrier' || ent.userData.type === 'highBarrier')) {
               if(ent.position.z > -80 && ent.position.z < -10) {
                    const lEdge = Math.round(ent.position.x / laneWidth);
                    if (lEdge === -1) dangerL = true;
                    if (lEdge === 0) dangerC = true;
                    if (lEdge === 1) dangerR = true;
               }
            }

            if (ent.userData.type === 'coin') ent.rotation.y += 5 * delta;

            if(!isGameOver) {
                const dy = Math.abs(ent.position.y - playerGroup.position.y);
                const dx = Math.abs(ent.position.x - playerGroup.position.x); 
                const dz = Math.abs(ent.position.z - playerGroup.position.z);
                
                // Sliding lowers hitbox
                const hitHeight = isSliding ? 1.0 : 2.5;
                const netSpeed = speed + ent.userData.zSpeed;
                
                // Warning system
                if (ent.userData.type === 'train' || ent.userData.type === 'lowBarrier' || ent.userData.type === 'highBarrier') {
                    const timeToReach = -ent.position.z / netSpeed;
                    if (timeToReach > 0 && timeToReach <= 0.3 && !ent.userData.warning) {
                        ent.userData.warning = true;
                    }
                }

                const triggerCrash = () => {
                    if (activePowers.jet > 0) return; // Invincible while flying
                    if (activePowers.shield) {
                        activePowers.shield = false;
                        puUI.shield.wrap.classList.add('hidden');
                        shieldBubble.visible = false;
                        playSound('crash'); // Shield break
                        vibrate([20, 50, 30]); // Haptic for shield break
                        scene.remove(ent); entities.splice(i, 1);
                        return;
                    }
                    isGameOver = true; gameState = 'GAMEOVER'; playSound('crash'); 
                    vibrate([50, 100, 200]); // Heavy haptic for death crash
                    handleGameOverSequence();
                };

                // Near-miss removed to prevent unwanted slowdown/vibration
                if (ent.userData.type !== 'coin' && ent.userData.type !== 'powerup' && !ent.userData.nearMiss) {
                    // We only mark it so we don't process it multiple times if needed later
                    if (dz > -2 && dz < 2 && dx > 1.8 && dx < 3.5 && dy < hitHeight) {
                        ent.userData.nearMiss = true;
                    }
                }

                if (ent.userData.type === 'train') {
                    // Spawn exhaust particles if train
                    if(Math.random() > 0.6) spawnDust(ent.position.x, ent.position.z - 5);
                    
                    if (dx < 1.8 && dy < hitHeight && dz < 5.2) triggerCrash();
                } else if (ent.userData.type === 'lowBarrier') {
                    if (dx < 1.4 && playerGroup.position.y < 1.0 && dz < 0.6) triggerCrash();
                } else if (ent.userData.type === 'highBarrier') {
                    if (dx < 1.4 && hitHeight > 1.2 && dz < 0.6) triggerCrash();
                } else if (ent.userData.type === 'coin') {
                    // Magnet logic
                    if (activePowers.magnet > 0) {
                        const magDist = playerGroup.position.distanceTo(ent.position);
                        if (magDist < 12) ent.position.lerp(new THREE.Vector3(playerGroup.position.x, playerGroup.position.y+1, playerGroup.position.z), 10*delta);
                    }
                    if (dx < 1.5 && dy < 2.0 && dz < 1.0) { 
                        
                        // Combo logic
                        consecutiveCoins++;
                        if (consecutiveCoins > 0 && consecutiveCoins % 5 === 0) {
                            coinComboMultiplier++;
                            playSound('coin'); // extra sound maybe?
                            document.getElementById('flashOverlay').style.background = 'rgba(255, 100, 0, 0.3)';
                            setTimeout(() => document.getElementById('flashOverlay').style.background = 'transparent', 200);
                            
                            const comboFloat = document.createElement('div');
                            comboFloat.className = 'combo-float';
                            comboFloat.innerText = `COMBO x${coinComboMultiplier}!`;
                            document.getElementById('gameHUD').appendChild(comboFloat);
                            gsap.fromTo(comboFloat, {scale: 0.5, opacity: 1, y: 0}, {scale: 1.5, opacity: 0, y: -50, duration: 1, ease: 'power2.out', onComplete: () => comboFloat.remove()});
                        }

                        const amount = (activePowers.mult > 0 ? 2 : 1) * coinComboMultiplier;
                        coinCount += amount; document.getElementById('coins').innerText = coinCount; playSound('coin'); 
                        vibrate(5); // Light tap for coin pickup
                        // Coin Float Animation
                        const floatMsg = document.createElement('div');
                        floatMsg.className = 'coin-plus'; floatMsg.innerText = '+' + amount;
                        document.getElementById('coinFloatContainer').appendChild(floatMsg);
                        gsap.fromTo(floatMsg, {y: 0, opacity: 1}, {y: -40, opacity: 0, duration: 0.8, onComplete: () => floatMsg.remove()});
                        
                        createSparkle(ent.position);
                        scene.remove(ent); entities.splice(i, 1); continue; 
                    }
                } else if (ent.userData.type === 'powerup') {
                    if (dx < 1.5 && dy < 2.0 && dz < 1.0) {
                        applyPowerup(ent.userData.puType);
                        scene.remove(ent); entities.splice(i, 1); continue; 
                    }
                }
            }
            if (ent.position.z > 15) { 
                if(ent.userData.type === 'coin') {
                    consecutiveCoins = 0; coinComboMultiplier = 1; // Missed a coin, break combo
                }
                scene.remove(ent); entities.splice(i, 1); 
            }
        }

        if(!isGameOver) {
            document.getElementById('dangerOverlayL').style.opacity = dangerL ? "1" : "0";
            document.getElementById('dangerOverlayC').style.opacity = dangerC ? "1" : "0";
            document.getElementById('dangerOverlayR').style.opacity = dangerR ? "1" : "0";
        }

        // Shadow update
        shadowBlob.position.x = playerGroup.position.x; shadowBlob.position.z = playerGroup.position.z;
        const shScale = Math.max(0.3, 1 - (playerGroup.position.y / 8));
        shadowBlob.scale.set(shScale * 1.5, shScale * 1.5, 1);
        shadowBlob.material.opacity = shScale * 0.8;
    }
    renderer.render(scene, camera);
}
animate();
