(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const SUPERVISOR_GROUPS_API = `${BASE_URL}/api/evaluations/supervisor/groups`;
    const SAVE_EVALUATION_API = `${BASE_URL}/api/evaluations/supervisor/evaluate`;
    const FYP_EVALUATIONS_API = `${BASE_URL}/api/evaluations/supervisor/fyp-evaluations`;
    const MY_EVALUATIONS_API = `${BASE_URL}/api/evaluations/supervisor/my-evaluations`;
    
    const token = window.AUTH_TOKEN?.replace('Bearer ', '') || localStorage.getItem('authToken');
    const currentEvaluatorType = "Supervisor";

    // Current state
    let currentGroup = null;
    let allGroups = [];
    let students = [];
    let fypEvaluations = [];
    let currentEvaluationContext = {};

    // First check authentication
    if (!token) {
        showError("Authentication required. Please login again.");
        console.error("No token found in localStorage or window.AUTH_TOKEN");
        return;
    }

    // ====================== API Functions ======================
    async function fetchSupervisorGroups() {
        try {
            showLoading();
            const res = await fetch(SUPERVISOR_GROUPS_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.status === 401) {
                showError("Session expired. Please login again.");
                localStorage.removeItem('authToken');
                return [];
            }
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            return data.data || [];
        } catch (error) {
            console.error("Error fetching supervisor groups:", error);
            showError("Failed to load groups");
            return [];
        }
    }

    async function fetchFypEvaluations(groupId) {
        try {
            const res = await fetch(`${FYP_EVALUATIONS_API}?groupId=${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            return data.data || null;
        } catch (error) {
            console.error("Error fetching FYP evaluations:", error);
            return null;
        }
    }

    async function fetchMyEvaluations(groupId) {
        try {
            const res = await fetch(`${MY_EVALUATIONS_API}?groupId=${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            return data.data || null;
        } catch (error) {
            console.error("Error fetching my evaluations:", error);
            return null;
        }
    }

    async function saveEvaluation(evaluationType, groupId, rollNumber, marks) {
        try {
            showLoading();
            const response = await fetch(SAVE_EVALUATION_API, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId,
                    rollNumber,
                    evaluationType,
                    marks
                })
            });

            if (response.status === 401) {
                showError("Session expired. Please login again.");
                localStorage.removeItem('authToken');
                return false;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            await loadGroupData(groupId);
            return true;
        } catch (error) {
            console.error("Error saving evaluation:", error);
            showError(`Failed to save evaluation: ${error.message}`);
            return false;
        }
    }

    // ====================== Data Loading ======================
    async function loadInitialData() {
        try {
            showLoading();
            
            // First fetch all supervisor groups
            allGroups = await fetchSupervisorGroups();
            
            if (allGroups.length === 0) {
                showError("No groups assigned to you for evaluation");
                return;
            }

            // Load the first group by default
            await loadGroupData(allGroups[0].groupId);
            
        } catch (error) {
            console.error("Error loading initial data:", error);
            showError("Failed to load initial data");
        }
    }

    async function loadGroupData(groupId) {
        try {
            showLoading();
            
            // Find the group in our cached list
            const groupData = allGroups.find(g => g.groupId === groupId);
            
            if (!groupData) {
                showError("Group not found in your assigned groups");
                return;
            }

            currentGroup = groupData;
            
            // Fetch evaluations in parallel
            const [fypEvals, myEvals] = await Promise.all([
                fetchFypEvaluations(groupId),
                fetchMyEvaluations(groupId)
            ]);

            fypEvaluations = fypEvals?.evaluations || [];
            
            // Update group details in UI
            updateGroupDetails(groupData);
            
            // Process students data
            students = groupData.groupMembers.map(member => {
                const rollNumber = typeof member === 'string' ? member : member.rollNumber;
                
                // Find FYP evaluation for this student
                const fypEval = fypEvaluations.find(e => e.rollNumber === rollNumber);
                
                // Find supervisor evaluation for this student
                const supervisorEvals = myEvals?.evaluations?.filter(e => e.rollNumber === rollNumber) || [];
                const midYearEval = supervisorEvals.find(e => e.evaluationType === 'MidYear');
                const finalYearEval = supervisorEvals.find(e => e.evaluationType === 'FinalYear');
                
                return {
                    rollNumber,
                    midYearDummy: fypEval?.midYear?.marks?.total || 0,
                    finalYearDummy: fypEval?.finalYear?.marks?.total || 0,
                    midYearEvaluation: midYearEval?.marks?.total || 0,
                    finalYearEvaluation: finalYearEval?.marks?.total || 0,
                    midYearEvaluationMarks: midYearEval?.marks || {},
                    finalYearEvaluationMarks: finalYearEval?.marks || {}
                };
            });

            renderStudentsTable();
        } catch (error) {
            console.error("Error loading group data:", error);
            showError("Failed to load group data");
        }
    }

    // ====================== UI Functions ======================
    function updateGroupDetails(groupData) {
        document.getElementById("group-id").textContent = groupData.groupId || 'N/A';
        document.getElementById("project-title").textContent = groupData.projectTitle || 'Unknown';
        document.getElementById("assigned-teacher").textContent = groupData.assignedTeacher || 'Unassigned';
        document.getElementById("co-advisor").textContent = groupData.coAdvisor || 'None';
        
        const membersList = document.getElementById("group-members");
        membersList.innerHTML = "";
        
        groupData.groupMembers.forEach(member => {
            const li = document.createElement("li");
            const rollNumber = typeof member === 'string' ? member : member.rollNumber;
            li.innerHTML = `<span>${rollNumber}</span>`;
            membersList.appendChild(li);
        });
    }

    function renderStudentsTable() {
        const tableBody = document.getElementById("marks-table-body");
        if (!tableBody) {
            console.error("Table body element not found");
            return;
        }

        tableBody.innerHTML = "";

        if (!students || students.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="no-data">No students found in this group</td></tr>`;
            return;
        }

        students.forEach((student, index) => {
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${student.rollNumber}</td>
                <td class="supervisor-marks">${student.midYearDummy}</td>
                <td>
                    <div class="input-container">
                        <input type="number" id="midYear-${index}" value="${student.midYearEvaluation}" disabled>
                        <span class="icon edit-icon" id="icon-midYear-${index}">✏️</span>
                    </div>
                </td>
                <td class="supervisor-marks">${student.finalYearDummy}</td>
                <td>
                    <div class="input-container">
                        <input type="number" id="finalYear-${index}" value="${student.finalYearEvaluation}" disabled>
                        <span class="icon edit-icon" id="icon-finalYear-${index}">✏️</span>
                    </div>
                </td>
            `;
            
            // Add event listeners to edit icons
            row.querySelector(`#icon-midYear-${index}`).addEventListener('click', () => {
                openEvaluationModal(index, 'midYear');
            });
            
            row.querySelector(`#icon-finalYear-${index}`).addEventListener('click', () => {
                openEvaluationModal(index, 'finalYear');
            });
            
            tableBody.appendChild(row);
        });
    }

    function openEvaluationModal(index, markType) {
        currentEvaluationContext = {
            studentIndex: index,
            rollNumber: students[index].rollNumber,
            evaluationType: markType === 'midYear' ? 'MidYear' : 'FinalYear'
        };

        const modal = markType === 'midYear' 
            ? document.getElementById("midYearModal") 
            : document.getElementById("finalYearModal");
            
        const modalOverlay = document.getElementById("modalOverlay");

        if (markType === 'midYear') {
            const marks = students[index].midYearEvaluationMarks || { 
                presentation: 0, 
                srsReport: 0, 
                poster: 0, 
                progressSheet: 0 
            };
            document.getElementById("presentation").value = marks.presentation;
            document.getElementById("srsReport").value = marks.srsReport;
            document.getElementById("poster").value = marks.poster;
            document.getElementById("progressSheet").value = marks.progressSheet;
        } else {
            const marks = students[index].finalYearEvaluationMarks || { 
                report: 0, 
                finalPresentation: 0 
            };
            document.getElementById("report").value = marks.report;
            document.getElementById("finalPresentation").value = marks.finalPresentation;
        }

        modal.style.display = "block";
        modalOverlay.style.display = "block";
    }

    function closeAllModals() {
        document.getElementById("midYearModal").style.display = "none";
        document.getElementById("finalYearModal").style.display = "none";
        document.getElementById("modalOverlay").style.display = "none";
    }

    async function handleSaveEvaluation() {
        const { studentIndex, rollNumber, evaluationType } = currentEvaluationContext;
        const groupId = currentGroup?.groupId;
        
        if (!groupId || !rollNumber) {
            console.error("Missing evaluation data");
            showError("Missing evaluation data");
            return;
        }

        let marks = {};
        let isValid = true;

        if (evaluationType === "MidYear") {
            isValid = [
                validateInput(document.getElementById("presentation"), 30),
                validateInput(document.getElementById("srsReport"), 10),
                validateInput(document.getElementById("poster"), 5),
                validateInput(document.getElementById("progressSheet"), 5)
            ].every(v => v);

            marks = {
                presentation: parseInt(document.getElementById("presentation").value) || 0,
                srsReport: parseInt(document.getElementById("srsReport").value) || 0,
                poster: parseInt(document.getElementById("poster").value) || 0,
                progressSheet: parseInt(document.getElementById("progressSheet").value) || 0
            };
        } else {
            isValid = [
                validateInput(document.getElementById("report"), 20),
                validateInput(document.getElementById("finalPresentation"), 30)
            ].every(v => v);

            marks = {
                report: parseInt(document.getElementById("report").value) || 0,
                finalPresentation: parseInt(document.getElementById("finalPresentation").value) || 0
            };
        }

        if (!isValid) {
            return;
        }

        const success = await saveEvaluation(evaluationType, groupId, rollNumber, marks);
        if (success) {
            closeAllModals();
        }
    }

    function validateInput(input, max) {
        const value = parseInt(input.value);
        if (isNaN(value) || value < 0 || value > max) {
            input.classList.add("invalid");
            input.nextElementSibling.style.display = "block";
            return false;
        }
        input.classList.remove("invalid");
        input.nextElementSibling.style.display = "none";
        return true;
    }

    function showLoading() {
        const tableBody = document.getElementById("marks-table-body");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="loading">Loading data...</td></tr>`;
        }
    }

    function showError(message) {
        const tableBody = document.getElementById("marks-table-body");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="error-message">${message}</td></tr>`;
        }
        console.error(message);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        document.getElementById("saveMidYearBtn")?.addEventListener("click", handleSaveEvaluation);
        document.getElementById("saveFinalYearBtn")?.addEventListener("click", handleSaveEvaluation);
        document.getElementById("closeMidYearModalBtn")?.addEventListener("click", closeAllModals);
        document.getElementById("closeFinalYearModalBtn")?.addEventListener("click", closeAllModals);
        document.getElementById("modalOverlay")?.addEventListener("click", closeAllModals);
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        loadInitialData();
    }

    if (token) {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            setTimeout(initializeApp, 1);
        } else {
            document.addEventListener("DOMContentLoaded", initializeApp);
        }
    } else {
        showError("Authentication required. Please login again.");
        console.error("No authentication token available");
    }
})();