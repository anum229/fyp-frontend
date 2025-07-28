(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/proposals/all`;
    const FYP_REVIEW_API = `${BASE_URL}/api/proposals/fyp-review/`;
    const AI_REVIEW_BULK_API = `${BASE_URL}/api/proposals/ai-review-bulk`;
    
    // Current state
    let proposals = [];
    const token = localStorage.getItem("authToken");
    let currentController = null;

    // ====================== API Functions ======================
    async function fetchProposals(keepModalOpen = false) {
        const loaderModal = document.getElementById('loaderModal');
        try {
            const res = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();

            const proposalArray = Array.isArray(data) ? data : data.data;

            proposals = proposalArray
                .filter(p => p.aiStatus === "Pass" || p.aiStatus === "Fail")
                .map((p, index) => ({
                    sNo: index + 1,
                    groupID: p.groupId,
                    projectTitle: p.projectTitle,
                    groupMembers: p.groupMembers.map(m => ({
                        name: m,
                        role: m === p.groupLeader ? "GL" : ""
                    })),
                    groupLeaderEmail: p.submittedBy?.email || "N/A",
                    proposalDocument: p.pdfUrl,
                    aiReviewedDate: p.aiReviewDate ? new Date(p.aiReviewDate).toLocaleDateString() : "N/A",
                    status: p.aiStatus,
                    feedback: p.aiFeedback || "No feedback",
                    feedbackDescription: p.aiFeedbackDescription || "",
                    feedbackType: "ai",
                    fypFeedback: p.fypFeedback || "No feedback",
                    action: p.fypStatus || (p.aiStatus === "Fail" ? "Not Available" : "Pending")
                }));

            renderTable(proposals);
        } catch (err) {
            console.error("Error fetching proposals:", err);
            if (!keepModalOpen) {
                alert("Error loading proposals. Please try again.");
            }
            throw err;
        }
    }

    async function submitFYPReview(action, groupId, feedback) {
        try {
            const res = await fetch(FYP_REVIEW_API + groupId, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fypStatus: action === "approve" ? "Approved" : "Rejected",
                    fypFeedback: feedback
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Review submission failed');
            }

            return await res.json();
        } catch (error) {
            console.error("Error submitting review:", error);
            throw error;
        }
    }

    async function fetchAndReviewPendingProposals() {
        const loaderModal = document.getElementById('loaderModal');
        const btn = document.getElementById('fetchProposalsBtn');
        
        // Cancel any existing request
        if (currentController) {
            currentController.abort();
        }
        
        currentController = new AbortController();
        const timeoutId = setTimeout(() => currentController.abort(), 300000); // 5 minutes timeout
        
        try {
            // Show loader modal and disable button
            loaderModal.style.display = 'block';
            btn.disabled = true;
            
            // Make the API call
            const res = await fetch(AI_REVIEW_BULK_API, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: currentController.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to review proposals');
            }
            
            const data = await res.json();
            
            // Refresh data with modal still visible
            await fetchProposals(true);
            
            return data;
        } catch (error) {
            console.error("Error in bulk AI review:", error);
            
            // Refresh data even on error (with modal still visible)
            try {
                await fetchProposals(true);
            } catch (refreshError) {
                console.error("Error refreshing proposals:", refreshError);
            }
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. The review may still be processing.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Connection interrupted, but review may have completed');
            } else {
                throw new Error(error.message || 'Error reviewing proposals');
            }
        } finally {
            clearTimeout(timeoutId);
            currentController = null;
            // Only hide loader modal and enable button after everything is complete
            loaderModal.style.display = 'none';
            btn.disabled = false;
        }
    }

    // ====================== UI Functions ======================
    function renderTable(data) {
        const tableBody = document.querySelector("#proposalsTable tbody");
        tableBody.innerHTML = "";

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="no-data">No proposals found</td></tr>`;
            return;
        }

        data.forEach((proposal) => {
            const row = document.createElement("tr");

            const groupMembersHTML = proposal.groupMembers.map(member => 
                `<div>${member.name} ${member.role === "GL" ? "<span class='gl-tag'>GL</span>" : ""}</div>`
            ).join('');

            const statusHTML = `
                <div class="status-container">
                    ${proposal.status}
                    <span class="help-icon" data-feedback="${proposal.feedbackDescription ? `${proposal.feedback}: ${proposal.feedbackDescription}` : proposal.feedback}">&#9432;</span>
                </div>
            `;

            let actionHTML = "";
            if (proposal.status === "Fail" || proposal.action === "Not Available") {
                actionHTML = `
                    <div class="action-status">
                        Action Not Available
                        <span class="help-icon" data-feedback="No action available">&#9432;</span>
                    </div>
                `;
            } else if (proposal.action === "Pending") {
                actionHTML = `
                    <div class="action-buttons">
                        <button class="approve-btn" onclick="window.openFeedbackModal('approve', '${proposal.groupID}')">Approve</button>
                        <button class="reject-btn" onclick="window.openFeedbackModal('reject', '${proposal.groupID}')">Reject</button>
                    </div>
                `;
            } else {
                actionHTML = `
                    <div class="action-status">
                        ${proposal.action}
                        <span class="help-icon" data-feedback="${proposal.fypFeedback}">&#9432;</span>
                    </div>
                `;
            }

            row.innerHTML = `
                <td>${proposal.sNo}</td>
                <td>${proposal.groupID}</td>
                <td>${proposal.projectTitle}</td>
                <td>${groupMembersHTML}</td>
                <td><a href="mailto:${proposal.groupLeaderEmail}">${proposal.groupLeaderEmail}</a></td>
                <td><a href="${proposal.proposalDocument}" target="_blank" class="download-link">Download</a></td>
                <td>${proposal.aiReviewedDate}</td>
                <td>${statusHTML}</td>
                <td>${actionHTML}</td>
            `;

            tableBody.appendChild(row);
        });

        // Add tooltip functionality to help icons
        document.querySelectorAll(".help-icon").forEach(icon => {
            icon.addEventListener("mouseover", () => {
                const feedback = icon.getAttribute("data-feedback");
                alert("Feedback: " + feedback);
            });
        });
    }

    function openFeedbackModal(action, groupId) {
        const modal = document.getElementById("feedbackModal");
        const feedbackText = document.getElementById("feedbackText");
        const submitFeedbackBtn = document.getElementById("submitFeedback");

        feedbackText.value = "";

        submitFeedbackBtn.onclick = async () => {
            const feedback = feedbackText.value.trim();
            if (!feedback) {
                alert("Please enter feedback.");
                return;
            }

            try {
                await submitFYPReview(action, groupId, feedback);
                alert("Action completed successfully");
                fetchProposals(); // Refresh list
                modal.style.display = "none";
            } catch (error) {
                console.error("Feedback submission error:", error);
                alert(error.message || "Something went wrong");
            }
        };

        modal.style.display = "block";
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        const filteredProposals = proposals.filter((proposal) =>
            proposal.groupID.toLowerCase().includes(searchTerm)
        );
        renderTable(filteredProposals);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Search functionality
        const searchBar = document.getElementById("searchBar");
        if (searchBar) {
            searchBar.addEventListener("input", handleSearch);
            searchBar.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleSearch();
            });
        }

        // Feedback modal close button
        document.querySelector(".close")?.addEventListener("click", () => {
            document.getElementById("feedbackModal").style.display = "none";
        });

        // Add listener for the new fetch proposals button
        document.getElementById('fetchProposalsBtn')?.addEventListener('click', async function() {
            try {
                const result = await fetchAndReviewPendingProposals();
                if (result.success) {
                    alert(result.message || 'Proposals reviewed successfully');
                } else {
                    alert(result.message || 'No new proposals were reviewed');
                }
            } catch (error) {
                console.error("Bulk review error:", error);
                alert(`Notice: ${error.message || 'Operation completed with some issues'}`);
            }
        });

        // Close loader modal when clicking outside
        document.getElementById('loaderModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('loaderModal')) {
                document.getElementById('loaderModal').style.display = 'none';
                if (currentController) {
                    currentController.abort();
                    currentController = null;
                }
                document.getElementById('fetchProposalsBtn').disabled = false;
            }
        });
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        
        // Load initial data
        fetchProposals()
            .then(() => {
                console.log("Application initialized successfully");
            })
            .catch(error => {
                console.error("Initialization error:", error);
                alert("Error initializing application. Please refresh the page.");
            });
    }

    // Expose functions to window object for HTML event handlers
    window.openFeedbackModal = openFeedbackModal;

    // Start the application when DOM is fully loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();