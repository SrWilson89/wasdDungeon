/**
 * DRAGONES Y MAZMORRAS - RPG con Enemigos y Jefe Final
 * - Generación procedural de laberintos
 * - Sistema de combate por turnos
 * - Enemigos que otorgan puntos de mejora según distancia a la salida
 * - Jefe final antes de la salida
 * - Mejora de estadísticas con puntos acumulados
 */

// ========== 1. Variables globales ==========
let mazeData = [];          // Matriz: 0=path, 1=wall, 2=exit, 3=event, 4=speed, 5=enemy, 6=boss
let rows = 15, cols = 15;
let playerRow, playerCol;
let gameWin = false;
let bossDefeated = false;   // Indica si el jefe ya fue derrotado
let upgradePoints = 0;      // Puntos para mejorar stats (XP)

let character = {
    name: "???",
    str: 5,   // Fuerza (ataque)
    hp: 5,    // Vida actual
    maxHp: 5,
    mag: 5,   // Magia (no usado directamente en combate por ahora)
    luk: 5,   // Suerte (afecta críticos)
    spd: 5    // Velocidad (afecta evasión)
};
let extraPoints = 6;

// Elementos DOM
const creatorDiv = document.getElementById('character-creator');
const gameScreen = document.getElementById('game-screen');
const gameContainer = document.getElementById('game-container');
const messageArea = document.getElementById('message-area');
const resetBtn = document.getElementById('reset-btn');
const upgradeBtn = document.getElementById('upgrade-btn');
const upgradeModal = document.getElementById('upgrade-modal');
const closeModalBtn = document.getElementById('close-modal');
const upgradePointsSpan = document.getElementById('upgrade-points');
const heroNameDisplay = document.getElementById('hero-name-display');
const statStrDisplay = document.getElementById('stat-str-display');
const statHpDisplay = document.getElementById('stat-hp-display');
const statHpMax = document.getElementById('stat-hp-max');
const statMagDisplay = document.getElementById('stat-mag-display');
const statLukDisplay = document.getElementById('stat-luk-display');
const statSpdDisplay = document.getElementById('stat-spd-display');
const statPointsDisplay = document.getElementById('stat-points-display');

// ========== 2. Generador de laberinto (con enemigos y jefe) ==========
function generateMaze(w, h) {
    // Inicializar todo como pared (1)
    let maze = Array(h).fill().map(() => Array(w).fill(1));
    
    function getNeighbors(x, y) {
        let neighbors = [];
        if (x > 1 && maze[y][x-2] === 1) neighbors.push([x-2, y]);
        if (x < w-2 && maze[y][x+2] === 1) neighbors.push([x+2, y]);
        if (y > 1 && maze[y-2][x] === 1) neighbors.push([x, y-2]);
        if (y < h-2 && maze[y+2][x] === 1) neighbors.push([x, y+2]);
        return neighbors;
    }
    
    let startX = 1, startY = 1;
    maze[startY][startX] = 0;
    let stack = [[startX, startY]];
    while (stack.length) {
        let [x, y] = stack[stack.length-1];
        let neighbors = getNeighbors(x, y);
        if (neighbors.length) {
            let [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
            let midX = (x + nx) / 2;
            let midY = (y + ny) / 2;
            maze[ny][nx] = 0;
            maze[midY][midX] = 0;
            stack.push([nx, ny]);
        } else {
            stack.pop();
        }
    }
    
    // Bordes como paredes
    for (let i = 0; i < h; i++) maze[i][0] = maze[i][w-1] = 1;
    for (let j = 0; j < w; j++) maze[0][j] = maze[h-1][j] = 1;
    
    // Colocar salida (2) en algún borde interior
    let exitPos = null;
    for (let i = h-2; i > 0 && !exitPos; i--) {
        for (let j = w-2; j > 0; j--) {
            if (maze[i][j] === 0 && (i === h-2 || j === w-2 || i === 1 || j === 1)) {
                maze[i][j] = 2;
                exitPos = [j, i];
                break;
            }
        }
    }
    if (!exitPos) {
        maze[h-2][w-2] = 2;
        exitPos = [w-2, h-2];
    }
    
    // Colocar jefe (6) en una celda adyacente a la salida (que no sea pared)
    let bossPlaced = false;
    let bossPos = null;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let [dx, dy] of dirs) {
        let nx = exitPos[0] + dx;
        let ny = exitPos[1] + dy;
        if (nx > 0 && nx < w-1 && ny > 0 && ny < h-1 && maze[ny][nx] === 0) {
            maze[ny][nx] = 6;
            bossPlaced = true;
            bossPos = [nx, ny];
            break;
        }
    }
    if (!bossPlaced) {
        // Fallback: colocar jefe en la misma salida (no ideal pero funcional)
        maze[exitPos[1]][exitPos[0]] = 6;
        bossPos = exitPos;
    }
    
    // Colocar eventos (3) y velocidad (4) en caminos (excepto inicio, salida, jefe)
    let eventCount = Math.floor(Math.random() * 5) + 3;
    for (let e = 0; e < eventCount; e++) {
        let placed = false;
        while (!placed) {
            let x = Math.floor(Math.random() * (w-2)) + 1;
            let y = Math.floor(Math.random() * (h-2)) + 1;
            if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === exitPos[0] && y === exitPos[1]) && !(bossPos && x === bossPos[0] && y === bossPos[1])) {
                maze[y][x] = 3;
                placed = true;
            }
        }
    }
    let speedCount = Math.floor(Math.random() * 4) + 2;
    for (let s = 0; s < speedCount; s++) {
        let placed = false;
        while (!placed) {
            let x = Math.floor(Math.random() * (w-2)) + 1;
            let y = Math.floor(Math.random() * (h-2)) + 1;
            if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === exitPos[0] && y === exitPos[1]) && !(bossPos && x === bossPos[0] && y === bossPos[1])) {
                maze[y][x] = 4;
                placed = true;
            }
        }
    }
    
    // Colocar enemigos (5) en caminos restantes
    let enemyCount = Math.floor(Math.random() * 6) + 5; // entre 5 y 10 enemigos
    for (let e = 0; e < enemyCount; e++) {
        let placed = false;
        while (!placed) {
            let x = Math.floor(Math.random() * (w-2)) + 1;
            let y = Math.floor(Math.random() * (h-2)) + 1;
            if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === exitPos[0] && y === exitPos[1]) && !(bossPos && x === bossPos[0] && y === bossPos[1])) {
                maze[y][x] = 5;
                placed = true;
            }
        }
    }
    
    return { maze, exitPos, bossPos };
}

