(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const PROPOSALS_API = `${BASE_URL}/api/proposals`;
    const STUDENTS_API = `${BASE_URL}/api/students`;
    const TEACHERS_API = `${BASE_URL}/api/teachers`;
    
    // Current state
    let currentProposals = [];
    let allProposals = [];
    let availableSupervisors = [];
    let availableCoAdvisors = [];
    let currentModal = {
        type: null,
        rowId: null,
        currentSelection: null,
        isOpen: false
    };

    // ====================== API Functions ======================
    async function fetchStudentDetails(studentId) {
        try {
            const response = await fetch(`${STUDENTS_API}/${studentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching student details:", error);
            return null;
        }
    }

    async function fetchTeacherDetails(teacherId) {
        try {
            const response = await fetch(`${TEACHERS_API}/${teacherId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching teacher details:", error);
            return null;
        }
    }

    async function fetchApprovedProposals() {
        try {
            showLoading(true);
            const response = await fetch(`${PROPOSALS_API}/approved-proposals`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            let proposals = await response.json();
            
            // Enhance proposals with additional data
            proposals = await Promise.all(proposals.map(async proposal => {
                // Get student details for submittedBy
                if (proposal.submittedBy) {
                    const studentId = proposal.submittedBy.$oid || proposal.submittedBy;
                    const student = await fetchStudentDetails(studentId);
                    proposal.submittedByEmail = student?.email || 'N/A';
                    proposal.submittedByName = student?.name || 'N/A';
                } else {
                    proposal.submittedByEmail = 'N/A';
                    proposal.submittedByName = 'N/A';
                }
                
                // Get AI suggested supervisor details
                if (proposal.aiSuggestedSupervisor) {
                    const teacherId = proposal.aiSuggestedSupervisor.$oid || proposal.aiSuggestedSupervisor;
                    const teacher = await fetchTeacherDetails(teacherId);
                    proposal.aiSuggestedSupervisorName = teacher?.name || 'N/A';
                    proposal.aiSuggestedSupervisorEmail = teacher?.email || 'N/A';
                } else {
                    proposal.aiSuggestedSupervisorName = 'N/A';
                    proposal.aiSuggestedSupervisorEmail = 'N/A';
                }
    
                // Get assigned teacher details if exists
                if (proposal.assigned_teacher) {
                    const teacherId = proposal.assigned_teacher._id || proposal.assigned_teacher;
                    const teacher = await fetchTeacherDetails(teacherId);
                    proposal.assignedTeacherName = teacher?.name || 'N/A';
                    proposal.assignedTeacherId = teacherId;
                } else {
                    proposal.assignedTeacherName = null;
                    proposal.assignedTeacherId = null;
                }
    
                // Get assigned coadvisor details if exists
                if (proposal.assigned_coadvisor) {
                    const coadvisorId = proposal.assigned_coadvisor._id || proposal.assigned_coadvisor;
                    const coadvisor = await fetchTeacherDetails(coadvisorId);
                    proposal.assignedCoAdvisorName = coadvisor?.name || 'N/A';
                    proposal.assignedCoAdvisorId = coadvisorId;
                } else {
                    proposal.assignedCoAdvisorName = null;
                    proposal.assignedCoAdvisorId = null;
                }
    
                return proposal;
            }));
    
            allProposals = proposals;
            return proposals;
        } catch (error) {
            console.error("Error fetching approved proposals:", error);
            showError("Error loading approved proposals. Please try again.");
            return [];
        } finally {
            showLoading(false);
        }
    }

    async function fetchAvailableTeachers(type) {
        try {
            const role = type === 'supervisor' ? 'supervisor' : 'coadvisor';
            const response = await fetch(`${PROPOSALS_API}/available-teachers?role=${role}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const teachers = await response.json();
            
            // Enhance teachers with name and email
            const enhancedTeachers = await Promise.all(teachers.map(async teacher => {
                const teacherDetails = await fetchTeacherDetails(teacher._id);
                return {
                    ...teacher,
                    name: teacherDetails?.name || 'N/A',
                    email: teacherDetails?.email || 'N/A'
                };
            }));
            
            return enhancedTeachers;
        } catch (error) {
            console.error(`Error fetching available ${type}s:`, error);
            showError(`Error loading available ${type}s. Please try again.`);
            return [];
        }
    }

    async function assignSupervisor(proposalId, teacherId) {
        try {
            showLoading(true);
            const response = await fetch(`${PROPOSALS_API}/assign-supervisor`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proposalId,
                    teacherId
                })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Assignment failed');
            }
    
            const result = await response.json();
            
            // Get teacher details for the response
            const teacher = await fetchTeacherDetails(teacherId);
            return {
                ...result,
                assignedTeacherName: teacher?.name || 'N/A',
                assignedTeacherId: teacherId
            };
        } catch (error) {
            console.error("Error assigning supervisor:", error);
            throw error;
        } finally {
            showLoading(false);
        }
    }
    
    async function assignCoAdvisor(proposalId, teacherId) {
        try {
            showLoading(true);
            const response = await fetch(`${PROPOSALS_API}/assign-coadvisor`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proposalId,
                    teacherId
                })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Assignment failed');
            }
    
            const result = await response.json();
            
            // Get teacher details for the response
            const teacher = await fetchTeacherDetails(teacherId);
            return {
                ...result,
                assignedCoAdvisorName: teacher?.name || 'N/A',
                assignedCoAdvisorId: teacherId
            };
        } catch (error) {
            console.error("Error assigning co-advisor:", error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    async function removeSupervisor(groupId) {
        try {
            showLoading(true);
            const response = await fetch(`${PROPOSALS_API}/remove-supervisor/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Remove supervisor failed');
            }

            return true;
        } catch (error) {
            console.error("Error removing supervisor:", error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    async function removeCoAdvisor(groupId) {
        try {
            showLoading(true);
            const response = await fetch(`${PROPOSALS_API}/remove-coadvisor/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Remove co-advisor failed');
            }

            return true;
        } catch (error) {
            console.error("Error removing co-advisor:", error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    // ====================== UI Functions ======================
    function showLoading(show) {
        const loadingElement = document.getElementById('loadingOverlay');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    function showError(message) {
        alert(message);
    }

    function showSuccess(message) {
        alert(message);
    }

    function renderTable(proposals) {
        currentProposals = proposals;
        const tableBody = document.querySelector("#proposalsTable tbody");
        
        if (!tableBody) {
            console.error("Table body not found!");
            return;
        }

        tableBody.innerHTML = "";

        if (!proposals || proposals.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="11" class="no-data">No approved proposals found</td></tr>`;
            return;
        }

        proposals.forEach((proposal, index) => {
            const row = document.createElement("tr");
            row.innerHTML = generateTableRowHTML(proposal, index + 1);
            tableBody.appendChild(row);
        });

        setupTooltips();
    }

    function generateTableRowHTML(proposal, sNo) {
        return `
            <td>${sNo}</td>
            <td>${proposal.groupId}</td>
            <td>${proposal.projectTitle || 'N/A'}</td>
            <td>${generateGroupMembersHTML(proposal.groupMembers)}</td>
            <td>${proposal.submittedByEmail || 'N/A'}</td>
            <td><a href="${proposal.pdfUrl}" class="download-link" target="_blank">Download</a></td>
            <td>${proposal.fypActionDate ? new Date(proposal.fypActionDate).toLocaleDateString() : 'N/A'}</td>
            <td>${generateStatusHTML(proposal.fypStatus, proposal.fypFeedback)}</td>
            <td>${proposal.aiSuggestedSupervisorName || 'N/A'}</td>
            <td class="assignment-cell">${generateAssignmentHTML(proposal.assignedTeacherName, 'supervisor', proposal._id, proposal.groupId)}</td>
            <td class="assignment-cell">${generateAssignmentHTML(proposal.assignedCoAdvisorName, 'coadvisor', proposal._id, proposal.groupId)}</td>
        `;
    }

    function generateGroupMembersHTML(members) {
        if (!members || !Array.isArray(members)) return 'N/A';
        return members.map(member => `<div>${member}</div>`).join('');
    }

    function generateStatusHTML(status, feedback) {
        if (!status) status = 'N/A';
        if (!feedback) feedback = 'No feedback available';
        return `
            <div class="status-container">
                ${status}
                <span class="help-icon" data-tooltip="${feedback.replace(/"/g, '&quot;')}">&#9432;</span>
            </div>
        `;
    }
    function generateAssignmentHTML(currentValue, type, proposalId, groupId) {
        if (currentValue && currentValue !== 'N/A') {
            return `
                <div class="assignment-badge assigned">
                    <span class="assignment-name">${currentValue}</span>
                    <button class="clear-btn" data-type="${type}" data-row="${proposalId}" data-group="${groupId}" title="Remove assignment">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="assignment-badge">
                    <span>Not assigned</span>
                    <button class="select-btn" data-type="${type}" data-row="${proposalId}">
                        Select
                    </button>
                </div>
            `;
        }
    }

    async function renderAssignmentModal(type, rowId) {
        if (currentModal.isOpen) return;
        
        const modalId = type === 'supervisor' ? 'supervisorModal' : 'coAdvisorModal';
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID ${modalId} not found`);
            return;
        }
        
        const listContainer = modal.querySelector(`.${type}-list`);
        const searchInput = modal.querySelector('input[type="text"]');
        
        const proposal = currentProposals.find(p => p._id === rowId);
        if (!proposal) {
            showError("Proposal not found");
            return;
        }
        
        currentModal = {
            type,
            rowId,
            currentSelection: null,
            isOpen: true
        };
        
        // Clear previous content and search
        listContainer.innerHTML = '';
        if (searchInput) searchInput.value = '';
        
        // Show loading state in modal
        listContainer.innerHTML = '<div class="loading-teachers">Loading available teachers...</div>';
        
        // Fetch available teachers based on role
        const teachers = await fetchAvailableTeachers(type);
            
        if (teachers.length === 0) {
            listContainer.innerHTML = `<div class="no-teachers">No available ${type}s found</div>`;
            return;
        }
        
        // Clear loading state
        listContainer.innerHTML = '';
        
        teachers.forEach(teacher => {
            const card = document.createElement('div');
            card.className = `${type}-card`;
            card.dataset.id = teacher._id;
            card.dataset.name = teacher.name;
            
            card.innerHTML = `
                <div class="${type}-header">
                    <div>
                        <div class="${type}-name">${teacher.name}</div>
                        <div class="${type}-degree">${teacher.teacherID}</div>
                    </div>
                </div>
                <div class="${type}-expertise">
                    <span class="expertise-tag">${teacher.department || 'N/A'}</span>
                </div>
            `;
            
            listContainer.appendChild(card);
        });
        
        modal.style.display = "block";
    }

    async function handleSaveSelection() {
        if (!currentModal.currentSelection) {
            showError('Please select a supervisor/co-advisor first');
            return;
        }
        
        const proposal = currentProposals.find(p => p._id === currentModal.rowId);
        if (!proposal) {
            showError('Proposal not found');
            return;
        }
        
        try {
            let result;
            if (currentModal.type === 'supervisor') {
                result = await assignSupervisor(proposal._id, currentModal.currentSelection);
            } else {
                result = await assignCoAdvisor(proposal._id, currentModal.currentSelection);
            }
            
            // Update the specific proposal in allProposals
            const updatedProposals = allProposals.map(p => {
                if (p._id === proposal._id) {
                    return {
                        ...p,
                        assignedTeacherName: currentModal.type === 'supervisor' ? result.assignedTeacherName : p.assignedTeacherName,
                        assignedTeacherId: currentModal.type === 'supervisor' ? result.assignedTeacherId : p.assignedTeacherId,
                        assignedCoAdvisorName: currentModal.type === 'coadvisor' ? result.assignedCoAdvisorName : p.assignedCoAdvisorName,
                        assignedCoAdvisorId: currentModal.type === 'coadvisor' ? result.assignedCoAdvisorId : p.assignedCoAdvisorId
                    };
                }
                return p;
            });
            
            allProposals = updatedProposals;
            renderTable(updatedProposals);
            showSuccess(`${currentModal.type === 'supervisor' ? 'Supervisor' : 'Co-Advisor'} assigned successfully`);
            closeModal();
        } catch (error) {
            showError(`Assignment failed: ${error.message}`);
        }
    }

    async function handleClearAssignment(type, proposalId, groupId) {
        if (!confirm(`Are you sure you want to remove the assigned ${type}?`)) {
            return;
        }
        
        try {
            if (type === 'supervisor') {
                await removeSupervisor(groupId);
            } else {
                await removeCoAdvisor(groupId);
            }
            
            // Refresh the data from server after successful removal
            const proposals = await fetchApprovedProposals();
            renderTable(proposals);
            showSuccess(`${type === 'supervisor' ? 'Supervisor' : 'Co-Advisor'} removed successfully`);
        } catch (error) {
            showError(`Failed to remove ${type}: ${error.message}`);
        }
    }

    function closeModal() {
        document.getElementById('supervisorModal').style.display = 'none';
        document.getElementById('coAdvisorModal').style.display = 'none';
        currentModal = {
            type: null,
            rowId: null,
            currentSelection: null,
            isOpen: false
        };
    }

    function filterAssignmentList(searchTerm, type) {
        const cards = document.querySelectorAll(`#${type === 'supervisor' ? 'supervisorModal' : 'coAdvisorModal'} .${type}-card`);
        cards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            card.style.display = name.includes(searchTerm) ? 'block' : 'none';
        });
    }

    function setupTooltips() {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        document.body.appendChild(tooltip);

        document.querySelectorAll('.help-icon').forEach(icon => {
            icon.addEventListener('mouseenter', (e) => {
                const tooltipContent = e.target.getAttribute('data-tooltip');
                tooltip.textContent = tooltipContent;
                tooltip.style.display = 'block';
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = `${rect.right + 5}px`;
                tooltip.style.top = `${rect.top}px`;
            });

            icon.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        
        if (!searchTerm) {
            renderTable(allProposals);
            return;
        }

        const filteredProposals = allProposals.filter(proposal =>
            (proposal.groupId && proposal.groupId.toLowerCase().includes(searchTerm)) ||
            (proposal.projectTitle && proposal.projectTitle.toLowerCase().includes(searchTerm)) ||
            (proposal.submittedByEmail && proposal.submittedByEmail.toLowerCase().includes(searchTerm)) ||
            (proposal.assignedTeacherName && proposal.assignedTeacherName.toLowerCase().includes(searchTerm)) ||
            (proposal.assignedCoAdvisorName && proposal.assignedCoAdvisorName.toLowerCase().includes(searchTerm))
        );
        renderTable(filteredProposals);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Event delegation for select/clear buttons
        document.addEventListener('click', function(e) {
            const selectBtn = e.target.closest('.select-btn');
            if (selectBtn) {
                e.preventDefault();
                const type = selectBtn.dataset.type;
                const rowId = selectBtn.dataset.row;
                renderAssignmentModal(type, rowId);
                return;
            }
            
            const clearBtn = e.target.closest('.clear-btn');
            if (clearBtn) {
                e.preventDefault();
                const type = clearBtn.dataset.type;
                const proposalId = clearBtn.dataset.row;
                const groupId = clearBtn.dataset.group;
                handleClearAssignment(type, proposalId, groupId);
                return;
            }
            
            const assignmentCard = e.target.closest('.supervisor-card, .coadvisor-card');
            if (assignmentCard) {
                e.preventDefault();
                currentModal.currentSelection = assignmentCard.dataset.id;
                
                const modalType = assignmentCard.classList.contains('supervisor-card') ? 'supervisor' : 'coadvisor';
                const modalId = modalType === 'supervisor' ? 'supervisorModal' : 'coAdvisorModal';
                document.querySelectorAll(`#${modalId} .${modalType}-card`).forEach(c => {
                    c.classList.remove('selected');
                });
                assignmentCard.classList.add('selected');
                return;
            }
            
            const closeModalBtn = e.target.closest('.close-modal');
            if (closeModalBtn) {
                e.preventDefault();
                closeModal();
                return;
            }
            
            const cancelBtn = e.target.closest('.cancel-btn');
            if (cancelBtn) {
                e.preventDefault();
                closeModal();
                return;
            }
            
            const saveBtn = e.target.closest('.save-btn');
            if (saveBtn) {
                e.preventDefault();
                handleSaveSelection();
                return;
            }
        });
        
        const modalSearch = document.getElementById('modalSearch');
        if (modalSearch) {
            modalSearch.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                filterAssignmentList(searchTerm, 'supervisor');
            });
        }
        
        const coAdvisorSearch = document.getElementById('coAdvisorSearch');
        if (coAdvisorSearch) {
            coAdvisorSearch.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                filterAssignmentList(searchTerm, 'coadvisor');
            });
        }
        
        const searchBar = document.getElementById("searchBar");
        if (searchBar) {
            searchBar.addEventListener("input", handleSearch);
        }
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        // Check if user is authenticated
        if (!localStorage.getItem('authToken')) {
            window.location.href = '/login.html';
            return;
        }

        initializeEventListeners();
        
        try {
            const proposals = await fetchApprovedProposals();
            renderTable(proposals);
        } catch (error) {
            console.error("Initialization error:", error);
            showError("Error initializing application. Please refresh the page.");
        }
    }

    // Start the application when DOM is fully loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();