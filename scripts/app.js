let gameSide = '';

document.addEventListener("DOMContentLoaded", () => {
    initialiseEventListeners();
});

function initialiseEventListeners() {
    const sente = document.querySelector("#choose-sente");
    const gote = document.querySelector("#choose-gote");

    sente.addEventListener("click", () => {
        gameSide = 'sente';
        console.log(gameSide);
        updateGameSide(gameSide);
    });

    gote.addEventListener("click", () => {
        gameSide = 'gote';
        console.log(gameSide);
        updateGameSide(gameSide);
    });
}

function updateGameSide(side) {
    const currentTurnText = document.querySelector("#current-turn");

    switch (side) {
        case 'sente':
            gameSide = 'sente';
            currentTurnText.textContent = 'Player';

            currentTurnText.classList.remove('text-red-400');
            currentTurnText.classList.add('text-green-400');

            break;

        case 'gote':
            gameSide = 'gote';
            currentTurnText.textContent = 'AI';

            currentTurnText.classList.remove('text-green-400');
            currentTurnText.classList.add('text-red-400');

            break;

        default:
            break;
    }
}
