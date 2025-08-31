(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const TASK_API = `${BASE_URL}/api/tasks`;
    const token = localStorage.getItem("authToken");

    // Current state
    let pendingTasks = [];
    let completedTasks = [];
    let selectedTaskId = null;

    // ====================== DOM Elements ======================
    const elements = {
        searchInput: document.getElementById("search-task"),
        searchResults: document.getElementById("search-results"),
        taskDropdown: document.getElementById("task-dropdown"),
        taskTitle: document.getElementById("task-title"),
        taskDescription: document.getElementById("task-description"),
        createdOnLabel: document.getElementById("task-created-on"),
        deadlineLabel: document.getElementById("task-deadline"),
        statusLabel: document.getElementById("status-label"),
        submissionTitle: document.getElementById("submission-title"),
        submissionDescription: document.getElementById("submission-description"),
        submissionFile: document.getElementById("submission-file"),
        fileNameDisplay: document.getElementById("submission-file-name"),
        submitTaskButton: document.getElementById("submit-task-btn"),
        completedTasksList: document.getElementById("completed-tasks-list"),
        toggleCompletedTasksBtn: document.getElementById("toggle-completed-tasks"),
        submitStatus: document.getElementById("submit-status")
    };

    // ====================== API Functions ======================
    const api = {
        fetchPendingTasks: async () => {
            try {
                const response = await fetch(`${TASK_API}/pending-tasks`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch pending tasks');
                }
                
                const data = await response.json();
                // Convert dates to local time strings for display
                return data.map(task => ({
                    ...task,
                    dueDate: new Date(task.dueDate).toISOString(),
                    assignedDate: new Date(task.assignedDate).toISOString()
                }));
            } catch (error) {
                console.error('Error fetching pending tasks:', error);
                throw error;
            }
        },

        fetchCompletedTasks: async () => {
            try {
                const response = await fetch(`${TASK_API}/completed-tasks`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch completed tasks');
                }
                
                const data = await response.json();
                // Convert dates to local time strings for display
                return data.map(task => ({
                    ...task,
                    dueDate: new Date(task.dueDate).toISOString(),
                    assignedDate: new Date(task.assignedDate).toISOString(),
                    submissionDate: task.submissionDate ? new Date(task.submissionDate).toISOString() : null
                }));
            } catch (error) {
                console.error('Error fetching completed tasks:', error);
                throw error;
            }
        },

        submitTask: async (taskId, formData) => {
            try {
                const response = await fetch(`${TASK_API}/submit/${taskId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Submission failed');
                }
                
                const data = await response.json();
                // Convert dates to local time strings for display
                return {
                    ...data,
                    task: {
                        ...data.task,
                        dueDate: new Date(data.task.dueDate).toISOString(),
                        assignedDate: new Date(data.task.assignedDate).toISOString(),
                        submissionDate: data.task.submissionDate ? new Date(data.task.submissionDate).toISOString() : null
                    }
                };
            } catch (error) {
                console.error('Error submitting task:', error);
                throw error;
            }
        }
    };

    // ====================== UI Functions ======================
    const ui = {
        formatDate: (dateString) => {
            if (!dateString) return 'Not specified';
            const date = new Date(dateString);
            return date.toLocaleString('en-PK', {
                timeZone: 'Asia/Karachi',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        },

        formatDateForInput: (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            const pad = num => num.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        },

        populateDropdown: () => {
            elements.taskDropdown.innerHTML = '<option value="" disabled selected>Select a pending task</option>';
            
            pendingTasks.forEach(task => {
                const option = document.createElement("option");
                option.value = task._id;
                option.textContent = task.title;
                option.setAttribute('data-task', JSON.stringify(task));
                elements.taskDropdown.appendChild(option);
            });
        },

        renderCompletedTasks: () => {
            elements.completedTasksList.innerHTML = "";
            
            completedTasks.forEach(task => {
                const taskItem = document.createElement("div");
                taskItem.classList.add("completed-task-item");
                
                taskItem.innerHTML = `
                    <h4>${task.title}</h4>
                    <p><strong>Description:</strong> ${task.studentDescription || task.description}</p>
                    <p><strong>Created On:</strong> <span class="text-green">${ui.formatDate(task.assignedDate)}</span></p>
                    <p><strong>Deadline:</strong> <span class="text-red">${ui.formatDate(task.dueDate)}</span></p>
                    <p><strong>Submitted On:</strong> ${task.submissionDate ? ui.formatDate(task.submissionDate) : 'Not submitted'}</p>
                    <p><strong>File:</strong> 
                        ${task.submittedFile ? 
                            `<a href="${task.submittedFile}" target="_blank" class="file-link">Download Submission</a>` : 
                            'No file submitted'}
                    </p>
                    <p><strong>Status:</strong> <span class="text-green">${task.status}</span></p>
                `;
                
                elements.completedTasksList.appendChild(taskItem);
            });
        },

        displayTaskDetails: (task) => {
            if (!task) {
                ui.resetTaskDisplay();
                return;
            }
            
            selectedTaskId = task._id;
            elements.taskTitle.textContent = task.title;
            elements.taskDescription.textContent = task.description;
            elements.createdOnLabel.textContent = ui.formatDate(task.assignedDate);
            elements.deadlineLabel.textContent = ui.formatDate(task.dueDate);
            elements.statusLabel.textContent = task.status;
            elements.statusLabel.className = task.status === "Submitted" ? "text-green" : "text-blue";
            elements.submissionTitle.value = task.title;
        },

        resetTaskDisplay: () => {
            selectedTaskId = null;
            elements.taskTitle.textContent = "No Task Selected";
            elements.taskDescription.textContent = "-";
            elements.createdOnLabel.textContent = "-";
            elements.deadlineLabel.textContent = "-";
            elements.statusLabel.textContent = "-";
            elements.statusLabel.className = "";
            elements.submissionTitle.value = "";
        },

        clearSubmissionForm: () => {
            elements.submissionDescription.value = "";
            elements.submissionFile.value = "";
            elements.fileNameDisplay.textContent = "";
        },

        showSearchResults: (results) => {
            elements.searchResults.innerHTML = "";
            
            if (results.length === 0) {
                elements.searchResults.style.display = "none";
                return;
            }
            
            results.forEach(task => {
                const li = document.createElement("li");
                li.textContent = task.title;
                li.addEventListener("click", () => {
                    ui.displayTaskDetails(task);
                    elements.searchInput.value = "";
                    elements.searchResults.style.display = "none";
                });
                elements.searchResults.appendChild(li);
            });
            
            elements.searchResults.style.display = "block";
        },

        showSubmissionStatus: (message, isError = false) => {
            elements.submitStatus.textContent = message;
            elements.submitStatus.style.color = isError ? "red" : "green";
            
            if (!isError) {
                setTimeout(() => {
                    elements.submitStatus.textContent = "";
                }, 3000);
            }
        },

        showSuccessAlert: (message) => {
            alert(message);
            window.location.reload();
        }
    };

    // ====================== Event Handlers ======================
    const handlers = {
        handleSearch: () => {
            const query = elements.searchInput.value.toLowerCase().trim();
            
            if (!query) {
                elements.searchResults.style.display = "none";
                return;
            }
            
            const results = pendingTasks.filter(task => 
                task.title.toLowerCase().includes(query)
            );
            
            ui.showSearchResults(results);
        },

        handleTaskSelection: () => {
            const selectedOption = elements.taskDropdown.options[elements.taskDropdown.selectedIndex];
            
            if (selectedOption.value) {
                const task = JSON.parse(selectedOption.getAttribute('data-task'));
                ui.displayTaskDetails(task);
                ui.clearSubmissionForm();
            }
        },

        handleFileSelection: () => {
            if (elements.submissionFile.files.length > 0) {
                elements.fileNameDisplay.textContent = elements.submissionFile.files[0].name;
            } else {
                elements.fileNameDisplay.textContent = "";
            }
        },

        handleTaskSubmission: async () => {
            if (!selectedTaskId) {
                ui.showSubmissionStatus("Please select a task to submit", true);
                return;
            }

            const description = elements.submissionDescription.value.trim();
            const file = elements.submissionFile.files[0];
            
            if (!description) {
                ui.showSubmissionStatus("Please provide a description", true);
                return;
            }

            if (!file) {
                ui.showSubmissionStatus("Please upload a file", true);
                return;
            }

            try {
                elements.submitTaskButton.disabled = true;
                ui.showSubmissionStatus("Submitting...");

                const formData = new FormData();
                formData.append('file', file);
                formData.append('studentDescription', description);

                const response = await api.submitTask(selectedTaskId, formData);
                
                ui.showSuccessAlert("Task submitted successfully!");
                
            } catch (error) {
                console.error('Submission error:', error);
                
                // Handle deadline error specifically
                if (error.message.includes('due date')) {
                    ui.showSubmissionStatus("Submission failed: The task deadline has passed", true);
                } else {
                    ui.showSubmissionStatus(error.message || "Submission failed. Please try again.", true);
                }
            } finally {
                elements.submitTaskButton.disabled = false;
            }
        },

        toggleCompletedTasks: () => {
            elements.completedTasksList.classList.toggle("hidden");
            elements.toggleCompletedTasksBtn.textContent = 
                elements.completedTasksList.classList.contains("hidden") ? 
                "Show Completed Tasks" : "Hide Completed Tasks";
        }
    };

    // ====================== Helper Functions ======================
    const helpers = {
        refreshData: async () => {
            try {
                [pendingTasks, completedTasks] = await Promise.all([
                    api.fetchPendingTasks(),
                    api.fetchCompletedTasks()
                ]);
                
                ui.populateDropdown();
                ui.renderCompletedTasks();
                
            } catch (error) {
                console.error('Data refresh error:', error);
                alert('Failed to refresh data. Please try again.');
            }
        },
        
        initializeEventListeners: () => {
            // Search functionality
            elements.searchInput.addEventListener("input", handlers.handleSearch);
            document.addEventListener("click", (e) => {
                if (!elements.searchInput.contains(e.target) && 
                    !elements.searchResults.contains(e.target)) {
                    elements.searchResults.style.display = "none";
                }
            });

            // Task selection
            elements.taskDropdown.addEventListener("change", handlers.handleTaskSelection);

            // File upload
            elements.submissionFile.addEventListener("change", handlers.handleFileSelection);

            // Task submission
            elements.submitTaskButton.addEventListener("click", handlers.handleTaskSubmission);

            // Completed tasks toggle
            elements.toggleCompletedTasksBtn.addEventListener("click", handlers.toggleCompletedTasks);
        }
    };

    // ====================== Initialization ======================
    async function initializeApp() {
        helpers.initializeEventListeners();
        
        try {
            await helpers.refreshData();
            console.log("Application initialized successfully");
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Error initializing application. Please refresh the page.");
        }
    }

    // ====================== Start Application ======================
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();