// ========== 3. Renderizado del laberinto ==========
function renderMaze() {
    gameContainer.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    gameContainer.innerHTML = '';
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            const val = mazeData[i][j];
            if (val === 1) cellDiv.classList.add('wall');
            else if (val === 0) cellDiv.classList.add('path');
            else if (val === 2) cellDiv.classList.add('exit');
            else if (val === 3) cellDiv.classList.add('event');
            else if (val === 4) cellDiv.classList.add('speed-tile');
            else if (val === 5) cellDiv.classList.add('enemy');
            else if (val === 6) cellDiv.classList.add('boss');
            
            if (i === playerRow && j === playerCol && !gameWin) {
                cellDiv.classList.add('player');
            } else if (i === playerRow && j === playerCol && gameWin) {
                cellDiv.classList.add('player');
            }
            gameContainer.appendChild(cellDiv);
        }
    }
    if (gameWin) messageArea.innerHTML = "✨ ¡VICTORIA! Has escapado de la mazmorra. ✨";
    updateStatsDisplay();
}

// ========== 4. Sistema de combate ==========
async function combat(enemyType, row, col) {
    // Determinar stats del enemigo según tipo y distancia a la salida
    let enemy = { name: "Enemigo", hp: 0, attack: 0, points: 0 };
    let isBoss = (enemyType === 6);
    
    // Calcular distancia a la salida (para puntos y dificultad)
    let exitPos = null;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (mazeData[i][j] === 2) exitPos = {x: j, y: i};
        }
    }
    let distance = Math.abs(row - exitPos.y) + Math.abs(col - exitPos.x);
    let pointsGain = isBoss ? 8 : Math.min(3, Math.max(1, Math.floor(distance / 4) + 1));
    
    if (isBoss) {
        enemy.name = "DRAGÓN GUARDIÁN";
        enemy.hp = 25 + character.str;  // más fuerte según fuerza del jugador
        enemy.attack = 6 + Math.floor(character.luk / 3);
        enemy.points = pointsGain;
    } else {
        enemy.name = "Orco Salvaje";
        enemy.hp = 8 + Math.floor(Math.random() * 5);
        enemy.attack = 3 + Math.floor(Math.random() * 3);
        enemy.points = pointsGain;
    }
    
    // Mensaje de inicio de combate
    messageArea.innerHTML = `⚔️ ¡Combate contra ${enemy.name}! ⚔️<br>Vida: ${character.hp} vs ${enemy.hp}`;
    await sleep(800);
    
    // Bucle de combate
    while (character.hp > 0 && enemy.hp > 0) {
        // Turno del jugador
        let playerDamage = Math.max(1, character.str + Math.floor(Math.random() * 7) - 2);
        // Crítico por suerte
        if (Math.random() * 20 < character.luk) {
            playerDamage = Math.floor(playerDamage * 1.5);
            messageArea.innerHTML += `<br>✨ ¡Golpe crítico! ✨`;
        }
        enemy.hp -= playerDamage;
        messageArea.innerHTML += `<br>💥 Dañas a ${enemy.name} por ${playerDamage}. Vida restante: ${enemy.hp}`;
        if (enemy.hp <= 0) break;
        await sleep(500);
        
        // Turno del enemigo
        let enemyDamage = Math.max(1, enemy.attack + Math.floor(Math.random() * 5) - 2);
        // Evasión por velocidad
        if (Math.random() * 20 < character.spd) {
            messageArea.innerHTML += `<br>🌀 ¡Esquivas el ataque! 🌀`;
            await sleep(500);
            continue;
        }
        character.hp -= enemyDamage;
        messageArea.innerHTML += `<br>💢 ${enemy.name} te golpea por ${enemyDamage}. Tu vida: ${character.hp}`;
        if (character.hp <= 0) break;
        await sleep(500);
    }
    
    if (character.hp <= 0) {
        // Derrota
        messageArea.innerHTML = `💀 HAS MUERTO ante ${enemy.name}... Game Over. 💀`;
        gameWin = true;
        renderMaze();
        return false;
    } else {
        // Victoria
        messageArea.innerHTML = `🏆 ¡Has derrotado a ${enemy.name}! Obtienes ${enemy.points} puntos de mejora. 🏆`;
        upgradePoints += enemy.points;
        updateStatsDisplay();
        
        // Eliminar enemigo/boss del mapa
        if (isBoss) {
            bossDefeated = true;
            // Convertir la celda del jefe en camino normal
            mazeData[row][col] = 0;
            // Mensaje especial
            messageArea.innerHTML += `<br>🐉 El dragón ha caído. ¡La salida está despejada!`;
        } else {
            mazeData[row][col] = 0;
        }
        renderMaze();
        return true;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 5. Movimiento y lógica principal ==========
function isWalkable(row, col) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
    let val = mazeData[row][col];
    // No se puede pisar pared, pero se puede pisar todo lo demás (incluyendo enemigos/boss)
    return val !== 1;
}

