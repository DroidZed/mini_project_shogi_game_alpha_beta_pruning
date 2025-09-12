class ShogiGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'sente';
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
            this.board[0][col] = {type: goteBackRow[col], owner: 'gote', promoted: false};
        }
        this.board[1][1] = {type: 'rook', owner: 'gote', promoted: false};
        this.board[1][7] = {type: 'bishop', owner: 'gote', promoted: false};
        for (let col = 0; col < 9; col++) {
            this.board[2][col] = {type: 'pawn', owner: 'gote', promoted: false};
        }

        const senteBackRow = ['lance', 'knight', 'silver', 'gold', 'king', 'gold', 'silver', 'knight', 'lance'];
        for (let col = 0; col < 9; col++) {
            this.board[6][col] = {type: 'pawn', owner: 'sente', promoted: false};
        }
        this.board[7][7] = {type: 'rook', owner: 'sente', promoted: false};
        this.board[7][1] = {type: 'bishop', owner: 'sente', promoted: false};
        for (let col = 0; col < 9; col++) {
            this.board[8][col] = {type: senteBackRow[col], owner: 'sente', promoted: false};
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
                    moves.push({row: newRow, col: newCol});
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
                moves.push({row: newRow, col: newCol});
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
                moves.push({row: newRow, col: newCol});
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
                moves.push({row: newRow, col: newCol});
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
                moves.push({row: newRow, col: newCol});
            }
        }
        return moves;
    }

    getKnightMoves(row, col, direction) {
        const moves = [];
        // A shogi knight moves two squares forward and one square to the left or right, jumping over pieces.
        const forwardStep = 2 * direction;
        const sideSteps = [-1, 1];

        for (const dc of sideSteps) {
            const newRow = row + forwardStep;
            const newCol = col + dc;
            if (this.isInBounds(newRow, newCol)) {
                moves.push({row: newRow, col: newCol});
            }
        }
        return moves;
    }

    getLanceMoves(row, col, direction) {
        const moves = [];
        for (let i = 1; i < 9; i++) {
            const newRow = row + direction * i;
            if (!this.isInBounds(newRow, col)) break;
            moves.push({row: newRow, col: col});
            if (this.board[newRow][col]) break;
        }
        return moves;
    }

    getPawnMoves(row, col, direction) {
        const newRow = row + direction;
        return this.isInBounds(newRow, col) ? [{row: newRow, col: col}] : [];
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
                    kingPos = {row, col};
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
                this.dragState.droppingPiece = {type: pieceType, owner: owner};
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
            this.dragState.originalSquare = {row, col};
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
            this.dragState = {dragging: false, originalSquare: null, droppingPiece: null};
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
            this.capturedPieces[moveMaker].push({type: capturedPiece.type, promoted: false});
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
            this.board[row][col] = {type: pieceType, owner: owner, promoted: false};
            const isMate = this.isCheckmate(opponent);
            this.board[row][col] = null;
            if (isMate) {
                return false;
            }
        }

        this.board[row][col] = {type: pieceType, owner: owner, promoted: false};
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

        this.board[row][col] = {type: pieceType, owner: owner, promoted: false};
        if (this.isInCheck(owner)) {
            this.board[row][col] = null;
            capturedArray.push({type: pieceType, promoted: false});
            this.logEvent('Illegal drop: Cannot leave king in check.');
            return;
        }

        const moveMaker = this.currentPlayer;
        const opponent = (moveMaker === 'sente') ? 'gote' : 'sente';

        const moveNotation = `${this.getPieceChar({
            type: pieceType,
            owner
        })}*${9 - col}${String.fromCharCode(97 + row)}`;
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

    makeAIMove() {
        const startTime = performance.now();
        this.gameStats.nodesEvaluated = 0;
        this.gameStats.nodesPruned = 0;

        const depth = this.gameStats.searchDepth;
        // A depth of 0 will result in a random (but legal) move.
        if (depth === 0) {
            const moves = this.getAllMovesForPlayer('gote');
            if (moves.length === 0) {
                this.endGame('sente');
                return;
            }
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            if (randomMove.type === 'drop') {
                this.dropPiece(randomMove.drop.type, 'gote', randomMove.to.row, randomMove.to.col);
            } else {
                this.makeMove(randomMove.from.row, randomMove.from.col, randomMove.to.row, randomMove.to.col);
            }
            return;
        }


        const allMoves = this.getAllMovesForPlayer('gote');

        if (allMoves.length === 0) {
            if (this.isInCheck('gote')) this.endGame('sente');
            else this.endGame('draw'); // Stalemate
            return;
        }

        let bestMove = allMoves[0];
        let maxEval = -Infinity;
        let alpha = -Infinity;

        // Iterate through all possible moves to find the best one
        for (const move of allMoves) {
            const undo = this.applyMove(move);
            // The next level is the minimizing player (sente)
            const evaluation = this.alphaBeta(depth - 1, alpha, Infinity, false);
            this.undoMove(undo);

            if (evaluation > maxEval) {
                maxEval = evaluation;
                bestMove = move;
            }
        }

        const thinkTime = performance.now() - startTime;
        this.gameStats.timeTaken += thinkTime;
        this.gameStats.thinkTimes.push(thinkTime);
        this.gameStats.bestScore = (maxEval / 100).toFixed(2);
        this.updateGameStatistics();

        if (bestMove) {
            if (bestMove.type === 'drop') {
                document.getElementById('best-move').textContent = `${this.getPieceChar({type: bestMove.drop.type})}*${9 - bestMove.to.col}${String.fromCharCode(97 + bestMove.to.row)}`;
                this.logEvent(`AI dropping ${bestMove.drop.type} at ${bestMove.to.row},${bestMove.to.col}`);
                this.dropPiece(bestMove.drop.type, 'gote', bestMove.to.row, bestMove.to.col);
            } else {
                const piece = this.board[bestMove.from.row][bestMove.from.col];
                document.getElementById('best-move').textContent = this.getMoveNotation(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col, piece, this.board[bestMove.to.row][bestMove.to.col]);
                this.logEvent(`AI moving ${piece.type} from ${bestMove.from.row},${bestMove.from.col} to ${bestMove.to.row},${bestMove.to.col}`);
                this.makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            }
        } else {
            this.logEvent("AI Error: No best move found. Game may be over.");
            if (this.isInCheck('gote')) this.endGame('sente');
        }
    }

    // New AI Helper: Get all legal moves (board moves and drops) for a player.
    getAllMovesForPlayer(player) {
        const moves = [];
        // 1. Get all board moves
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.owner === player) {
                    const possibleMoves = this.getPossibleMoves(r, c);
                    for (const move of possibleMoves) {
                        if (this.isValidMoveForPiece(r, c, move.row, move.col)) {
                            moves.push({from: {row: r, col: c}, to: {row: move.row, col: move.col}, type: 'move'});
                        }
                    }
                }
            }
        }
        // 2. Get all drop moves
        const uniqueCaptured = [...new Map(this.capturedPieces[player].map(p => [p.type, p])).values()];
        for (const captured of uniqueCaptured) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.canDropPiece(captured.type, player, r, c)) {
                        moves.push({drop: {type: captured.type, owner: player}, to: {row: r, col: c}, type: 'drop'});
                    }
                }
            }
        }
        return moves;
    }

    // New AI Helper: Simulate a move for the search algorithm
    applyMove(move) {
        const undoData = {
            move: move,
            capturedPiece: null,
            wasPromoted: false,
            droppedPieceType: null
        };

        if (move.type === 'move') {
            const piece = this.board[move.from.row][move.from.col];
            undoData.wasPromoted = piece.promoted;
            undoData.capturedPiece = this.board[move.to.row][move.to.col];

            this.board[move.to.row][move.to.col] = piece;
            this.board[move.from.row][move.from.col] = null;

            if (undoData.capturedPiece) {
                // Captured pieces are always demoted to their base type.
                const capturedBaseType = undoData.capturedPiece.type;
                this.capturedPieces[piece.owner].push({type: capturedBaseType, promoted: false});
            }

            // In search, we test the move with promotion if possible for a more aggressive AI
            if (!piece.promoted && this.canPromote(piece, move.to.row)) {
                piece.promoted = true;
            }
        } else { // 'drop'
            const pieceToDrop = move.drop;
            undoData.droppedPieceType = pieceToDrop.type;
            const index = this.capturedPieces[pieceToDrop.owner].findIndex(p => p.type === pieceToDrop.type);
            if (index > -1) {
                this.capturedPieces[pieceToDrop.owner].splice(index, 1);
            }
            this.board[move.to.row][move.to.col] = {type: pieceToDrop.type, owner: pieceToDrop.owner, promoted: false};
        }
        return undoData;
    }

    // New AI Helper: Undo a simulated move
    undoMove(undoData) {
        const move = undoData.move;
        if (move.type === 'move') {
            const piece = this.board[move.to.row][move.to.col];
            piece.promoted = undoData.wasPromoted;
            this.board[move.from.row][move.from.col] = piece;
            this.board[move.to.row][move.to.col] = undoData.capturedPiece;

            if (undoData.capturedPiece) {
                const owner = piece.owner;
                const capturedBaseType = undoData.capturedPiece.type;
                // Find and remove the last added piece of that type to correctly handle multiple captures of the same type.
                for (let i = this.capturedPieces[owner].length - 1; i >= 0; i--) {
                    if (this.capturedPieces[owner][i].type === capturedBaseType) {
                        this.capturedPieces[owner].splice(i, 1);
                        break;
                    }
                }
            }
        } else { // 'drop'
            this.board[move.to.row][move.to.col] = null;
            this.capturedPieces[move.drop.owner].push({type: undoData.droppedPieceType, promoted: false});
        }
    }

    // New AI Helper: The recursive alpha-beta pruning algorithm
    alphaBeta(depth, alpha, beta, isMaximizingPlayer) {
        this.gameStats.nodesEvaluated++;
        if (depth === 0) {
            return this.calculatePositionValue();
        }

        const player = isMaximizingPlayer ? 'gote' : 'sente';
        const allMoves = this.getAllMovesForPlayer(player);

        if (allMoves.length === 0) {
            if (this.isInCheck(player)) {
                // Return a very high/low score for checkmate
                return isMaximizingPlayer ? -Infinity : Infinity;
            }
            return 0; // Stalemate
        }

        if (isMaximizingPlayer) { // Gote (AI)
            let maxEval = -Infinity;
            for (const move of allMoves) {
                const undo = this.applyMove(move);
                const evaluation = this.alphaBeta(depth - 1, alpha, beta, false);
                this.undoMove(undo);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    this.gameStats.nodesPruned++;
                    break; // Beta cut-off
                }
            }
            return maxEval;
        } else { // Sente (Player)
            let minEval = Infinity;
            for (const move of allMoves) {
                const undo = this.applyMove(move);
                const evaluation = this.alphaBeta(depth - 1, alpha, beta, true);
                this.undoMove(undo);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    this.gameStats.nodesPruned++;
                    break; // Alpha cut-off
                }
            }
            return minEval;
        }
    }

    getPossibleMovesForPlayer(player) {
        const moves = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.owner === player) {
                    this.getPossibleMoves(row, col).forEach(move => {
                        if (this.isValidMoveForPiece(row, col, move.row, move.col)) {
                            moves.push({from: {row, col}, to: move, piece});
                        }
                    });
                }
            }
        }
        return moves;
    }

    calculatePositionValue() {
        const pieceValues = {
            pawn: 100, lance: 300, knight: 320, silver: 500, gold: 550,
            bishop: 800, rook: 1000, king: 20000
        };
        const promotedValues = {
            pawn: 400, lance: 450, knight: 450, silver: 550,
            bishop: 1000, rook: 1200
        };

        let value = 0;
        // Evaluate pieces on the board
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let pieceValue = piece.promoted ? (promotedValues[piece.type] || pieceValues[piece.type]) : pieceValues[piece.type];
                    if (piece.owner === 'sente') {
                        value -= pieceValue; // Player's pieces are negative
                    } else {
                        value += pieceValue; // AI's pieces are positive
                    }
                }
            }
        }

        // Evaluate captured pieces (pieces in hand)
        for (const piece of this.capturedPieces.sente) {
            value -= pieceValues[piece.type] * 1.1; // Pieces in hand are slightly more valuable
        }
        for (const piece of this.capturedPieces.gote) {
            value += pieceValues[piece.type] * 1.1;
        }

        // Update the display value, scaled for readability
        this.gameStats.positionValue = value / 100;
        return value; // Return the raw score for the AI
    }

    updateGameStatistics() {
        const totalNodes = this.gameStats.nodesEvaluated + this.gameStats.nodesPruned;
        const pruningRate = totalNodes > 0 ? (this.gameStats.nodesPruned / totalNodes) * 100 : 0;

        document.getElementById('nodes-evaluated').textContent = this.gameStats.nodesEvaluated.toLocaleString();
        document.getElementById('nodes-pruned').textContent = this.gameStats.nodesPruned.toLocaleString();
        document.getElementById('time-taken').textContent = Math.round(this.gameStats.timeTaken).toLocaleString();
        document.getElementById('pruning-rate').textContent = `${pruningRate.toFixed(1)}%`;

        const evalValue = this.gameStats.positionValue;
        document.getElementById('position-eval').textContent = (evalValue >= 0 ? '+' : '') + evalValue.toFixed(2);

        document.getElementById('move-count').textContent = this.gameStats.totalMoves;
    }

    canPromote(piece, row) {
        if (piece.promoted || piece.type === 'king' || piece.type === 'gold') return false;
        if (piece.owner === 'sente' && row <= 2) return true;
        return piece.owner === 'gote' && row >= 6;

    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        const files = '987654321';
        const ranks = 'abcdefghi';
        const from = `${files[fromCol]}${ranks[fromRow]}`;
        const to = `${files[toCol]}${ranks[toRow]}`;
        const pieceChar = this.getPieceChar({type: piece.type, owner: piece.owner, promoted: false});
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
            const displayPiece = {...piece, owner};
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
        const giveUpBtn = document.getElementById("forfeit-game");

        if (this.gameStarted) {
            if (this.currentPlayer === 'sente') {
                turnElement.textContent = 'Player (Sente)';
                turnElement.className = 'font-bold text-lg turn-sente';
                turnInfoElement.textContent = 'Your turn. Drag a piece to make a move.';
                giveUpBtn.disabled = false;
            } else {
                turnElement.textContent = 'AI (Gote)';
                turnElement.className = 'font-bold text-lg turn-gote';
                turnInfoElement.textContent = 'AI is thinking...';
                giveUpBtn.disabled = true;
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
        document.getElementById("forfeit-game").addEventListener('click', () => {
            this.endGame('gote');
        })
    }

    startNewGame() {
        this.setupInitialPosition();
        this.gameStarted = true;
        this.currentPlayer = 'sente';
        this.moveHistory = [];
        this.capturedPieces = {sente: [], gote: []};
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
            return false;
        }

        // The game is checkmate if the player is in check AND has no legal moves to escape.
        // getPossibleMovesForPlayer already filters for moves that would escape check.
        if (this.getPossibleMovesForPlayer(player).length > 0) {
            this.logEvent(`${player} is in check, but has legal moves. Not checkmate.`);
            return false;
        }

        // Also check if any drop can save the king. canDropPiece also validates the move.
        for (const captured of this.capturedPieces[player]) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (this.canDropPiece(captured.type, player, r, c)) {
                        this.logEvent(`${player} has an escape drop: ${captured.type} at ${r},${c}`);
                        return false;
                    }
                }
            }
        }

        this.logEvent(`Checkmate detected for ${player}. No legal moves or drops available.`);

        if (player === 'sente')
            Swal.fire({
                        title: "Checkmate 😂",
                        text: "Better luck next time !",
                        icon: "error"
            });

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
