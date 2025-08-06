(function() {
    // Debug check - confirms script is loading
    console.log("Events and Competitions script loaded successfully");
    
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/events`;

    // ====================== Date Utilities ======================
    function parseEventDate(dateString) {
        if (!dateString) return new Date();
        
        try {
            // Handle both "YYYY-MM-DD" and "DD-MM-YYYY" formats
            const parts = dateString.includes('-') ? dateString.split('-') : [];
            if (parts.length === 3) {
                // If first part is 4 digits, assume YYYY-MM-DD
                if (parts[0].length === 4) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                }
                // Otherwise assume DD-MM-YYYY
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return new Date(dateString);
        } catch (e) {
            console.warn("Invalid date format:", dateString);
            return new Date();
        }
    }

    function isUpcomingEvent(eventDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return 'Date not specified';
        const date = parseEventDate(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // ====================== API Functions ======================
    async function fetchAllEvents() {
        try {
            console.log("Fetching events from:", API_URL);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            });

            console.log("API Response Status:", response.status);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Failed to fetch events' }));
                throw new Error(error.message || 'Failed to fetch events');
            }

            const data = await response.json();
            console.log("API Data Received:", data);
            
            return Array.isArray(data) ? data : (data.data || []);
        } catch (error) {
            console.error("API Error:", error);
            alert(`Error loading events: ${error.message}`);
            return [];
        }
    }

    // ====================== UI Functions ======================
    function createEventCard(event) {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';

        const eventDate = parseEventDate(event.eventDate);
        const isPastEvent = !isUpcomingEvent(eventDate);

        eventCard.innerHTML = `
            <div class="event-image">
                <img src="${event.eventImage || 'default-image.jpg'}" 
                     alt="${event.eventTitle || 'Event'}" 
                     loading="lazy"
                     onerror="this.src='default-image.jpg'">
            </div>
            <div class="event-details">
                <h3 class="event-title">${event.eventTitle || 'Untitled Event'}</h3>
                <p class="event-date"><strong>Date:</strong> ${formatDateForDisplay(event.eventDate)}</p>
                ${event.eventTime ? `<p class="event-time"><strong>Time:</strong> ${event.eventTime}</p>` : ''}
                ${event.eventVenue ? `<p class="event-venue"><strong>Venue:</strong> ${event.eventVenue}</p>` : ''}
                <p class="event-description">${event.eventDescription || 'No description available.'}</p>
                ${event.eventWinner ? `<p class="event-winner"><strong>Winner:</strong> <span>${event.eventWinner}</span></p>` : ''}
            </div>
        `;

        return eventCard;
    }

    function renderEvents(events) {
        const upcomingContainer = document.getElementById('upcomingEventsContainer');
        const pastContainer = document.getElementById('pastEventsContainer');
        
        // Clear containers (without headers)
        upcomingContainer.innerHTML = '';
        pastContainer.innerHTML = '';

        if (!events || events.length === 0) {
            upcomingContainer.innerHTML = '<p class="no-events">No events found</p>';
            return;
        }

        // Sort events by date (newest first)
        events.sort((a, b) => {
            const dateA = parseEventDate(a.eventDate);
            const dateB = parseEventDate(b.eventDate);
            return dateB - dateA;
        });

        let hasUpcoming = false;
        let hasPast = false;

        events.forEach(event => {
            const eventDate = parseEventDate(event.eventDate);
            const card = createEventCard(event);
            
            if (isUpcomingEvent(eventDate)) {
                upcomingContainer.appendChild(card);
                hasUpcoming = true;
            } else {
                pastContainer.appendChild(card);
                hasPast = true;
            }
        });

        // Add empty state messages if needed
        if (!hasUpcoming) {
            upcomingContainer.innerHTML = '<p class="no-events">No upcoming events scheduled</p>';
        }
        if (!hasPast) {
            pastContainer.innerHTML = '<p class="no-events">No past events recorded</p>';
        }
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        console.log("Initializing application...");
        
        // Check if required DOM elements exist
        const upcomingContainer = document.getElementById('upcomingEventsContainer');
        const pastContainer = document.getElementById('pastEventsContainer');
        
        if (!upcomingContainer || !pastContainer) {
            console.log("DOM elements not ready yet, retrying in 100ms...");
            setTimeout(initializeApp, 100);
            return;
        }
        
        try {
            upcomingContainer.innerHTML = '<p>Loading events...</p>';
            pastContainer.innerHTML = '';
            
            const events = await fetchAllEvents();
            renderEvents(events);
        } catch (error) {
            console.error("Startup error:", error);
            if (upcomingContainer) {
                upcomingContainer.innerHTML = 
                    `<p class="error">Failed to load events: ${error.message}</p>`;
            }
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
            const upcomingContainer = document.getElementById('upcomingEventsContainer');
            const pastContainer = document.getElementById('pastEventsContainer');
            
            if (upcomingContainer && pastContainer) {
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

    // Start when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInitialization);
    } else {
        startInitialization();
    }
})();