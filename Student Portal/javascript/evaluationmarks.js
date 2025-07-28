(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const COMBINED_MARKS_API = `${BASE_URL}/api/evaluations/student/combined-marks`;
    const PROPOSAL_STATUS_API = `${BASE_URL}/api/proposals/status`;
    const GROUP_LEADER_API = `${BASE_URL}/api/students/groupleader`;
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // First check authentication
    if (!token || !userData) {
        showError("Authentication required. Please login again.");
        console.error("No token or user data found");
        return;
    }

    // ====================== API Functions ======================
    async function fetchCombinedMarks() {
        try {
            const res = await fetch(COMBINED_MARKS_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.status === 401) {
                showError("Session expired. Please login again.");
                localStorage.removeItem('authToken');
                return null;
            }
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            return data.data || null;
        } catch (error) {
            console.error("Error fetching combined marks:", error);
            showError("Failed to load evaluation marks");
            return null;
        }
    }

    async function fetchProposalStatus() {
        try {
            const res = await fetch(PROPOSAL_STATUS_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.status === 401) {
                showError("Session expired. Please login again.");
                localStorage.removeItem('authToken');
                return null;
            }
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            return data || null;
        } catch (error) {
            console.error("Error fetching proposal status:", error);
            showError("Failed to load proposal details");
            return null;
        }
    }

    async function fetchGroupLeaderAndMembers() {
        try {
            const res = await fetch(GROUP_LEADER_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.status === 404) {
                const data = await res.json();
                return {
                    groupLeader: null,
                    groupMembers: data.groupMembers || []
                };
            }

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error("Error fetching group leader and members:", error);
            return {
                groupLeader: null,
                groupMembers: []
            };
        }
    }

    // ====================== UI Functions ======================
    async function updateUI() {
        try {
            showLoading();
            
            // Update student details from login data
            updateStudentDetails();

            // Fetch all data in parallel
            const [marksData, proposalData, groupData] = await Promise.all([
                fetchCombinedMarks(),
                fetchProposalStatus(),
                fetchGroupLeaderAndMembers()
            ]);

            // Update group details from APIs
            updateGroupDetails(marksData, proposalData, groupData);
            
            // Update marks if available
            if (marksData) {
                updateMarksDetails(marksData);
            } else {
                showError("Failed to load evaluation marks");
            }
        } catch (error) {
            console.error("Error updating UI:", error);
            showError("Failed to load data");
        }
    }

    function updateStudentDetails() {
        const studentName = userData.name || userData.user?.name || "N/A";
        const rollNumber = userData.rollNumber || userData.user?.rollNumber || "N/A";
        
        document.getElementById('student-name').textContent = studentName;
        document.getElementById('roll-number').textContent = rollNumber;
    }

    function updateGroupDetails(marksData, proposalData, groupData) {
        // Update group ID from combined marks API if available, otherwise from userData
        const groupId = marksData?.groupId || userData.groupID || userData.user?.groupID || "N/A";
        document.getElementById('group-id').textContent = groupId;

        // Update assigned teacher - consistent with dashboard wording
        document.getElementById('assigned-teacher').textContent = 
            proposalData?.assigned_teacher?.name || "No Teacher Assigned";

        // Update group members from groupData (works even without proposal)
        const membersList = document.getElementById("group-members");
        membersList.innerHTML = '';
        
        if (groupData.groupMembers && groupData.groupMembers.length > 0) {
            // Extract roll numbers from members data
            const rollNumbers = groupData.groupMembers.map(member => 
                member.rollNumber || "Unknown"
            );
            
            rollNumbers.forEach(rollNumber => {
                const li = document.createElement('li');
                li.textContent = rollNumber;
                membersList.appendChild(li);
            });
        } else {
            membersList.innerHTML = '<li>No members found</li>';
        }

        // Update proposal-related details if proposal exists
        if (proposalData?.exists) {
            if (proposalData.fypStatus === "Approved") {
                document.getElementById('project-title').textContent = 
                    proposalData.projectTitle || "No title available";
            } else {
                document.getElementById('project-title').textContent = 
                    "Not available (Proposal not approved)";
            }
            document.getElementById('proposal-status').textContent = 
                proposalData.status || "Unknown";
        } else {
            document.getElementById('project-title').textContent = "No proposal submitted";
            document.getElementById('proposal-status').textContent = 
                proposalData?.message || "No proposal";
        }
    }

    function updateMarksDetails(marksData) {
        if (!marksData || !marksData.marks) return;

        // Clear any existing status messages
        document.getElementById('mid-year-status').textContent = "";
        document.getElementById('final-year-status').textContent = "";

        // Update mid-year marks
        if (marksData.marks.midYear) {
            const midYear = marksData.marks.midYear;
            const midTotal = midYear.marks?.total ?? "N/A";
            document.getElementById('mid-year-total').textContent = 
                midTotal !== "N/A" ? `${midTotal} out of 100` : midTotal;
            
            updateMarkWithMax('mid-presentation', midYear.marks?.presentation, 60);
            updateMarkWithMax('mid-srs', midYear.marks?.srsReport, 20);
            updateMarkWithMax('mid-poster', midYear.marks?.poster, 10);
            updateMarkWithMax('mid-progress', midYear.marks?.progressSheet, 10);
        }

        // Update final-year marks
        if (marksData.marks.finalYear) {
            const finalYear = marksData.marks.finalYear;
            const finalTotal = finalYear.marks?.total ?? "N/A";
            document.getElementById('final-year-total').textContent = 
                finalTotal !== "N/A" ? `${finalTotal} out of 100` : finalTotal;
            
            updateMarkWithMax('final-report', finalYear.marks?.report, 40);
            updateMarkWithMax('final-presentation', finalYear.marks?.finalPresentation, 60);
        }
    }

    function updateMarkWithMax(elementId, mark, maxMark) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = mark !== undefined ? `${mark} out of ${maxMark}` : "N/A";
        }
    }

    function showLoading() {
        const loadingElements = [
            "group-id", "project-title", "assigned-teacher", "student-name", "roll-number",
            "mid-year-total", "final-year-total", "mid-presentation", "mid-srs", "mid-poster",
            "mid-progress", "final-report", "final-presentation", "proposal-status"
        ];
        
        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = "Loading...";
        });
    }

    function showError(message) {
        const statusElements = [
            document.getElementById("mid-year-status"),
            document.getElementById("final-year-status")
        ].filter(Boolean);
        
        statusElements.forEach(el => {
            el.textContent = message;
            el.className = "evaluation-status error";
        });
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        try {
            await updateUI();
        } catch (error) {
            console.error("Initialization error:", error);
            showError("Failed to load data");
        }
    }

    if (token) {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            setTimeout(initializeApp, 1);
        } else {
            document.addEventListener("DOMContentLoaded", initializeApp);
        }
    } else {
        showError("Authentication required. Please login again.");
    }
})();