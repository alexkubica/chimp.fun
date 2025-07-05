const { createCanvas } = require('canvas');
const fs = require('fs');

// Create a larger canvas for better visibility - one line version
const width = 200;
const height = 30; // Smaller height for one line
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Set transparent background
ctx.clearRect(0, 0, width, height);

// Set font and text properties - larger and bolder
ctx.font = 'bold 14px monospace';
ctx.fillStyle = 'white';
ctx.strokeStyle = 'black';
ctx.lineWidth = 2;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Draw the single line text with outline for better visibility
const text = 'MADE IN CHIMP.FUN!';

// Draw text outline (stroke) first
ctx.strokeText(text, width / 2, height / 2);

// Draw the filled text on top
ctx.fillText(text, width / 2, height / 2);

// Save the image as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/credit-oneline.png', buffer);

console.log('One-line watermark created successfully!');