async function tryMove(direction) {
    if (gameWin) return;
    let newRow = playerRow, newCol = playerCol;
    switch (direction) {
        case 'up': newRow--; break;
        case 'down': newRow++; break;
        case 'left': newCol--; break;
        case 'right': newCol++; break;
        default: return;
    }
    if (isWalkable(newRow, newCol)) {
        // Si hay enemigo o jefe, iniciar combate antes de moverse
        const tileType = mazeData[newRow][newCol];
        if (tileType === 5 || tileType === 6) {
            let combatResult = await combat(tileType, newRow, newCol);
            if (!combatResult) {
                // Muerte en combate
                gameWin = true;
                renderMaze();
                return;
            }
            // Después de vencer, el tile ya es camino, podemos mover
        }
        
        // Moverse a la nueva celda
        playerRow = newRow;
        playerCol = newCol;
        renderMaze();
        
        // Comprobar si es salida (solo si el jefe está muerto o no hay jefe)
        if (mazeData[playerRow][playerCol] === 2) {
            if (bossDefeated) {
                gameWin = true;
                messageArea.innerHTML = "🏆 ¡HAS ESCAPADO DE LA MAZMORRA! 🏆";
                renderMaze();
            } else {
                messageArea.innerHTML = "⚠️ ¡El dragón guardián bloquea la salida! Derrota al jefe primero. ⚠️";
            }
            return;
        }
        
        // Eventos especiales (solo si no son enemigos/boss, ya que esos se eliminaron)
        if (mazeData[playerRow][playerCol] === 3) {
            triggerEvent(playerRow, playerCol);
        } else if (mazeData[playerRow][playerCol] === 4) {
            triggerSpeedTile(playerRow, playerCol);
        } else {
            messageArea.innerHTML = "Explorando...";
        }
    } else {
        messageArea.innerHTML = "¡Pared infranqueable!";
        setTimeout(() => {
            if (!gameWin) messageArea.innerHTML = "Busca la salida ⭐ y derrota al dragón.";
        }, 800);
    }
}

