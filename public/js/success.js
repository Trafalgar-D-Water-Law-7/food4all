document.addEventListener("DOMContentLoaded", function () {
    var flashMessages = document.querySelectorAll(".flash-message"); // Select all flash messages

    flashMessages.forEach(flashMessage => {
        if (flashMessage.textContent.trim() !== '') {
            flashMessage.style.display = "block"; // Show message
            setTimeout(() => {
                flashMessage.style.animation = "fadeOut 0.5s ease-in-out";
                setTimeout(() => {
                    flashMessage.style.display = "none"; // Hide after animation
                }, 500);
            }, 2000); // Display for 2 seconds before fading out
        }
    });
});
