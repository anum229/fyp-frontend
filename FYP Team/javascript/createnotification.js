// API Configuration
const API_BASE_URL = 'https://fyp-backend-8mc0.onrender.com';
const NOTIFICATIONS_API = `${API_BASE_URL}/api/notifications`;

// DOM Elements
const notificationForm = document.getElementById('notificationForm');
const subjectInput = document.getElementById('subject');
const bodyInput = document.getElementById('body');
const studentCheckbox = document.getElementById('studentCheckbox');
const teacherCheckbox = document.getElementById('teacherCheckbox');
const pastNotificationsContainer = document.getElementById('pastNotificationsContainer');
const toggleNotificationsBtn = document.getElementById('toggleNotificationsBtn');

// State
let isLoading = false;

// Utility Functions
function showLoading() {
    isLoading = true;
    const submitBtn = notificationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Sending...';
}

function hideLoading() {
    isLoading = false;
    const submitBtn = notificationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Notification';
}

function showAlert(message) {
    alert(message); // Simple alert dialog
}

// API Functions
async function createNotification(notificationData) {
    try {
        const response = await fetch(NOTIFICATIONS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(notificationData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create notification');
        }

        return await response.json();
    } catch (error) {
        console.error('Notification creation error:', error);
        throw error;
    }
}

async function fetchAllNotifications() {
    try {
        const response = await fetch(`${NOTIFICATIONS_API}/all`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch notifications error:', error);
        throw error;
    }
}

// Form Handling
notificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const subject = subjectInput.value.trim();
    const body = bodyInput.value.trim();
    const sendToStudents = studentCheckbox.checked;
    const sendToTeachers = teacherCheckbox.checked;

    // Validation
    if (!subject || !body || (!sendToStudents && !sendToTeachers)) {
        showAlert('Please fill all fields and select at least one recipient');
        return;
    }

    try {
        showLoading();
        
        const notificationData = {
            subject,
            body,
            recipients: {
                students: sendToStudents,
                teachers: sendToTeachers
            }
        };

        await createNotification(notificationData);
        showAlert('Notification created successfully!');
        notificationForm.reset();
        await loadPastNotifications();
    } catch (error) {
        showAlert(error.message || 'Failed to create notification');
    } finally {
        hideLoading();
    }
});

// Notifications Display
async function loadPastNotifications() {
    try {
        const notifications = await fetchAllNotifications();
        renderPastNotifications(notifications);
    } catch (error) {
        showAlert('Failed to load past notifications');
        console.error(error);
    }
}

function renderPastNotifications(notifications) {
    pastNotificationsContainer.innerHTML = '';

    if (!notifications || notifications.length === 0) {
        pastNotificationsContainer.innerHTML = '<p class="no-notifications">No notifications found</p>';
        return;
    }

    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification-item';
        
        const recipients = [];
        if (notification.recipients.students) recipients.push('Students');
        if (notification.recipients.teachers) recipients.push('Teachers');

        notificationElement.innerHTML = `
            <div class="notification-header">
                <h3 class="notification-title">${notification.subject}</h3>
                <span class="notification-date">
                    ${new Date(notification.createdAt).toLocaleDateString()}
                </span>
            </div>
            <div class="notification-recipients">
                To: ${recipients.join(', ')}
            </div>
            <div class="notification-content">
                ${notification.body}
            </div>
        `;

        pastNotificationsContainer.appendChild(notificationElement);
    });
}

// Toggle Visibility
toggleNotificationsBtn.addEventListener('click', () => {
    pastNotificationsContainer.classList.toggle('hidden');
    toggleNotificationsBtn.textContent = 
        pastNotificationsContainer.classList.contains('hidden') 
        ? 'Show Past Notifications' 
        : 'Hide Past Notifications';
    
    if (!pastNotificationsContainer.classList.contains('hidden') && 
        pastNotificationsContainer.children.length === 0) {
        loadPastNotifications();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!pastNotificationsContainer.classList.contains('hidden')) {
        loadPastNotifications();
    }
});