document.addEventListener('DOMContentLoaded', function () {
    const otpInputs = document.querySelectorAll('.otp-input');
    const resendOtpLink = document.getElementById('resend-otp');
    const backButton = document.getElementById('back-button');
    const continueButton = document.getElementById('continue-button');

    // Retrieve email and role from localStorage
    const email = localStorage.getItem("resetEmail");
    const role = localStorage.getItem("resetRole");

    if (!email || !role) {
        alert("Email or role missing. Redirecting...");
        window.location.href = "forgetpassword.html";
        return;
    }

    // Handle back button click to redirect to forgetpassword screen
    backButton.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'forgetpassword.html';
    });

    // Handle continue button click to verify OTP
    continueButton.addEventListener('click', async function (e) {
        e.preventDefault();
        const otp = getOtp();

        if (!otp) {
            alert('Please enter a valid 6-digit OTP');
            return;
        }

        try {
            const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role, otp }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || "OTP verified successfully.");
                window.location.href = "resetpassword.html"; // Redirect on success
            } else {
                alert(result.message || "OTP verification failed.");
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            alert("Something went wrong. Please try again.");
        }
    });

    // Get combined OTP from 6 input boxes
    function getOtp() {
        let otp = "";
        otpInputs.forEach(input => {
            otp += input.value.trim();
        });
        return otp.length === 6 ? otp : null;
    }

    // Handle OTP input focus navigation
    otpInputs.forEach((input, index, inputs) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Handle Resend OTP click
    resendOtpLink.addEventListener('click', async function (e) {
        e.preventDefault();

        try {
            const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/otp/resend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || "OTP resent successfully.");
            } else {
                alert(result.message || "Failed to resend OTP.");
            }
        } catch (error) {
            console.error("Error resending OTP:", error);
            alert("Something went wrong while resending OTP.");
        }
    });
});