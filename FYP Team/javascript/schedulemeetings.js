(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const MEETING_API = `${BASE_URL}/api/meetings`;
    const VENUES_API = `${MEETING_API}/venues`;
    const ELIGIBLE_GROUPS_API = `${MEETING_API}/eligible-groups`;
    const CHECK_AVAILABILITY_API = `${MEETING_API}/check-availability`;
    const SCHEDULE_MEETING_API = `${MEETING_API}/fyp-schedule`; // Updated endpoint
    
    // Current state
    let groups = [];
    let venues = [];
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    // ====================== Debug Helper ======================
    function debugLog(label, data) {
        console.log(`[DEBUG] ${label}:`, JSON.parse(JSON.stringify(data)));
    }

    // ====================== API Functions ======================
    async function fetchGroups() {
        try {
            const res = await fetch(ELIGIBLE_GROUPS_API, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                throw new Error('Failed to fetch groups');
            }
            
            const data = await res.json();
            groups = data.data || [];
            renderTable(groups);
        } catch (err) {
            console.error("Error fetching groups:", err);
            alert("Error loading groups. Please try again.");
        }
    }

    async function fetchVenues() {
        try {
            const res = await fetch(VENUES_API, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                throw new Error('Failed to fetch venues');
            }
            
            const data = await res.json();
            venues = data.data || [];
        } catch (err) {
            console.error("Error fetching venues:", err);
            alert("Error loading venues. Please try again.");
        }
    }

    async function checkVenueAvailability(venue, startTime, endTime) {
        try {
            const isoStart = new Date(startTime).toISOString();
            const isoEnd = new Date(endTime).toISOString();
            
            debugLog("Checking availability payload", {
                venue,
                startTime: isoStart,
                endTime: isoEnd
            });

            const res = await fetch(CHECK_AVAILABILITY_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    venue,
                    startTime: isoStart,
                    endTime: isoEnd
                })
            });

            const data = await res.json();
            debugLog("Availability response", data);

            if (!res.ok) {
                throw new Error(data.message || 'Availability check failed');
            }

            return data;
        } catch (error) {
            console.error("Error checking venue availability:", error);
            throw error;
        }
    }

    async function scheduleMeeting(groupId, venue, startDateTime, endDateTime) {
        try {
            // Convert to ISO string and ensure proper format
            const startTime = new Date(startDateTime).toISOString();
            const endTime = new Date(endDateTime).toISOString();

            const payload = {
                groupId,
                venue,
                startTime,
                endTime
                // Removed userRole from payload as it's now handled by endpoint
            };

            debugLog("Sending meeting payload", payload);

            // Updated to use the FYP-specific endpoint
            const res = await fetch(SCHEDULE_MEETING_API, {
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
            console.error("Error scheduling meeting:", {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function renderTable(data) {
        const tableBody = document.querySelector("#scheduleTable tbody");
        tableBody.innerHTML = "";

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="no-data">No groups available for scheduling at the moment.</td></tr>`;
            return;
        }

        data.forEach((group) => {
            const membersHTML = group.groupMembers
                .map((member) => `<div>${member.rollNumber}</div>`)
                .join("");

            const row = `
                <tr data-group-id="${group.groupId}">
                    <td>${group.groupId}</td>
                    <td>${group.projectTitle}</td>
                    <td>${membersHTML}</td>
                    <td>${group.assigned_teacher?.name || 'N/A'}</td>
                    <td>${group.assigned_coadvisor?.name || 'N/A'}</td>
                    <td><input type="datetime-local" class="start-date-time-input" required></td>
                    <td><input type="datetime-local" class="end-date-time-input" required></td>
                    <td class="venue-cell">Select Venue</td>
                    <td><button class="send-notification-btn">Schedule Meeting</button></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // Add click event to venue cells
        document.querySelectorAll('.venue-cell').forEach(cell => {
            cell.addEventListener('click', function() {
                const row = this.closest('tr');
                const groupId = row.getAttribute('data-group-id');
                const startInput = row.querySelector('.start-date-time-input');
                const endInput = row.querySelector('.end-date-time-input');
                
                if (!startInput.value || !endInput.value) {
                    alert('Please select both start and end times first');
                    return;
                }
                
                // Validate time range
                const start = new Date(startInput.value);
                const end = new Date(endInput.value);
                if (start >= end) {
                    alert('End time must be after start time');
                    return;
                }
                
                openVenueModal(groupId, startInput.value, endInput.value);
            });
        });
    }

    function openVenueModal(groupId, startTime, endTime) {
        const modal = document.getElementById('venueModal');
        const venueCardsContainer = document.getElementById('venueCards');
        venueCardsContainer.innerHTML = '';

        // Create venue cards
        venues.forEach(venue => {
            const card = document.createElement('div');
            card.className = 'venue-card';
            card.innerHTML = `<h3>${venue}</h3>`;
            
            card.addEventListener('click', async () => {
                try {
                    const availability = await checkVenueAvailability(
                        venue, 
                        startTime,
                        endTime
                    );

                    if (availability.available) {
                        const row = document.querySelector(`tr[data-group-id="${groupId}"]`);
                        row.querySelector('.venue-cell').textContent = venue;
                        modal.style.display = 'none';
                    } else {
                        alert(`Venue ${venue} is not available at the selected time`);
                    }
                } catch (error) {
                    alert(`Error checking availability: ${error.message}`);
                }
            });
            
            venueCardsContainer.appendChild(card);
        });

        modal.style.display = 'block';
    }

    // Close modal when clicking X
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('venueModal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('venueModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Search functionality
    document.getElementById("searchBar").addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = groups.filter((group) => 
            group.groupId.toLowerCase().includes(searchTerm)
        );
        renderTable(filtered);
    });

    // Schedule meeting button handler
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("send-notification-btn")) {
            const row = e.target.closest("tr");
            const groupId = row.getAttribute("data-group-id");
            const venue = row.querySelector(".venue-cell").textContent;
            const startDateTime = row.querySelector(".start-date-time-input").value;
            const endDateTime = row.querySelector(".end-date-time-input").value;

            if (venue === "Select Venue") {
                alert("Please select a venue first");
                return;
            }

            if (!startDateTime || !endDateTime) {
                alert("Please select both start and end times");
                return;
            }

            // Validate time range again
            const start = new Date(startDateTime);
            const end = new Date(endDateTime);
            if (start >= end) {
                alert('End time must be after start time');
                return;
            }

            try {
                const response = await scheduleMeeting(groupId, venue, startDateTime, endDateTime);
                if (response.success) {
                    showNotificationSuccess(groupId, venue, startDateTime, endDateTime);
                    // Reset the row after successful scheduling
                    row.querySelector('.venue-cell').textContent = "Select Venue";
                    row.querySelector('.start-date-time-input').value = "";
                    row.querySelector('.end-date-time-input').value = "";
                } else {
                    throw new Error(response.message || 'Scheduling failed');
                }
            } catch (error) {
                alert(`Error scheduling meeting: ${error.message}`);
                console.error("Full error details:", error);
            }
        }
    });

    function showNotificationSuccess(groupID, venue, startDateTime, endDateTime) {
        const formattedStart = new Date(startDateTime).toLocaleString();
        const formattedEnd = new Date(endDateTime).toLocaleString();
        alert(`Meeting scheduled for Group ${groupID} at ${venue}\nFrom: ${formattedStart}\nTo: ${formattedEnd}`);
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        // Check if user is FYP Team before allowing access
        if (userRole !== 'fyp_team') {
            alert('Access denied. Only FYP Team can schedule meetings.');
            window.location.href = '/'; // Redirect to home or login page
            return;
        }

        // Check if required DOM elements exist
        const searchBar = document.getElementById("searchBar");
        const scheduleTable = document.getElementById("scheduleTable");
        
        if (!searchBar || !scheduleTable) {
            console.log("DOM elements not ready yet, retrying in 100ms...");
            setTimeout(initializeApp, 100);
            return;
        }

        try {
            await Promise.all([fetchVenues(), fetchGroups()]);
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Failed to initialize application. Please check console for details.");
        }
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
            const searchBar = document.getElementById("searchBar");
            const scheduleTable = document.getElementById("scheduleTable");
            
            if (searchBar && scheduleTable) {
                console.log("DOM elements found, initializing...");
                initializeApp();
            } else if (attempts < maxAttempts) {
                setTimeout(checkAndInitialize, 100);
            } else {
                console.error("Failed to find required DOM elements after maximum attempts");
                alert("Failed to initialize application. Please check console for details.");
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