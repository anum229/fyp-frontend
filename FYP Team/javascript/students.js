(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/students`;
    
    // Current editing student ID
    let editingStudentId = null;
    let currentStudentData = null;

    // ====================== API Functions ======================
    async function fetchStudents() {
        try {
            console.log("Fetching students from API...");
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
            console.log("Students data received:", data);
            return data;
        } catch (error) {
            console.error("Error fetching students:", error);
            alert("Error loading students. Please try again.");
            return [];
        }
    }

    async function registerStudent(studentData) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }

            return await response.json();
        } catch (error) {
            console.error("Error registering student:", error);
            throw error;
        }
    }

    async function updateStudent(studentId, studentData) {
        try {
            if (!studentData.password) {
                delete studentData.password;
            }
            
            const response = await fetch(`${API_URL}/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Update failed');
            }
    
            return await response.json();
        } catch (error) {
            console.error("Error updating student:", error);
            throw error;
        }
    }

    async function deleteStudentById(studentId) {
        try {
            const response = await fetch(`${API_URL}/${studentId}`, {
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
            console.error("Error deleting student:", error);
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

            let message = `Bulk upload completed!\n\nTotal: ${result.total}\nSuccess: ${result.success}`;
            if (result.errors > 0) {
                message += `\nErrors: ${result.errors}\n\nError details:\n`;
                result.errorDetails.forEach(error => {
                    message += `Row ${error.row}: ${error.error}\n`;
                });
            }
            
            alert(message);
            
            document.getElementById('bulkUploadModal').style.display = 'none';
            const students = await fetchStudents();
            renderTable(students);
        } catch (error) {
            console.error('Bulk upload error:', error);
            alert(`Error during bulk upload: ${error.message}`);
        } finally {
            const uploadBtn = document.getElementById('uploadCsvBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload';
            }
        }
    }

    // ====================== UI Functions ======================
    function renderTable(students) {
        const tableBody = document.querySelector("#studentsTable tbody");
        
        if (!tableBody) {
            console.error("Table body not found!");
            return;
        }

        tableBody.innerHTML = "";

        if (!students || students.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9">No students found</td></tr>`;
            return;
        }

        students.forEach((student, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.name}</td>
                <td>${student.batch}</td>
                <td>${student.department}</td>
                <td>${student.rollNumber}</td>
                <td>${student.groupID}</td>
                <td>${student.student_role}</td>
                <td>${student.email}</td>
                <td class="actions">
                    <span class="edit-btn" onclick="window.openEditModal('${student._id}')">✏️</span>
                    <span class="delete-btn" onclick="window.confirmDeleteStudent('${student._id}')">🗑️</span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function openAddModal() {
        document.getElementById("addStudentModal").style.display = "flex";
        clearModalFields();
        editingStudentId = null;
        currentStudentData = null;
        document.getElementById("password").placeholder = "Enter password";
    }

    function clearModalFields() {
        document.getElementById("studentName").value = "";
        document.getElementById("batch").value = "";
        document.getElementById("department").value = "";
        document.getElementById("rollNumber").value = "";
        document.getElementById("groupID").value = "";
        document.getElementById("role").value = "Member";
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
    }

    async function openEditModal(studentId) {
        try {
            const response = await fetch(`${API_URL}/${studentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': window.AUTH_TOKEN || `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch student data');
            }

            currentStudentData = await response.json();
            
            document.getElementById("studentName").value = currentStudentData.name;
            document.getElementById("batch").value = currentStudentData.batch;
            document.getElementById("department").value = currentStudentData.department;
            document.getElementById("rollNumber").value = currentStudentData.rollNumber;
            document.getElementById("groupID").value = currentStudentData.groupID;
            document.getElementById("role").value = currentStudentData.student_role;
            document.getElementById("email").value = currentStudentData.email;
            document.getElementById("password").value = "";
            document.getElementById("password").placeholder = "Leave blank to keep current password";

            editingStudentId = studentId;
            document.getElementById("addStudentModal").style.display = "flex";
        } catch (error) {
            console.error("Error opening edit modal:", error);
            alert("Error loading student data");
        }
    }

    async function saveStudent() {
        const studentData = {
            name: document.getElementById("studentName").value,
            batch: document.getElementById("batch").value,
            department: document.getElementById("department").value,
            rollNumber: document.getElementById("rollNumber").value,
            groupID: document.getElementById("groupID").value,
            student_role: document.getElementById("role").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        if (!studentData.name || !studentData.rollNumber || !studentData.email) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            if (editingStudentId) {
                await updateStudent(editingStudentId, studentData);
                alert("Student updated successfully");
            } else {
                if (!studentData.password) {
                    alert("Password is required for new students");
                    return;
                }
                await registerStudent(studentData);
                alert("Student registered successfully");
            }

            document.getElementById("addStudentModal").style.display = "none";
            const students = await fetchStudents();
            renderTable(students);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    async function confirmDeleteStudent(studentId) {
        if (!confirm("Are you sure you want to delete this student?")) {
            return;
        }

        try {
            await deleteStudentById(studentId);
            alert("Student deleted successfully");
            const students = await fetchStudents();
            renderTable(students);
        } catch (error) {
            alert("Error deleting student");
        }
    }

    function toggleModalPasswordVisibility() {
        const passwordInput = document.getElementById("password");
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
        } else {
            passwordInput.type = "password";
        }
    }

    async function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        const students = await fetchStudents();
        
        if (!searchTerm) {
            renderTable(students);
            return;
        }

        const filteredStudents = students.filter(student => 
            student.rollNumber.toLowerCase().includes(searchTerm) ||
            student.groupID.toLowerCase().includes(searchTerm) ||
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm)
        );

        renderTable(filteredStudents);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Main buttons
        document.getElementById("addStudentBtn")?.addEventListener("click", () => {
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

        // Add/edit student modal
        document.getElementById("saveStudentBtn")?.addEventListener("click", saveStudent);
        document.getElementById("closeModalBtn")?.addEventListener("click", () => {
            document.getElementById("addStudentModal").style.display = "none";
        });

        // Search functionality
        document.getElementById("searchBar")?.addEventListener("input", handleSearch);

        // Password visibility toggle
        document.getElementById("password-eye-icon")?.addEventListener("click", toggleModalPasswordVisibility);
    }

    // ====================== Initialization ======================
    function initializeApp() {
        initializeEventListeners();
        fetchStudents()
            .then(renderTable)
            .catch(error => {
                console.error("Initialization error:", error);
            });
    }

    // Expose functions to window object for HTML event handlers
    window.openEditModal = openEditModal;
    window.confirmDeleteStudent = confirmDeleteStudent;

    // Start the application
    initializeApp();
})();