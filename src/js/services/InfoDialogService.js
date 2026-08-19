export function InfoDialogService() {
    return {
        open
    };

    function open(title, message, buttonText = 'Ok', callback = () => {}) {
        const dialog = document.getElementById('info-dialog');
        const dialogTitle = document.querySelector('#info-dialog h2');
        const dialogMessage = document.getElementById('info-dialog-message');
        const dialogOkButton = document.getElementById('info-dialog-button');

        dialogTitle.innerHTML = title;
        dialogMessage.innerHTML = message;
        dialogOkButton.textContent = buttonText;

        dialog.addEventListener('close', () => {
            callback();
        }, { once: true });
        dialog.showModal();
    }
}
