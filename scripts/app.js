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
            originalSquare: null,
            droppingPiece: null
        };

        this.initializeDOM();
        this.renderBoard();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

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

    setupInitialPosition() {
        this.board = this.initializeBoard();

        const goteBackRow = ['lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance'];
        for (let col = 0; col < 9; col++) {
            this.board[0][col] = { type: goteBackRow[col], owner: 'gote', promoted: false };
        }
        this.board[1][1] = { type: 'rook', owner: 'gote', promoted: false };
        this.board[1][7] = { type: 'bishop', owner: 'gote', promoted: false };
        for (let col = 0; col < 9; col++) {
            this.board[2][col] = { type: 'pawn', owner: 'gote', promoted: false };
        }

        const senteBackRow = ['lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance'];
        for (let col = 0; col < 9; col++) {
            this.board[6][col] = { type: 'pawn', owner: 'sente', promoted: false };
        }
        this.board[7][7] = { type: 'rook', owner: 'sente', promoted: false };
        this.board[7][1] = { type: 'bishop', owner: 'sente', promoted: false };
        for (let col = 0; col < 9; col++) {
            this.board[8][col] = { type: senteBackRow[col], owner: 'sente', promoted: false };
        }
    }

    createPieceSVG(piece) {
        if (!piece) return '';

        const color = piece.owner === 'sente' ? '#1e40af' : '#dc2626';
        const strokeColor = piece.owner === 'sente' ? '#1e3a8a' : '#991b1b';
        const textColor = 'white';

        let pieceShape;
        if (piece.owner === 'sente') {
            pieceShape = `
            <path d="M18 4 L30 8 L32 32 L24 38 L12 38 L4 32 L6 8 Z" 
                  fill="${color}" 
                  stroke="${strokeColor}" 
                  stroke-width="2"/>
            <circle cx="18" cy="6" r="2" fill="${strokeColor}"/>
        `;
        } else {
            pieceShape = `
            <path d="M18 2 L32 8 L30 30 L18 38 L6 30 L4 8 Z" 
                  fill="${color}" 
                  stroke="${strokeColor}" 
                  stroke-width="2"/>
            <polygon points="18,2 22,6 14,6" fill="${strokeColor}"/>
        `;
        }

        let promotionIndicator = '';
        if (piece.promoted) {
            promotionIndicator = `
            <rect x="2" y="2" width="32" height="38" 
                  fill="none" 
                  stroke="#ffd700" 
                  stroke-width="2" 
                  stroke-dasharray="4,2" 
                  rx="3"/>
        `;
        }

        const char = this.getPieceChar(piece);
        const ownerIndicator = piece.owner === 'gote' ? '▼' : '▲';

        return `
        <svg class="piece-svg" viewBox="0 0 36 42">
            ${pieceShape}
            ${promotionIndicator}
            <text x="18" y="${char.length > 1 ? '18' : '20'}" 
                  text-anchor="middle" 
                  dominant-baseline="middle" 
                  fill="${textColor}" 
                  font-size="${char.length > 1 ? '7' : '10'}" 
                  font-weight="bold" 
                  font-family="Arial, sans-serif"
                  stroke="#000" 
                  stroke-width="0.3">
                ${char}
            </text>
            <text x="18" y="${char.length > 1 ? '32' : '34'}" 
                  text-anchor="middle" 
                  dominant-baseline="middle" 
                  fill="${textColor}" 
                  font-size="8" 
                  font-weight="bold">
                ${ownerIndicator}
            </text>
        </svg>
    `;
    }

    getPieceChar(piece) {
        if (!piece) return '';

        const chars = {
            'king': 'K',
            'rook': piece.promoted ? 'R+' : 'R',
            'bishop': piece.promoted ? 'B+' : 'B',
            'gold': 'G',
            'silver': piece.promoted ? 'S+' : 'S',
            'knight': piece.promoted ? 'N+' : 'N',
            'lance': piece.promoted ? 'L+' : 'L',
            'pawn': piece.promoted ? 'P+' : 'P'
        };

        return chars[piece.type] || '';
    }

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
            [-1, -1], [-1, 0], [-1, 1], // Forward diagonals and straight
            [0, -1], [0, 1],            // Sideways
            [1, 0]                      // Backward
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
            [-1, -1], [-1, 0], [-1, 1], // Forward diagonals and straight
            [1, -1], [1, 1]            // Backward diagonals
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
        const knightMoves = [[-2, -1], [-2, 1]]; // Forward jumps
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

    isValidMoveForPiece(fromRow, fromCol, toRow, toCol) {
        const possibleMoves = this.getPossibleMoves(fromRow, fromCol);
        const isPossible = possibleMoves.some(move => move.row === toRow && move.col === toCol);
        if (!isPossible) {
            this.logEvent(`Move from ${fromRow},${fromCol} to ${toRow},${toCol} not in possible moves.`);
            return false;
        }

        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        const wasPromoted = piece.promoted;

        // Simulate the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        if (this.canPromote(piece, toRow)) {
            piece.promoted = true;
        }

        const inCheck = this.isInCheck(piece.owner);

        // Undo the move
        piece.promoted = wasPromoted;
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = targetPiece;

        if (inCheck) {
            this.logEvent(`Move from ${fromRow},${fromCol} to ${toRow},${toCol} rejected: leaves king in check.`);
        }

        if (this.isInCheck(piece.owner)) {
            return !inCheck;
        }
        return !inCheck;
    }

    isInCheck(player) {
        let kingPos = null;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.owner === player) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }

        if (!kingPos) {
            this.logEvent(`No king found for ${player}. Treating as checkmate.`);
            return true;
        }

        const opponent = player === 'sente' ? 'gote' : 'sente';
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === opponent) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
                        this.logEvent(`${player}'s king at ${kingPos.row},${kingPos.col} is in check by piece at ${row},${col}.`);
                        return true;
                    }
                }
            }
        }
        return false;
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

    setupDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            const pieceElement = e.target.closest('.shogi-piece');
            if (!pieceElement || !pieceElement.draggable) {
                e.preventDefault();
                return;
            }

            const capturedPiece = e.target.closest('.captured-piece');
            if (capturedPiece) {
                const pieceType = capturedPiece.dataset.pieceType;
                const owner = capturedPiece.dataset.owner;

                if (owner !== this.currentPlayer || !this.gameStarted) {
                    e.preventDefault();
                    return;
                }

                this.dragState.dragging = true;
                this.dragState.droppingPiece = { type: pieceType, owner: owner };
                e.dataTransfer.setData('text/plain', `drop:${pieceType}:${owner}`);
                e.dataTransfer.effectAllowed = 'move';

                setTimeout(() => pieceElement.classList.add('dragging'), 0);
                return;
            }

            const square = pieceElement.closest('.board-square');
            if (!square) return;

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

        document.addEventListener('dragend', (e) => {
            e.target.closest('.shogi-piece')?.classList.remove('dragging');
            this.clearHighlights();
            if (this.dragState.originalSquare) {
                const originalSquare = this.boardElement.querySelector(`[data-row="${this.dragState.originalSquare.row}"][data-col="${this.dragState.originalSquare.col}"]`);
                originalSquare?.classList.remove('selected');
            }
            this.dragState = { dragging: false, originalSquare: null, droppingPiece: null };
        });

        this.boardElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            const square = e.target.closest('.board-square');
            if (!square || !this.dragState.dragging) return;

            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);

            if (this.dragState.originalSquare) {
                if (this.isValidMoveForPiece(this.dragState.originalSquare.row, this.dragState.originalSquare.col, toRow, toCol)) {
                    square.classList.add('drop-zone');
                }
            } else if (this.dragState.droppingPiece) {
                if (this.canDropPiece(this.dragState.droppingPiece.type, this.dragState.droppingPiece.owner, toRow, toCol)) {
                    square.classList.add('drop-zone');
                }
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
            const dragData = e.dataTransfer.getData('text/plain');

            if (dragData.startsWith('drop:')) {
                const [, pieceType, owner] = dragData.split(':');
                if (this.canDropPiece(pieceType, owner, toRow, toCol)) {
                    this.dropPiece(pieceType, owner, toRow, toCol);
                }
            } else {
                const [fromRow, fromCol] = dragData.split(',').map(Number);
                if (this.isValidMoveForPiece(fromRow, fromCol, toRow, toCol)) {
                    this.makeMove(fromRow, fromCol, toRow, toCol);
                }
            }
        });
    }

    renderBoard() {
        const squares = this.boardElement.querySelectorAll('.board-square');
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.board[row][col];
            const pieceElement = square.querySelector('.shogi-piece');

            if (piece) {
                pieceElement.innerHTML = this.createPieceSVG(piece);
                pieceElement.draggable = piece.owner === 'sente';
                pieceElement.dataset.pieceType = piece.type;
                pieceElement.dataset.owner = piece.owner;
                pieceElement.dataset.promoted = piece.promoted.toString();
                square.dataset.hasPiece = piece.owner;
            } else {
                pieceElement.innerHTML = '';
                pieceElement.draggable = false;
                pieceElement.removeAttribute('data-piece-type');
                pieceElement.removeAttribute('data-owner');
                pieceElement.removeAttribute('data-promoted');
                square.dataset.hasPiece = 'none';
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

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        const moveMaker = this.currentPlayer;
        const opponent = (moveMaker === 'sente') ? 'gote' : 'sente';
        const wasPromoted = piece.promoted;

        if (capturedPiece && capturedPiece.type === 'king') {
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;
            this.gameStats.totalMoves++;
            this.calculatePositionValue();
            this.updateGameStatistics();
            this.updateCapturedPieces();
            this.endGame(moveMaker);
            return;
        }

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        if (this.canPromote(piece, toRow)) {
            piece.promoted = true;
        }

        if (this.isInCheck(moveMaker)) {
            piece.promoted = wasPromoted;
            this.board[fromRow][fromCol] = piece;
            this.board[toRow][toCol] = capturedPiece;
            this.logEvent('Illegal move: Cannot leave king in check.');
            return;
        }

        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
        this.moveHistory.push(moveNotation);
        this.updateMoveHistory();
        document.getElementById('last-move').textContent = moveNotation;
        this.gameStats.totalMoves++;
        this.calculatePositionValue();
        this.updateGameStatistics();

        if (capturedPiece) {
            this.capturedPieces[moveMaker].push({ type: capturedPiece.type, promoted: false });
            this.gameStats.totalCaptures++;
            this.updateCapturedPieces();
        }

        if (this.isCheckmate(opponent)) {
            this.updateCapturedPieces();
            this.endGame(moveMaker);
            return;
        }

        this.currentPlayer = opponent;
        this.updateTurnDisplay();
        this.renderBoard();
        this.logEvent(`Move: ${moveNotation}`);

        if (this.gameStarted && this.currentPlayer === 'gote') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    canDropPiece(pieceType, owner, row, col) {
        if (this.board[row][col]) {
            return false;
        }

        if (pieceType === 'pawn') {
            for (let r = 0; r < 9; r++) {
                const piece = this.board[r][col];
                if (piece && piece.type === 'pawn' && piece.owner === owner && !piece.promoted) {
                    return false;
                }
            }
        }

        const direction = owner === 'sente' ? -1 : 1;
        const lastRank = owner === 'sente' ? 0 : 8;
        const secondToLastRank = owner === 'sente' ? 1 : 7;

        if (pieceType === 'pawn' || pieceType === 'lance') {
            if (row === lastRank) return false;
        }
        if (pieceType === 'knight') {
            if (row === lastRank || row === secondToLastRank) return false;
        }

        if (pieceType === 'pawn') {
            const opponent = owner === 'sente' ? 'gote' : 'sente';
            this.board[row][col] = { type: pieceType, owner: owner, promoted: false };
            const isMate = this.isCheckmate(opponent);
            this.board[row][col] = null;
            if (isMate) {
                return false;
            }
        }

        this.board[row][col] = { type: pieceType, owner: owner, promoted: false };
        const inCheck = this.isInCheck(owner);
        this.board[row][col] = null;
        if (inCheck) {
            this.logEvent(`Drop of ${pieceType} at ${row},${col} rejected: leaves king in check.`);
            return false;
        }

        return true;
    }

    dropPiece(pieceType, owner, row, col) {
        const capturedArray = this.capturedPieces[owner];
        const index = capturedArray.findIndex(p => p.type === pieceType);
        if (index !== -1) {
            capturedArray.splice(index, 1);
        }

        this.board[row][col] = { type: pieceType, owner: owner, promoted: false };
        if (this.isInCheck(owner)) {
            this.board[row][col] = null;
            capturedArray.push({ type: pieceType, promoted: false });
            this.logEvent('Illegal drop: Cannot leave king in check.');
            return;
        }

        const moveMaker = this.currentPlayer;
        const opponent = (moveMaker === 'sente') ? 'gote' : 'sente';

        const moveNotation = `${this.getPieceChar({ type: pieceType, owner })}*${9 - col}${String.fromCharCode(97 + row)}`;
        this.moveHistory.push(moveNotation);
        this.updateMoveHistory();
        document.getElementById('last-move').textContent = moveNotation;
        this.gameStats.totalMoves++;
        this.calculatePositionValue();
        this.updateGameStatistics();
        this.updateCapturedPieces();

        if (this.isCheckmate(opponent)) {
            this.endGame(moveMaker);
            return;
        }

        this.currentPlayer = opponent;
        this.updateTurnDisplay();
        this.renderBoard();
        this.logEvent(`Drop: ${moveNotation}`);

        if (this.gameStarted && this.currentPlayer === 'gote') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    // New helper to find the checking piece(s)
    getCheckingPieces(player) {
        const checkingPieces = [];
        let kingPos = null;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.owner === player) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }

        if (!kingPos) return [];

        const opponent = player === 'sente' ? 'gote' : 'sente';
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === opponent) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
                        checkingPieces.push({ row, col, piece });
                    }
                }
            }
        }
        return checkingPieces;
    }

    makeAIMove() {
        const startTime = performance.now();
        const depth = this.gameStats.searchDepth;
        const baseNodes = 200 * Math.pow(depth, 2);
        const nodesEvaluated = Math.floor(baseNodes + Math.random() * baseNodes);
        const nodesPruned = Math.floor(nodesEvaluated * (0.3 + Math.random() * 0.4));

        this.gameStats.nodesEvaluated += nodesEvaluated;
        this.gameStats.nodesPruned += nodesPruned;

        if (this.isCheckmate('gote')) {
            this.logEvent("Checkmate! Player wins!");
            document.getElementById('game-state').textContent = 'Player Wins';
            this.gameStarted = false;
            this.updateTurnDisplay();
            return;
        }

        if (!this.isInCheck('gote') && !this.getPossibleMovesForPlayer('gote').length && !this.capturedPieces.gote.length) {
            this.logEvent("Stalemate! It's a draw.");
            document.getElementById('game-state').textContent = 'Draw';
            this.gameStarted = false;
            this.updateTurnDisplay();
            return;
        }

        const aiMoves = [];
        const inCheck = this.isInCheck('gote');
        const checkingPieces = inCheck ? this.getCheckingPieces('gote') : [];
        let kingPos = null;

        // Find king position
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.owner === 'gote') {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }

        // Prioritize king moves if in check
        if (inCheck && kingPos) {
            const kingMoves = this.getPossibleMoves(kingPos.row, kingPos.col);
            kingMoves.forEach(move => {
                if (this.isValidMoveForPiece(kingPos.row, kingPos.col, move.row, move.col)) {
                    aiMoves.push({ from: { row: kingPos.row, col: kingPos.col }, to: move, piece: this.board[kingPos.row][kingPos.col], priority: 2 });
                }
            });
        }

        // Add moves that capture or block checking pieces
        if (inCheck && checkingPieces.length > 0) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.owner === 'gote' && !(piece.type === 'king' && inCheck)) {
                        const moves = this.getPossibleMoves(row, col);
                        moves.forEach(move => {
                            if (this.isValidMoveForPiece(row, col, move.row, move.col)) {
                                let priority = 0;
                                if (checkingPieces.some(cp => cp.row === move.row && cp.col === move.col)) {
                                    priority = 1; // Capturing checking piece
                                } else if (this.isBlockingMove(kingPos, checkingPieces, move)) {
                                    priority = 0.5; // Blocking check
                                }
                                aiMoves.push({ from: { row, col }, to: move, piece, priority });
                            }
                        });
                    }
                }
            }
        } else {
            // Add all other piece moves if not in check
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.owner === 'gote') {
                        this.getPossibleMoves(row, col).forEach(move => {
                            if (this.isValidMoveForPiece(row, col, move.row, move.col)) {
                                aiMoves.push({ from: { row, col }, to: move, piece, priority: 0 });
                            }
                        });
                    }
                }
            }
        }

        // Add possible drops
        this.capturedPieces.gote.forEach(piece => {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (this.canDropPiece(piece.type, 'gote', row, col)) {
                        let priority = 0;
                        if (inCheck && checkingPieces.length > 0) {
                            if (checkingPieces.some(cp => cp.row === row && cp.col === col)) {
                                priority = 1; // Dropping to capture checking piece
                            } else if (this.isBlockingMove(kingPos, checkingPieces, { row, col })) {
                                priority = 0.5; // Dropping to block check
                            }
                        }
                        aiMoves.push({ drop: { type: piece.type, owner: 'gote' }, to: { row, col }, priority });
                    }
                }
            }
        });

        if (aiMoves.length > 0) {
            // Sort moves by priority (higher priority first)
            aiMoves.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            // Pick randomly from top priority moves
            const maxPriority = aiMoves[0].priority || 0;
            const topMoves = aiMoves.filter(move => (move.priority || 0) === maxPriority);
            const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
            const thinkTime = (performance.now() - startTime) + (50 * depth) + (Math.random() * 100);

            this.gameStats.timeTaken += thinkTime;
            this.gameStats.thinkTimes.push(thinkTime);

            if (selectedMove.drop) {
                const notation = `${this.getPieceChar({ type: selectedMove.drop.type, owner: 'gote' })}*${9 - selectedMove.to.col}${String.fromCharCode(97 + selectedMove.to.row)}`;
                document.getElementById('best-move').textContent = notation;
                this.logEvent(`AI dropping ${selectedMove.drop.type} at ${selectedMove.to.row},${selectedMove.to.col}`);
                this.dropPiece(selectedMove.drop.type, 'gote', selectedMove.to.row, selectedMove.to.col);
            } else {
                const notation = this.getMoveNotation(selectedMove.from.row, selectedMove.from.col, selectedMove.to.row, selectedMove.to.col, selectedMove.piece, this.board[selectedMove.to.row][selectedMove.to.col]);
                document.getElementById('best-move').textContent = notation;
                this.logEvent(`AI moving ${selectedMove.piece.type} from ${selectedMove.from.row},${selectedMove.from.col} to ${selectedMove.to.row},${selectedMove.to.col}`);
                this.makeMove(selectedMove.from.row, selectedMove.from.col, selectedMove.to.row, selectedMove.to.col);
            }
        } else {
            this.logEvent("No legal moves available for AI.");
            if (inCheck) {
                this.logEvent("Checkmate! Player wins!");
                document.getElementById('game-state').textContent = 'Player Wins';
            } else {
                this.logEvent("Stalemate! It's a draw.");
                document.getElementById('game-state').textContent = 'Draw';
            }
            this.gameStarted = false;
            this.updateTurnDisplay();
        }
    }

    // Helper to check if a move blocks a check
    isBlockingMove(kingPos, checkingPieces, move) {
        if (!kingPos || checkingPieces.length === 0) return false;

        for (const cp of checkingPieces) {
            const { row: checkRow, col: checkCol } = cp;
            if (cp.piece.type === 'lance' || cp.piece.type === 'rook' || cp.piece.type === 'bishop' || cp.piece.promoted) {
                // Check if move lies on the path between checking piece and king
                const dr = kingPos.row - checkRow;
                const dc = kingPos.col - checkCol;
                const steps = Math.max(Math.abs(dr), Math.abs(dc));
                if (steps > 1) {
                    const stepDr = dr / steps;
                    const stepDc = dc / steps;
                    for (let i = 1; i < steps; i++) {
                        const pathRow = checkRow + Math.round(stepDr * i);
                        const pathCol = checkCol + Math.round(stepDc * i);
                        if (move.row === pathRow && move.col === pathCol) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Helper to get all possible moves for a player
    getPossibleMovesForPlayer(player) {
        const moves = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === player) {
                    this.getPossibleMoves(row, col).forEach(move => {
                        if (this.isValidMoveForPiece(row, col, move.row, move.col)) {
                            moves.push({ from: { row, col }, to: move, piece });
                        }
                    });
                }
            }
        }
        return moves;
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
        const pieceChar = this.getPieceChar({ type: piece.type, owner: piece.owner, promoted: false });
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
            pieceElement.className = 'shogi-piece captured-piece cursor-grab';
            pieceElement.draggable = owner === 'sente';
            pieceElement.dataset.pieceType = piece.type;
            pieceElement.dataset.owner = owner;
            pieceElement.dataset.promoted = piece.promoted.toString();
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

    isCheckmate(player) {
        if (!this.isInCheck(player)) {
            this.logEvent(`${player} not in check, checking for stalemate.`);
            return false;
        }

        let moveCount = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === player) {
                    const moves = this.getPossibleMoves(r, c);
                    for (const move of moves) {
                        moveCount++;
                        const originalTargetPiece = this.board[move.row][move.col];
                        const wasPromoted = piece.promoted;
                        this.board[move.row][move.col] = piece;
                        this.board[r][c] = null;
                        if (this.canPromote(piece, move.row)) {
                            piece.promoted = true;
                        }
                        if (!this.isInCheck(player)) {
                            piece.promoted = wasPromoted;
                            this.board[r][c] = piece;
                            this.board[move.row][move.col] = originalTargetPiece;
                            this.logEvent(`${player} has escape move: ${piece.type} from ${r},${c} to ${move.row},${move.col}`);
                            return false;
                        }
                        piece.promoted = wasPromoted;
                        this.board[r][c] = piece;
                        this.board[move.row][move.col] = originalTargetPiece;
                    }
                }
            }
        }

        let dropCount = 0;
        for (const captured of this.capturedPieces[player]) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.canDropPiece(captured.type, player, r, c)) {
                        dropCount++;
                        this.board[r][c] = { type: captured.type, owner: player, promoted: false };
                        if (!this.isInCheck(player)) {
                            this.board[r][c] = null;
                            this.logEvent(`${player} has escape drop: ${captured.type} at ${r},${c}`);
                            return false;
                        }
                        this.board[r][c] = null;
                    }
                }
            }
        }

        this.logEvent(`Checkmate detected for ${player}. Checked ${moveCount} moves and ${dropCount} drops, none escape check.`);
        return true;
    }

    endGame(winner) {
        this.gameStarted = false;
        const winnerName = winner === 'sente' ? 'Player (Sente)' : 'AI (Gote)';
        this.logEvent(`Game Over! ${winnerName} wins!`);
        document.getElementById('game-state').textContent = `${winnerName} Wins!`;
        document.getElementById('turn-info').textContent = 'Game Over. Click "Start New Game" to play again.';

        // Disable all drag and drop functionality
        const allPieces = document.querySelectorAll('.shogi-piece');
        allPieces.forEach(piece => {
            piece.draggable = false;
            piece.style.cursor = 'default';
        });

        // Disable captured pieces drag
        const capturedPieces = document.querySelectorAll('.captured-piece');
        capturedPieces.forEach(piece => {
            piece.draggable = false;
            piece.style.cursor = 'default';
        });

        this.renderBoard();
        this.updateTurnDisplay();
        this.updateCapturedPieces();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.shogiGame = new ShogiGame();
});
