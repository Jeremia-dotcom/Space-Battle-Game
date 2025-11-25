// WebGL initialization and utility functions

// Initialize WebGL context
function initWebGL(canvas) {
    const gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");
        return null;
    }
    return gl;
}

// Create and compile WebGL shader program
function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
        return null;
    }
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
        return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}

// Drawing functions
function drawSpaceship(gl, program, colorUniform, vertices, color) {
    gl.uniform4f(colorUniform, color[0], color[1], color[2], 1);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

function drawRectangle(gl, program, colorUniform, x, y, width, height, color) {
    gl.uniform4f(colorUniform, color[0], color[1], color[2], 1);
    const vertices = new Float32Array([
        x, y,
        x + width, y,
        x, y + height,
        x, y + height,
        x + width, y,
        x + width, y + height
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawParticle(gl, program, colorUniform, x, y, size, color) {
    gl.uniform4f(colorUniform, color[0], color[1], color[2], 1);
    const halfSize = size / 2;
    const vertices = new Float32Array([
        x - halfSize, y - halfSize,
        x + halfSize, y - halfSize,
        x - halfSize, y + halfSize,
        x - halfSize, y + halfSize,
        x + halfSize, y - halfSize,
        x + halfSize, y + halfSize
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Create display elements
function createScoreDisplay() {
    const display = document.createElement("div");
    display.id = "scoreDisplay";
    display.style.position = "absolute";
    display.style.top = "10px";
    display.style.left = "10px";
    display.style.color = "white";
    display.style.fontFamily = "Arial, sans-serif";
    display.style.fontSize = "16px";
    document.body.appendChild(display);
    return display;
}

// Create UI elements for game start
function createInstructions(enemiesNeededToWin) {
    const instructions = document.createElement('div');
    instructions.id = 'instructions';
    instructions.style.position = 'absolute';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.color = 'white';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '24px';
    instructions.style.textAlign = 'center';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructions.style.padding = '20px';
    instructions.style.borderRadius = '10px';
    instructions.style.zIndex = '100';
    instructions.innerHTML = `
        <h1>Space Battle</h1>
        <p>Use ← → arrow keys to move</p>
        <p>Press SPACE to shoot</p>
        <p>Defeat ${enemiesNeededToWin} enemies to complete Level 1</p>
        <p>Click anywhere to start</p>
        <p>Ntshwane Jeremia Mphorane</p>
    `;
    document.body.appendChild(instructions);
    
    document.addEventListener('click', function() {
        if (instructions.style.display !== 'none') {
            instructions.style.display = 'none';
        }
    });
    
    return instructions;
}

// Check for collision between two rectangles
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}