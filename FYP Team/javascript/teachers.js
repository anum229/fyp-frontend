(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/teachers`;
    
    // Current editing teacher ID and password state
    let editingTeacherId = null;
    let currentTeacherData = null;
    let currentTeachers = []; 

    // ====================== API Functions ======================
    async function fetchTeachers() {
        try {
            console.log("Fetching teachers from API...");
            const response = await fetch(API_URL, {
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
            console.log("Teachers data received:", data);
            return data;
        } catch (error) {
            console.error("Error fetching teachers:", error);
            alert("Error loading teachers. Please try again.");
            return [];
        }
    }

    async function registerTeacher(teacherData) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teacherData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }

            return await response.json();
        } catch (error) {
            console.error("Error registering teacher:", error);
            throw error;
        }
    }

    async function updateTeacher(teacherId, teacherData) {
        try {
            // If password is empty, remove it from the update data
            if (!teacherData.password) {
                delete teacherData.password;
            } else {
                // If password is provided, add a flag to indicate it's a new password
                teacherData.passwordChanged = true;
            }

            const response = await fetch(`${API_URL}/${teacherId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teacherData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Update failed');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating teacher:", error);
            throw error;
        }
    }

    async function deleteTeacherById(teacherId) {
        try {
            const response = await fetch(`${API_URL}/${teacherId}`, {
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
            console.error("Error deleting teacher:", error);
            throw error;
        }
    }

    async function handleBulkUpload() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a CSV file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Show loading state
            const uploadBtn = document.getElementById('uploadCsvBtn');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
            }

            const response = await fetch(`${API_URL}/bulk-upload`, {
                method: 'POST',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Bulk upload failed');
            }

            // Show summary of upload
            let message = `Bulk upload completed!\n\nTotal: ${result.total}\nSuccess: ${result.success}`;
            if (result.errors > 0) {
                message += `\nErrors: ${result.errors}\n\nError details:\n`;
                result.errorDetails.forEach(error => {
                    message += `Row ${error.row}: ${error.error}\n`;
                });
            }
            
            alert(message);
            
            // Close modal and refresh table
            document.getElementById('bulkUploadModal').style.display = 'none';
            const teachers = await fetchTeachers();
            renderTable(teachers);
        } catch (error) {
            console.error('Bulk upload error:', error);
            alert(`Error during bulk upload: ${error.message}`);
        } finally {
            // Reset upload button state
            const uploadBtn = document.getElementById('uploadCsvBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload';
            }
        }
    }

    // ====================== UI Functions ======================
    async function renderTable(teachers) {
        currentTeachers = teachers; 
        const tableBody = document.querySelector("#teachersTable tbody");
        
        if (!tableBody) {
            console.error("Table body not found!");
            return;
        }

        tableBody.innerHTML = "";

        if (!teachers || teachers.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="12" class="no-data">No teachers found</td></tr>`;
            return;
        }

        teachers.forEach((teacher, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${teacher.teacherID}</td>
                <td>${teacher.name}</td>
                <td>${teacher.department}</td>
                <td>${teacher.facultyType}</td>
                <td>${teacher.facultyMember ? 'Yes' : 'No'}</td>
                <td class="expertise-cell" data-teacher-id="${teacher._id}">Loading...</td>
                <td>${teacher.isSupervisorOf || '-'}</td>
                <td>${teacher.isCoAdvisorOf?.join(', ') || '-'}</td>
                <td>${teacher.phoneNumber}</td>
                <td>${teacher.email}</td>
                <td class="actions">
                    <span class="edit-btn" onclick="window.openEditModal('${teacher._id}')">✏️</span>
                    <span class="delete-btn" onclick="window.confirmDeleteTeacher('${teacher._id}')">🗑️</span>
                </td>
            `;
            tableBody.appendChild(row);
            
            // Load expertise data for each teacher
            loadExpertiseData(teacher._id);
        });
    }

    async function loadExpertiseData(teacherId) {
        try {
            const response = await fetch(`${API_URL}/education-expertise/${teacherId}`, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const expertiseData = await response.json();
                const expertiseCell = document.querySelector(`.expertise-cell[data-teacher-id="${teacherId}"]`);
                if (expertiseCell) {
                    expertiseCell.textContent = expertiseData.expertise?.join(', ') || '-';
                }
            } else {
                const errorCell = document.querySelector(`.expertise-cell[data-teacher-id="${teacherId}"]`);
                if (errorCell) {
                    errorCell.textContent = '-';
                }
            }
        } catch (error) {
            console.error(`Error loading expertise for teacher ${teacherId}:`, error);
            const errorCell = document.querySelector(`.expertise-cell[data-teacher-id="${teacherId}"]`);
            if (errorCell) {
                errorCell.textContent = '-';
            }
        }
    }

    function openAddModal() {
        document.getElementById("addTeacherModal").style.display = "flex";
        clearModalFields();
        editingTeacherId = null;
        currentTeacherData = null;
        document.getElementById("password").placeholder = "Enter password";
    }

    function clearModalFields() {
        document.getElementById("teacherName").value = "";
        document.getElementById("teacherID").value = "";
        document.getElementById("email").value = "";
        document.getElementById("phoneNumber").value = "";
        document.getElementById("department").value = "";
        document.getElementById("facultyType").value = "Permanent";
        document.getElementById("password").value = "";
        document.getElementById('facultyMemberNo').checked = true;
    }

    async function openEditModal(teacherId) {
        try {
            const response = await fetch(`${API_URL}/${teacherId}`, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch teacher data');
            }

            currentTeacherData = await response.json();
            
            document.getElementById("teacherName").value = currentTeacherData.name;
            document.getElementById("teacherID").value = currentTeacherData.teacherID;
            document.getElementById("email").value = currentTeacherData.email;
            document.getElementById("phoneNumber").value = currentTeacherData.phoneNumber;
            document.getElementById("department").value = currentTeacherData.department;
            document.getElementById("facultyType").value = currentTeacherData.facultyType;
            if (currentTeacherData.facultyMember) {
                document.getElementById('facultyMemberYes').checked = true;
            } else {
                document.getElementById('facultyMemberNo').checked = true;
            }
            document.getElementById("password").value = "";
            document.getElementById("password").placeholder = "Leave blank to keep current password";

            editingTeacherId = teacherId;
            document.getElementById("addTeacherModal").style.display = "flex";
        } catch (error) {
            console.error("Error opening edit modal:", error);
            alert("Error loading teacher data");
        }
    }

    async function saveTeacher() {
        const teacherData = {
            name: document.getElementById("teacherName").value,
            teacherID: document.getElementById("teacherID").value,
            email: document.getElementById("email").value,
            phoneNumber: document.getElementById("phoneNumber").value,
            department: document.getElementById("department").value,
            facultyType: document.getElementById("facultyType").value,
            facultyMember: document.getElementById('facultyMemberYes').checked,
            password: document.getElementById("password").value
        };

        // Validate required fields
        const requiredFields = ['name', 'teacherID', 'email', 'phoneNumber', 'department'];
        const missingFields = requiredFields.filter(field => !teacherData[field]);
        
        if (missingFields.length > 0) {
            alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            if (editingTeacherId) {
                // For update, password is optional
                await updateTeacher(editingTeacherId, teacherData);
                alert("Teacher updated successfully");
            } else {
                // For new teacher, password is required
                if (!teacherData.password) {
                    alert("Password is required for new teachers");
                    return;
                }
                await registerTeacher(teacherData);
                alert("Teacher registered successfully");
            }

            document.getElementById("addTeacherModal").style.display = "none";
            const teachers = await fetchTeachers();
            renderTable(teachers);
        } catch (error) {
            console.error("Save error:", error);
            alert(`Error: ${error.message}`);
        }
    }

    async function confirmDeleteTeacher(teacherId) {
        if (!confirm("Are you sure you want to delete this teacher?\nThis action cannot be undone.")) {
            return;
        }

        try {
            await deleteTeacherById(teacherId);
            alert("Teacher deleted successfully");
            const teachers = await fetchTeachers();
            renderTable(teachers);
        } catch (error) {
            console.error("Delete error:", error);
            alert("Error deleting teacher. Please try again.");
        }
    }

    function toggleModalPasswordVisibility() {
        const passwordInput = document.getElementById("password");
        const eyeIcon = document.getElementById("password-eye-icon");
        
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeIcon.textContent = "👁️‍🗨️";
        } else {
            passwordInput.type = "password";
            eyeIcon.textContent = "👁️";
        }
    }

    async function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase().trim();
        
        try {
            const teachers = await fetchTeachers();
            
            if (!searchTerm) {
                renderTable(teachers);
                return;
            }

            const filteredTeachers = teachers.filter(teacher =>
                teacher.teacherID.toLowerCase().includes(searchTerm) ||
                teacher.name.toLowerCase().includes(searchTerm) ||
                teacher.email.toLowerCase().includes(searchTerm) ||
                (teacher.isSupervisorOf && teacher.isSupervisorOf.toLowerCase().includes(searchTerm)) ||
                (teacher.isCoAdvisorOf && teacher.isCoAdvisorOf.some(group => group.toLowerCase().includes(searchTerm)))
            );

            renderTable(filteredTeachers);
        } catch (error) {
            console.error("Search error:", error);
            alert("Error performing search. Please try again.");
        }
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Main buttons
        document.getElementById("addTeacherBtn")?.addEventListener("click", () => {
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

        // Bulk upload file selection
        document.getElementById('csvFileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('selectedFileName').textContent = `Selected file: ${file.name}`;
                
                // Add upload button if it doesn't exist
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

        // Add/edit teacher modal
        document.getElementById("saveTeacherBtn")?.addEventListener("click", saveTeacher);
        document.getElementById("closeModalBtn")?.addEventListener("click", () => {
            document.getElementById("addTeacherModal").style.display = "none";
        });

        // Search functionality
        const searchBar = document.getElementById("searchBar");
        if (searchBar) {
            searchBar.addEventListener("input", handleSearch);
            searchBar.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleSearch();
            });
        }

        // Password visibility toggle
        document.getElementById("password-eye-icon")?.addEventListener("click", toggleModalPasswordVisibility);
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        
        // Load initial data
        fetchTeachers()
            .then(teachers => {
                renderTable(teachers);
                console.log("Application initialized successfully");
            })
            .catch(error => {
                console.error("Initialization error:", error);
                alert("Error initializing application. Please refresh the page.");
            });
    }

    // Expose functions to window object for HTML event handlers
    window.openEditModal = openEditModal;
    window.confirmDeleteTeacher = confirmDeleteTeacher;

    // Start the application when DOM is fully loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();