// --- Modal Handling ---
document.addEventListener('DOMContentLoaded', () => {
    // Generate the board on page load
    const modals = {
        about: {
            dialog: document.getElementById('about-modal'),
            openBtn: document.getElementById('open-about-btn'),
            closeBtn: document.getElementById('close-about-btn')
        },
        pseudo: {
            dialog: document.getElementById('pseudo-modal'),
            openBtn: document.getElementById('open-pseudo-btn'),
            closeBtn: document.getElementById('close-pseudo-btn')
        },
        shogi: {
            dialog: document.getElementById('shogi-modal'),
            openBtn: document.getElementById('open-shogi-btn'),
            closeBtn: document.getElementById('close-shogi-btn')
        }
    };

    // Function to handle opening and closing modals
    const setupModal = (modal) => {
        modal.openBtn.addEventListener('click', () => modal.dialog.showModal());
        modal.closeBtn.addEventListener('click', () => modal.dialog.close());
        // Close when clicking on the backdrop
        modal.dialog.addEventListener('click', (event) => {
            if (event.target === modal.dialog) {
                modal.dialog.close();
            }
        });
    };

    // Set up all modals
    Object.values(modals).forEach(setupModal);
});
