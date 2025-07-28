// Toggle Password Visibility
const togglePasswordIcons = document.querySelectorAll('.toggle-password');

togglePasswordIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        const targetId = icon.getAttribute('data-target');
        const passwordField = document.getElementById(targetId);

        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.classList.add('active');
            icon.textContent = '👁️‍🗨️';
        } else {
            passwordField.type = 'password';
            icon.classList.remove('active');
            icon.textContent = '👁️';
        }
    });
});

// Handle Reset Password submission
document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('.reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validate
        if (!newPassword || !confirmPassword) {
            alert("Please fill in both password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        const email = localStorage.getItem("resetEmail");
        const role = localStorage.getItem("resetRole");

        if (!email || !role) {
            alert("Missing email or role. Please go through the forgot password process again.");
            window.location.href = "forgetpassword.html";
            return;
        }

        try {
            const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role, newPassword }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || "Password reset successful. Please log in.");
                // Clear localStorage
                localStorage.removeItem("resetEmail");
                localStorage.removeItem("resetRole");
                window.location.href = "login.html";
            } else {
                alert(result.message || "Password reset failed.");
            }
        } catch (error) {
            console.error("Reset password error:", error);
            alert("Something went wrong. Please try again later.");
        }
    });
});