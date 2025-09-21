// River Run - simple modern River Raid-like game
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let DPR = Math.max(1, window.devicePixelRatio || 1);

const scoreEl = document.getElementById('score');
const fuelEl = document.getElementById('fuel');
const livesEl = document.getElementById('lives');
const startBtn = document.getElementById('start');

// Mobile controls
const controls = {
  left: document.getElementById('left'),
  right: document.getElementById('right'),
  up: document.getElementById('up'),
  down: document.getElementById('down'),
  fire: document.getElementById('fire')
};

const CONFIG = {
  shipSpeed: 220,
  bulletSpeed: 500,
  spawnFreq: 1.2, // seconds per enemy spawn (will scale)
  maxEnemies: 6,
  fuelDrain: 6 // per second
};

let keys = {};
let game = null;

function resize(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * DPR);
  // keep aspect ratio ~16:9-ish based on css height
  canvas.height = Math.floor(rect.height * DPR);
}
window.addEventListener('resize', ()=>{ DPR = Math.max(1, window.devicePixelRatio || 1); resize(); if(game) game.onResize(); });

class Ship {
  constructor(x,y){
    this.x = x; this.y = y; this.w = 42; this.h = 28;
    this.cool = 0;
  }
  update(dt){
    if(keys['ArrowLeft']||keys['a']||keys['touchLeft']) this.x -= CONFIG.shipSpeed*dt;
    if(keys['ArrowRight']||keys['d']||keys['touchRight']) this.x += CONFIG.shipSpeed*dt;
    if(keys['ArrowUp']||keys['w']||keys['touchUp']) this.y -= CONFIG.shipSpeed*dt;
    if(keys['ArrowDown']||keys['s']||keys['touchDown']) this.y += CONFIG.shipSpeed*dt;
    this.x = Math.max(12, Math.min((canvas.width/DPR)-this.w-12, this.x));
    this.y = Math.max(12, Math.min((canvas.height/DPR)-this.h-12, this.y));
    if(this.cool>0) this.cool = Math.max(0, this.cool-dt);
    if((keys[' ']|0) || keys['Space'] || keys['mouse'] || keys['touchFire']){
      if(this.cool<=0){ this.cool=0.25; return true; }
    }
    return false;
  }
  draw(){
    ctx.save();
    ctx.translate(this.x, this.y);
    // body
    const g = ctx.createLinearGradient(0,0,this.w,this.h);
    g.addColorStop(0,'#9b7cff'); g.addColorStop(1,'#7ee7f7');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(this.w, this.h/2); ctx.lineTo(this.w/2,0); ctx.lineTo(0,this.h/2); ctx.lineTo(this.w/2,this.h); ctx.closePath();
    ctx.fill();
    // cockpit
    ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillRect(this.w*0.45,this.h*0.25, this.w*0.2, this.h*0.2);
    ctx.restore();
  }
}

class Bullet {
  constructor(x,y,vy){ this.x=x; this.y=y; this.w=4; this.h=10; this.vy=vy; this.dead=false; }
  update(dt){ this.y += this.vy*dt; if(this.y < -20 || this.y > canvas.height/DPR+20) this.dead=true; }
  draw(){ ctx.fillStyle = '#fff'; ctx.fillRect(this.x,this.y,this.w,this.h); }
}

class Enemy {
  constructor(x,y,vy,kind=0){ this.x=x; this.y=y; this.w=36; this.h=24; this.vy=vy; this.kind=kind; this.dead=false; }
  update(dt){ this.y += this.vy*dt; if(this.y > canvas.height/DPR+40) this.dead=true; }
  draw(){ ctx.save(); ctx.translate(this.x,this.y); ctx.fillStyle = (this.kind? '#ffb86b':'#ffd6f7'); ctx.fillRect(0,0,this.w,this.h); ctx.restore(); }
  collides(o){ return !(this.x+this.w < o.x || this.x > o.x+o.w || this.y+this.h < o.y || this.y > o.y+o.h); }
}

