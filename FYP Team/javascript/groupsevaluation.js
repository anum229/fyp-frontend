(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const EVALUATIONS_API = `${BASE_URL}/api/evaluations`;
    const SUPERVISOR_EVALUATIONS_API = `${BASE_URL}/api/evaluations/fyp/supervisor-evaluations`;
    const token = window.AUTH_TOKEN?.replace('Bearer ', '') || localStorage.getItem('authToken');
    const currentEvaluatorType = "FYPTeam";

    // Current state
    let evaluations = [];
    let supervisorEvaluations = {};
    let currentEvaluationContext = {};

    // First check authentication
    if (!token) {
        showError("Authentication required. Please login again.");
        console.error("No token found in localStorage or window.AUTH_TOKEN");
        return;
    }

    // ====================== API Functions ======================
    async function fetchSupervisorEvaluations(groupId) {
        try {
            const res = await fetch(`${SUPERVISOR_EVALUATIONS_API}/${groupId}`, {
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
            console.error("Error fetching supervisor evaluations:", error);
            return null;
        }
    }

    async function fetchEvaluations() {
        try {
            showLoading();
            const res = await fetch(EVALUATIONS_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.status === 401) {
                showError("Session expired. Please login again.");
                localStorage.removeItem('authToken');
                return;
            }
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            evaluations = data.data || [];
            
            const supervisorEvalsPromises = evaluations.map(group => 
                fetchSupervisorEvaluations(group.groupId)
            );
            const supervisorEvalsResults = await Promise.all(supervisorEvalsPromises);
            
            supervisorEvaluations = {};
            supervisorEvalsResults.forEach((result, index) => {
                if (result && evaluations[index]) {
                    supervisorEvaluations[evaluations[index].groupId] = result.evaluations || [];
                }
            });
            
            renderTable(evaluations);
        } catch (error) {
            console.error("Error fetching evaluations:", error);
            showError(`Failed to load evaluations: ${error.message}`);
        }
    }

    async function saveEvaluation(evaluationType, groupId, rollNumber, marks) {
        try {
            showLoading();
            const response = await fetch(EVALUATIONS_API, {
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
            await fetchEvaluations();
            return true;
        } catch (error) {
            console.error("Error saving evaluation:", error);
            showError(`Failed to save evaluation: ${error.message}`);
            return false;
        }
    }

    // ====================== UI Functions ======================
    function renderTable(groups) {
        const tableBody = document.querySelector("#evaluationTable tbody");
        if (!tableBody) {
            console.error("Evaluation table body not found");
            return;
        }

        tableBody.innerHTML = "";

        if (!groups || groups.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" class="no-data">No evaluation data found</td></tr>`;
            return;
        }

        groups.forEach((group, index) => {
            const membersHTML = group.groupMembers
                ?.map(member => {
                    const rollNumber = typeof member === 'string' ? member : member.rollNumber;
                    const name = typeof member === 'string' ? '' : member.name;
                    return `<div>${rollNumber || 'N/A'}${name ? ` (${name})` : ''}</div>`;
                })
                ?.join("") || '<div>No members</div>';

            // Get supervisor evaluations for this group
            const groupSupervisorEvals = supervisorEvaluations[group.groupId] || [];

            // Render supervisor marks
            const renderSupervisorMarks = (type) => {
                if (!group.groupMembers) return '<div>N/A</div>';
                
                return group.groupMembers.map(member => {
                    const rollNumber = typeof member === 'string' ? member : member.rollNumber;
                    
                    // Find supervisor evaluation for this student
                    const supervisorEval = groupSupervisorEvals.find(e => e.rollNumber === rollNumber);
                    const evaluationData = supervisorEval?.[type === 'midYear' ? 'midYear' : 'finalYear'];
                    
                    if (evaluationData?.marks) {
                        // Use the total provided by the API directly
                        return `<div>${evaluationData.marks.total || 0}</div>`;
                    }
                    return `<div>N/A</div>`;
                }).join("");
            };

            // Render FYP Team marks
            const renderFypMarks = (type, editable = false) => {
                if (!group.groupMembers) return '<div>N/A</div>';

                return group.groupMembers.map(member => {
                    const rollNumber = typeof member === 'string' ? member : member.rollNumber;
                    const groupEvaluation = evaluations.find(g => g.groupId === group.groupId);

                    // ✅ Only pick FYPTeam evaluation (not Supervisor)
                    const studentEvaluation = groupEvaluation?.evaluations?.find(e => 
                        e.rollNumber === rollNumber && e.evaluatorType === 'FYPTeam'
                    );

                    let total;

                    if (studentEvaluation) {
                        if (type === "MidYear") {
                            const midYearMarks = studentEvaluation.midYearEvaluation?.marks;
                            total = typeof midYearMarks?.total === 'number' ? midYearMarks.total : (editable ? 0 : 'N/A');
                        } else if (type === "FinalYear") {
                            const finalYearMarks = studentEvaluation.finalYearEvaluation?.marks;
                            total = typeof finalYearMarks?.total === 'number' ? finalYearMarks.total : (editable ? 0 : 'N/A');
                        } else {
                            total = editable ? 0 : 'N/A';
                        }
                    } else {
                        total = editable ? 0 : 'N/A';
                    }

                    if (editable) {
                        return `
                            <div>
                                <span class="total-display">${total !== 'N/A' ? total : 0}</span>
                                <span class="icon edit-icon" 
                                    data-group="${group.groupId}" 
                                    data-roll="${rollNumber}"
                                    data-type="${type}">✏️</span>
                            </div>
                        `;
                    }

                    return `
                        <div>
                            <span class="total-display">${total}</span>
                        </div>
                    `;
                }).join("");
            };

            const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td>${group.department || 'CE'}</td>
                    <td>${group.groupId || 'N/A'}</td>
                    <td>${group.projectTitle || 'Unknown'}</td>
                    <td>${group.assignedTeacher || 'Unassigned'}</td>
                    <td>${membersHTML}</td>
                    <td class="supervisor-marks">${renderSupervisorMarks('midYear')}</td>
                    <td>${renderFypMarks('MidYear', true)}</td>
                    <td class="supervisor-marks">${renderSupervisorMarks('finalYear')}</td>
                    <td>${renderFypMarks('FinalYear', true)}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // Add event listeners to edit icons
        document.querySelectorAll('.edit-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const { group, roll, type } = e.target.dataset;
                if (group && roll && type) {
                    openEvaluationModal(group, roll, type);
                } else {
                    console.error("Missing required data attributes:", e.target.dataset);
                }
            });
        });
    }

    function openEvaluationModal(groupId, rollNumber, type) {
        const studentEvaluation = evaluations
        .find(g => g.groupId === groupId)
        ?.evaluations
        ?.find(e => e.rollNumber === rollNumber && e.evaluatorType === 'FYPTeam');

        currentEvaluationContext = {
            groupId,
            rollNumber,
            evaluationType: type
        };

        if (type === "MidYear") {
            resetFields(["presentation", "srsReport", "poster", "progressSheet"]);

            if (studentEvaluation?.midYearEvaluation?.completed) {
                const marks = studentEvaluation.midYearEvaluation.marks;
                document.getElementById("presentation").value = marks.presentation || 0;
                document.getElementById("srsReport").value = marks.srsReport || 0;
                document.getElementById("poster").value = marks.poster || 0;
                document.getElementById("progressSheet").value = marks.progressSheet || 0;
            }

            document.getElementById("midYearModal").style.display = "block";
            document.getElementById("modalOverlay").style.display = "block";
        } else {
            resetFields(["report", "finalPresentation"]);

            if (studentEvaluation?.finalYearEvaluation?.completed) {
                const marks = studentEvaluation.finalYearEvaluation.marks;
                document.getElementById("report").value = marks.report || 0;
                document.getElementById("finalPresentation").value = marks.finalPresentation || 0;
            }

            document.getElementById("finalYearModal").style.display = "block";
            document.getElementById("modalOverlay").style.display = "block";
        }
    }

    function resetFields(fieldIds) {
        fieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.value = 0;
                field.classList.remove("invalid");
                const errorMsg = field.nextElementSibling;
                if (errorMsg) errorMsg.style.display = "none";
            }
        });
    }

    function closeAllModals() {
        document.getElementById("midYearModal").style.display = "none";
        document.getElementById("finalYearModal").style.display = "none";
        document.getElementById("modalOverlay").style.display = "none";
    }

    async function handleSaveEvaluation(type) {
        const { groupId, rollNumber } = currentEvaluationContext;
        
        if (!groupId || !rollNumber) {
            console.error("Missing evaluation data:", currentEvaluationContext);
            showError("Missing evaluation data");
            return;
        }

        let marks = {};
        let isValid = true;

        if (type === "MidYear") {
            isValid = [
                validateInput("presentation", 30),
                validateInput("srsReport", 10),
                validateInput("poster", 5),
                validateInput("progressSheet", 5)
            ].every(v => v);

            marks = {
                presentation: parseInt(document.getElementById("presentation")?.value) || 0,
                srsReport: parseInt(document.getElementById("srsReport")?.value) || 0,
                poster: parseInt(document.getElementById("poster")?.value) || 0,
                progressSheet: parseInt(document.getElementById("progressSheet")?.value) || 0
            };
        } else {
            isValid = [
                validateInput("report", 20),
                validateInput("finalPresentation", 30)
            ].every(v => v);

            marks = {
                report: parseInt(document.getElementById("report")?.value) || 0,
                finalPresentation: parseInt(document.getElementById("finalPresentation")?.value) || 0
            };
        }

        if (!isValid) {
            return;
        }

        const success = await saveEvaluation(type, groupId, rollNumber, marks);
        if (success) {
            closeAllModals();
        }
    }

    function validateInput(id, max) {
        const input = document.getElementById(id);
        if (!input) {
            console.error(`Input field not found: ${id}`);
            return false;
        }

        const value = parseInt(input.value);
        if (isNaN(value) || value < 0 || value > max) {
            input.classList.add("invalid");
            const errorMsg = input.nextElementSibling;
            if (errorMsg) errorMsg.style.display = "block";
            return false;
        }

        input.classList.remove("invalid");
        const errorMsg = input.nextElementSibling;
        if (errorMsg) errorMsg.style.display = "none";
        return true;
    }

    function showLoading() {
        const tableBody = document.querySelector("#evaluationTable tbody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="10" class="loading">Loading data...</td></tr>`;
        }
    }

    function showError(message) {
        const tableBody = document.querySelector("#evaluationTable tbody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="10" class="error-message">${message}</td></tr>`;
        }
        
        console.error(message);
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar")?.value?.toLowerCase() || '';
        if (!searchTerm) {
            renderTable(evaluations);
            return;
        }

        const filtered = evaluations.filter(group => 
            (group.groupId && group.groupId.toLowerCase().includes(searchTerm)) ||
            (group.projectTitle && group.projectTitle.toLowerCase().includes(searchTerm)) ||
            (group.assignedTeacher && group.assignedTeacher.toLowerCase().includes(searchTerm))
        );
        renderTable(filtered);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        const searchBar = document.getElementById("searchBar");
        if (searchBar) {
            searchBar.addEventListener("input", handleSearch);
        }

        document.getElementById("saveMidYearBtn")?.addEventListener("click", () => handleSaveEvaluation("MidYear"));
        document.getElementById("closeMidYearModalBtn")?.addEventListener("click", closeAllModals);
        document.getElementById("saveFinalYearBtn")?.addEventListener("click", () => handleSaveEvaluation("FinalYear"));
        document.getElementById("closeFinalYearModalBtn")?.addEventListener("click", closeAllModals);
        
        document.getElementById("modalOverlay")?.addEventListener("click", closeAllModals);
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        fetchEvaluations();
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