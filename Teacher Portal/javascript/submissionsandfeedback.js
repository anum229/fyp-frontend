(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const TASK_API = `${BASE_URL}/api/tasks`;
    const TEACHER_GROUPS_API = `${BASE_URL}/api/teachers/my-groups`;
    
    // Current state
    let editingTaskId = null;
    const token = localStorage.getItem("authToken");
    const TIMEZONE = 'Asia/Karachi'; // Pakistan timezone

    // DOM Elements
    const createTaskButton = document.getElementById("create-task-btn");
    const taskTitle = document.getElementById("task-title");
    const taskDescription = document.getElementById("task-description");
    const taskDeadline = document.getElementById("task-deadline");
    const studentSelect = document.getElementById("student-select");
    const submissionContainer = document.getElementById("submission-container");
    const createdTaskContainer = document.getElementById("created-task-container");
    const toggleCreatedTasksBtn = document.getElementById("toggle-created-tasks");
    const toggleSubmissionsBtn = document.getElementById("toggle-submissions");

    // ====================== Date Helper Functions ======================
    function convertLocalToUTC(localDate) {
        const date = new Date(localDate);
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleString('en-PK', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const pad = num => num.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    // ====================== API Functions ======================
    async function fetchTeacherGroups() {
        try {
            const response = await fetch(TEACHER_GROUPS_API, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch groups');
            return await response.json();
        } catch (error) {
            console.error('Error fetching teacher groups:', error);
            throw error;
        }
    }

    async function fetchCreatedTasks() {
        try {
            const response = await fetch(`${TASK_API}/created-tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch created tasks');
            const data = await response.json();
            return data.map(task => ({
                ...task,
                dueDate: new Date(task.dueDate).toISOString(),
                assignedDate: new Date(task.assignedDate).toISOString()
            }));
        } catch (error) {
            console.error('Error fetching created tasks:', error);
            throw error;
        }
    }

    async function fetchStudentSubmissions() {
        try {
            const response = await fetch(`${TASK_API}/student-submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch student submissions');
            const data = await response.json();
            return data.map(submission => ({
                ...submission,
                dueDate: submission.dueDate ? new Date(submission.dueDate).toISOString() : null,
                assignedDate: submission.assignedDate ? new Date(submission.assignedDate).toISOString() : null,
                submissionDate: submission.submissionDate ? new Date(submission.submissionDate).toISOString() : null
            }));
        } catch (error) {
            console.error('Error fetching student submissions:', error);
            throw error;
        }
    }

    async function createTask(taskData) {
        try {
            const utcDueDate = convertLocalToUTC(taskData.dueDate);
            const payload = {
                ...taskData,
                dueDate: utcDueDate.toISOString()
            };

            const response = await fetch(`${TASK_API}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to create task');
            return await response.json();
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async function updateTask(taskId, taskData) {
        try {
            const utcDueDate = convertLocalToUTC(taskData.dueDate);
            const payload = {
                ...taskData,
                dueDate: utcDueDate.toISOString()
            };

            const response = await fetch(`${TASK_API}/edit/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update task');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async function deleteTaskAPI(taskId) {
        try {
            const response = await fetch(`${TASK_API}/delete/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete task');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function renderCreatedTasks(tasks) {
        createdTaskContainer.innerHTML = '';
        if (!tasks || tasks.length === 0) {
            createdTaskContainer.innerHTML = '<div class="no-tasks">No tasks created yet</div>';
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement("div");
            card.classList.add("created-task-card");
            
            const actionButtons = task.status === 'Pending' ? `
                <button onclick="window.editTaskUI('${task._id}')">Edit</button>
                <button onclick="window.deleteTaskUI('${task._id}')">Delete</button>
            ` : '<span class="no-actions">No actions available (already submitted)</span>';
            
            card.innerHTML = `
                <h3><span style="color: black;">Task Title: </span><span style="color: #007bff;">${task.title}</span></h3>
                <p><strong>Task For:</strong> ${task.assignedTo?.rollNumber || 'Unknown'}</p>
                <p><strong>Description:</strong> ${task.description}</p>
                <p><strong>Deadline:</strong> <span style="color: red;">${formatDateForDisplay(task.dueDate)}</span></p>
                <p><strong>Status:</strong> ${task.status}</p>
                <p><strong>Created On:</strong> <span style="color: #007bff;">${formatDateForDisplay(task.assignedDate)}</span></p>
                ${actionButtons}
            `;
            createdTaskContainer.appendChild(card);
        });
    }

    function renderSubmissions(submissions) {
        submissionContainer.innerHTML = '';
        if (!submissions || submissions.length === 0) {
            submissionContainer.innerHTML = '<div class="no-submissions">No submissions yet</div>';
            return;
        }

        submissions.forEach(submission => {
            const card = document.createElement("div");
            card.classList.add("submission-card");
            card.innerHTML = `
                <h3>Task Title: ${submission.title}</h3>
                <p><strong>Student:</strong> ${submission.assignedTo?.rollNumber || 'Unknown'}</p>
                <p><strong>Description:</strong> ${submission.description}</p>
                <p><strong>Student Description:</strong> ${submission.studentDescription || 'Not provided'}</p>
                <p><strong>Attached File:</strong> ${submission.submittedFile ? 
                    `<a href="${submission.submittedFile}" target="_blank">Download File</a>` : 'No file submitted'}</p>
                <p><strong>Status:</strong> ${submission.status}</p>
                <p><strong>Submission Date:</strong> ${formatDateForDisplay(submission.submissionDate)}</p>
            `;
            submissionContainer.appendChild(card);
        });
    }

    function populateStudentDropdown(groupMembers) {
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        groupMembers.forEach(rollNumber => {
            const option = document.createElement('option');
            option.value = rollNumber;
            option.textContent = rollNumber;
            studentSelect.appendChild(option);
        });
    }

    // ====================== Event Handlers ======================
    async function handleTaskSubmit() {
        const title = taskTitle.value.trim();
        const description = taskDescription.value.trim();
        const deadline = taskDeadline.value;
        const assignedToRollNumber = studentSelect.value;

        if (!title || !description || !deadline || !assignedToRollNumber) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const taskData = { title, description, assignedToRollNumber, dueDate: deadline };

            if (editingTaskId) {
                const response = await updateTask(editingTaskId, taskData);
                alert(response.message || 'Task updated successfully!');
            } else {
                const response = await createTask(taskData);
                alert(response.message || 'Task created successfully!');
            }

            // Reset form
            taskTitle.value = '';
            taskDescription.value = '';
            taskDeadline.value = '';
            studentSelect.value = '';
            editingTaskId = null;
            await refreshData();
        } catch (error) {
            console.error('Error in task operation:', error);
            alert(error.message || 'Operation failed. Please try again.');
        }
    }

    async function editTaskUI(taskId) {
        try {
            const tasks = await fetchCreatedTasks();
            const task = tasks.find(t => t._id === taskId);
            if (!task) throw new Error('Task not found');
            if (task.status !== 'Pending') {
                throw new Error('Only tasks with status "Pending" can be edited');
            }
            
            taskTitle.value = task.title;
            taskDescription.value = task.description;
            taskDeadline.value = formatDateForInput(task.dueDate);
            studentSelect.value = task.assignedTo.rollNumber;
            editingTaskId = task._id;
            document.querySelector('.task-creation').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error in edit task:', error);
            alert(error.message || 'Failed to load task for editing.');
        }
    }

    async function deleteTaskUI(taskId) {
        const confirmDelete = confirm("Are you sure you want to delete this task?");
        if (!confirmDelete) return;

        try {
            const tasks = await fetchCreatedTasks();
            const task = tasks.find(t => t._id === taskId);
            if (!task) throw new Error('Task not found');
            if (task.status !== 'Pending') {
                throw new Error('Only tasks with status "Pending" can be deleted');
            }
            
            const response = await deleteTaskAPI(taskId);
            alert(response.message || "Task deleted successfully!");
            await refreshData();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert(error.message || 'Failed to delete task.');
        }
    }

    function handleDeadlineChange() {
        const date = new Date(this.value);
        const minutes = date.getMinutes();
        const roundedMinutes = Math.floor(minutes / 15) * 15;
        date.setMinutes(roundedMinutes);
        this.value = date.toISOString().slice(0, 16);
    }

    function toggleCreatedTasks() {
        if (createdTaskContainer.style.display === "none") {
            createdTaskContainer.style.display = "block";
            toggleCreatedTasksBtn.textContent = "Hide Created Tasks";
            fetchCreatedTasks().then(renderCreatedTasks);
        } else {
            createdTaskContainer.style.display = "none";
            toggleCreatedTasksBtn.textContent = "Show Created Tasks";
        }
    }

    function toggleSubmissions() {
        if (submissionContainer.style.display === "none") {
            submissionContainer.style.display = "block";
            toggleSubmissionsBtn.textContent = "Hide Submissions";
            fetchStudentSubmissions().then(renderSubmissions);
        } else {
            submissionContainer.style.display = "none";
            toggleSubmissionsBtn.textContent = "Show Submissions";
        }
    }

    // ====================== Helper Functions ======================
    async function refreshData() {
        try {
            const [tasks, submissions] = await Promise.all([
                fetchCreatedTasks(),
                fetchStudentSubmissions()
            ]);
            
            if (createdTaskContainer.style.display !== "none") {
                renderCreatedTasks(tasks);
            }
            
            if (submissionContainer.style.display !== "none") {
                renderSubmissions(submissions);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    function initializeEventListeners() {
        createTaskButton.addEventListener("click", handleTaskSubmit);
        taskDeadline.addEventListener("change", handleDeadlineChange);
        toggleCreatedTasksBtn.addEventListener("click", toggleCreatedTasks);
        toggleSubmissionsBtn.addEventListener("click", toggleSubmissions);
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        try {
            initializeEventListeners();
            createdTaskContainer.style.display = "none";
            submissionContainer.style.display = "none";
            
            const groups = await fetchTeacherGroups();
            const groupMembers = groups.supervisingGroups.flatMap(group => group.groupMembers);
            populateStudentDropdown(groupMembers);
            
            console.log("Application initialized successfully");
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Error initializing application. Please refresh the page.");
        }
    }

    // Expose functions to window
    window.editTaskUI = editTaskUI;
    window.deleteTaskUI = deleteTaskUI;

    // Start Application
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();