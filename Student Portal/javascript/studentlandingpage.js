// Define base URL for API requests
const BASE_URL = "https://fyp-backend-8mc0.onrender.com";

// Function to display the current date
function displayCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const currentDate = new Date().toLocaleDateString('en-US', options);
    currentDateElement.innerHTML = `Today: <span>${currentDate}</span>`;
}

// Check authentication status
function checkAuth() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = '../login.html';
        return false;
    }
    return true;
}

// Main content loading function
function loadContent(contentId) {
    if (!checkAuth()) return;

    const cleanContentId = contentId.split('/').pop().replace('.html', '');
    localStorage.setItem('lastVisitedPage', cleanContentId);

    const contentArea = document.getElementById('main-content');
    const url = `${cleanContentId}.html`;

    console.log(`Loading content from: ${url}`);

    // Show a temporary loading spinner
    contentArea.innerHTML = `<div class="loading-spinner">Loading...</div>`;

    // Clean up previous dynamic scripts
    document.querySelectorAll(".dynamicScript").forEach(script => script.remove());

    // Dynamically inject CSS if not already added
    const styleId = `style-${cleanContentId}`;
    if (!document.getElementById(styleId)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `css/${cleanContentId}.css?v=${new Date().getTime()}`;
        link.id = styleId;
        document.head.appendChild(link);
    }

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Content not found');
            return response.text();
        })
        .then(data => {
            // Extract only the body content to avoid invalid HTML structure
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data;
            
            // Find the body content
            const bodyContent = tempDiv.querySelector('body');
            let contentToInject;
            
            if (bodyContent) {
                // Extract all content inside body, excluding script tags
                const bodyChildren = Array.from(bodyContent.children);
                const contentElements = bodyChildren.filter(child => child.tagName !== 'SCRIPT');
                contentToInject = contentElements.map(child => child.outerHTML).join('');
            } else {
                // Fallback: use the entire data if no body tag found
                contentToInject = data;
            }

            // Inject the HTML only after CSS is likely started loading
            contentArea.innerHTML = contentToInject;

            // Inject dynamic script for that page
            const newScript = document.createElement("script");
            newScript.className = "dynamicScript";
            newScript.src = `javascript/${cleanContentId}.js?v=${new Date().getTime()}`;
            newScript.textContent = `window.AUTH_TOKEN = 'Bearer ${localStorage.getItem('authToken')}';`;

            document.body.appendChild(newScript);

            console.log(`Content for ${cleanContentId} loaded successfully.`);
        })
        .catch(error => {
            console.error('Content load error:', error);
            // Fallback: Redirect to dashboard if the page fails
            if (cleanContentId !== 'keyinsightsstudent') {
                loadContent('keyinsightsstudent');
            } else {
                contentArea.innerHTML = `<p>Error loading content. Please try again later.</p>`;
            }
        });
}

// Handle logout
function handleLogout() {
    console.log("Clearing localStorage...");
    localStorage.removeItem('authToken');
    localStorage.removeItem('lastVisitedPage');

    // Redirect to login page
    window.location.href = '../login.html';
}

// Format time as "X time ago"
function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    
    return 'Just now';
}

