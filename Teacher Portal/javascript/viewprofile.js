(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const CHANGE_PASSWORD_API = `${BASE_URL}/api/auth/change-password`;
    const EDUCATION_EXPERTISE_API = `${BASE_URL}/api/teachers/education-expertise/me`;
    const EXPERTISE_OPTIONS_API = `${BASE_URL}/api/teachers/education-expertise/options`;
    const FIELDS_OF_STUDY_API = `${BASE_URL}/api/teachers/education-expertise/fields-of-study`;

    // Current state
    const userData = JSON.parse(localStorage.getItem('userData'));

    // Data for Fields of Study and Expertise
    let fieldsOfStudy = {
        BS: [],
        MS: [],
        PhD: []
    };

    let expertiseOptions = [];

    // Store original selected skills
    let originalExpertise = [];

    // ====================== UI Functions ======================
    function renderPersonalDetails() {
        if (!userData) {
            throw new Error('Teacher data not found in localStorage');
        }

        document.getElementById('teacher-name').textContent = userData.name || 'N/A';
        document.getElementById('teacher-id').textContent = userData.teacherID || 'N/A';
        document.getElementById('teacher-email').textContent = userData.email || 'N/A';
        document.getElementById('teacher-phone').textContent = userData.phoneNumber || 'N/A';
        document.getElementById('teacher-department').textContent = userData.department || 'N/A';
        document.getElementById('teacher-faculty-type').textContent = userData.facultyType || 'N/A';
        document.getElementById('teacher-fyp-member').textContent = userData.facultyMember ? 'Yes' : 'No';
    }

    // ====================== Password Change Handler ======================
    async function changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(CHANGE_PASSWORD_API, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to change password');
            }

            return data;
        } catch (error) {
            console.error("Error changing password:", error);
            throw error;
        }
    }

    function setupPasswordChange() {
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const messageElement = document.getElementById('passwordChangeMessage');

        changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Basic validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                showMessage('Please fill in all fields', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage('New passwords do not match', 'error');
                return;
            }

            try {
                changePasswordBtn.disabled = true;
                changePasswordBtn.textContent = 'Changing...';
                
                const result = await changePassword(currentPassword, newPassword, confirmPassword);
                showMessage(result.message || 'Password changed successfully', 'success');
                
                // Clear the form
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } catch (error) {
                showMessage(error.message || 'Failed to change password', 'error');
            } finally {
                changePasswordBtn.disabled = false;
                changePasswordBtn.textContent = 'Change Password';
            }
        });

        function showMessage(message, type) {
            messageElement.textContent = message;
            messageElement.className = 'message';
            messageElement.classList.add(type);
            
            // Clear message after 5 seconds
            setTimeout(() => {
                messageElement.textContent = '';
                messageElement.className = 'message';
            }, 5000);
        }
    }

    // ====================== Education & Expertise API Functions ======================
    async function fetchEducationExpertise() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(EDUCATION_EXPERTISE_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch education and expertise data');
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching education/expertise:", error);
            throw error;
        }
    }

    async function fetchExpertiseOptions() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(EXPERTISE_OPTIONS_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch expertise options');
            }

            const data = await response.json();
            return data.expertiseOptions || [];
        } catch (error) {
            console.error("Error fetching expertise options:", error);
            throw error;
        }
    }

    async function fetchFieldsOfStudy() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(FIELDS_OF_STUDY_API, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch fields of study options');
            }

            const data = await response.json();
            return data.fieldsOfStudy || {};
        } catch (error) {
            console.error("Error fetching fields of study:", error);
            throw error;
        }
    }

    async function updateEducationExpertise(educationLevel, fieldOfStudy, expertise) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(EDUCATION_EXPERTISE_API, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    educationLevel,
                    fieldOfStudy,
                    expertise
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update education and expertise');
            }

            return data;
        } catch (error) {
            console.error("Error updating education/expertise:", error);
            throw error;
        }
    }

    // ====================== Education & Expertise UI Functions ======================
    function populateFieldOfStudy(educationLevel) {
        const fieldOfStudyDropdown = document.getElementById("fieldOfStudy");
        
        // Clear existing options except the first one
        fieldOfStudyDropdown.innerHTML = '<option value="" disabled selected>Select field of study</option>';
        
        // Add new options based on selected education level
        if (educationLevel && fieldsOfStudy[educationLevel]) {
            fieldsOfStudy[educationLevel].forEach(field => {
                const option = document.createElement('option');
                option.value = field;
                option.textContent = field;
                fieldOfStudyDropdown.appendChild(option);
            });
        }
    }

    function setupEducationLevelChangeListener() {
        document.getElementById("educationLevel").addEventListener("change", function() {
            populateFieldOfStudy(this.value);
        });
    }

    function populateExpertiseOptions() {
        const expertiseDropdown = document.getElementById("expertiseDropdown");
        expertiseDropdown.innerHTML = expertiseOptions
            .map(expertise => `
                <label class="expertise-option">
                    <input type="checkbox" value="${expertise}"> ${expertise}
                </label>
            `)
            .join("");
    }

    function toggleDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    }

    function setupExpertiseDropdownToggle() {
        document.querySelector(".dropdown-header").addEventListener("click", function() {
            const dropdown = document.getElementById("expertiseDropdown");
            const isDisabled = document.querySelector(".custom-dropdown").classList.contains("disabled");
            
            if (!isDisabled) {
                toggleDropdown("expertiseDropdown");
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", function(event) {
            const dropdown = document.getElementById("expertiseDropdown");
            const dropdownHeader = document.querySelector(".dropdown-header");
            
            if (!dropdownHeader.contains(event.target) && !dropdown.contains(event.target)) {
                dropdown.style.display = "none";
            }
        });
    }

    function enableEditing() {
        document.getElementById("educationLevel").disabled = false;
        document.getElementById("fieldOfStudy").disabled = false;
        document.getElementById("editBtn").style.display = "none";
        document.getElementById("cancelBtn").style.display = "inline-block";
        document.getElementById("saveBtn").style.display = "inline-block";

        document.querySelector(".custom-dropdown").classList.remove("disabled");

        // Store original values
        originalExpertise = Array.from(document.querySelectorAll("#expertiseDropdown input[type='checkbox']:checked"))
            .map(checkbox => checkbox.value);

        updateSelectedExpertise();
    }

    function cancelEditing() {
        document.getElementById("educationLevel").disabled = true;
        document.getElementById("fieldOfStudy").disabled = true;
        document.getElementById("editBtn").style.display = "inline-block";
        document.getElementById("cancelBtn").style.display = "none";
        document.getElementById("saveBtn").style.display = "none";

        document.querySelector(".custom-dropdown").classList.add("disabled");

        // Reset to original values
        document.getElementById("educationLevel").value = userData.educationLevel || "";
        
        // Reset field of study
        if (userData.educationLevel) {
            populateFieldOfStudy(userData.educationLevel);
            setTimeout(() => {
                document.getElementById("fieldOfStudy").value = userData.fieldOfStudy || "";
            }, 100);
        }

        // Reset expertise checkboxes
        document.querySelectorAll("#expertiseDropdown input[type='checkbox']").forEach(checkbox => {
            checkbox.checked = originalExpertise.includes(checkbox.value);
        });

        updateSelectedExpertise();
        document.getElementById("expertiseDropdown").style.display = "none";
    }

    function updateSelectedExpertise() {
        const selectedExpertise = Array.from(document.querySelectorAll("#expertiseDropdown input[type='checkbox']:checked"))
            .map(checkbox => checkbox.value);
        const selectedExpertiseContainer = document.getElementById("selectedExpertise");
        selectedExpertiseContainer.innerHTML = selectedExpertise
            .map(skill => `<span class="expertise-tag">${skill}</span>`)
            .join(" ");
    }

    async function saveEducationExpertise() {
        try {
            const saveBtn = document.getElementById("saveBtn");
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            const educationLevel = document.getElementById("educationLevel").value;
            const fieldOfStudy = document.getElementById("fieldOfStudy").value;
            const expertise = Array.from(document.querySelectorAll("#expertiseDropdown input[type='checkbox']:checked"))
                .map(checkbox => checkbox.value);

            // Call API to update
            const result = await updateEducationExpertise(educationLevel, fieldOfStudy, expertise);

            // Update UI
            document.getElementById("displayEducationLevel").textContent = educationLevel || "N/A";
            document.getElementById("displayFieldOfStudy").textContent = fieldOfStudy || "N/A";
            document.getElementById("displayExpertise").textContent = expertise.join(", ") || "N/A";

            // Update user data in localStorage
            userData.educationLevel = educationLevel;
            userData.fieldOfStudy = fieldOfStudy;
            userData.expertise = expertise;
            localStorage.setItem('userData', JSON.stringify(userData));

            originalExpertise = [...expertise];
            cancelEditing();
            
            // Show success message
            alert(result.message || 'Education & Expertise updated successfully');
        } catch (error) {
            alert(error.message || 'Failed to update Education & Expertise');
            console.error("Error saving education/expertise:", error);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
        }
    }

    function setupEducationExpertise() {
        document.getElementById("editBtn").addEventListener("click", enableEditing);
        document.getElementById("cancelBtn").addEventListener("click", cancelEditing);
        document.getElementById("saveBtn").addEventListener("click", saveEducationExpertise);
        
        // Add event listeners to checkboxes
        document.getElementById("expertiseDropdown").addEventListener("change", updateSelectedExpertise);
    }

    async function loadEducationExpertiseData() {
        try {
            // Fetch fields of study first
            fieldsOfStudy = await fetchFieldsOfStudy();

            // Then fetch expertise options
            expertiseOptions = await fetchExpertiseOptions();
            populateExpertiseOptions();

            // Then fetch teacher's current education/expertise
            const data = await fetchEducationExpertise();
            
            // Update UI with fetched data
            if (data) {
                // Set education level
                const educationLevelSelect = document.getElementById("educationLevel");
                if (data.educationLevel) {
                    educationLevelSelect.value = data.educationLevel;
                    // Populate field of study based on current education level
                    populateFieldOfStudy(data.educationLevel);
                }

                // Set field of study after a small delay to ensure options are populated
                setTimeout(() => {
                    if (data.fieldOfStudy) {
                        document.getElementById("fieldOfStudy").value = data.fieldOfStudy;
                    }
                }, 100);

                // Set expertise checkboxes
                if (data.expertise && data.expertise.length > 0) {
                    document.querySelectorAll("#expertiseDropdown input[type='checkbox']").forEach(checkbox => {
                        checkbox.checked = data.expertise.includes(checkbox.value);
                    });
                }

                // Update display fields
                document.getElementById("displayEducationLevel").textContent = data.educationLevel || "N/A";
                document.getElementById("displayFieldOfStudy").textContent = data.fieldOfStudy || "N/A";
                document.getElementById("displayExpertise").textContent = 
                    (data.expertise && data.expertise.join(", ")) || "N/A";

                // Store original expertise
                originalExpertise = data.expertise || [];
                updateSelectedExpertise();
            }
        } catch (error) {
            console.error("Error loading education/expertise data:", error);
            alert('Error loading education/expertise data. Please try again later.');
        }
    }

    // ====================== Back Button ======================
    function setupBackButton() {
        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = "teacherlandingpage.html";
        });
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        try {
            if (!userData || userData.user_role !== 'teacher') {
                window.location.href = 'login.html';
                return;
            }

            renderPersonalDetails();
            setupPasswordChange();
            setupBackButton();

            // Initialize date display
            const dateElement = document.getElementById('current-date');
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const date = new Date().toLocaleDateString('en-US', options);
            dateElement.textContent = 'Today, ' + date;

            // Initialize Education & Expertise
            setupEducationLevelChangeListener();
            await loadEducationExpertiseData();
            setupEducationExpertise();
            setupExpertiseDropdownToggle();

        } catch (error) {
            console.error("Initialization error:", error);
            alert('Error loading teacher data. Please try again later.');
        }
    }

    // Start the application
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();