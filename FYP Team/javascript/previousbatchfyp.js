(function() {
    // API Configuration
    const BASE_URL = "http://localhost:5000";
    const API_URL = `${BASE_URL}/api/previousbatchfyp`;
    
    // Current editing project ID
    let editingProjectId = null;
    let currentProjectData = null;

    // ====================== API Functions ======================
    async function fetchPreviousFYPs() {
        try {
            console.log("Fetching previous batch FYPs from API...");
            const response = await fetch(`${API_URL}/getall`, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Previous batch FYPs data received:", data);
            return data;
        } catch (error) {
            console.error("Error fetching previous batch FYPs:", error);
            alert("Error loading previous batch FYPs. Please try again.");
            return [];
        }
    }

    async function createPreviousFYP(projectData) {
        try {
            // Format group members as array of strings (roll numbers)
            const formattedProjectData = {
                ...projectData,
                groupMembers: projectData.groupMembers.split(',').map(member => member.trim())
            };

            const response = await fetch(`${API_URL}/add`, {
                method: 'POST',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formattedProjectData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Creation failed');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating previous batch FYP:", error);
            throw error;
        }
    }

    async function updatePreviousFYP(projectId, projectData) {
        try {
            // Format group members as array of strings (roll numbers)
            const formattedProjectData = {
                ...projectData,
                groupMembers: projectData.groupMembers.split(',').map(member => member.trim())
            };

            const response = await fetch(`${API_URL}/update/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formattedProjectData)
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Update failed');
            }
    
            return await response.json();
        } catch (error) {
            console.error("Error updating previous batch FYP:", error);
            throw error;
        }
    }

    async function deletePreviousFYP(projectId) {
        try {
            const response = await fetch(`${API_URL}/delete/${projectId}`, {
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
            console.error("Error deleting previous batch FYP:", error);
            throw error;
        }
    }

    async function getPreviousFYPById(projectId) {
        try {
            const response = await fetch(`${API_URL}/get/${projectId}`, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch project');
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching previous batch FYP:", error);
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function renderTable(projects) {
        const tableBody = document.querySelector("#previousFYPTable tbody");
        
        if (!tableBody) {
            console.error("Table body not found!");
            return;
        }

        tableBody.innerHTML = "";

        if (!projects || projects.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7">No previous batch FYPs found</td></tr>`;
            return;
        }

        projects.forEach((project, index) => {
            const row = document.createElement("tr");
            
            // Format group members with GL indication (first member is GL)
            const groupMembersHTML = project.groupMembers.map((member, i) => 
                `<div>${member}</div>`
            ).join('');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${project.groupID}</td>
                <td>${project.department}</td>
                <td>${groupMembersHTML}</td>
                <td>${project.year}</td>
                <td>${project.projectTitle}</td>
                <td class="actions">
                    <span class="edit-btn" onclick="window.openEditFYPModal('${project._id}')">✏️</span>
                    <span class="delete-btn" onclick="window.confirmDeleteFYP('${project._id}')">🗑️</span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function openAddModal() {
        document.getElementById("addProjectModal").style.display = "flex";
        clearModalFields();
        editingProjectId = null;
        currentProjectData = null;
    }

    function clearModalFields() {
        document.getElementById("projectTitle").value = "";
        document.getElementById("groupID").value = "";
        document.getElementById("department").value = "";
        document.getElementById("groupMembers").value = "";
        document.getElementById("year").value = "";
    }

    async function openEditModal(projectId) {
        try {
            const project = await getPreviousFYPById(projectId);
            
            document.getElementById("projectTitle").value = project.projectTitle;
            document.getElementById("groupID").value = project.groupID;
            document.getElementById("department").value = project.department;
            document.getElementById("groupMembers").value = project.groupMembers.join(", ");
            document.getElementById("year").value = project.year;

            editingProjectId = projectId;
            currentProjectData = project;
            document.getElementById("addProjectModal").style.display = "flex";
        } catch (error) {
            console.error("Error opening edit modal:", error);
            alert("Error loading project data");
        }
    }

    async function saveProject() {
        const projectData = {
            projectTitle: document.getElementById("projectTitle").value,
            groupID: document.getElementById("groupID").value,
            department: document.getElementById("department").value,
            groupMembers: document.getElementById("groupMembers").value,
            year: document.getElementById("year").value
        };

        // Validate required fields
        if (!projectData.projectTitle || !projectData.groupID || 
            !projectData.department || !projectData.groupMembers || !projectData.year) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            if (editingProjectId) {
                await updatePreviousFYP(editingProjectId, projectData);
                alert("Project updated successfully");
            } else {
                await createPreviousFYP(projectData);
                alert("Project created successfully");
            }

            document.getElementById("addProjectModal").style.display = "none";
            const projects = await fetchPreviousFYPs();
            renderTable(projects);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    async function confirmDeleteProject(projectId) {
        if (!confirm("Are you sure you want to delete this project?")) {
            return;
        }

        try {
            await deletePreviousFYP(projectId);
            alert("Project deleted successfully");
            const projects = await fetchPreviousFYPs();
            renderTable(projects);
        } catch (error) {
            alert("Error deleting project");
        }
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        fetchPreviousFYPs().then(projects => {
            if (!searchTerm) {
                renderTable(projects);
                return;
            }

            const filteredProjects = projects.filter(project => 
                project.projectTitle.toLowerCase().includes(searchTerm) ||
                (project.groupID && project.groupID.toLowerCase().includes(searchTerm)) ||
                (project.department && project.department.toLowerCase().includes(searchTerm))
            );

            renderTable(filteredProjects);
        });
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Main buttons
        document.getElementById("addProjectBtn")?.addEventListener("click", openAddModal);

        // Add/edit project modal
        document.getElementById("saveProjectBtn")?.addEventListener("click", saveProject);
        document.getElementById("closeModalBtn")?.addEventListener("click", () => {
            document.getElementById("addProjectModal").style.display = "none";
        });

        // Search functionality
        document.getElementById("searchBar")?.addEventListener("input", handleSearch);
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        fetchPreviousFYPs()
            .then(renderTable)
            .catch(error => {
                console.error("Initialization error:", error);
            });
    }

    // Expose functions to window object for HTML event handlers
    window.openEditFYPModal = openEditModal;
    window.confirmDeleteFYP = confirmDeleteProject;

    // Start the application
    initializeApp();
})();