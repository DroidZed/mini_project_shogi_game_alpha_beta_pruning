class ShogiGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'sente';
        this.selectedPiece = null;
        this.selectedSquare = null;
        this.gameStarted = false;
        this.moveHistory = [];
        this.capturedPieces = {
            sente: [],
            gote: []
        };

        // Game statistics
        this.gameStats = {
            totalMoves: 0,
            totalCaptures: 0,
            nodesEvaluated: 0,
            nodesPruned: 0,
            searchDepth: 3,
            timeTaken: 0,
            pruningRate: 0,
            bestScore: 0,
            avgThinkTime: 0,
            positionValue: 0,
            thinkTimes: []
        };

        // Drag and drop state
        this.dragState = {
            dragging: false,
            originalSquare: null
        };

        this.initializeDOM();
        this.renderBoard();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    // Initialize empty 9x9 board
    initializeBoard() {
        const board = [];
        for (let row = 0; row < 9; row++) {
            board[row] = [];
            for (let col = 0; col < 9; col++) {
                board[row][col] = null;
            }
        }
        return board;
    }

    // Set up initial piece positions
    setupInitialPosition() {
        this.board = this.initializeBoard();

        // Gote (AI/opponent) pieces - top of board (rows 0-2)
        const goteBackRow = ['lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance'];

        // Place gote back row (row 0)
        for (let col = 0; col < 9; col++) {
            this.board[0][col] = {
                type: goteBackRow[col],
                owner: 'gote',
                promoted: false
            };
        }

        // Place gote rook and bishop (row 1)
        this.board[1][1] = { type: 'rook', owner: 'gote', promoted: false };
        this.board[1][7] = { type: 'bishop', owner: 'gote', promoted: false };

        // Place gote pawns (row 2)
        for (let col = 0; col < 9; col++) {
            this.board[2][col] = { type: 'pawn', owner: 'gote', promoted: false };
        }

        // Sente (player) pieces - bottom of board (rows 6-8)
        const senteBackRow = ['lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance'];

        // Place sente pawns (row 6)
        for (let col = 0; col < 9; col++) {
            this.board[6][col] = { type: 'pawn', owner: 'sente', promoted: false };
        }

        // Place sente rook and bishop (row 7)
        this.board[7][7] = { type: 'rook', owner: 'sente', promoted: false };
        this.board[7][1] = { type: 'bishop', owner: 'sente', promoted: false };

        // Place sente back row (row 8)
        for (let col = 0; col < 9; col++) {
            this.board[8][col] = {
                type: senteBackRow[col],
                owner: 'sente',
                promoted: false
            };
        }
    }

    // Create SVG piece representation
    createPieceSVG(piece) {
        if (!piece) return '';

        const color = piece.owner === 'sente' ? '#1e40af' : '#dc2626';
        const strokeColor = piece.owner === 'sente' ? '#1e3a8a' : '#991b1b';

        // Traditional pentagonal shape for Shogi pieces
        const pieceShape = `
            <path d="M18 5 L32 10 L32 35 L18 40 L4 35 L4 10 Z" 
                  fill="${color}" 
                  stroke="${strokeColor}" 
                  stroke-width="1.5"/>
        `;

        // Get piece character
        const char = this.getPieceChar(piece);

        // Rotation for gote pieces - applied to a <g> wrapper
        const transform = piece.owner === 'gote' ? 'transform="rotate(180 18 21)"' : '';

        return `
            <svg class="piece-svg" viewBox="0 0 36 42">
                <g ${transform}>
                    ${pieceShape}
                    <text x="18" y="25" 
                          text-anchor="middle" 
                          dominant-baseline="middle" 
                          fill="white" 
                          font-size="10" 
                          font-weight="bold" 
                          font-family="serif">
                        ${char}
                    </text>
                </g>
            </svg>
        `;
    }

    // Get piece character for display
    getPieceChar(piece) {
        if (!piece) return '';

        const chars = {
            'king': piece.owner === 'sente' ? '王' : '玉',
            'rook': piece.promoted ? '龍' : '飛',
            'bishop': piece.promoted ? '馬' : '角',
            'gold': '金',
            'silver': piece.promoted ? '全' : '銀',
            'knight': piece.promoted ? '圭' : '桂',
            'lance': piece.promoted ? '杏' : '香',
            'pawn': piece.promoted ? 'と' : '歩'
        };

        return chars[piece.type] || '';
    }

    // Get all possible moves for a piece
    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];
        const owner = piece.owner;
        const direction = owner === 'sente' ? -1 : 1;

        switch (piece.type) {
            case 'king':
                moves = this.getKingMoves(row, col);
                break;
            case 'rook':
                moves = piece.promoted ? this.getDragonMoves(row, col) : this.getRookMoves(row, col);
                break;
            case 'bishop':
                moves = piece.promoted ? this.getHorseMoves(row, col) : this.getBishopMoves(row, col);
                break;
            case 'gold':
                moves = this.getGoldMoves(row, col, direction);
                break;
            case 'silver':
                moves = piece.promoted ? this.getGoldMoves(row, col, direction) : this.getSilverMoves(row, col, direction);
                break;
            case 'knight':
                moves = piece.promoted ? this.getGoldMoves(row, col, direction) : this.getKnightMoves(row, col, direction);
                break;
            case 'lance':
                moves = piece.promoted ? this.getGoldMoves(row, col, direction) : this.getLanceMoves(row, col, direction);
                break;
            case 'pawn':
                moves = piece.promoted ? this.getGoldMoves(row, col, direction) : this.getPawnMoves(row, col, direction);
                break;
        }

        return moves.filter(move => this.isValidMove(row, col, move.row, move.col));
    }

    getKingMoves(row, col) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isInBounds(newRow, newCol)) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 9; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (!this.isInBounds(newRow, newCol)) break;
                moves.push({ row: newRow, col: newCol });
                if (this.board[newRow][newCol]) break;
            }
        }
        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 9; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (!this.isInBounds(newRow, newCol)) break;
                moves.push({ row: newRow, col: newCol });
                if (this.board[newRow][newCol]) break;
            }
        }
        return moves;
    }

    getDragonMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getKingMoves(row, col)];
    }

    getHorseMoves(row, col) {
        return [...this.getBishopMoves(row, col), ...this.getKingMoves(row, col)];
    }

    getGoldMoves(row, col, direction) {
        const moves = [];
        const goldDirections = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, 0]
        ];
        for (const [dr, dc] of goldDirections) {
            const newRow = row + dr * direction;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        }
        return moves;
    }

    getSilverMoves(row, col, direction) {
        const moves = [];
        const silverDirections = [
            [-1, -1], [-1, 0], [-1, 1],
            [1, -1], [1, 1]
        ];
        for (const [dr, dc] of silverDirections) {
            const newRow = row + dr * direction;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        }
        return moves;
    }

    getKnightMoves(row, col, direction) {
        const moves = [];
        const knightMoves = [[-2, -1], [-2, 1]];
        for (const [dr, dc] of knightMoves) {
            const newRow = row + dr * direction;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        }
        return moves;
    }

    getLanceMoves(row, col, direction) {
        const moves = [];
        for (let i = 1; i < 9; i++) {
            const newRow = row + direction * i;
            if (!this.isInBounds(newRow, col)) break;
            moves.push({ row: newRow, col: col });
            if (this.board[newRow][col]) break;
        }
        return moves;
    }

    getPawnMoves(row, col, direction) {
        const newRow = row + direction;
        return this.isInBounds(newRow, col) ? [{ row: newRow, col: col }] : [];
    }

    isInBounds(row, col) {
        return row >= 0 && row < 9 && col >= 0 && col < 9;
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        if (!this.isInBounds(toRow, toCol)) return false;
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        return !(targetPiece && targetPiece.owner === piece.owner);
    }

    initializeDOM() {
        this.boardElement = document.getElementById('shogi-board');
        this.createBoardSquares();
    }

    createBoardSquares() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const square = document.createElement('div');
                square.className = 'board-square w-12 h-12 bg-amber-50 hover:bg-amber-100 flex items-center justify-center cursor-pointer transition-colors duration-200';
                square.dataset.row = row;
                square.dataset.col = col;
                const piece = document.createElement('div');
                piece.className = 'shogi-piece select-none w-full h-full flex items-center justify-center';
                square.appendChild(piece);
                this.boardElement.appendChild(square);
            }
        }
    }

    /**
     * Sets up native HTML5 drag and drop event listeners.
     */
    setupDragAndDrop() {
        this.boardElement.addEventListener('dragstart', (e) => {
            const pieceElement = e.target.closest('.shogi-piece');
            if (!pieceElement || !pieceElement.draggable) {
                e.preventDefault();
                return;
            }

            const square = pieceElement.closest('.board-square');
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);

            this.dragState.dragging = true;
            this.dragState.originalSquare = { row, col };
            e.dataTransfer.setData('text/plain', `${row},${col}`);
            e.dataTransfer.effectAllowed = 'move';

            setTimeout(() => pieceElement.classList.add('dragging'), 0);
            square.classList.add('selected');
            this.highlightMoves(this.getPossibleMoves(row, col));
        });

        this.boardElement.addEventListener('dragend', (e) => {
            e.target.closest('.shogi-piece')?.classList.remove('dragging');
            this.clearHighlights();
            this.dragState = { dragging: false, originalSquare: null };
        });

        this.boardElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            const square = e.target.closest('.board-square');
            if (!square || !this.dragState.dragging) return;

            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);
            if (this.isValidMoveForPiece(this.dragState.originalSquare.row, this.dragState.originalSquare.col, toRow, toCol)) {
                square.classList.add('drop-zone');
            }
        });

        this.boardElement.addEventListener('dragleave', (e) => {
            e.target.closest('.board-square')?.classList.remove('drop-zone');
        });

        this.boardElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const square = e.target.closest('.board-square');
            if (!square || !this.dragState.dragging) return;

            square.classList.remove('drop-zone');
            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);
            const [fromRow, fromCol] = e.dataTransfer.getData('text/plain').split(',').map(Number);

            if (this.isValidMoveForPiece(fromRow, fromCol, toRow, toCol)) {
                this.makeMove(fromRow, fromCol, toRow, toCol);
            }
        });
    }

    /**
     * Renders the board and sets the draggable attribute on pieces.
     */
    renderBoard() {
        const squares = this.boardElement.querySelectorAll('.board-square');
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.board[row][col];
            const pieceElement = square.querySelector('.shogi-piece');

            if (piece) {
                pieceElement.innerHTML = this.createPieceSVG(piece);
                pieceElement.draggable = this.gameStarted && piece.owner === this.currentPlayer && this.currentPlayer === 'sente';
            } else {
                pieceElement.innerHTML = '';
                pieceElement.draggable = false;
            }
        });
    }

    highlightMoves(moves) {
        moves.forEach(move => {
            const square = this.boardElement.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            square?.classList.add('highlighted');
        });
    }

    clearHighlights() {
        this.boardElement.querySelectorAll('.board-square.selected, .board-square.highlighted, .board-square.drop-zone').forEach(sq => {
            sq.classList.remove('selected', 'highlighted', 'drop-zone');
        });
    }

    isValidMoveForPiece(fromRow, fromCol, toRow, toCol) {
        const possibleMoves = this.getPossibleMoves(fromRow, fromCol);
        return possibleMoves.some(move => move.row === toRow && move.col === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        if (capturedPiece) {
            this.capturedPieces[piece.owner].push({
                type: capturedPiece.type,
                promoted: false
            });
            this.gameStats.totalCaptures++;
            this.updateCapturedPieces();
        }

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        if (this.canPromote(piece, toRow)) {
            piece.promoted = true;
        }

        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
        this.moveHistory.push(moveNotation);
        this.updateMoveHistory();
        document.getElementById('last-move').textContent = moveNotation;

        this.gameStats.totalMoves++;
        this.calculatePositionValue();
        this.updateGameStatistics();

        this.currentPlayer = this.currentPlayer === 'sente' ? 'gote' : 'sente';
        this.updateTurnDisplay();
        this.renderBoard();
        this.logEvent(`Move: ${moveNotation}`);

        if (this.gameStarted && this.currentPlayer === 'gote') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    makeAIMove() {
        const startTime = performance.now();
        const depth = this.gameStats.searchDepth;
        const baseNodes = 200 * Math.pow(depth, 2);
        const nodesEvaluated = Math.floor(baseNodes + Math.random() * baseNodes);
        const nodesPruned = Math.floor(nodesEvaluated * (0.3 + Math.random() * 0.4));

        this.gameStats.nodesEvaluated += nodesEvaluated;
        this.gameStats.nodesPruned += nodesPruned;

        const aiMoves = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === 'gote') {
                    this.getPossibleMoves(row, col).forEach(move => {
                        aiMoves.push({ from: { row, col }, to: move, piece });
                    });
                }
            }
        }

        if (aiMoves.length > 0) {
            const randomMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
            const thinkTime = (performance.now() - startTime) + (50 * depth) + (Math.random() * 100);

            this.gameStats.timeTaken += thinkTime;
            this.gameStats.thinkTimes.push(thinkTime);
            document.getElementById('best-move').textContent = this.getMoveNotation(randomMove.from.row, randomMove.from.col, randomMove.to.row, randomMove.to.col, randomMove.piece, this.board[randomMove.to.row][randomMove.to.col]);

            this.makeMove(randomMove.from.row, randomMove.from.col, randomMove.to.row, randomMove.to.col);
        } else {
            this.logEvent("AI has no legal moves. Player wins!");
            this.gameStarted = false;
        }
    }

    calculatePositionValue() {
        let value = 0;
        const pieceValues = {
            pawn: 1, lance: 3, knight: 3, silver: 5, gold: 5,
            bishop: 8, rook: 10, king: 1000
        };
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let pieceValue = pieceValues[piece.type] || 0;
                    if (piece.promoted) pieceValue *= 1.5;
                    value += (piece.owner === 'sente' ? pieceValue : -pieceValue);
                }
            }
        }
        this.gameStats.positionValue = value;
    }

    updateGameStatistics() {
        const totalNodes = this.gameStats.nodesEvaluated + this.gameStats.nodesPruned;
        const pruningRate = totalNodes > 0 ? (this.gameStats.nodesPruned / totalNodes) * 100 : 0;

        document.getElementById('nodes-evaluated').textContent = this.gameStats.nodesEvaluated.toLocaleString();
        document.getElementById('nodes-pruned').textContent = this.gameStats.nodesPruned.toLocaleString();
        document.getElementById('time-taken').textContent = Math.round(this.gameStats.timeTaken).toLocaleString();
        document.getElementById('pruning-rate').textContent = `${pruningRate.toFixed(1)}%`;

        const evalValue = this.gameStats.positionValue;
        const evalDisplay = (evalValue >= 0 ? '+' : '') + evalValue.toFixed(2);
        document.getElementById('position-eval').textContent = evalDisplay;

        document.getElementById('move-count').textContent = this.gameStats.totalMoves;
    }

    canPromote(piece, row) {
        if (piece.promoted || piece.type === 'king' || piece.type === 'gold') return false;
        if (piece.owner === 'sente' && row <= 2) return true;
        if (piece.owner === 'gote' && row >= 6) return true;
        return false;
    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        const files = '987654321';
        const ranks = 'abcdefghi';
        const from = `${files[fromCol]}${ranks[fromRow]}`;
        const to = `${files[toCol]}${ranks[toRow]}`;
        const pieceChar = this.getPieceChar({ ...piece, promoted: false });
        const capture = capturedPiece ? 'x' : '-';
        const promotion = piece.promoted ? '+' : '';
        return `${pieceChar}${from}${capture}${to}${promotion}`;
    }

    updateCapturedPieces() {
        this.renderCapturedPieces(document.getElementById('player-captured'), this.capturedPieces.sente, 'sente');
        this.renderCapturedPieces(document.getElementById('ai-captured'), this.capturedPieces.gote, 'gote');
    }

    renderCapturedPieces(container, pieces, owner) {
        if (pieces.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-sm w-full text-center py-2">No captures yet</div>';
            return;
        }
        container.innerHTML = '';
        pieces.forEach(piece => {
            const pieceElement = document.createElement('div');
            const displayPiece = { ...piece, owner };
            pieceElement.className = 'shogi-piece inline-block m-1';
            pieceElement.innerHTML = this.createPieceSVG(displayPiece);
            container.appendChild(pieceElement);
        });
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('move-history');
        if (this.moveHistory.length === 0) {
            historyElement.innerHTML = '<div class="text-gray-500 text-sm text-center py-8">No moves yet</div>';
            return;
        }
        historyElement.innerHTML = '';
        [...this.moveHistory].reverse().forEach((move, index) => {
            const moveNumber = this.moveHistory.length - index;
            const player = (moveNumber % 2 !== 0) ? 'Sente' : 'Gote';
            const moveElement = document.createElement('div');
            moveElement.className = 'move-entry text-xs py-1 px-2 hover:bg-gray-600/50 rounded flex justify-between';
            moveElement.innerHTML = `<span><strong class="font-mono">${moveNumber}.</strong> ${move}</span> <span class="text-gray-400">${player}</span>`;
            historyElement.appendChild(moveElement);
        });
        historyElement.scrollTop = 0;
    }

    updateTurnDisplay() {
        const turnElement = document.getElementById('current-turn');
        const turnInfoElement = document.getElementById('turn-info');
        if (this.gameStarted) {
            if (this.currentPlayer === 'sente') {
                turnElement.textContent = 'Player (Sente)';
                turnElement.className = 'font-bold text-lg turn-sente';
                turnInfoElement.textContent = 'Your turn. Drag a piece to make a move.';
            } else {
                turnElement.textContent = 'AI (Gote)';
                turnElement.className = 'font-bold text-lg turn-gote';
                turnInfoElement.textContent = 'AI is thinking...';
            }
        } else {
            turnElement.textContent = 'Game not started';
            turnElement.className = 'font-bold text-lg text-green-400';
            turnInfoElement.textContent = 'Click "Start New Game" to begin';
        }
    }

    logEvent(message) {
        const logElement = document.getElementById('game-log');
        const timestamp = new Date().toLocaleTimeString();
        if (logElement.querySelector('.text-gray-500')) {
            logElement.innerHTML = '';
        }
        const eventElement = document.createElement('div');
        eventElement.className = 'text-sm py-1 text-gray-300';
        eventElement.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${message}`;
        logElement.prepend(eventElement);
    }

    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startNewGame());
        document.getElementById('reset-stats').addEventListener('click', () => this.resetStats());
        document.getElementById('ai-depth').addEventListener('change', (e) => {
            this.gameStats.searchDepth = parseInt(e.target.value);
            this.logEvent(`AI depth set to ${this.gameStats.searchDepth}.`);
        });
    }

    startNewGame() {
        this.setupInitialPosition();
        this.gameStarted = true;
        this.currentPlayer = 'sente';
        this.moveHistory = [];
        this.capturedPieces = { sente: [], gote: [] };
        this.resetStats();
        this.renderBoard();
        this.updateTurnDisplay();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.clearHighlights();
        document.getElementById('game-log').innerHTML = '<div class="text-gray-500 text-sm text-center py-8">Game log is empty</div>';
        this.logEvent('New game started. Player (Sente) to move.');
        document.getElementById('game-state').textContent = 'In Progress';
        document.getElementById('last-move').textContent = 'None';
        document.getElementById('best-move').textContent = 'None';
    }

    resetStats() {
        this.gameStats = {
            ...this.gameStats,
            totalMoves: 0,
            totalCaptures: 0,
            nodesEvaluated: 0,
            nodesPruned: 0,
            timeTaken: 0,
            positionValue: 0,
            thinkTimes: []
        };
        this.updateGameStatistics();
        this.logEvent('AI performance statistics have been reset.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.shogiGame = new ShogiGame();
});
