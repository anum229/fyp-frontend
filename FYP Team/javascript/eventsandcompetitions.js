(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/events`;
    
    // Current editing event ID
    let editingEventId = null;
    let currentEventData = null;
    
    // Loading state management to prevent duplicate submissions
    let isSubmitting = false;

    // DOM Elements
    const eventModal = document.getElementById("eventModal");
    const eventForm = document.getElementById("eventForm");
    const modalTitle = document.getElementById("modalTitle");
    const eventTitleInput = document.getElementById("eventTitle");
    const eventDateInput = document.getElementById("eventDate");
    const eventTimeInput = document.getElementById("eventTime");
    const eventVenueInput = document.getElementById("eventVenue");
    const eventDescriptionInput = document.getElementById("eventDescription");
    const eventWinnerInput = document.getElementById("eventWinner");
    const eventImageInput = document.getElementById("eventImage");
    const imagePreview = document.getElementById("imagePreview");
    const upcomingEventsContainer = document.getElementById("upcomingEvents");
    const pastEventsContainer = document.getElementById("pastEvents");
    const addEventBtn = document.querySelector(".add-event-btn");
    const cancelBtn = document.getElementById("cancelBtn");
    const saveBtn = document.getElementById("saveBtn");
    const searchBar = document.getElementById("searchBar");

    // ====================== Loading State Management ======================
    function setLoadingState(loading) {
        isSubmitting = loading;
        
        // Disable/enable all interactive buttons
        if (saveBtn) saveBtn.disabled = loading;
        if (addEventBtn) addEventBtn.disabled = loading;
        if (cancelBtn) cancelBtn.disabled = loading;
        
        // Update button text to show loading state
        if (saveBtn) {
            saveBtn.textContent = loading ? "Saving..." : "Save";
        }
        if (addEventBtn) {
            addEventBtn.textContent = loading ? "Adding..." : "Add Event/Competition";
        }
        
        // Disable form inputs during submission
        const formInputs = [eventTitleInput, eventDateInput, eventTimeInput, eventVenueInput, eventDescriptionInput, eventWinnerInput, eventImageInput];
        formInputs.forEach(input => {
            if (input) input.disabled = loading;
        });
    }

    // ====================== API Functions ======================
    async function fetchEvents() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data : (data.data || []); // Handle different response structures
        } catch (error) {
            console.error("Error fetching events:", error);
            alert("Error loading events. Please try again.");
            return [];
        }
    }

    async function createEvent(eventData) {
        try {
            const formData = new FormData();
            formData.append('eventTitle', eventData.eventTitle);
            formData.append('eventDate', eventData.eventDate);
            formData.append('eventTime', eventData.eventTime);
            formData.append('eventVenue', eventData.eventVenue);
            formData.append('eventDescription', eventData.eventDescription);
            if (eventData.eventWinner) formData.append('eventWinner', eventData.eventWinner);
            if (eventData.eventImage) formData.append('eventImage', eventData.eventImage);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Creation failed');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating event:", error);
            throw error;
        }
    }

    async function updateEvent(eventId, eventData) {
        try {
            const formData = new FormData();
            formData.append('eventTitle', eventData.eventTitle);
            formData.append('eventDate', eventData.eventDate);
            formData.append('eventTime', eventData.eventTime);
            formData.append('eventVenue', eventData.eventVenue);
            formData.append('eventDescription', eventData.eventDescription);
            if (eventData.eventWinner) formData.append('eventWinner', eventData.eventWinner);
            if (eventData.eventImage) {
                formData.append('eventImage', eventData.eventImage);
            } else if (currentEventData && currentEventData.eventImage) {
                // Retain the original image if no new image is selected
                formData.append('originalImage', currentEventData.eventImage);
            }

            const response = await fetch(`${API_URL}/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Update failed');
            }
    
            return await response.json();
        } catch (error) {
            console.error("Error updating event:", error);
            throw error;
        }
    }

    async function deleteEvent(eventId) {
        try {
            const response = await fetch(`${API_URL}/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            return true;
        } catch (error) {
            console.error("Error deleting event:", error);
            throw error;
        }
    }

    async function getEventById(eventId) {
        try {
            const response = await fetch(`${API_URL}/${eventId}`, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch event');
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching event:", error);
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function renderEvents(events) {
        upcomingEventsContainer.innerHTML = "";
        pastEventsContainer.innerHTML = "";

        if (!events || events.length === 0) {
            upcomingEventsContainer.innerHTML = "<p>No upcoming events found</p>";
            pastEventsContainer.innerHTML = "<p>No past events found</p>";
            return;
        }

        const today = new Date().toISOString().split("T")[0];

        events.forEach((event) => {
            const eventCard = document.createElement("div");
            eventCard.className = "event-card";

            const imageContainer = document.createElement("div");
            imageContainer.className = "event-image";
            const img = document.createElement("img");
            img.src = event.eventImage || "../assets/default-event.jpg";
            img.alt = event.eventTitle;
            imageContainer.appendChild(img);

            const detailsContainer = document.createElement("div");
            detailsContainer.className = "event-details";
            detailsContainer.innerHTML = `
                <h3 class="event-title">${event.eventTitle}</h3>
                <p class="event-date"><strong>Date:</strong> ${event.eventDate} | <strong>Time:</strong> ${event.eventTime}</p>
                <p class="event-venue"><strong>Venue:</strong> ${event.eventVenue}</p>
                <p class="event-description">${event.eventDescription}</p>
            `;

            if (event.eventWinner) {
                const winnerElement = document.createElement("p");
                winnerElement.className = "event-winner";
                winnerElement.innerHTML = `<strong>Winner:</strong> <span>${event.eventWinner}</span>`;
                detailsContainer.appendChild(winnerElement);
            }

            const actionsContainer = document.createElement("div");
            actionsContainer.className = "event-actions";

            const editButton = document.createElement("button");
            editButton.className = "action-btn edit-btn";
            editButton.textContent = "Edit";
            editButton.onclick = () => openEditModal(event._id);

            const deleteButton = document.createElement("button");
            deleteButton.className = "action-btn delete-btn";
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => confirmDeleteEvent(event._id);

            actionsContainer.appendChild(editButton);
            actionsContainer.appendChild(deleteButton);

            eventCard.appendChild(imageContainer);
            eventCard.appendChild(detailsContainer);
            eventCard.appendChild(actionsContainer);

            if (event.eventDate >= today) {
                upcomingEventsContainer.appendChild(eventCard);
            } else {
                pastEventsContainer.appendChild(eventCard);
            }
        });
    }

    function openModal() {
        // Prevent opening modal if currently submitting
        if (isSubmitting) return;
        
        modalTitle.textContent = "Add Event/Competition";
        clearModalFields();
        editingEventId = null;
        currentEventData = null;
        eventModal.style.display = "block";
    }

    function clearModalFields() {
        eventTitleInput.value = "";
        eventDateInput.value = "";
        eventTimeInput.value = "";
        eventVenueInput.value = "";
        eventDescriptionInput.value = "";
        eventWinnerInput.value = "";
        eventImageInput.value = "";
        imagePreview.style.display = "none";
        imagePreview.src = "";
    }

    async function openEditModal(eventId) {
        // Prevent opening edit modal if currently submitting
        if (isSubmitting) return;
        
        try {
            const response = await getEventById(eventId);
            const event = response.data || response;
            
            modalTitle.textContent = "Edit Event/Competition";
            eventTitleInput.value = event.eventTitle;
            eventDateInput.value = event.eventDate;
            eventTimeInput.value = event.eventTime;
            eventVenueInput.value = event.eventVenue;
            eventDescriptionInput.value = event.eventDescription;
            eventWinnerInput.value = event.eventWinner || "";

            if (event.eventImage) {
                imagePreview.src = event.eventImage;
                imagePreview.style.display = "block";
            }

            editingEventId = eventId;
            currentEventData = event;
            eventModal.style.display = "block";
        } catch (error) {
            console.error("Error opening edit modal:", error);
            alert("Error loading event data");
        }
    }

    function closeModal() {
        // Prevent closing modal if currently submitting
        if (isSubmitting) return;
        
        eventModal.style.display = "none";
        editingEventId = null;
        currentEventData = null;
        setLoadingState(false); // Reset loading state
    }

    async function saveEvent(e) {
        e.preventDefault();
        
        // Prevent duplicate submissions
        if (isSubmitting) {
            console.log("Form submission already in progress, ignoring duplicate click");
            return;
        }
        
        setLoadingState(true);

        const eventData = {
            eventTitle: eventTitleInput.value.trim(),
            eventDate: eventDateInput.value.trim(),
            eventTime: eventTimeInput.value.trim(),
            eventVenue: eventVenueInput.value.trim(),
            eventDescription: eventDescriptionInput.value.trim(),
            eventWinner: eventWinnerInput.value.trim(),
            eventImage: eventImageInput.files[0] || null
        };

        // Validate required fields
        if (!eventData.eventTitle || !eventData.eventDate || !eventData.eventTime || 
            !eventData.eventVenue || !eventData.eventDescription) {
            alert("Please fill in all required fields");
            setLoadingState(false);
            return;
        }

        // Validate image if it's a new event
        if (!editingEventId && !eventData.eventImage) {
            alert("Event image is required");
            setLoadingState(false);
            return;
        }

        try {
            let result;
            if (editingEventId) {
                // If no new image was selected, keep the original one
                if (!eventData.eventImage) {
                    eventData.eventImage = currentEventData.eventImage;
                }
                result = await updateEvent(editingEventId, eventData);
                alert("Event updated successfully");
            } else {
                result = await createEvent(eventData);
                alert("Event created successfully");
            }

            // Close modal first, then refresh data
            eventModal.style.display = "none";
            editingEventId = null;
            currentEventData = null;
            setLoadingState(false);
            
            // Refresh the events list
            const events = await fetchEvents();
            renderEvents(events);
        } catch (error) {
            console.error("Save error:", error);
            alert(`Error: ${error.message}`);
            setLoadingState(false);
        }
    }

    async function confirmDeleteEvent(eventId) {
        // Prevent deletion if currently submitting
        if (isSubmitting) return;
        
        if (!confirm("Are you sure you want to delete this event?")) {
            return;
        }

        setLoadingState(true);
        
        try {
            await deleteEvent(eventId);
            alert("Event deleted successfully");
            const events = await fetchEvents();
            renderEvents(events);
        } catch (error) {
            alert("Error deleting event");
        } finally {
            setLoadingState(false);
        }
    }

    function handleSearch() {
        const searchTerm = searchBar.value.toLowerCase();
        fetchEvents().then(events => {
            if (!searchTerm) {
                renderEvents(events);
                return;
            }

            const filteredEvents = events.filter(event => 
                (event.eventTitle && event.eventTitle.toLowerCase().includes(searchTerm)) ||
                (event.eventVenue && event.eventVenue.toLowerCase().includes(searchTerm)) ||
                (event.eventDescription && event.eventDescription.toLowerCase().includes(searchTerm)) ||
                (event.eventWinner && event.eventWinner.toLowerCase().includes(searchTerm))
            );

            renderEvents(filteredEvents);
        });
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Search functionality
        searchBar.addEventListener("input", handleSearch);

        // Main buttons
        addEventBtn.addEventListener("click", openModal);
        cancelBtn.addEventListener("click", closeModal);

        // Form submission
        eventForm.addEventListener("submit", saveEvent);

        // Image preview
        eventImageInput.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
                if (!allowedTypes.includes(file.type)) {
                    alert("Only JPEG, JPG, and PNG files are allowed.");
                    this.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });

        // Close modal when clicking outside
        window.addEventListener("click", function(event) {
            if (event.target === eventModal) {
                closeModal();
            }
        });
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        
        // Show loading state
        upcomingEventsContainer.innerHTML = "<p>Loading events...</p>";
        pastEventsContainer.innerHTML = "";
        
        fetchEvents()
            .then(events => {
                renderEvents(events);
            })
            .catch(error => {
                console.error("Initialization error:", error);
                upcomingEventsContainer.innerHTML = "<p>Error loading events</p>";
            });
    }

    // Start the application
    initializeApp();
})();