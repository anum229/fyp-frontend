// Forget Password
async function validateForgetPassword() {
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;

    if (!email || !role) {
        alert("Please enter your email and select a role.");
        return;
    }

    const continueButton = document.querySelector(".continue-button");
    const originalText = continueButton.textContent;
    continueButton.textContent = "Processing...";
    continueButton.disabled = true;

    try {
        const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/auth/forgotpassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                role
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Store email and role in localStorage for OTP verification use
            localStorage.setItem("resetEmail", email);
            localStorage.setItem("resetRole", role);

            alert(result.message);
            window.location.href = "otp-verification.html"; // Redirect on success
        } else {
            alert(result.message || "Failed to send OTP. Please try again.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong. Please try again later.");
    } finally {
        continueButton.textContent = originalText;
        continueButton.disabled = false;
    }
}

function removeDefaultOption() {
    const dropdown = document.getElementById("role");
    const firstOption = dropdown.options[0];
    if (firstOption.disabled) {
        firstOption.disabled = true;
    }
}