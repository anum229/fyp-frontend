function displayFileName() {
    const fileInput = document.getElementById("file-upload");
    const fileNameDisplay = document.getElementById("file-name");

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = file.name;

        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(file);
        downloadLink.download = fileName;
        downloadLink.textContent = fileName;
        downloadLink.classList.add("download-link");

        fileNameDisplay.innerHTML = "";
        fileNameDisplay.appendChild(downloadLink);
    } else {
        fileNameDisplay.textContent = "No file selected";
    }
}

function getGroupIdFromToken() {
    const token = localStorage.getItem("authToken");
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.groupID;
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
}

function showLoading(button) {
    button.innerHTML = '<div class="spinner"></div> Submitting...';
    button.disabled = true;
}

function hideLoading(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}

async function checkProposalStatus() {
    try {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No auth token found");
            return;
        }

        const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/proposals/status", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Proposal Status:", data);

        const statusEl = document.getElementById("status");
        const projectTitleInput = document.getElementById("project-title");
        const fileInput = document.getElementById("file-upload");
        const fileDisplay = document.getElementById("file-name");
        const feedbackEl = document.getElementById("feedback");

        // Reset all fields first
        statusEl.className = "status";
        projectTitleInput.value = "";
        fileInput.value = "";
        fileDisplay.textContent = "No file selected";
        feedbackEl.textContent = "No feedback yet";

        if (data.exists) {
            // Set status with appropriate styling
            statusEl.textContent = data.status;

            if (data.status === "Approved") {
                statusEl.classList.add("approved");
            } else if (data.status === "Rejected") {
                statusEl.classList.add("rejected");
            } else {
                statusEl.classList.add("pending");
            }

            // Only populate fields if not rejected
            if (!data.isRejected) {
                projectTitleInput.value = data.projectTitle || "";

                if (data.pdfUrl) {
                    const fileName = data.pdfUrl.split('/').pop();
                    fileDisplay.innerHTML = `
                        <a href="${data.pdfUrl}" class="download-link" target="_blank">
                            ${fileName}
                        </a>
                    `;
                }
            }

            // 🧠 Updated feedback logic with fallback handling
            if (data.aiStatus === "Fail") {
                feedbackEl.textContent = data.aiFeedbackDescription || "AI review failed.";
            } else if (data.aiStatus === "Pass") {
                if (data.fypStatus === "Approved" || data.fypStatus === "Rejected") {
                    feedbackEl.textContent = data.fypFeedback || "No FYP feedback provided.";
                }
            }

        } else {
            // No proposal exists
            statusEl.textContent = "Pending";
            statusEl.classList.add("pending");
        }
    } catch (error) {
        console.error("Failed to check proposal status:", error);
        document.getElementById("status").textContent = "Error";
        document.getElementById("status").className = "status error";
    }
}


async function confirmSubmission() {
    const submitButton = document.getElementById("submit-button");
    const originalText = submitButton.innerHTML;
    const fileInput = document.getElementById("file-upload");
    const projectTitleInput = document.getElementById("project-title");
    const statusEl = document.getElementById("status");

    // Basic validation
    if (!fileInput.files.length || !projectTitleInput.value.trim()) {
        alert("Please fill all fields before submitting.");
        return;
    }

    const confirmation = confirm("Are you sure you want to submit your proposal?");
    if (!confirmation) return;

    const token = localStorage.getItem("authToken");
    const groupId = getGroupIdFromToken();
    if (!token || !groupId) {
        alert("Authentication error. Please login again.");
        return;
    }

    showLoading(submitButton);

    const formData = new FormData();
    formData.append("projectTitle", projectTitleInput.value.trim());
    formData.append("pdf", fileInput.files[0]);

    try {
        const response = await fetch("https://fyp-backend-8mc0.onrender.com/api/proposals/submit", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || "Proposal submitted successfully");
            await checkProposalStatus(); // Refresh status
        } else {
            alert(data.message || "Submission failed");
        }
    } catch (error) {
        console.error("Submission Error:", error);
        alert("An error occurred while submitting");
    } finally {
        hideLoading(submitButton, originalText);
    }
}

// Initialize on page load and call checkProposalStatus immediately
(function initialize() {
    // Call immediately on load
    checkProposalStatus();
    
    // Also set up the MutationObserver for status changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === "class" && 
                mutation.target.textContent === "Rejected") {
                // Clear fields when status changes to Rejected
                document.getElementById("project-title").value = "";
                document.getElementById("file-name").textContent = "No file selected";
                document.getElementById("file-upload").value = "";
            }
        });
    });
    
    observer.observe(document.getElementById("status"), {
        attributes: true,
        childList: true,
        characterData: true
    });
})();