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
            if (!response.ok) {
                throw new Error('Content not found');
            }
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

            // Load the corresponding JS
            const newScript = document.createElement("script");
            newScript.className = "dynamicScript";
            newScript.src = `javascript/${cleanContentId}.js?v=${new Date().getTime()}`;
            document.body.appendChild(newScript);

            console.log(`Content for ${cleanContentId} loaded successfully.`);
        })
        .catch(error => {
            console.error('Content load error:', error);
            if (cleanContentId !== 'students') {
                loadContent('students');
            } else {
                contentArea.innerHTML = `<p>Error loading content. Please try again.</p>`;
            }
        });
}

// Handle logout
function handleLogout() {
    console.log("Clearing localStorage..."); // Optional: Debug check
    localStorage.removeItem('authToken');
    localStorage.removeItem('lastVisitedPage');

    // Redirect and force reload to clear memory/cache
    window.location.href = '../login.html';
    location.reload();
}

// Initialize the application
function initializeApp() {
    // Check authentication first
    if (!checkAuth()) return;

    displayCurrentDate();
    
    // Determine which page to load
    const isFreshLogin = !localStorage.getItem('lastVisitedPage');
    const pageToLoad = isFreshLogin ? 'students' : 
                      (localStorage.getItem('lastVisitedPage') || 'students');
    
    loadContent(pageToLoad);
    
    // Set up side panel event listeners
    const sidePanelItems = {
        'students': 'students',
        'teachers': 'teachers',
        'aireviewedproposals': 'aireviewedproposals',
        'passedproposals': 'passedproposals',
        'schedulemeetings': 'schedulemeetings',
        'groupsevaluation': 'groupsevaluation',
        'progress-report': 'viewprogressreport',
        'eventsandcompetitions': 'eventsandcompetitions',
        'fundedprojects': 'fundedprojects',
        'previousbatchfyp': 'previousbatchfyp',
        'createnotification': 'createnotification',
        'ai-project-suggestion': 'ainamesuggestion'
    };

    Object.entries(sidePanelItems).forEach(([id, content]) => {
        document.getElementById(id)?.addEventListener('click', () => loadContent(content));
    });

    // Notification bell functionality
    const notificationBell = document.getElementById("notificationBell");
    const notificationDropdown = document.getElementById("notificationDropdown");
    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener("click", () => {
            notificationDropdown.style.display =
                notificationDropdown.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", (event) => {
            if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                notificationDropdown.style.display = "none";
            }
        });
    }

    // Profile dropdown functionality
    const profileIcon = document.querySelector(".profile-icon");
    const profileOptions = document.querySelector(".profile-options");
    if (profileIcon && profileOptions) {
        profileIcon.addEventListener("click", function (event) {
            event.stopPropagation();
            profileOptions.style.display = profileOptions.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", function (event) {
            if (!profileIcon.contains(event.target) && !profileOptions.contains(event.target)) {
                profileOptions.style.display = "none";
            }
        });

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", function (event) {
                event.preventDefault();
                console.log("Logout clicked"); // Optional: Debug check
                handleLogout();
            });
        }
    }

    // Hamburger menu functionality
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const sidePanel = document.querySelector(".side-panel");
    if (hamburgerMenu && sidePanel) {
        hamburgerMenu.addEventListener("click", () => {
            sidePanel.classList.toggle("active");
        });

        document.addEventListener("click", (event) => {
            if (!hamburgerMenu.contains(event.target) && !sidePanel.contains(event.target)) {
                sidePanel.classList.remove("active");
            }
        });
    }

    // Prevent back navigation after logout
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function(event) {
        if (!localStorage.getItem('authToken')) {
            window.location.href = '../login.html';
        } else {
            window.history.pushState(null, null, window.location.href);
        }
    });
}

// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);