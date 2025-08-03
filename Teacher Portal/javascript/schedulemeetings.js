(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const MEETING_API = `${BASE_URL}/api/meetings`;
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    // Current state
    let currentGroup = null;
    let venues = [];

    // ====================== Debug Helper ======================
    function debugLog(label, data) {
        console.log(`[DEBUG] ${label}:`, JSON.parse(JSON.stringify(data)));
    }

    // ====================== API Functions ======================
    async function fetchSupervisorGroups() {
        try {
            const res = await fetch(`${MEETING_API}/supervisor/groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Failed to fetch groups');
            
            const data = await res.json();
            return data.data || [];
        } catch (err) {
            console.error("Error fetching groups:", err);
            alert("Error loading groups. Please try again.");
            return [];
        }
    }

    async function fetchVenues() {
        try {
            const res = await fetch(`${MEETING_API}/venues`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Failed to fetch venues');
            
            const data = await res.json();
            venues = data.data || [];
            populateVenueDropdown();
        } catch (err) {
            console.error("Error fetching venues:", err);
            alert("Error loading venues. Please try again.");
        }
    }

    async function checkVenueAvailability(venue, startTime, endTime) {
        try {
            const res = await fetch(`${MEETING_API}/check-availability`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    venue,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Availability check failed');
            return data;
        } catch (error) {
            console.error("Error checking venue availability:", error);
            throw error;
        }
    }

    async function scheduleMeeting() {
        try {
            const venue = document.getElementById("venue").value;
            const startDateTime = document.getElementById("startDateTime").value;
            const endDateTime = document.getElementById("endDateTime").value;
            
            if (!currentGroup || !venue || !startDateTime || !endDateTime) {
                throw new Error('Please fill all fields');
            }

            // Validate time range
            const start = new Date(startDateTime);
            const end = new Date(endDateTime);
            if (start >= end) {
                throw new Error('End time must be after start time');
            }

            const payload = {
                groupId: currentGroup.groupId,
                venue,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            };

            debugLog("Sending meeting payload", payload);

            const res = await fetch(`${MEETING_API}/supervisor-schedule`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            debugLog("Meeting response", data);
            
            if (!res.ok || !data.success) {
                throw new Error(data.message || `Scheduling failed with status ${res.status}`);
            }

            return data;
        } catch (error) {
            console.error("Error scheduling meeting:", error);
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function populateVenueDropdown() {
        const venueSelect = document.getElementById("venue");
        venueSelect.innerHTML = '<option value="">Select Venue</option>' + 
            venues.map(venue => `<option value="${venue}">${venue}</option>`).join('');
    }

    function loadGroupData(group) {
        currentGroup = group;
        
        document.getElementById("groupID").textContent = group.groupId || 'N/A';
        document.getElementById("projectTitle").textContent = group.projectTitle || 'N/A';
        document.getElementById("supervisorName").textContent = group.assignedTeacher?.name || 'N/A';
        document.getElementById("supervisorEmail").textContent = group.assignedTeacher?.email || 'N/A';
        
        const membersContainer = document.getElementById("groupMembers");
        membersContainer.innerHTML = group.groupMembers?.map(member => 
            `<div>${member.rollNumber || 'N/A'}${member.isGL ? ' <span class="gl-tag">GL</span>' : ''}</div>`
        ).join('') || '<div>No members found</div>';
    }

    function clearFormFields() {
        document.getElementById("venue").value = "";
        document.getElementById("startDateTime").value = "";
        document.getElementById("endDateTime").value = "";
    }

    async function showNotificationSuccess() {
        const venue = document.getElementById("venue").value;
        const startDateTime = document.getElementById("startDateTime").value;
        const endDateTime = document.getElementById("endDateTime").value;
        
        const formattedStart = new Date(startDateTime).toLocaleString();
        const formattedEnd = new Date(endDateTime).toLocaleString();

        try {
            // First check venue availability
            const availability = await checkVenueAvailability(venue, startDateTime, endDateTime);
            if (!availability.available) {
                throw new Error(`Venue ${venue} is not available at the selected time`);
            }

            // Then schedule meeting
            await scheduleMeeting();
            alert(`Meeting scheduled successfully!\n\nGroup: ${currentGroup.groupId}\nVenue: ${venue}\nStart: ${formattedStart}\nEnd: ${formattedEnd}`);
            
            // Clear all form fields after successful scheduling
            clearFormFields();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        if (userRole !== 'teacher') {
            alert('Access denied. Only teachers can use this page.');
            window.location.href = '/';
            return;
        }

        // Check if required DOM elements exist
        const venueSelect = document.getElementById("venue");
        const sendNotificationBtn = document.querySelector(".send-notification-btn");
        
        if (!venueSelect || !sendNotificationBtn) {
            console.log("DOM elements not ready yet, retrying in 100ms...");
            setTimeout(initializeApp, 100);
            return;
        }

        try {
            await fetchVenues();
            const groups = await fetchSupervisorGroups();
            if (groups.length > 0) {
                loadGroupData(groups[0]); // Load first group by default
            } else {
                alert('No groups assigned to you');
            }
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Failed to initialize application.");
        }

        // Add event listener to "Schedule Meeting" button
        sendNotificationBtn.addEventListener("click", showNotificationSuccess);
    }

    // More robust initialization approach
    function startInitialization() {
        // Try to initialize immediately
        initializeApp();
        
        // Also set up a fallback timer in case DOM elements take longer to load
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max (50 * 100ms)
        
        const checkAndInitialize = () => {
            attempts++;
            const venueSelect = document.getElementById("venue");
            const sendNotificationBtn = document.querySelector(".send-notification-btn");
            
            if (venueSelect && sendNotificationBtn) {
                console.log("DOM elements found, initializing...");
                initializeApp();
            } else if (attempts < maxAttempts) {
                setTimeout(checkAndInitialize, 100);
            } else {
                console.error("Failed to find required DOM elements after maximum attempts");
                alert("Failed to initialize application.");
            }
        };
        
        // Start the fallback check
        setTimeout(checkAndInitialize, 100);
    }

    // Start the application when DOM is fully loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(startInitialization, 1);
    } else {
        document.addEventListener("DOMContentLoaded", startInitialization);
    }
})();