class Game {
  constructor(){ this.reset(); }
  reset(){
    this.score=0; this.lives=3; this.fuel=100; this.t=0; this.spawnTimer=0;
    this.ship = new Ship((canvas.width/DPR)/2 - 20, (canvas.height/DPR)/2 + 80);
    this.bullets = []; this.enemies=[]; this.bgOffset=0; this.paused=false;
    this.updateUI();
  }
  onResize(){ this.ship.x = Math.min(this.ship.x, (canvas.width/DPR)-this.ship.w-12); }
  updateUI(){ scoreEl.textContent = 'Score: '+this.score; fuelEl.textContent = 'Fuel: '+Math.max(0,Math.floor(this.fuel))+'%'; livesEl.textContent = 'Lives: '+this.lives; }
  update(dt){
    if(this.paused) return;
    this.t += dt; this.bgOffset += dt*60;
    // movement and firing
    const fired = this.ship.update(dt);
    if(fired) this.bullets.push(new Bullet(this.ship.x + this.ship.w/2 - 2, this.ship.y - 12, -CONFIG.bulletSpeed));
    // bullets
    this.bullets.forEach(b=>b.update(dt)); this.bullets = this.bullets.filter(b=>!b.dead);
    // spawn enemies (from top scrolling toward bottom)
    this.spawnTimer -= dt;
    const difficulty = Math.max(0.6, CONFIG.spawnFreq - Math.min(0.7, this.t/60));
    if(this.spawnTimer <= 0){
      this.spawnTimer = difficulty;
      if(this.enemies.length < CONFIG.maxEnemies){
        const ex = 20 + Math.random()*((canvas.width/DPR)-80);
        const ev = 40 + Math.random()*80;
        this.enemies.push(new Enemy(ex, -40, ev, Math.random()>0.6?1:0));
      }
    }
    // update enemies
    this.enemies.forEach(e=>e.update(dt));
    this.enemies = this.enemies.filter(e=>!e.dead);
    // collisions: bullets vs enemies
    for(const b of this.bullets){ for(const e of this.enemies){ if(!e.dead && e.collides(b)){ e.dead=true; b.dead=true; this.score += 150; } } }
    // collisions: enemies vs ship
    for(const e of this.enemies){ if(!e.dead && e.collides(this.ship)){ e.dead=true; this.lives--; this.shipHit(); if(this.lives<=0){ this.gameOver(); } } }
    // fuel drain and bounds
    this.fuel -= CONFIG.fuelDrain * dt;
    if(this.fuel <= 0){ this.lives = 0; this.gameOver(); }
    this.updateUI();
  }
  shipHit(){ /* small effect could be added */ }
  gameOver(){ this.paused = true; setTimeout(()=>{ alert('Game Over! Score: '+this.score); this.reset(); this.paused=false; }, 50); }
  draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save(); ctx.scale(DPR,DPR);
    const W = canvas.width/DPR, H = canvas.height/DPR;
    // draw river pattern (simple stripes moving)
    const stripeW = 80;
    ctx.fillStyle = '#012e3f';
    ctx.fillRect(0,0,W,H);
    for(let x = - (this.bgOffset%stripeW); x < W; x += stripeW){
      ctx.fillStyle = 'rgba(18,94,120,0.12)';
      ctx.fillRect(x,0,stripeW*0.6,H);
    }
    // draw enemies
    this.enemies.forEach(e=>e.draw());
    // draw bullets
    this.bullets.forEach(b=>b.draw());
    // draw ship
    this.ship.draw();
    // HUD overlay subtle
    ctx.restore();
  }
}

let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now - last)/1000);
  last = now;
  if(game) game.update(dt), game.draw();
  requestAnimationFrame(loop);
}

// Input handling
window.addEventListener('keydown', e=>{ keys[e.key]=true; if(e.key===' ') keys['Space']=true; });
window.addEventListener('keyup', e=>{ keys[e.key]=false; if(e.key===' ') keys['Space']=false; });
window.addEventListener('blur', ()=>{ keys={}; });

// Pointer controls for mobile buttons
controls.left.addEventListener('pointerdown', ()=>keys['touchLeft']=true); controls.left.addEventListener('pointerup', ()=>keys['touchLeft']=false);
controls.right.addEventListener('pointerdown', ()=>keys['touchRight']=true); controls.right.addEventListener('pointerup', ()=>keys['touchRight']=false);
controls.up.addEventListener('pointerdown', ()=>keys['touchUp']=true); controls.up.addEventListener('pointerup', ()=>keys['touchUp']=false);
controls.down.addEventListener('pointerdown', ()=>keys['touchDown']=true); controls.down.addEventListener('pointerup', ()=>keys['touchDown']=false);
controls.fire.addEventListener('pointerdown', ()=>{ keys['touchFire']=true; setTimeout(()=>keys['touchFire']=false,160); });

startBtn.addEventListener('click', ()=>{ if(game){ game.reset(); } });

function init(){
  resize();
  // show mobile controls only on small screens
  const isMobile = /Mobi|Android|iPhone|iPad|Phone/.test(navigator.userAgent);
  document.getElementById('controls').style.display = isMobile? 'flex':'none';
  game = new Game();
  requestAnimationFrame(loop);
}
init();
