script// Modern Space Invaders - ES module
// Save as game.js and referenced by index.html


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let DPR = Math.max(1, window.devicePixelRatio || 1);


// UI elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const mobileControls = document.getElementById('mobileControls');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const fireBtn = document.getElementById('fireBtn');


// Game constants
const CONFIG = {
playerSpeed: 320,
bulletSpeed: 700,
invaderCols: 8,
invaderRows: 4,
invaderPadding: 18,
invaderSpeedBase: 40,
canvasRatio: 16/9
};


let keys = {};
let game = null;


function resizeCanvas(){
const rect = canvas.getBoundingClientRect();
canvas.width = Math.floor(rect.width * DPR);
canvas.height = Math.floor(rect.width / CONFIG.canvasRatio * DPR);
}