// ========== 6. Eventos especiales ==========
function triggerEvent(row, col) {
    let roll = Math.floor(Math.random() * 20) + 1 + character.luk;
    if (roll >= 15) {
        let gain = Math.floor(Math.random() * 3) + 1;
        character.hp = Math.min(character.maxHp, character.hp + gain);
        messageArea.innerHTML = `🍀 ¡Suerte! Encuentras una poción +${gain} ❤️. Vida: ${character.hp}/${character.maxHp}`;
    } else if (roll <= 5) {
        let dmg = Math.floor(Math.random() * 2) + 1;
        character.hp = Math.max(0, character.hp - dmg);
        messageArea.innerHTML = `💀 Mala suerte... una trampa te hiere -${dmg} ❤️. Vida: ${character.hp}/${character.maxHp}`;
        if (character.hp <= 0) {
            gameWin = true;
            messageArea.innerHTML = "💀 HAS MUERTO... La mazmorra te venció. 💀";
            renderMaze();
            return;
        }
    } else {
        messageArea.innerHTML = "🍃 Nada especial, la suerte te observa.";
    }
    mazeData[row][col] = 0;
    renderMaze();
    updateStatsDisplay();
}

function triggerSpeedTile(row, col) {
    let bonus = Math.floor(Math.random() * 2) + 1;
    character.spd += bonus;
    messageArea.innerHTML = `⚡ ¡Velocidad! Tu agilidad aumenta +${bonus}. Velocidad actual: ${character.spd}`;
    mazeData[row][col] = 0;
    renderMaze();
    updateStatsDisplay();
}

// ========== 7. Sistema de mejora de estadísticas ==========
function upgradeStat(stat) {
    if (upgradePoints <= 0) return;
    upgradePoints--;
    if (stat === 'hp') {
        character.maxHp += 3;
        character.hp += 3;
    } else if (stat === 'str') character.str++;
    else if (stat === 'mag') character.mag++;
    else if (stat === 'luk') character.luk++;
    else if (stat === 'spd') character.spd++;
    updateStatsDisplay();
    document.getElementById('upgrade-points').textContent = upgradePoints;
    messageArea.innerHTML = `✨ Has aumentado ${stat.toUpperCase()} en 1. ✨`;
}

// ========== 7b. Curación mágica ==========
let magicHealCooldown = false;

function useMagicHeal() {
    if (magicHealCooldown) {
        messageArea.innerHTML = "⏳ La magia aún se recupera... espera un momento.";
        return;
    }
    if (character.mag <= 1) {
        messageArea.innerHTML = "🔮 No tienes suficiente magia para curar (necesitas al menos 2).";
        return;
    }
    if (character.hp >= character.maxHp) {
        messageArea.innerHTML = "💚 Tu vida ya está al máximo, no es necesario curar.";
        return;
    }
    if (gameWin) return;

    // Consumir 1 punto de magia
    character.mag--;

    // Recuperar entre 25% y 40% de vida máxima
    let pct = (Math.random() * 0.15 + 0.25); // 25% a 40%
    let healAmount = Math.floor(character.maxHp * pct);
    let prevHp = character.hp;
    character.hp = Math.min(character.maxHp, character.hp + healAmount);
    let actual = character.hp - prevHp;

    messageArea.innerHTML = `🔮 ¡Hechizo de curación! Recuperas ${actual} ❤️ (${Math.round(pct*100)}% de vida). Magia restante: ${character.mag}`;
    updateStatsDisplay();

    // Cooldown de 3 segundos
    magicHealCooldown = true;
    const healBtn = document.getElementById('magic-heal-btn');
    if (healBtn) {
        healBtn.disabled = true;
        healBtn.textContent = "🔮 Recargando...";
        setTimeout(() => {
            magicHealCooldown = false;
            healBtn.disabled = false;
            healBtn.textContent = "🔮 Curación Mágica";
        }, 3000);
    }
}

function updateStatsDisplay() {
    heroNameDisplay.textContent = character.name;
    statStrDisplay.textContent = character.str;
    statHpDisplay.textContent = character.hp;
    statHpMax.textContent = character.maxHp;
    statMagDisplay.textContent = character.mag;
    statLukDisplay.textContent = character.luk;
    statSpdDisplay.textContent = character.spd;
    statPointsDisplay.textContent = upgradePoints;
}

// ========== 8. Reiniciar juego con nuevo mapa ==========
async function resetGame() {
    // Generar nuevo laberinto
    const { maze, exitPos, bossPos } = generateMaze(cols, rows);
    mazeData = maze;
    // Buscar posición inicial (primer camino)
    playerRow = 1; playerCol = 1;
    while (mazeData[playerRow][playerCol] !== 0 && playerRow < rows-1) {
        playerCol++;
        if (playerCol >= cols-1) { playerRow++; playerCol = 1; }
    }
    gameWin = false;
    bossDefeated = false;
    // Restaurar vida completa (mantener stats)
    character.hp = character.maxHp;
    // Los puntos de mejora se conservan entre reinicios
    updateStatsDisplay();
    renderMaze();
    messageArea.innerHTML = "¡Nueva mazmorra! Derrota al dragón guardián y escapa.";
}

