// WebGL shader source code

// Vertex shader
const vertexShaderSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;

void main() {
    // Convert pixel position to clip space (-1 to 1)
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
    // Y is flipped in WebGL compared to canvas
    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0, 1);
}
`;

// Fragment shader
const fragmentShaderSource = `
precision mediump float;
uniform vec4 u_color;

void main() {
    gl_FragColor = u_color;
}
`;

// Model functions to create spaceship vertices

// Create player spaceship vertices
function createPlayerSpaceshipVertices(x, y, size) {
    const halfSize = size / 2;
    return new Float32Array([
        // Main body
        x - halfSize, y,
        x + halfSize, y,
        x, y + size,
        
        // Left wing
        x - halfSize, y,
        x - size, y - halfSize,
        x - halfSize, y - halfSize,
        
        // Right wing
        x + halfSize, y,
        x + size, y - halfSize,
        x + halfSize, y - halfSize,
        
        // Exhaust
        x - halfSize/2, y,
        x + halfSize/2, y,
        x, y - halfSize
    ]);
}

// Create enemy spaceship vertices
function createEnemySpaceshipVertices(x, y, size, type) {
    const halfSize = size / 2;
    
    // Basic enemy (triangular shape)
    if (type === 0) {
        return new Float32Array([
            // Main body (inverted triangle)
            x, y,
            x - halfSize, y + size,
            x + halfSize, y + size,
            
            // Left wing
            x - halfSize, y + size,
            x - size, y + size * 0.7,
            x - halfSize, y + size * 0.7,
            
            // Right wing
            x + halfSize, y + size,
            x + size, y + size * 0.7,
            x + halfSize, y + size * 0.7,
            
            // Cockpit (small triangle on top)
            x - halfSize * 0.3, y + halfSize * 0.5,
            x + halfSize * 0.3, y + halfSize * 0.5,
            x, y
        ]);
    } 
    // Advanced enemy (diamond shape)
    else if (type === 1) {
        return new Float32Array([
            // Diamond body
            x, y,
            x - halfSize, y + halfSize,
            x, y + size,
            
            x, y,
            x, y + size,
            x + halfSize, y + halfSize,
            
            // Side wings
            x - halfSize, y + halfSize,
            x - size, y + halfSize,
            x - halfSize * 0.8, y + halfSize * 1.3,
            
            x + halfSize, y + halfSize,
            x + size, y + halfSize,
            x + halfSize * 0.8, y + halfSize * 1.3,
            
            // Cockpit
            x - halfSize * 0.3, y + halfSize * 0.8,
            x + halfSize * 0.3, y + halfSize * 0.8,
            x, y + halfSize * 0.4
        ]);
    }
    // Boss enemy (larger, more complex)
    else if (type === 2) {
        return new Float32Array([
            // Main body (hexagon-like)
            x, y,
            x - halfSize, y + halfSize,
            x - halfSize, y + size - halfSize,
            
            x, y,
            x - halfSize, y + size - halfSize,
            x, y + size,
            
            x, y,
            x, y + size,
            x + halfSize, y + size - halfSize,
            
            x, y,
            x + halfSize, y + size - halfSize,
            x + halfSize, y + halfSize,
            
            // Wings
            x - halfSize, y + halfSize,
            x - size * 1.2, y + halfSize,
            x - halfSize, y + size - halfSize,
            
            x + halfSize, y + halfSize,
            x + size * 1.2, y + halfSize,
            x + halfSize, y + size - halfSize,
            
            // Antennas
            x - halfSize * 0.3, y,
            x - halfSize * 0.5, y - halfSize * 0.5,
            x, y,
            
            x + halfSize * 0.3, y,
            x + halfSize * 0.5, y - halfSize * 0.5,
            x, y
        ]);
    }
    // Mystery UFO (circular approximation)
    else if (type === 3) {
        const segments = 8;
        const vertices = [];
        
        // Create a polygon to approximate a circle
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            vertices.push(x, y);
            vertices.push(x + Math.cos(angle1) * halfSize, y + Math.sin(angle1) * halfSize * 0.6);
            vertices.push(x + Math.cos(angle2) * halfSize, y + Math.sin(angle2) * halfSize * 0.6);
        }
        
        // Add top dome
        for (let i = 0; i < segments/2; i++) {
            const angle1 = (i / (segments/2)) * Math.PI;
            const angle2 = ((i + 1) / (segments/2)) * Math.PI;
            
            vertices.push(x, y);
            vertices.push(x + Math.cos(angle1) * halfSize * 0.5, y - Math.sin(angle1) * halfSize * 0.4);
            vertices.push(x + Math.cos(angle2) * halfSize * 0.5, y - Math.sin(angle2) * halfSize * 0.4);
        }
        
        return new Float32Array(vertices);
    }
    // Default to basic enemy if type is invalid
    else {
        return createEnemySpaceshipVertices(x, y, size, 0);
    }
}