(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/fundedprojects`;
    
    // Current editing project ID
    let editingProjectId = null;
    let currentProjectData = null;
    
    // Loading state management to prevent duplicate submissions
    let isSubmitting = false;

    // ====================== Loading State Management ======================
    function setLoadingState(loading) {
        isSubmitting = loading;
        
        // Disable/enable all interactive buttons
        const saveBtn = document.getElementById("saveProjectBtn");
        const addProjectBtn = document.getElementById("addProjectBtn");
        const closeModalBtn = document.getElementById("closeModalBtn");
        const uploadCsvBtn = document.getElementById("uploadCsvBtn");
        
        if (saveBtn) saveBtn.disabled = loading;
        if (addProjectBtn) addProjectBtn.disabled = loading;
        if (closeModalBtn) closeModalBtn.disabled = loading;
        if (uploadCsvBtn) uploadCsvBtn.disabled = loading;
        
        // Update button text to show loading state
        if (saveBtn) {
            saveBtn.textContent = loading ? "Saving..." : "Save";
        }
        if (addProjectBtn) {
            addProjectBtn.textContent = loading ? "Adding..." : "Add Project";
        }
        if (uploadCsvBtn) {
            uploadCsvBtn.textContent = loading ? "Uploading..." : "Upload";
        }
        
        // Disable form inputs during submission
        const formInputs = [
            document.getElementById("projectTitle"),
            document.getElementById("groupID"),
            document.getElementById("department"),
            document.getElementById("groupMembers"),
            document.getElementById("fundedBy")
        ];
        formInputs.forEach(input => {
            if (input) input.disabled = loading;
        });
    }

    // ====================== API Functions ======================
    async function fetchFundedProjects() {
        try {
            console.log("Fetching funded projects from API...");
            const response = await fetch(`${API_URL}/getallfundedprojects`, {
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
            console.log("Funded projects data received:", data);
            return data;
        } catch (error) {
            console.error("Error fetching funded projects:", error);
            alert("Error loading funded projects. Please try again.");
            return [];
        }
    }

    async function createFundedProject(projectData) {
        try {
            // Format group members as array of strings (roll numbers)
            const formattedProjectData = {
                ...projectData,
                groupMembers: projectData.groupMembers.split(',').map(member => member.trim())
            };

            const response = await fetch(`${API_URL}/createfundedproject`, {
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
            console.error("Error creating funded project:", error);
            throw error;
        }
    }

    async function updateFundedProject(projectId, projectData) {
        try {
            // Format group members as array of strings (roll numbers)
            const formattedProjectData = {
                ...projectData,
                groupMembers: projectData.groupMembers.split(',').map(member => member.trim())
            };

            const response = await fetch(`${API_URL}/updatefundedproject/${projectId}`, {
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
            console.error("Error updating funded project:", error);
            throw error;
        }
    }

    async function deleteFundedProject(projectId) {
        try {
            const response = await fetch(`${API_URL}/deletefundedproject/${projectId}`, {
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
            console.error("Error deleting funded project:", error);
            throw error;
        }
    }

    async function getProjectById(projectId) {
        try {
            const response = await fetch(`${API_URL}/getfundedprojectbyid/${projectId}`, {
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
            console.error("Error fetching funded project:", error);
            throw error;
        }
    }

    async function handleBulkUpload() {
        // Prevent duplicate submissions
        if (isSubmitting) {
            console.log("Bulk upload already in progress, ignoring duplicate click");
            return;
        }
        
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a CSV file first');
            return;
        }

        setLoadingState(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/bulkuploadfundedprojects`, {
                method: 'POST',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Bulk upload failed');
            }

            const result = await response.json();
            alert(`Bulk upload completed! Successfully uploaded ${result.success} projects.`);
            
            // Close modal and refresh data
            document.getElementById("bulkUploadModal").style.display = "none";
            fileInput.value = "";
            document.getElementById('selectedFileName').textContent = "";
            
            const projects = await fetchFundedProjects();
            renderTable(projects);
        } catch (error) {
            console.error("Bulk upload error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    }

    // ====================== UI Functions ======================
    function renderTable(projects) {
        const tableBody = document.querySelector("#fundedProjectsTable tbody");
        
        if (!tableBody) {
            console.error("Table body not found!");
            return;
        }

        tableBody.innerHTML = "";

        if (!projects || projects.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7">No funded projects found</td></tr>`;
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
                <td>${project.projectTitle}</td>
                <td>${project.fundedBy}</td>
                <td class="actions">
                    <span class="edit-btn" onclick="window.openEditProjectModal('${project._id}')">✏️</span>
                    <span class="delete-btn" onclick="window.confirmDeleteProject('${project._id}')">🗑️</span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function openAddModal() {
        // Prevent opening modal if currently submitting
        if (isSubmitting) return;
        
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
        document.getElementById("fundedBy").value = "";
    }

    async function openEditModal(projectId) {
        // Prevent opening edit modal if currently submitting
        if (isSubmitting) return;
        
        try {
            const project = await getProjectById(projectId);
            
            document.getElementById("projectTitle").value = project.projectTitle;
            document.getElementById("groupID").value = project.groupID;
            document.getElementById("department").value = project.department;
            document.getElementById("groupMembers").value = project.groupMembers.join(", ");
            document.getElementById("fundedBy").value = project.fundedBy;

            editingProjectId = projectId;
            currentProjectData = project;
            document.getElementById("addProjectModal").style.display = "flex";
        } catch (error) {
            console.error("Error opening edit modal:", error);
            alert("Error loading project data");
        }
    }

    async function saveProject() {
        // Prevent duplicate submissions
        if (isSubmitting) {
            console.log("Form submission already in progress, ignoring duplicate click");
            return;
        }
        
        setLoadingState(true);

        const projectData = {
            projectTitle: document.getElementById("projectTitle").value,
            groupID: document.getElementById("groupID").value,
            department: document.getElementById("department").value,
            groupMembers: document.getElementById("groupMembers").value,
            fundedBy: document.getElementById("fundedBy").value
        };

        // Validate required fields
        if (!projectData.projectTitle || !projectData.groupID || !projectData.department || !projectData.groupMembers) {
            alert("Please fill in all required fields");
            setLoadingState(false);
            return;
        }

        try {
            if (editingProjectId) {
                await updateFundedProject(editingProjectId, projectData);
                alert("Project updated successfully");
            } else {
                await createFundedProject(projectData);
                alert("Project created successfully");
            }

            document.getElementById("addProjectModal").style.display = "none";
            const projects = await fetchFundedProjects();
            renderTable(projects);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoadingState(false);
        }
    }

    async function confirmDeleteProject(projectId) {
        // Prevent deletion if currently submitting
        if (isSubmitting) return;
        
        if (!confirm("Are you sure you want to delete this project?")) {
            return;
        }

        setLoadingState(true);
        
        try {
            await deleteFundedProject(projectId);
            alert("Project deleted successfully");
            const projects = await fetchFundedProjects();
            renderTable(projects);
        } catch (error) {
            alert("Error deleting project");
        } finally {
            setLoadingState(false);
        }
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        fetchFundedProjects().then(projects => {
            if (!searchTerm) {
                renderTable(projects);
                return;
            }

            const filteredProjects = projects.filter(project => 
                project.projectTitle.toLowerCase().includes(searchTerm) ||
                (project.groupID && project.groupID.toLowerCase().includes(searchTerm)) ||
                (project.fundedBy && project.fundedBy.toLowerCase().includes(searchTerm))
            );

            renderTable(filteredProjects);
        });
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Main buttons
        document.getElementById("addProjectBtn")?.addEventListener("click", () => {
            document.getElementById("addOptionsModal").style.display = "flex";
        });

        // Add options modal
        document.getElementById("addManuallyOptionBtn")?.addEventListener("click", () => {
            document.getElementById("addOptionsModal").style.display = "none";
            openAddModal();
        });

        document.getElementById("bulkUploadOptionBtn")?.addEventListener("click", () => {
            document.getElementById("addOptionsModal").style.display = "none";
            document.getElementById("bulkUploadModal").style.display = "flex";
        });

        document.getElementById("closeAddOptionsModalBtn")?.addEventListener("click", () => {
            document.getElementById("addOptionsModal").style.display = "none";
        });

        // Bulk upload modal
        document.getElementById("closeBulkUploadModalBtn")?.addEventListener("click", () => {
            document.getElementById("bulkUploadModal").style.display = "none";
        });

        // CSV file selection
        document.getElementById('csvFileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('selectedFileName').textContent = `Selected file: ${file.name}`;
                
                const buttonContainer = document.querySelector('#bulkUploadModal .button-container');
                if (!document.getElementById('uploadCsvBtn')) {
                    const uploadBtn = document.createElement('button');
                    uploadBtn.id = 'uploadCsvBtn';
                    uploadBtn.textContent = 'Upload';
                    uploadBtn.addEventListener('click', handleBulkUpload);
                    buttonContainer.insertBefore(uploadBtn, buttonContainer.firstChild);
                }
            }
        });

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
        fetchFundedProjects()
            .then(renderTable)
            .catch(error => {
                console.error("Initialization error:", error);
            });
    }

    // Expose functions to window object for HTML event handlers
    window.openEditProjectModal = openEditModal;
    window.confirmDeleteProject = confirmDeleteProject;

    // Start the application
    initializeApp();
})();