// Format meeting time for display
function formatMeetingTime(startTime, endTime) {
    const options = { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    };
    
    const start = new Date(startTime).toLocaleString('en-US', options);
    const end = new Date(endTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    return `${start} to ${end}`;
}

// Create meeting notification message
function createMeetingNotification(meeting) {
    const timeString = formatMeetingTime(meeting.startTime, meeting.endTime);
    let advisors = meeting.participants.supervisor.name;
    
    if (meeting.participants.coAdvisor && meeting.participants.coAdvisor.name) {
        advisors += ` and ${meeting.participants.coAdvisor.name}`;
    }
    
    return {
        subject: `Meeting Scheduled`,
        body: `You have a meeting with ${advisors} at ${meeting.venue} on ${timeString}.`,
        createdAt: meeting.createdAt,
        type: 'meeting'
    };
}

// Fetch and display meeting notifications
async function fetchAndDisplayMeetingNotifications() {
    try {
        const response = await fetch(`${BASE_URL}/api/meetings`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch meetings');

        const { data: meetings } = await response.json();
        const notifications = [];

        if (meetings && meetings.length > 0) {
            meetings.forEach(meeting => {
                if (meeting.status === 'Scheduled') {
                    notifications.push(createMeetingNotification(meeting));
                }
            });
        }

        return notifications;

    } catch (error) {
        console.error('Error fetching meetings:', error);
        return [];
    }
}

// Fetch regular notifications
async function fetchRegularNotifications() {
    try {
        const response = await fetch(`${BASE_URL}/api/notifications`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch notifications');

        const notifications = await response.json();
        return notifications.map(notification => ({
            ...notification,
            type: 'general'
        }));

    } catch (error) {
        console.error('Error fetching regular notifications:', error);
        return [];
    }
}

// Display all notifications in sorted order
function displayAllNotifications(notifications) {
    const notificationList = document.querySelector('#notificationDropdown ul');
    notificationList.innerHTML = '';

    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <li class="no-notifications">
                <p>No Recent Notifications</p>
            </li>
        `;
        return;
    }

    // Sort notifications by createdAt date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    notifications.forEach(notification => {
        const li = document.createElement('li');
        li.className = 'notification-item';
        
        const message = document.createElement('p');
        message.className = 'notification-subject';
        message.textContent = notification.subject;
        
        const body = document.createElement('p');
        body.className = 'notification-body';
        
        // Process the body text to convert URLs to links
        if (notification.body) {
            // Enhanced URL regex pattern that matches most common URLs
            const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
            
            // Split the text on URLs while keeping the matches
            let lastIndex = 0;
            let match;
            
            while ((match = urlRegex.exec(notification.body)) !== null) {
                // Add text before the URL
                if (match.index > lastIndex) {
                    body.appendChild(document.createTextNode(
                        notification.body.substring(lastIndex, match.index)
                    ));
                }
                
                // Add the URL as a link
                let url = match[0];
                if (url.startsWith('www.')) {
                    url = 'https://' + url;
                }
                
                const link = document.createElement('a');
                link.href = url;
                link.textContent = match[0];
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                body.appendChild(link);
                
                lastIndex = urlRegex.lastIndex;
            }
            
            // Add any remaining text after the last URL
            if (lastIndex < notification.body.length) {
                body.appendChild(document.createTextNode(
                    notification.body.substring(lastIndex)
                ));
            }
        }
        
        const timeAgo = document.createElement('span');
        timeAgo.className = 'notification-time';
        timeAgo.textContent = formatTimeAgo(notification.createdAt);
        
        li.appendChild(message);
        li.appendChild(body);
        li.appendChild(timeAgo);
        notificationList.appendChild(li);
    });
}

// Fetch and display all notifications
async function fetchAndDisplayNotifications() {
    const notificationList = document.querySelector('#notificationDropdown ul');
    notificationList.innerHTML = '<li class="loading-notification"><p>Loading notifications...</p></li>';

    try {
        // Fetch both regular notifications and meetings
        const [regularNotifications, meetingNotifications] = await Promise.all([
            fetchRegularNotifications(),
            fetchAndDisplayMeetingNotifications()
        ]);

        // Combine all notifications
        const allNotifications = [...regularNotifications, ...meetingNotifications];
        displayAllNotifications(allNotifications);

    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = `
            <li class="error-notification">
                <p class="notification-subject">Error</p>
                <p class="notification-body">Failed to load notifications</p>
            </li>
        `;
    }
}

// Initialize the application
function initializeApp() {
    if (!checkAuth()) return;

    displayCurrentDate();
    
    // Check if this is a fresh login (no lastVisitedPage in storage)
    const isFreshLogin = !localStorage.getItem('lastVisitedPage');
    
    // Determine which page to load
    const pageToLoad = isFreshLogin ? 'keyinsightsstudent' : 
                      (localStorage.getItem('lastVisitedPage') || 'keyinsightsstudent');
    
    loadContent(pageToLoad);
    
    // Setup side panel navigation
    const sidePanelItems = {
        'student-landing': 'keyinsightsstudent',
        'submit-proposal': 'submitproposal',
        'tasks-feedback': 'taskandfeedback',
        'evaluation-marks': 'evaluationmarks',
        'events-competitions': 'eventandcompetition',
        'funded-projects': 'fundedprojects',
        'previous-projects': 'previousbatchfyp'
    };

    Object.entries(sidePanelItems).forEach(([id, content]) => {
        document.getElementById(id)?.addEventListener('click', () => loadContent(content));
    });

    // Setup notification bell
    const notificationBell = document.getElementById("notificationBell");
    const notificationDropdown = document.getElementById("notificationDropdown");
    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (notificationDropdown.style.display !== "block") {
                await fetchAndDisplayNotifications();
            }
            notificationDropdown.style.display =
                notificationDropdown.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", (event) => {
            if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.style.display = "none";
            }
        });
    }

    // Setup profile dropdown
    const profileIcon = document.querySelector(".profile-icon");
    const profileOptions = document.querySelector(".profile-options");
    if (profileIcon && profileOptions) {
        profileIcon.addEventListener("click", function (e) {
            e.stopPropagation();
            profileOptions.style.display = profileOptions.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", function (e) {
            if (!profileIcon.contains(e.target) && !profileOptions.contains(e.target)) {
                profileOptions.style.display = "none";
            }
        });

        document.getElementById("logoutBtn")?.addEventListener("click", function (e) {
            e.preventDefault();
            handleLogout();
        });
    }

    // Setup hamburger menu
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const sidePanel = document.querySelector(".side-panel");
    if (hamburgerMenu && sidePanel) {
        hamburgerMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            sidePanel.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!hamburgerMenu.contains(e.target) && !sidePanel.contains(e.target)) {
                sidePanel.classList.remove("active");
            }
        });
    }

    // Prevent back navigation after logout
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function() {
        if (!localStorage.getItem('authToken')) {
            window.location.href = '../login.html';
        } else {
            window.history.pushState(null, null, window.location.href);
        }
    });

    // Initial notifications load
    fetchAndDisplayNotifications();
}

// Start the application
document.addEventListener("DOMContentLoaded", initializeApp);