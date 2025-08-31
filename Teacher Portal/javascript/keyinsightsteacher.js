(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const TEACHER_GROUPS_API = `${BASE_URL}/api/teachers/my-groups`;
    const GROUP_LEADER_EMAIL_API = `${BASE_URL}/api/teachers/supervising-group-leader-email`;
    const UPCOMING_EVENTS_API = `${BASE_URL}/api/teachers/dashboard/upcoming`;
    const TEACHER_EDUCATION_API = `${BASE_URL}/api/teachers/education-expertise/me`;
    
    // Current state
    const userData = JSON.parse(localStorage.getItem('userData'));
    let teacherGroupsData = null;

    // ====================== UI Functions ======================
async function renderPersonalDetails() {
        if (!userData) {
            throw new Error('Teacher data not found in localStorage');
        }

        // Personal Details Section
        document.getElementById('teacher-name').textContent = userData.name || 'N/A';
        document.getElementById('teacher-id').textContent = userData.teacherID || 'N/A';
        document.getElementById('teacher-department').textContent = userData.department || 'N/A';
        document.getElementById('teacher-faculty-type').textContent = userData.facultyType || 'N/A';
        document.getElementById('teacher-fyp-member').textContent = userData.facultyMember ? 'Yes' : 'No';
        document.getElementById('teacher-email').textContent = userData.email || 'N/A';
        document.getElementById('teacher-contact').textContent = userData.phoneNumber || 'N/A';

        // Fetch and render qualification
        try {
            const educationData = await fetchTeacherEducation();
            const qualificationText = educationData.educationLevel && educationData.fieldOfStudy 
                ? `${educationData.educationLevel} in ${educationData.fieldOfStudy}`
                : 'N/A';
            document.getElementById('teacher-qualification').textContent = qualificationText;
        } catch (error) {
            console.error("Error loading education data:", error);
            document.getElementById('teacher-qualification').textContent = 'N/A';
        }
    }

    // ====================== API Functions ====================== 
    async function fetchTeacherEducation() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(TEACHER_EDUCATION_API, {
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
            console.error("Error fetching teacher education:", error);
            throw error;
        }
    }

    async function renderGroupDetails(groupsData) {
        if (!groupsData?.supervisingGroups?.length) {
            console.warn("No supervising groups found");
            // Clear group fields if no data
            document.getElementById('group-id').textContent = 'N/A';
            document.getElementById('project-title').textContent = 'N/A';
            document.getElementById('proposal-link').textContent = 'N/A';
            document.getElementById('group-members').textContent = 'N/A';
            document.getElementById('group-leader-email').textContent = 'N/A';
            document.getElementById('group-co-advisor').textContent = userData.isCoAdvisorOf?.join(', ') || 'None';
            return;
        }

        const primaryGroup = groupsData.supervisingGroups[0];
        
        // Basic group info
        document.getElementById('group-id').textContent = primaryGroup.groupId || 'N/A';
        document.getElementById('project-title').textContent = primaryGroup.projectTitle || 'N/A';
        
        // Proposal link
        const proposalLink = document.getElementById('proposal-link');
        if (primaryGroup.pdfUrl) {
            proposalLink.textContent = 'Download Proposal';
            proposalLink.href = primaryGroup.pdfUrl;
            proposalLink.style.display = 'inline';
        } else {
            proposalLink.textContent = 'Not Available';
            proposalLink.style.display = 'none';
        }

        // Group members
        document.getElementById('group-members').textContent = 
            primaryGroup.groupMembers?.join(', ') || 'N/A';

        // Group leader email from new API
        try {
            const leaderEmailData = await fetchGroupLeaderEmail();
            if (leaderEmailData?.groups?.length > 0) {
                const leaderEmail = leaderEmailData.groups[0].submittedBy.email;
                const leaderEmailElement = document.getElementById('group-leader-email');
                leaderEmailElement.textContent = leaderEmail || 'N/A';
                if (leaderEmail) {
                    leaderEmailElement.style.cursor = 'pointer';
                    leaderEmailElement.onclick = () => window.location.href = `mailto:${leaderEmail}`;
                }
            }
        } catch (error) {
            console.error("Error loading leader email:", error);
            document.getElementById('group-leader-email').textContent = 'N/A';
        }

        // Co-advising groups from userData
        document.getElementById('group-co-advisor').textContent = 
            userData.isCoAdvisorOf?.join(', ') || 'None';
    }

    // ====================== API Functions ====================== 
    async function fetchTeacherGroups() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(TEACHER_GROUPS_API, {
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
            console.error("Error fetching teacher groups:", error);
            throw error;
        }
    }

    async function fetchGroupLeaderEmail() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(GROUP_LEADER_EMAIL_API, {
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
            console.error("Error fetching group leader email:", error);
            throw error;
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
            return await response.json();
        } catch (error) {
            console.error("Error fetching upcoming events:", error);
            return {
                data: {
                    upcomingEvents: [],
                    scheduledMeetings: []
                }
            };
        }
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

    const { upcomingEvents = [], scheduledMeetings = [] } = eventsData;

    if (upcomingEvents.length === 0 && scheduledMeetings.length === 0) {
        const noEventsItem = document.createElement('li');
        noEventsItem.innerHTML = `
            <i class="fas fa-calendar-times"></i>
            <span class="event-text">No upcoming events found</span>
            <span class="event-date"></span>
        `;
        eventsContainer.appendChild(noEventsItem);
        return;
    }

    // Render upcoming events
    upcomingEvents.forEach(event => {
        const eventItem = document.createElement('li');
        eventItem.innerHTML = `
            <i class="fas fa-bullseye"></i>
            <span class="event-text">${event.eventTitle || 'Event'}</span>
            <span class="event-date">${formatDate(event.eventDate)}${event.eventTime ? ' • ' + event.eventTime : ''}</span>
        `;
        eventsContainer.appendChild(eventItem);
    });

    // Render scheduled meetings
    scheduledMeetings.forEach(meeting => {
        const meetingItem = document.createElement('li');
        
        // Get group ID if available
        const groupId = meeting.groupId || 'N/A';
        
        // Get co-advisor name if available
        let coAdvisorText = '';
        if (meeting.participants?.coAdvisor?.name) {
            coAdvisorText = ` & ${meeting.participants.coAdvisor.name}`;
        }

        meetingItem.innerHTML = `
            <i class="fas fa-clock"></i>
            <span class="event-text">
                Meeting with Group ${groupId}${coAdvisorText}
                ${meeting.venue ? ` at ${meeting.venue}` : ''}
            </span>
            <span class="event-date">${formatDateTime(meeting.startTime)}</span>
        `;
        eventsContainer.appendChild(meetingItem);
    });
}

    // ====================== Initialization ======================
    async function initializeApp() {
        try {
            if (!userData || userData.user_role !== 'teacher') {
                window.location.href = 'login.html';
                return;
            }

            // Render personal details from localStorage first
            renderPersonalDetails();
            
            // Then load and render group data
            teacherGroupsData = await fetchTeacherGroups();
            await renderGroupDetails(teacherGroupsData);

            // Load and render upcoming events
            const eventsData = await fetchUpcomingEvents();
            renderUpcomingEvents(eventsData.data);

        } catch (error) {
            console.error("Initialization error:", error);
            // Still show personal details even if other data fails to load
            renderPersonalDetails();
            alert('Error loading dashboard data. Please try again later.');
        }
    }

    // Start the application
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();