(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const PROPOSAL_STATUS_API = `${BASE_URL}/api/proposals/status`;
    const STUDENT_INFO_API = `${BASE_URL}/api/students`;
    const GROUP_LEADER_API = `${BASE_URL}/api/students/groupleader`;
    const CHANGE_PASSWORD_API = `${BASE_URL}/api/auth/change-password`;

    // Current state
    const userData = JSON.parse(localStorage.getItem('userData'));
    let proposalData = null;

    // ====================== API Functions ======================
    async function fetchProposalStatus() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(PROPOSAL_STATUS_API, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching proposal status:", error);
            throw error;
        }
    }

    async function fetchGroupLeaderAndMembers() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(GROUP_LEADER_API, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 404) {
                const data = await response.json();
                return {
                    groupLeader: null,
                    groupMembers: data.groupMembers || []
                };
            }

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching group leader and members:", error);
            return {
                groupLeader: null,
                groupMembers: []
            };
        }
    }

    async function changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(CHANGE_PASSWORD_API, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to change password');
            }

            return data;
        } catch (error) {
            console.error("Error changing password:", error);
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function renderPersonalDetails() {
        if (!userData) {
            throw new Error('User data not found');
        }

        document.getElementById('fullName').textContent = userData.name || 'N/A';
        document.getElementById('rollNumber').textContent = userData.rollNumber || 'N/A';
        document.getElementById('batch').textContent = userData.batch || 'N/A';
        document.getElementById('department').textContent = userData.department || 'N/A';
        document.getElementById('email').textContent = userData.email || 'N/A';
        document.getElementById('studentRole').textContent = userData.student_role || 'N/A';
    }

    function renderTeacherAssignments(proposalStatus) {
        const supervisorElement = document.getElementById('assignedTeacher');
        const coadvisorElement = document.getElementById('assignedCoAdvisor');
        
        if (proposalStatus?.fypStatus === "Approved") {
            if (proposalStatus?.assigned_teacher) {
                const teacher = proposalStatus.assigned_teacher;
                supervisorElement.textContent = teacher.name || 'Not Assigned';
                if (teacher.email) {
                    supervisorElement.title = `Email: ${teacher.email}`;
                    supervisorElement.style.cursor = 'pointer';
                    supervisorElement.onclick = () => window.location.href = `mailto:${teacher.email}`;
                }
            } else {
                supervisorElement.textContent = 'Not Assigned';
            }

            if (proposalStatus?.assigned_coadvisor) {
                const teacher = proposalStatus.assigned_coadvisor;
                coadvisorElement.textContent = teacher.name || 'Not Assigned';
                if (teacher.email) {
                    coadvisorElement.title = `Email: ${teacher.email}`;
                    coadvisorElement.style.cursor = 'pointer';
                    coadvisorElement.onclick = () => window.location.href = `mailto:${teacher.email}`;
                }
            } else {
                coadvisorElement.textContent = 'Not Assigned';
            }
        } else {
            supervisorElement.textContent = 'Not Available';
            coadvisorElement.textContent = 'Not Available';
            supervisorElement.onclick = null;
            coadvisorElement.onclick = null;
            supervisorElement.style.cursor = 'default';
            coadvisorElement.style.cursor = 'default';
        }
    }

    function renderGroupMembers(groupMembers) {
        const membersElement = document.getElementById('groupMembers');
        if (groupMembers?.length) {
            const rollNumbers = groupMembers.map(member => member.rollNumber).filter(Boolean);
            membersElement.textContent = rollNumbers.length ? rollNumbers.join(', ') : 'No members found';
        } else {
            membersElement.textContent = 'No members found';
        }
    }

    async function renderGroupLeaderAndMembers() {
        const leaderEmailElement = document.getElementById('groupLeaderEmail');
        try {
            const { groupLeader, groupMembers } = await fetchGroupLeaderAndMembers();

            if (groupLeader?.student_role === "Group Leader") {
                leaderEmailElement.textContent = groupLeader.email || 'No email available';
                leaderEmailElement.title = `Name: ${groupLeader.name}\nRoll Number: ${groupLeader.rollNumber}`;
                leaderEmailElement.style.cursor = 'pointer';
                leaderEmailElement.onclick = () => window.location.href = `mailto:${groupLeader.email}`;
            } else {
                leaderEmailElement.textContent = 'No group leader assigned';
                leaderEmailElement.title = '';
                leaderEmailElement.onclick = null;
                leaderEmailElement.style.cursor = 'default';
            }

            renderGroupMembers(groupMembers || []);

        } catch (error) {
            console.error("Error rendering group data:", error);
            leaderEmailElement.textContent = 'Error loading data';
            document.getElementById('groupMembers').textContent = 'Error loading data';
        }
    }

    function renderProjectDetails(proposalStatus) {
        const projectTitleElement = document.getElementById('projectTitle');
        const projectStatusElement = document.getElementById('projectStatus');
        const proposalLinkElement = document.getElementById('proposalLink');

        if (proposalStatus?.fypStatus === "Approved") {
            projectTitleElement.textContent = proposalStatus.projectTitle || 'N/A';
            projectStatusElement.textContent = proposalStatus.status || 'N/A';
            
            if (proposalStatus.pdfUrl) {
                proposalLinkElement.textContent = 'Download Proposal';
                proposalLinkElement.href = proposalStatus.pdfUrl;
                proposalLinkElement.classList.add('pdf-link');
            } else {
                proposalLinkElement.textContent = 'Not Available';
                proposalLinkElement.removeAttribute('href');
            }
        } else {
            projectTitleElement.textContent = 'Not Available';
            projectStatusElement.textContent = 'Proposal not approved';
            proposalLinkElement.textContent = 'Not Available';
            proposalLinkElement.removeAttribute('href');
        }
    }

    function renderGroupDetails(proposalStatus) {
        if (!userData) {
            throw new Error('User data not found');
        }

        document.getElementById('groupId').textContent = userData.groupID || 'N/A';
        renderGroupLeaderAndMembers();
        renderProjectDetails(proposalStatus);
        renderTeacherAssignments(proposalStatus);
    }

    // ====================== Password Change Handler ======================
    function setupPasswordChange() {
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const messageElement = document.getElementById('passwordChangeMessage');

        changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Basic validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                showMessage('Please fill in all fields', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage('New passwords do not match', 'error');
                return;
            }

            try {
                changePasswordBtn.disabled = true;
                changePasswordBtn.textContent = 'Changing...';
                
                const result = await changePassword(currentPassword, newPassword, confirmPassword);
                showMessage(result.message || 'Password changed successfully', 'success');
                
                // Clear the form
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } catch (error) {
                showMessage(error.message || 'Failed to change password', 'error');
            } finally {
                changePasswordBtn.disabled = false;
                changePasswordBtn.textContent = 'Change Password';
            }
        });

        function showMessage(message, type) {
            messageElement.textContent = message;
            messageElement.className = 'message';
            messageElement.classList.add(type);
            
            // Clear message after 5 seconds
            setTimeout(() => {
                messageElement.textContent = '';
                messageElement.className = 'message';
            }, 5000);
        }
    }

    // ====================== Back Button Handler ======================
    function setupBackButton() {
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = "studentlandingpage.html";
            });
        }
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        try {
            if (!userData) {
                window.location.href = 'login.html';
                return;
            }

            renderPersonalDetails();
            const proposalStatus = await fetchProposalStatus();
            renderGroupDetails(proposalStatus);
            setupPasswordChange();
            setupBackButton();
            
            // Display Current Date in the Header
            const dateElement = document.getElementById('current-date');
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const date = new Date().toLocaleDateString('en-US', options);
            dateElement.textContent = 'Today, ' + date;
        } catch (error) {
            console.error("Initialization error:", error);
            alert('Error loading data. Please try again later.');
        }
    }

    // Start the application
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();