// ========== 9. Creación de personaje ==========
function initCharacterCreator() {
    const nameInput = document.getElementById('hero-name');
    const pointsLeftSpan = document.getElementById('points-left');
    const statElements = {
        str: document.getElementById('stat-str'),
        hp: document.getElementById('stat-hp'),
        mag: document.getElementById('stat-mag'),
        luk: document.getElementById('stat-luk'),
        spd: document.getElementById('stat-spd')
    };
    let remaining = extraPoints;
    
    function updatePointsDisplay() {
        pointsLeftSpan.textContent = remaining;
        for (let stat in statElements) {
            statElements[stat].textContent = character[stat === 'hp' ? 'maxHp' : stat];
        }
    }
    
    function modifyStat(stat, delta) {
        let current = character[stat === 'hp' ? 'maxHp' : stat];
        // HP usa incrementos de 3 por punto repartido
        let increment = (stat === 'hp') ? 3 : 1;
        let newVal = current + delta * increment;
        if (delta > 0 && remaining <= 0) return;
        if (delta < 0 && current <= (stat === 'hp' ? 5 : 5)) return;
        if (newVal >= 5) {
            character[stat === 'hp' ? 'maxHp' : stat] = newVal;
            remaining -= delta;
            if (stat === 'hp') character.hp = character.maxHp;
            updatePointsDisplay();
        }
    }
    
    document.querySelectorAll('.stat-plus').forEach(btn => {
        btn.addEventListener('click', () => modifyStat(btn.dataset.stat, 1));
    });
    document.querySelectorAll('.stat-minus').forEach(btn => {
        btn.addEventListener('click', () => modifyStat(btn.dataset.stat, -1));
    });
    
    document.getElementById('start-adventure').addEventListener('click', async () => {
        let name = nameInput.value.trim().toUpperCase();
        if (name.length !== 3) {
            alert("¡El nombre debe tener exactamente 3 letras!");
            return;
        }
        if (remaining !== 0) {
            alert(`Debes repartir los 6 puntos extra. Te quedan ${remaining} puntos.`);
            return;
        }
        character.name = name;
        character.maxHp = character.hp; // sincronizar
        character.hp = character.maxHp;
        upgradePoints = 0; // puntos de mejora empiezan en 0
        updateStatsDisplay();
        // Generar primer laberinto
        const { maze } = generateMaze(cols, rows);
        mazeData = maze;
        playerRow = 1; playerCol = 1;
        while (mazeData[playerRow][playerCol] !== 0 && playerRow < rows-1) {
            playerCol++;
            if (playerCol >= cols-1) { playerRow++; playerCol = 1; }
        }
        gameWin = false;
        bossDefeated = false;
        renderMaze();
        creatorDiv.style.display = 'none';
        gameScreen.style.display = 'block';
        messageArea.innerHTML = "¡Aventura comenzada! Usa WASD para moverte. Derrota enemigos para ganar puntos y mejora tus stats.";
    });
}

// ========== 10. Controles y modales ==========
function setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            e.preventDefault();
            if (gameScreen.style.display === 'block') {
                if (key === 'w') tryMove('up');
                if (key === 's') tryMove('down');
                if (key === 'a') tryMove('left');
                if (key === 'd') tryMove('right');
            }
        }
    });
}

function setupUpgradeModal() {
    upgradeBtn.addEventListener('click', () => {
        upgradePointsSpan.textContent = upgradePoints;
        upgradeModal.style.display = 'flex';
    });
    closeModalBtn.addEventListener('click', () => {
        upgradeModal.style.display = 'none';
    });
    document.querySelectorAll('.upgrade-stat').forEach(btn => {
        btn.addEventListener('click', () => {
            upgradeStat(btn.dataset.stat);
            upgradePointsSpan.textContent = upgradePoints;
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target === upgradeModal) upgradeModal.style.display = 'none';
    });
}

// ========== 11. Inicialización ==========
function init() {
    initCharacterCreator();
    setupKeyboardControls();
    setupUpgradeModal();
    resetBtn.addEventListener('click', () => {
        if (gameScreen.style.display === 'block') resetGame();
    });
    const healBtn = document.getElementById('magic-heal-btn');
    if (healBtn) healBtn.addEventListener('click', useMagicHeal);
}

document.addEventListener('DOMContentLoaded', init);