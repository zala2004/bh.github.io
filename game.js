// Fruit Crush - Main Game Engine
class FruitCrushGame {
    constructor() {
        this.GRID_SIZE = 8;
        this.board = []; // 2D array: board[row][col]
        this.selectedTile = null; // { row, col }
        this.isAnimating = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('fruitcrush_highscore') || '0', 10);
        this.moves = 25;
        this.targetScore = 2500;
        this.level = 1;
        this.combo = 0;
        this.idleTimer = null;
        this.activeHint = null;

        // Fruit Definitions
        this.FRUITS = [
            { type: 'apple', icon: '🍎', color: '#ff3b30' },
            { type: 'orange', icon: '🍊', color: '#ff9500' },
            { type: 'grape', icon: '🍇', color: '#af52de' },
            { type: 'banana', icon: '🍌', color: '#ffcc00' },
            { type: 'strawberry', icon: '🍓', color: '#ff2d55' },
            { type: 'watermelon', icon: '🍉', color: '#34c759' }
        ];

        // Combo names
        this.COMBO_MESSAGES = [
            'NICE!',
            'JUICY!',
            'SWEET!',
            'DELICIOUS!',
            'SENSATIONAL!',
            'UNSTOPPABLE!',
            'MEGA CRUSH!'
        ];

        // DOM elements
        this.boardEl = document.getElementById('board');
        this.scoreEl = document.getElementById('scoreVal');
        this.movesEl = document.getElementById('movesVal');
        this.targetEl = document.getElementById('targetVal');
        this.progressFillEl = document.getElementById('progressFill');
        this.comboBannerEl = document.getElementById('comboBanner');
        this.gameModalEl = document.getElementById('gameModal');
        this.btnSoundEl = document.getElementById('btnSound');
        this.btnHintEl = document.getElementById('btnHint');
        this.btnRestartEl = document.getElementById('btnRestart');
        this.btnModalActionEl = document.getElementById('btnModalAction');

        // Drag/Touch tracking
        this.pointerStart = null;

