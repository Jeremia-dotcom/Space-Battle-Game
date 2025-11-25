// Main game logic

window.onload = function () {
    const canvas = document.getElementById("gameCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = initWebGL(canvas);
    if (!gl) return;

    // Create and compile shaders
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // Set up attributes and uniforms
    const positionBuffer = gl.createBuffer();
    const positionAttrib = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
    const colorUniform = gl.getUniformLocation(program, "u_color");
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height);

    // Game variables
    let score = 0;
    let highScore = 0;
    let gameSpeed = 1;
    let speedIncreaseThreshold = 500; // Increase speed every 500 points
    let playerAlive = true;
    let playerWon = false;
    let explosionParticles = [];
    let enemyBullets = [];
    let enemiesKilled = 0;
    let enemiesNeededToWin = 5; // Win after killing this many enemies
    let currentLevel = 1;
    let maxLevel = 5;
    let bossFighting = false;
    let gameStarted = false;

    let player = { 
        x: canvas.width / 2, 
        y: canvas.height - 100, 
        size: 30,
        getVertices: function() {
            return createPlayerSpaceshipVertices(this.x, this.y, this.size);
        },
        // Hitbox for collision detection
        getHitbox: function() {
            return {
                x: this.x - this.size/2,
                y: this.y - this.size/2,
                width: this.size,
                height: this.size
            };
        }
    };
    
    let bullets = [];
    let enemies = [];
    let powerups = [];

    // Enemy types with different colors and properties
    const enemyTypes = [
        { color: [1.0, 0.0, 0.0], points: 100, health: 1, speed: 1.0 },   // Red - basic
        { color: [0.8, 0.0, 0.8], points: 150, health: 2, speed: 1.3 },   // Purple - medium
        { color: [0.5, 0.0, 0.5], points: 200, health: 3, speed: 1.7 },   // Dark purple - advanced
        { color: [0.0, 0.7, 0.0], points: 300, health: 4, speed: 0.8 }    // Green - tank
    ];

    // Boss enemy that appears at certain levels
    const bossType = { color: [0.9, 0.2, 0.0], points: 1000, health: 15, speed: 0.5 };

    // Create explosion effect at given location
    function createExplosion(x, y, scale = 1) {
        const particleCount = 30 * scale;
        const explosionColors = [
            [1.0, 0.3, 0.0], // Orange
            [1.0, 0.6, 0.0], // Light orange
            [1.0, 0.8, 0.0], // Yellow
            [1.0, 0.0, 0.0]  // Red
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1 + Math.random() * 3) * scale;
            const size = (3 + Math.random() * 5) * scale;
            const life = 30 + Math.random() * 30;
            const colorIndex = Math.floor(Math.random() * explosionColors.length);
            
            explosionParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: explosionColors[colorIndex],
                life: life,
                maxLife: life
            });
        }
    }

    // Create victory celebration effect
    function createVictoryEffect() {
        // Create multiple explosions across the screen
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const x = Math.random() * canvas.width;
                const y = Math.random() * (canvas.height / 2);
                createExplosion(x, y, 1.5);
            }, i * 300);
        }
    }

    function update() {
        if (!gameStarted) return;
        
        // Update explosion particles
        for (let i = explosionParticles.length - 1; i >= 0; i--) {
            const particle = explosionParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                explosionParticles.splice(i, 1);
            }
        }

        if (!playerAlive || playerWon) return;

        // Update player bullets
        bullets.forEach(bullet => bullet.y -= 5 * gameSpeed);
        
        // Update enemy bullets
        enemyBullets.forEach(bullet => bullet.y += (3 + bullet.speed) * gameSpeed);
        
        // Update enemies
        enemies.forEach(enemy => {
            enemy.y += enemy.speed * gameSpeed * (enemy.isBoss ? 0.5 : 1);
            
            // Add different movement patterns based on enemy type
            if (enemy.movePattern === 'zigzag') {
                enemy.x += Math.sin(enemy.y * 0.05) * 1.5;
            } else if (enemy.movePattern === 'sweep') {
                enemy.x += enemy.direction * 1.2;
                if (enemy.x < 0 || enemy.x > canvas.width - enemy.size) {
                    enemy.direction *= -1;
                }
            } else if (enemy.movePattern === 'spiral') {
                const angle = enemy.y * 0.03;
                enemy.x = canvas.width/2 + Math.cos(angle) * 200;
            } else if (enemy.movePattern === 'sine') {
                enemy.x = enemy.startX + Math.sin(enemy.y * 0.02) * 100;
            }
            
            // Bosses have a more complex firing pattern
            if (enemy.isBoss) {
                if (Math.random() < 0.05 * gameSpeed) {
                    // Spread fire pattern for boss
                    for (let i = -2; i <= 2; i++) {
                        enemyBullets.push({ 
                            x: enemy.x + i * 20, 
                            y: enemy.y + enemy.size, 
                            width: 6, 
                            height: 12,
                            speed: 2 + Math.abs(i) * 0.5,
                            color: [1.0, 0.3, 0.0]
                        });
                    }
                }
            } 
            // Regular enemies shoot occasionally
            else if (Math.random() < 0.002 * gameSpeed * enemy.fireRate) {
                enemyBullets.push({ 
                    x: enemy.x, 
                    y: enemy.y + enemy.size, 
                    width: 4, 
                    height: 10,
                    speed: 1 + enemy.type * 0.5,
                    color: [1.0, 0.5, 0.0]
                });
            }
        });

        // Update powerups
        powerups.forEach(powerup => {
            powerup.y += 1 * gameSpeed;
            powerup.rotation += 0.05;
        });

        // Remove bullets and enemies that are off-screen
        bullets = bullets.filter(bullet => bullet.y > 0);
        enemies = enemies.filter(enemy => enemy.y < canvas.height);
        enemyBullets = enemyBullets.filter(bullet => bullet.y < canvas.height);
        powerups = powerups.filter(powerup => powerup.y < canvas.height);

        // Check for bullet-enemy collisions
        for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
            const bullet = bullets[bIndex];
            const bulletRect = {
                x: bullet.x,
                y: bullet.y,
                width: 5,
                height: 10
            };
            
            let bulletHit = false;
            
            for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
                const enemy = enemies[eIndex];
                const enemyRect = {
                    x: enemy.x - enemy.size/2,
                    y: enemy.y,
                    width: enemy.size,
                    height: enemy.size
                };
                
                if (checkCollision(bulletRect, enemyRect)) {
                    enemy.health--;
                    bulletHit = true;
                    
                    // Enemy destroyed
                    if (enemy.health <= 0) {
                        // Create small explosion at enemy position
                        createExplosion(enemy.x, enemy.y + enemy.size/2, enemy.isBoss ? 2 : 1);
                        
                        enemies.splice(eIndex, 1);
                        score += enemy.points;
                        enemiesKilled++;
                        
                        // Chance to drop powerup
                        if (Math.random() < 0.1) {
                            powerups.push({
                                x: enemy.x,
                                y: enemy.y,
                                size: 15,
                                type: Math.floor(Math.random() * 3), // 0: speed, 1: rapid fire, 2: shield
                                rotation: 0
                            });
                        }
                        
                        // Check for level completion
                        if (enemiesKilled >= enemiesNeededToWin) {
                            if (currentLevel < maxLevel) {
                                playerWon = true;
                                createVictoryEffect();
                                setTimeout(() => {
                                    advanceToNextLevel();
                                }, 3000);
                            } else {
                                // Player completed all levels
                                playerWon = true;
                                createVictoryEffect();
                                console.log("Congratulations! You've completed all levels!");
                            }
                        }
                        
                        // Check if we need to increase speed
                        if (score % speedIncreaseThreshold === 0) {
                            gameSpeed += 0.2;
                            console.log(`Speed increased to ${gameSpeed.toFixed(1)}x`);
                        }
                        
                        // Update high score
                        if (score > highScore) {
                            highScore = score;
                        }
                    } else {
                        // Enemy hit but not destroyed - show small hit effect
                        createExplosion(enemy.x, enemy.y + enemy.size/2, 0.5);
                    }
                    
                    break; // A bullet can only hit one enemy
                }
            }
            
            if (bulletHit) {
                bullets.splice(bIndex, 1);
            }
        }

        // Check for player-enemy collisions
        const playerHitbox = player.getHitbox();
        
        // Check for enemy collisions
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const enemyRect = {
                x: enemy.x - enemy.size/2,
                y: enemy.y,
                width: enemy.size,
                height: enemy.size
            };
            
            if (checkCollision(playerHitbox, enemyRect)) {
                createExplosion(player.x, player.y);
                playerAlive = false;
                console.log("Game over! Press R to restart.");
                break;
            }
        }
        
        // Check for enemy bullet collisions
        for (let i = 0; i < enemyBullets.length; i++) {
            const bullet = enemyBullets[i];
            const bulletRect = {
                x: bullet.x,
                y: bullet.y,
                width: bullet.width,
                height: bullet.height
            };
            
            if (checkCollision(playerHitbox, bulletRect)) {
                createExplosion(player.x, player.y);
                playerAlive = false;
                console.log("Game over! Press R to restart.");
                break;
            }
        }

        // Check for powerup collisions
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            const powerupRect = {
                x: powerup.x - powerup.size/2,
                y: powerup.y - powerup.size/2,
                width: powerup.size,
                height: powerup.size
            };
            
            if (checkCollision(playerHitbox, powerupRect)) {
                // Apply powerup effect
                if (powerup.type === 0) {
                    // Speed boost
                    gameSpeed += 0.3;
                    setTimeout(() => gameSpeed -= 0.3, 5000);
                } else if (powerup.type === 1) {
                    // Rapid fire - implemented through UI
                    console.log("Rapid fire activated!");
                } else if (powerup.type === 2) {
                    // Shield - would need additional implementation
                    console.log("Shield activated!");
                }
                
                powerups.splice(i, 1);
            }
        }

        // Spawn new enemies based on level difficulty
        if (Math.random() < 0.01 * gameSpeed * (currentLevel / 2)) {
            // Higher chance of advanced enemies in later levels
            let enemyTypeIndex = Math.floor(Math.random() * enemyTypes.length);
            // Bias toward higher-tier enemies in higher levels
            enemyTypeIndex = Math.min(enemyTypeIndex + Math.floor((currentLevel - 1) / 2), enemyTypes.length - 1);
            
            const enemyType = enemyTypes[enemyTypeIndex];
            
            // Different movement patterns
            const patterns = ['straight', 'zigzag', 'sweep', 'sine', 'spiral'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            enemies.push({ 
                x: Math.random() * (canvas.width - 40) + 20, 
                y: 0, 
                size: 25 + Math.random() * 10,
                type: enemyTypeIndex,
                color: enemyType.color,
                points: enemyType.points,
                health: enemyType.health * currentLevel / 2,
                speed: enemyType.speed,
                movePattern: pattern,
                direction: Math.random() > 0.5 ? 1 : -1,
                fireRate: 1 + enemyTypeIndex * 0.5,  // Higher tier enemies shoot more often
                startX: Math.random() * (canvas.width - 40) + 20,
                isBoss: false
            });
        }
        
        // Spawn a boss enemy at certain intervals or when enough enemies have been killed
        if (enemiesKilled > 0 && enemiesKilled % 20 === 0 && !bossFighting) {
            spawnBossEnemy();
        }
    }
    
    function spawnBossEnemy() {
        bossFighting = true;
        
        // Spawn a boss at the top center of the screen
        enemies.push({
            x: canvas.width / 2,
            y: 50,
            size: 50,
            type: 2, // Boss type
            color: bossType.color,
            points: bossType.points * currentLevel,
            health: bossType.health * currentLevel,
            speed: bossType.speed,
            movePattern: 'sweep',
            direction: 1,
            fireRate: 3,
            startX: canvas.width / 2,
            isBoss: true
        });
        
        console.log("Boss enemy has appeared!");
        
        // Reset boss flag after some time if boss was not destroyed
        setTimeout(() => {
            bossFighting = false;
        }, 30000);
    }
    
    function advanceToNextLevel() {
        currentLevel++;
        enemiesKilled = 0;
        playerWon = false;
        enemiesNeededToWin += 10; // More enemies required for next level
        enemies = []; // Clear all enemies
        enemyBullets = []; // Clear all bullets
        
        console.log(`Level ${currentLevel} started! Defeat ${enemiesNeededToWin} enemies to advance.`);
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw player spaceship
        if (playerAlive && gameStarted) {
            drawSpaceship(gl, program, colorUniform, player.getVertices(), [0.2, 0.8, 1.0]);
        }

        // Draw player bullets
        bullets.forEach(bullet => {
            drawRectangle(gl, program, colorUniform, bullet.x, bullet.y, 5, 10, [1, 1, 0]);
        });
        
        // Draw enemy bullets
        enemyBullets.forEach(bullet => {
            drawRectangle(gl, program, colorUniform, bullet.x, bullet.y, bullet.width, bullet.height, bullet.color || [1, 0.5, 0]);
        });

        // Draw enemies
        enemies.forEach(enemy => {
            const enemyVertices = createEnemySpaceshipVertices(enemy.x, enemy.y, enemy.size, enemy.type);
            drawSpaceship(gl, program, colorUniform, enemyVertices, enemy.color);
        });
        
        // Draw powerups
        powerups.forEach(powerup => {
            let color;
            if (powerup.type === 0) color = [0, 1, 0]; // Green for speed
            else if (powerup.type === 1) color = [1, 1, 0]; // Yellow for rapid fire
            else color = [0, 0.5, 1]; // Blue for shield
            
            drawParticle(gl, program, colorUniform, powerup.x, powerup.y, powerup.size, color);
        });
        
        // Draw explosion particles
        explosionParticles.forEach(particle => {
            drawParticle(gl, program, colorUniform, particle.x, particle.y, particle.size, particle.color);
        });

        // Draw score and game status
        drawScore();
    }

    function drawScore() {
        // We'll use HTML/CSS for the score display since WebGL text is complex
        const scoreDisplay = document.getElementById("scoreDisplay") || createScoreDisplay();
        
        if (!gameStarted) {
            scoreDisplay.style.display = "none";
            return;
        }
        
        scoreDisplay.style.display = "block";
        scoreDisplay.innerHTML = `Score: ${score} | High Score: ${highScore} | Speed: ${gameSpeed.toFixed(1)}x | Level: ${currentLevel} | Enemies Killed: ${enemiesKilled}/${enemiesNeededToWin}`;
        
        if (!playerAlive) {
            scoreDisplay.innerHTML += " | GAME OVER - Press R to restart";
        } else if (playerWon && currentLevel >= maxLevel) {
            scoreDisplay.innerHTML += " | CONGRATULATIONS! YOU WON! - Press R to play again";
        } else if (playerWon) {
            scoreDisplay.innerHTML += " | LEVEL COMPLETE! Advancing to next level...";
        }
    }

    function resetGame() {
        player = { 
            x: canvas.width / 2, 
            y: canvas.height - 100, 
            size: 30,
            getVertices: function() {
                return createPlayerSpaceshipVertices(this.x, this.y, this.size);
            },
            getHitbox: function() {
                return {
                    x: this.x - this.size/2,
                    y: this.y - this.size/2,
                    width: this.size,
                    height: this.size
                };
            }
        };
        bullets = [];
        enemies = [];
        enemyBullets = [];
        powerups = [];
        explosionParticles = [];
        score = 0;
        gameSpeed = 1;
        playerAlive = true;
        playerWon = false;
        enemiesKilled = 0;
        currentLevel = 1;
        enemiesNeededToWin = 50;
        bossFighting = false;
    }

    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // Create instruction display
    const instructions = createInstructions(enemiesNeededToWin);
    
    // Start game when instructions are dismissed
    document.addEventListener('click', function() {
        if (!gameStarted && instructions.style.display === 'none') {
            gameStarted = true;
        }
    });

    // Player movement and controls
    window.addEventListener("keydown", function (event) {
        if ((!playerAlive || (playerWon && currentLevel >= maxLevel)) && event.key === "r") {
            resetGame();
            return;
        }
        
        if (!playerAlive || playerWon || !gameStarted) return;
        
        if (event.key === "ArrowLeft" && player.x > player.size/2) {
            player.x -= 15;
        }
        if (event.key === "ArrowRight" && player.x < canvas.width - player.size/2) {
            player.x += 15;
        }
        if (event.key === "Arrowup" && player.y < canvas.width - player.size/2) {
            player.y += 15;
        }
        if (event.key === "Arrowdown" && player.y < canvas.width - player.size/2) {
            player.y -= 15;
        }

        if (event.key === " ") {
            bullets.push({ x: player.x - 2.5, y: player.y, size: 5 });
        }
    });

    // Handle window resize
    window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
        
        // Adjust player position to make sure it's in-bounds
        player.x = Math.min(Math.max(player.x, player.size/2), canvas.width - player.size/2);
        player.y = canvas.height - 100;
    });

    gl.clearColor(0, 0, 0, 1);
    gameLoop();
};