(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const PROPOSAL_STATUS_API = `${BASE_URL}/api/proposals/status`;
    const STUDENT_INFO_API = `${BASE_URL}/api/students`;
    const GROUP_LEADER_API = `${BASE_URL}/api/students/groupleader`;
    const UPCOMING_EVENTS_API = `${BASE_URL}/api/students/dashboard/upcoming`;
    
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

    async function fetchUpcomingEvents() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(UPCOMING_EVENTS_API, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || {};
        } catch (error) {
            console.error("Error fetching upcoming events:", error);
            return {
                pendingTasks: [],
                upcomingEvents: [],
                scheduledMeetings: []
            };
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

    function formatDate(dateString) {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function formatDateTime(dateTimeString) {
        const options = { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateTimeString).toLocaleDateString('en-US', options);
    }

    function renderUpcomingEvents(eventsData) {
        const eventsContainer = document.querySelector('.events-container ul');
        eventsContainer.innerHTML = ''; // Clear existing hardcoded events

        const { pendingTasks = [], upcomingEvents = [], scheduledMeetings = [] } = eventsData;

        if (pendingTasks.length === 0 && upcomingEvents.length === 0 && scheduledMeetings.length === 0) {
            const noEventsItem = document.createElement('li');
            noEventsItem.innerHTML = `
                <i class="fas fa-calendar-times"></i>
                <span class="event-text">No upcoming events found</span>
                <span class="event-date"></span>
            `;
            eventsContainer.appendChild(noEventsItem);
            return;
        }

        // Render pending tasks
        pendingTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.innerHTML = `
                <i class="fas fa-tasks"></i>
                <span class="event-text">${task.title || 'Task'}</span>
                <span class="event-date">${formatDateTime(task.dueDate)}</span>
            `;
            eventsContainer.appendChild(taskItem);
        });

        // Render upcoming events
        upcomingEvents.forEach(event => {
            const eventItem = document.createElement('li');
            eventItem.innerHTML = `
                <i class="fas fa-bullseye"></i>
                <span class="event-text">${event.eventTitle || 'Event'}</span>
                <span class="event-date">${formatDate(event.eventDate)}</span>
            `;
            eventsContainer.appendChild(eventItem);
        });

        // Render scheduled meetings
        scheduledMeetings.forEach(meeting => {
            const supervisors = meeting.participants?.supervisor ? [meeting.participants.supervisor.name] : [];
            const coAdvisors = meeting.participants?.coAdvisor ? [meeting.participants.coAdvisor.name] : [];
            const allAdvisors = [...supervisors, ...coAdvisors].join(' & ');
            
            const meetingItem = document.createElement('li');
            meetingItem.innerHTML = `
                <i class="fas fa-clock"></i>
                <span class="event-text">
                    Meeting with ${allAdvisors || 'Supervisor'}
                    ${meeting.venue ? `at ${meeting.venue}` : ''}
                </span>
                <span class="event-date">${formatDateTime(meeting.startTime)}</span>
            `;
            eventsContainer.appendChild(meetingItem);
        });
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
            
            const eventsData = await fetchUpcomingEvents();
            renderUpcomingEvents(eventsData);
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