        this.init();
    }

    init() {
        this.particles = new ParticleEngine('particleCanvas');
        this.bindEvents();
        this.updateSoundButtonUI();
        this.startLevel(1);
    }

    bindEvents() {
        this.btnSoundEl.addEventListener('click', () => {
            window.soundCtrl.toggleMute();
            this.updateSoundButtonUI();
        });

        this.btnHintEl.addEventListener('click', () => {
            this.showHint(true);
        });

        this.btnRestartEl.addEventListener('click', () => {
            this.startLevel(this.level);
        });

        this.btnModalActionEl.addEventListener('click', () => {
            this.gameModalEl.classList.remove('active');
            if (this.score >= this.targetScore) {
                this.startLevel(this.level + 1);
            } else {
                this.startLevel(this.level);
            }
        });

        // Board pointer interactions
        this.boardEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
        window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    updateSoundButtonUI() {
        this.btnSoundEl.textContent = window.soundCtrl.muted ? '🔇' : '🔊';
    }

    startLevel(lvl) {
        this.level = lvl;
        this.score = 0;
        this.moves = 25;
        this.targetScore = 2000 + (lvl - 1) * 1200;
        this.combo = 0;
        this.selectedTile = null;
        this.clearHint();
        this.updateStatsUI();
        this.initBoard();
        this.resetIdleTimer();
    }

    updateStatsUI() {
        this.scoreEl.textContent = this.score.toLocaleString();
        this.movesEl.textContent = this.moves;
        this.targetEl.textContent = this.targetScore.toLocaleString();

        const pct = Math.min(100, Math.floor((this.score / this.targetScore) * 100));
        this.progressFillEl.style.width = `${pct}%`;

        // Star badges
        document.getElementById('star1').classList.toggle('achieved', pct >= 33);
        document.getElementById('star2').classList.toggle('achieved', pct >= 66);
        document.getElementById('star3').classList.toggle('achieved', pct >= 100);
    }

    // ----------------------------------------------------
    // Board Generation & Rendering
    // ----------------------------------------------------
    initBoard() {
        let validBoard = false;
        let attempts = 0;

        while (!validBoard && attempts < 200) {
            attempts++;
            this.board = [];
            for (let r = 0; r < this.GRID_SIZE; r++) {
                this.board[r] = [];
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    const fruit = this.getRandomFruitExcept([
                        this.getFruitTypeAt(r - 1, c),
                        this.getFruitTypeAt(r, c - 1)
                    ]);
                    this.board[r][c] = {
                        id: `${r}-${c}-${Date.now()}-${Math.random()}`,
                        type: fruit.type,
                        special: null
                    };
                }
            }
            // Check that at least one valid match move exists
            if (this.findPossibleMove() !== null) {
                validBoard = true;
            }
        }

        this.renderBoard();
    }

    getFruitTypeAt(r, c) {
        if (r >= 0 && r < this.GRID_SIZE && c >= 0 && c < this.GRID_SIZE && this.board[r] && this.board[r][c]) {
            return this.board[r][c].type;
        }
        return null;
    }

    getRandomFruitExcept(excludedTypes) {
        const available = this.FRUITS.filter(f => !excludedTypes.includes(f.type));
        return available[Math.floor(Math.random() * available.length)];
    }

    getRandomFruit() {
        return this.FRUITS[Math.floor(Math.random() * this.FRUITS.length)];
    }

    getFruitDef(type) {
        return this.FRUITS.find(f => f.type === type) || this.FRUITS[0];
    }

    renderBoard() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const slot = document.createElement('div');
                slot.className = 'tile-slot';
                slot.dataset.row = r;
                slot.dataset.col = c;

                const tileData = this.board[r][c];
                if (tileData) {
                    const fruitEl = this.createFruitElement(tileData, r, c);
                    slot.appendChild(fruitEl);
                }

                this.boardEl.appendChild(slot);
            }
        }
    }

    createFruitElement(tileData, r, c) {
        const el = document.createElement('div');
        el.className = 'fruit';
        el.dataset.row = r;
        el.dataset.col = c;
        el.dataset.id = tileData.id;

        if (tileData.special === 'rainbow') {
            el.classList.add('special-rainbow');
            el.textContent = '🌟';
        } else {
            const def = this.getFruitDef(tileData.type);
            el.textContent = def.icon;
            if (tileData.special === 'line-h') el.classList.add('special-line-h');
            if (tileData.special === 'line-v') el.classList.add('special-line-v');
            if (tileData.special === 'bomb') el.classList.add('special-bomb');
        }

        return el;
    }

    getFruitElement(r, c) {
        return this.boardEl.querySelector(`.fruit[data-row="${r}"][data-col="${c}"]`);
    }

    // ----------------------------------------------------
    // User Interactions (Click, Tap, Drag Swipe)
    // ----------------------------------------------------
    onPointerDown(e) {
        if (this.isAnimating || this.moves <= 0) return;
        const fruitEl = e.target.closest('.fruit');
        if (!fruitEl) return;

        this.clearHint();
        this.resetIdleTimer();

        const row = parseInt(fruitEl.dataset.row, 10);
        const col = parseInt(fruitEl.dataset.col, 10);

        this.pointerStart = {
            row,
            col,
            x: e.clientX,
            y: e.clientY,
            targetEl: fruitEl
        };

        if (!this.selectedTile) {
            // First tile selection
            this.selectedTile = { row, col };
            fruitEl.classList.add('selected');
            window.soundCtrl.playSwap();
        } else {
            const prev = this.selectedTile;
            const prevEl = this.getFruitElement(prev.row, prev.col);
            if (prevEl) prevEl.classList.remove('selected');

            if (prev.row === row && prev.col === col) {
                // Deselect
                this.selectedTile = null;
            } else if (this.isAdjacent(prev.row, prev.col, row, col)) {
                // Adjacent swap!
                this.selectedTile = null;
                this.handleSwap(prev.row, prev.col, row, col);
            } else {
                // Select new tile
                this.selectedTile = { row, col };
                fruitEl.classList.add('selected');
                window.soundCtrl.playSwap();
            }
        }
    }

    onPointerUp(e) {
        if (!this.pointerStart || this.isAnimating) {
            this.pointerStart = null;
            return;
        }

        const deltaX = e.clientX - this.pointerStart.x;
        const deltaY = e.clientY - this.pointerStart.y;
        const dist = Math.hypot(deltaX, deltaY);

        if (dist > 25) {
            // Drag gesture detected
            let targetRow = this.pointerStart.row;
            let targetCol = this.pointerStart.col;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                targetCol += deltaX > 0 ? 1 : -1;
            } else {
                targetRow += deltaY > 0 ? 1 : -1;
            }

            if (targetRow >= 0 && targetRow < this.GRID_SIZE && targetCol >= 0 && targetCol < this.GRID_SIZE) {
                if (this.selectedTile) {
                    const prevEl = this.getFruitElement(this.selectedTile.row, this.selectedTile.col);
                    if (prevEl) prevEl.classList.remove('selected');
                    this.selectedTile = null;
                }
                this.handleSwap(this.pointerStart.row, this.pointerStart.col, targetRow, targetCol);
            }
        }

        this.pointerStart = null;
    }

    isAdjacent(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    // ----------------------------------------------------
    // Swap & Match Verification
    // ----------------------------------------------------
    async handleSwap(r1, c1, r2, c2) {
        this.isAnimating = true;
        this.clearHint();

        const el1 = this.getFruitElement(r1, c1);
        const el2 = this.getFruitElement(r2, c2);

        // Perform visual swap
        window.soundCtrl.playSwap();
        await this.animateSwap(el1, el2, r1, c1, r2, c2);

        // Swap data in board
        const temp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = temp;

        // Check if rainbow starfruit was swapped
        const isRainbowSwap = (this.board[r1][c1]?.special === 'rainbow' || this.board[r2][c2]?.special === 'rainbow');

        // Check for matches
        const matches = this.findAllMatches();

        if (matches.length === 0 && !isRainbowSwap) {
            // Invalid swap! Swap back
            window.soundCtrl.playInvalid();
            if (el1) el1.classList.add('invalid-shake');
            if (el2) el2.classList.add('invalid-shake');

            await this.wait(350);

            if (el1) el1.classList.remove('invalid-shake');
            if (el2) el2.classList.remove('invalid-shake');

            // Swap back visually & data
            await this.animateSwap(el1, el2, r2, c2, r1, c1);
            const revertTemp = this.board[r1][c1];
            this.board[r1][c1] = this.board[r2][c2];
            this.board[r2][c2] = revertTemp;

            this.isAnimating = false;
            this.resetIdleTimer();
            return;
        }

        // Valid move! Deduct a move
        this.moves--;
        this.updateStatsUI();

        // Handle Rainbow activation if present
        if (isRainbowSwap) {
            await this.handleRainbowSwap(r1, c1, r2, c2);
        }

        // Start Cascade & match resolution
        this.combo = 0;
        await this.resolveMatches();

        // Check level state
        this.checkGameStatus();
        this.isAnimating = false;
        this.resetIdleTimer();
    }

    async animateSwap(el1, el2, r1, c1, r2, c2) {
        if (!el1 || !el2) return;

        const slot1 = el1.parentElement;
        const slot2 = el2.parentElement;

        // Swap dataset coordinates
        el1.dataset.row = r2;
        el1.dataset.col = c2;
        el2.dataset.row = r1;
        el2.dataset.col = c1;

        // Move DOM elements
        slot1.appendChild(el2);
        slot2.appendChild(el1);

        await this.wait(180);
    }

    // ----------------------------------------------------
    // Robust Run-length Matching Algorithm
    // ----------------------------------------------------
    findAllMatches() {
        const matches = [];

        // Check horizontal matches
        for (let r = 0; r < this.GRID_SIZE; r++) {
            let matchStart = 0;
            for (let c = 1; c <= this.GRID_SIZE; c++) {
                const prev = this.board[r][c - 1];
                const curr = c < this.GRID_SIZE ? this.board[r][c] : null;

                const isSame = prev && curr && prev.type === curr.type && prev.special !== 'rainbow' && curr.special !== 'rainbow';
                if (!isSame) {
                    const length = c - matchStart;
                    if (length >= 3 && prev && prev.special !== 'rainbow') {
                        const line = [];
                        for (let k = matchStart; k < c; k++) {
                            line.push({ r, c: k });
                        }
                        matches.push({ type: 'h', tiles: line, fruitType: prev.type });
                    }
                    matchStart = c;
                }
            }
        }

        // Check vertical matches
        for (let c = 0; c < this.GRID_SIZE; c++) {
            let matchStart = 0;
            for (let r = 1; r <= this.GRID_SIZE; r++) {
                const prev = this.board[r - 1][c];
                const curr = r < this.GRID_SIZE ? this.board[r][c] : null;

                const isSame = prev && curr && prev.type === curr.type && prev.special !== 'rainbow' && curr.special !== 'rainbow';
                if (!isSame) {
                    const length = r - matchStart;
                    if (length >= 3 && prev && prev.special !== 'rainbow') {
                        const line = [];
                        for (let k = matchStart; k < r; k++) {
                            line.push({ r: k, c });
                        }
                        matches.push({ type: 'v', tiles: line, fruitType: prev.type });
                    }
                    matchStart = r;
                }
            }
        }

        return matches;
    }

    // ----------------------------------------------------
    // Resolve Matches, Cascades & Specials
    // ----------------------------------------------------
    async resolveMatches() {
        let hasMatches = true;

        while (hasMatches) {
            const matches = this.findAllMatches();
            if (matches.length === 0) {
                hasMatches = false;
                break;
            }

            this.combo++;
            if (this.combo >= 2) {
                this.showComboBanner();
            }

            // Identify special fruit creations
            const specialSpawns = this.detectSpecialCreations(matches);

            // Collect all unique tiles to destroy
            const toDestroy = new Map(); // key: "r,c", value: { r, c }
            matches.forEach(m => {
                m.tiles.forEach(t => toDestroy.set(`${t.r},${t.c}`, t));
            });

            // Trigger special tile blasts if included
            const extraDestroyed = this.triggerSpecials(Array.from(toDestroy.values()));
            extraDestroyed.forEach(t => toDestroy.set(`${t.r},${t.c}`, t));

            // Award points
            const pointsEarned = toDestroy.size * 100 * this.combo;
            this.addScore(pointsEarned);

            // Play Pop & Explosion sounds
            window.soundCtrl.playPop(this.combo);
            window.soundCtrl.playComboChime(this.combo);

            // Animate pops and spawn particles
            await this.animatePops(Array.from(toDestroy.values()));

            // Clear destroyed tiles in board data
            toDestroy.forEach(t => {
                this.board[t.r][t.c] = null;
            });

            // Create special fruits at spawn spots
            specialSpawns.forEach(sp => {
                this.board[sp.r][sp.c] = {
                    id: `${sp.r}-${sp.c}-${Date.now()}`,
                    type: sp.fruitType,
                    special: sp.special
                };
            });

            // Apply gravity and drop new fruits
            await this.applyGravityAndRefill();

            await this.wait(200);
        }

        // Verify that board still has moves; if not, shuffle!
        if (this.moves > 0 && this.score < this.targetScore && this.findPossibleMove() === null) {
            await this.shuffleBoard();
        }
    }

    detectSpecialCreations(matches) {
        const spawns = [];
        const processedMatches = new Set();

        // 1. Check for 5-in-a-row -> Rainbow Starfruit
        matches.forEach((m, idx) => {
            if (m.tiles.length >= 5 && !processedMatches.has(idx)) {
                const pivot = m.tiles[Math.floor(m.tiles.length / 2)];
                spawns.push({ r: pivot.r, c: pivot.c, fruitType: m.fruitType, special: 'rainbow' });
                processedMatches.add(idx);
            }
        });

        // 2. Check for T or L intersections -> Bomb
        for (let i = 0; i < matches.length; i++) {
            if (processedMatches.has(i)) continue;
            for (let j = i + 1; j < matches.length; j++) {
                if (processedMatches.has(j)) continue;
                if (matches[i].type !== matches[j].type && matches[i].fruitType === matches[j].fruitType) {
                    // Find intersection
                    const intersection = matches[i].tiles.find(t1 =>
                        matches[j].tiles.some(t2 => t2.r === t1.r && t2.c === t1.c)
                    );
                    if (intersection) {
                        spawns.push({ r: intersection.r, c: intersection.c, fruitType: matches[i].fruitType, special: 'bomb' });
                        processedMatches.add(i);
                        processedMatches.add(j);
                        break;
                    }
                }
            }
        }

        // 3. Check for 4-in-a-row -> Line Blaster
        matches.forEach((m, idx) => {
            if (m.tiles.length === 4 && !processedMatches.has(idx)) {
                const pivot = m.tiles[1];
                const specialType = m.type === 'h' ? 'line-h' : 'line-v';
                spawns.push({ r: pivot.r, c: pivot.c, fruitType: m.fruitType, special: specialType });
                processedMatches.add(idx);
            }
        });

        return spawns;
    }

    triggerSpecials(clearedTiles) {
        const queue = [...clearedTiles];
        const visited = new Set(clearedTiles.map(t => `${t.r},${t.c}`));
        const activated = [];

        while (queue.length > 0) {
            const current = queue.shift();
            const tile = this.board[current.r]?.[current.c];
            if (!tile || !tile.special) continue;

            window.soundCtrl.playSpecialExplosion();

            if (tile.special === 'line-h') {
                // Clear entire row
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    const key = `${current.r},${c}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        const pt = { r: current.r, c };
                        queue.push(pt);
                        activated.push(pt);
                    }
                }
            } else if (tile.special === 'line-v') {
                // Clear entire column
                for (let r = 0; r < this.GRID_SIZE; r++) {
                    const key = `${r},${current.c}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        const pt = { r, c: current.c };
                        queue.push(pt);
                        activated.push(pt);
                    }
                }
            } else if (tile.special === 'bomb') {
                // Clear 3x3 surrounding
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = current.r + dr;
                        const nc = current.c + dc;
                        if (nr >= 0 && nr < this.GRID_SIZE && nc >= 0 && nc < this.GRID_SIZE) {
                            const key = `${nr},${nc}`;
                            if (!visited.has(key)) {
                                visited.add(key);
                                const pt = { r: nr, c: nc };
                                queue.push(pt);
                                activated.push(pt);
                            }
                        }
                    }
                }
            }
        }

        return activated;
    }

    async handleRainbowSwap(r1, c1, r2, c2) {
        window.soundCtrl.playRainbow();

        const tile1 = this.board[r1][c1];
        const tile2 = this.board[r2][c2];

        // Double rainbow swap = CLEAR ENTIRE BOARD!
        if (tile1?.special === 'rainbow' && tile2?.special === 'rainbow') {
            this.showComboBanner('SUPER NOVA! 🌟');
            const allTiles = [];
            for (let r = 0; r < this.GRID_SIZE; r++) {
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    allTiles.push({ r, c });
                }
            }
            this.addScore(allTiles.length * 200);
            await this.animatePops(allTiles);
            for (let r = 0; r < this.GRID_SIZE; r++) {
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    this.board[r][c] = null;
                }
            }
            await this.applyGravityAndRefill();
            return;
        }

        const targetFruitType = tile1.special === 'rainbow' ? tile2.type : tile1.type;
        const toDestroy = [{ r: r1, c: c1 }, { r: r2, c: c2 }];

        // Clear all tiles of that target fruit type across the board!
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.board[r][c] && this.board[r][c].type === targetFruitType) {
                    toDestroy.push({ r, c });
                }
            }
        }

        // Trigger particles & points
        this.addScore(toDestroy.length * 150);
        await this.animatePops(toDestroy);

        toDestroy.forEach(t => {
            this.board[t.r][t.c] = null;
        });

        await this.applyGravityAndRefill();
    }

    async animatePops(tiles) {
        const boardRect = this.particles.canvas.getBoundingClientRect();

        tiles.forEach(t => {
            const el = this.getFruitElement(t.r, t.c);
            if (el) {
                const rect = el.getBoundingClientRect();
                const x = rect.left - boardRect.left + rect.width / 2;
                const y = rect.top - boardRect.top + rect.height / 2;

                const tileData = this.board[t.r]?.[t.c];
                const def = tileData ? this.getFruitDef(tileData.type) : null;
                const color = def ? def.color : '#ffd700';

                this.particles.createSplatter(x, y, color, 14);
                if (tileData && tileData.special) {
                    this.particles.createSparkles(x, y, 16);
                    this.particles.createShockwave(x, y, color);
                }

                el.classList.add('pop');
            }
        });

        await this.wait(260);
    }

    // ----------------------------------------------------
    // Gravity & Drop System
    // ----------------------------------------------------
    async applyGravityAndRefill() {
        // Drop existing tiles
        for (let c = 0; c < this.GRID_SIZE; c++) {
            let writeRow = this.GRID_SIZE - 1;
            for (let r = this.GRID_SIZE - 1; r >= 0; r--) {
                if (this.board[r][c] !== null) {
                    if (writeRow !== r) {
                        this.board[writeRow][c] = this.board[r][c];
                        this.board[r][c] = null;
                    }
                    writeRow--;
                }
            }

            // Refill empty top spaces
            for (let r = writeRow; r >= 0; r--) {
                const newFruit = this.getRandomFruit();
                this.board[r][c] = {
                    id: `${r}-${c}-${Date.now()}-${Math.random()}`,
                    type: newFruit.type,
                    special: null
                };
            }
        }

        // Re-render board and animate drops
        this.renderBoard();
        const fruits = this.boardEl.querySelectorAll('.fruit');
        fruits.forEach(f => f.classList.add('dropping'));

        await this.wait(280);
    }

    // ----------------------------------------------------
    // Hint System & Shuffle
    // ----------------------------------------------------
    findPossibleMove() {
        // Scan horizontal swaps
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE - 1; c++) {
                if (this.wouldMatch(r, c, r, c + 1)) {
                    return [{ r, c }, { r, c: c + 1 }];
                }
            }
        }
        // Scan vertical swaps
        for (let c = 0; c < this.GRID_SIZE; c++) {
            for (let r = 0; r < this.GRID_SIZE - 1; r++) {
                if (this.wouldMatch(r, c, r + 1, c)) {
                    return [{ r, c }, { r: r + 1, c }];
                }
            }
        }
        return null;
    }

    wouldMatch(r1, c1, r2, c2) {
        const t1 = this.board[r1]?.[c1];
        const t2 = this.board[r2]?.[c2];
        if (!t1 || !t2) return false;

        // Rainbow fruit is always a match
        if (t1.special === 'rainbow' || t2.special === 'rainbow') return true;

        // Swap temporarily
        this.board[r1][c1] = t2;
        this.board[r2][c2] = t1;

        const matches = this.findAllMatches();

        // Swap back
        this.board[r1][c1] = t1;
        this.board[r2][c2] = t2;

        return matches.length > 0;
    }

    showHint(manual = false) {
        if (this.isAnimating) return;
        this.clearHint();

        const move = this.findPossibleMove();
        if (move) {
            this.activeHint = move;
            move.forEach(pos => {
                const el = this.getFruitElement(pos.r, pos.c);
                if (el) el.classList.add('hint');
            });
            if (manual) {
                window.soundCtrl.playSwap();
            }
        }
    }

    clearHint() {
        if (this.activeHint) {
            this.activeHint.forEach(pos => {
                const el = this.getFruitElement(pos.r, pos.c);
                if (el) el.classList.remove('hint');
            });
            this.activeHint = null;
        }
    }

    resetIdleTimer() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            this.showHint(false);
        }, 5500);
    }

    async shuffleBoard() {
        this.showComboBanner('RESHUFFLING!');
        await this.wait(600);

        // Gather all existing fruits
        const flat = [];
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.board[r][c]) flat.push(this.board[r][c]);
            }
        }

        // Shuffle until a valid move exists without starting matches
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            attempts++;
            // Fisher-Yates shuffle
            for (let i = flat.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [flat[i], flat[j]] = [flat[j], flat[i]];
            }

            let idx = 0;
            for (let r = 0; r < this.GRID_SIZE; r++) {
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    this.board[r][c] = flat[idx++];
                }
            }

            if (this.findAllMatches().length === 0 && this.findPossibleMove() !== null) {
                valid = true;
            }
        }

        this.renderBoard();
    }

    // ----------------------------------------------------
    // Score & Level Management
    // ----------------------------------------------------
    addScore(pts) {
        this.score += pts;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('fruitcrush_highscore', this.highScore.toString());
        }
        this.updateStatsUI();
    }

    showComboBanner(customText) {
        const text = customText || this.COMBO_MESSAGES[Math.min(this.combo - 2, this.COMBO_MESSAGES.length - 1)];
        this.comboBannerEl.textContent = text;
        this.comboBannerEl.classList.add('show');
        setTimeout(() => {
            this.comboBannerEl.classList.remove('show');
        }, 850);
    }

    checkGameStatus() {
        if (this.score >= this.targetScore) {
            // Victory!
            window.soundCtrl.playVictory();
            this.showEndModal(true);
        } else if (this.moves <= 0) {
            // Game Over!
            window.soundCtrl.playGameOver();
            this.showEndModal(false);
        }
    }

    showEndModal(isWin) {
        const modalTitle = document.getElementById('modalTitle');
        const modalSubtitle = document.getElementById('modalSubtitle');
        const modalScore = document.getElementById('modalScore');
        const modalHighScore = document.getElementById('modalHighScore');
        const mStar1 = document.getElementById('mStar1');
        const mStar2 = document.getElementById('mStar2');
        const mStar3 = document.getElementById('mStar3');

        modalScore.textContent = this.score.toLocaleString();
        modalHighScore.textContent = `High Score: ${this.highScore.toLocaleString()}`;

        const pct = (this.score / this.targetScore) * 100;
        mStar1.style.filter = pct >= 33 ? 'grayscale(0)' : 'grayscale(1)';
        mStar2.style.filter = pct >= 66 ? 'grayscale(0)' : 'grayscale(1)';
        mStar3.style.filter = pct >= 100 ? 'grayscale(0)' : 'grayscale(1)';

        if (isWin) {
            modalTitle.textContent = 'Awesome!';
            modalSubtitle.textContent = `Level ${this.level} Cleared! 🎉`;
            this.btnModalActionEl.textContent = 'Next Level ➔';
            this.btnModalActionEl.style.background = 'linear-gradient(135deg, #11998e, #38ef7d)';
        } else {
            modalTitle.textContent = 'Out of Moves!';
            modalSubtitle.textContent = 'Try again to beat the target!';
            this.btnModalActionEl.textContent = 'Try Again 🔄';
            this.btnModalActionEl.style.background = 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)';
        }

        this.gameModalEl.classList.add('active');
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Launch game on page load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new FruitCrushGame();
});
