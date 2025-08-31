function switchRole(role) {
    const formTitle = document.getElementById('form-title');
    const loginButton = document.getElementById('login-button');
    const tabs = document.querySelectorAll('.role-tab');

    tabs.forEach(tab => tab.classList.remove('active'));

    if (role === 'student') {
        formTitle.textContent = 'Student Login';
        loginButton.textContent = 'Login as Student';
        loginButton.setAttribute("onclick", `validateLogin('student')`);
        document.querySelector('.role-tab-student').classList.add('active');
    } else if (role === 'teacher') {
        formTitle.textContent = 'Teacher Login';
        loginButton.textContent = 'Login as Teacher';
        loginButton.setAttribute("onclick", `validateLogin('teacher')`);
        document.querySelector('.role-tab-teacher').classList.add('active');
    } else {
        formTitle.textContent = 'FYP Team Login';
        loginButton.textContent = 'Login as FYP Team';
        loginButton.setAttribute("onclick", `validateLogin('fyp_team')`);
        document.querySelector('.role-tab-fyp').classList.add('active');
    }
}

async function validateLogin(requestedRole) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Show loading state
    const loginButton = document.getElementById('login-button');
    const originalButtonText = loginButton.textContent;
    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;

    try {
        const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
                requestedRole
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Save token and user data to localStorage
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userRole', result.actualRole);
            localStorage.setItem('userData', JSON.stringify(result.user));

            if (requestedRole === 'student') {
                localStorage.setItem('studentId', result.user._id); // <-- Add this line only for students
            }

            // Redirect based on REQUESTED role
            const redirectUrls = {
                student: "Student Portal/studentlandingpage.html",
                teacher: "Teacher Portal/teacherlandingpage.html",
                fyp_team: "FYP Team/fyplandingpage.html"
            };

            window.location.href = redirectUrls[requestedRole]; // Immediate redirection
        } else {
            alert(result.message || "Invalid credentials. Please try again.");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Something went wrong. Please try again later.");
    } finally {
        // Restore button state
        loginButton.textContent = originalButtonText;
        loginButton.disabled = false;
    }
}

function togglePasswordVisibility() {
    const passwordField = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');

    if (passwordField.type === "password") {
        passwordField.type = "text";
        eyeIcon.textContent = "👁️‍🗨️";
    } else {
        passwordField.type = "password";
        eyeIcon.textContent = "👁️";
    }
}

function redirectToForgotPassword() {
    window.location.href = "forgetpassword.html";
}

// Initialize with default role
switchRole('student');