(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const PROGRESS_REPORT_API = `${BASE_URL}/api/progress-reports`;
    const token = localStorage.getItem("authToken");    
    // Current state
    let reports = [];
    let editingId = null;
    // ====================== Helper Functions ======================
    function showAlert(message, type = "error") {
        const alertBox = document.createElement("div");
        alertBox.className = `alert ${type}`;
        alertBox.textContent = message;
        document.body.appendChild(alertBox);
        
        setTimeout(() => {
            alertBox.remove();
        }, 5000);
    }
    function normalizeMonth(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
    function formatDisplayDate(dateStr) {
        if (!dateStr) return "N/A";
        try {
            const [year, month] = dateStr.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleString('default', { month: 'short' }) + ' ' + year;
        } catch (e) {
            console.error("Date formatting error:", e);
            return dateStr;
        }
    }

    // ====================== API Functions ======================
    async function fetchReports() {
        try {
            const response = await fetch(`${PROGRESS_REPORT_API}/teacher`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            //
            reports = data.map((report, index) => {
            const [startPeriodRaw, endPeriodRaw] = (report.reportPeriod || " - ").split(' - ');
    
    // Optionally normalize to yyyy-mm if needed later
    function normalizeMonthDisplay(str) {
        const monthMap = {
            Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
            Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
        };
        if (!str) return null;
        const [month, year] = str.split(' ');
        if (!month || !year) return null;
        return `${year}-${monthMap[month] || '01'}`;
    }

    const startPeriod = normalizeMonthDisplay(startPeriodRaw);
    const endPeriod = normalizeMonthDisplay(endPeriodRaw);

    console.log(`Raw Report #${index + 1}: Start = ${startPeriodRaw}, End = ${endPeriodRaw}`);

    return {
        ...report,
        sNo: index + 1,
        startPeriod,
        endPeriod,
        formattedDate: report.createdAt ? new Date(report.createdAt).toLocaleString() : "N/A",
        displayPeriod: report.reportPeriod || "N/A"
    };
});
//
            renderReports();
            
       const sub = localStorage.getItem('reportSub').toString(); 
       if(sub==="true")
        {
            localStorage.setItem('reportSub','false');
            showAlert("Report submitted successfully!","success");
        }
        } catch (error) {
            console.error("Error fetching reports:", error);
            showAlert("Failed to load reports. Please check your connection and try again.");
        }
    }

    async function submitReport(formData, isEdit = false) {
        try {
            const url = isEdit ? `${PROGRESS_REPORT_API}/${editingId}` : `${PROGRESS_REPORT_API}/submit`;
            const method = isEdit ? "PUT" : "POST";
            localStorage.setItem('reportSub','true');
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Submission failed');
            }

            return await response.json();
        } catch (error) {
            //localStorage.setItem('reportSub','false');
            console.error("Submission error:", error);
            throw error;
        }
    }

    // ====================== UI Functions ======================
    function renderReports() {
        const reportsList = document.getElementById("reports-list");
        reportsList.innerHTML = "";

        if (!reports || reports.length === 0) {
            reportsList.innerHTML = `<li class="no-data">No reports found</li>`;
            return;
        }

        reports.forEach((report) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="report-details">
                    <strong>File:</strong> 
                    <a href="${report.fileUrl}" download="${report.fileName}" class="download-link">
                        <i class="fas fa-file-pdf"></i> ${report.fileName}
                    </a><br>
                    <strong>Comments:</strong> ${report.comments || "N/A"}<br>
                    <strong>Report Period:</strong> ${report.displayPeriod || "N/A"}<br>
                    <strong>Submitted On:</strong> ${report.formattedDate}
                </div>
                <div class="report-actions">
                    <button class="edit-btn" data-id="${report.id}">Edit</button>
                    <button class="delete-btn" data-id="${report.id}">Delete</button>
                </div>
            `;
            reportsList.appendChild(li);
        });

        // Add event listeners to all buttons
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => handleEdit(btn.dataset.id));
        });
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => handleDelete(btn.dataset.id));
        });
    }

    function clearForm() {
        document.getElementById("file-upload").value = "";
        document.getElementById("comments").value = "";
        document.getElementById("start-period").value = "";
        document.getElementById("end-period").value = "";
        const fileDisplay = document.getElementById("file-display");
        if (fileDisplay) fileDisplay.remove();
        editingId = null;
        
        document.querySelector(".submit-button").classList.remove("hidden");
        document.querySelector(".edit-buttons").style.display = "none";
    }

    function validateForm(file, comments, startPeriod, endPeriod) {
        if (!file && !editingId) {
            showAlert("Please upload a PDF file");
            return false;
        }
        if (!comments) {
            showAlert("Please enter comments");
            return false;
        }
        if (!startPeriod || !endPeriod) {
            showAlert("Please select report period");
            return false;
        }
        if (startPeriod >= endPeriod) {
            showAlert("End period must be after start period");
            return false;
        }
        return true;
    }

    // ====================== Event Handlers ======================
    async function handleSubmit(e) {
        if (e) e.preventDefault();
        
        const fileInput = document.getElementById("file-upload");
        const file = fileInput.files[0];
        const comments = document.getElementById("comments").value.trim();
        const startPeriod = document.getElementById("start-period").value;
        const endPeriod = document.getElementById("end-period").value;

        if (!validateForm(file, comments, startPeriod, endPeriod)) return;
           // ✅ Duplicate period check (only for new submissions)
    if (!editingId) {
        const duplicate = reports.find(r => r.startPeriod === startPeriod && r.endPeriod === endPeriod);
        if (duplicate) {
            showAlert("A report for the specified period already exists.");
            return;
        }
    }

        const formData = new FormData();
        if (file) formData.append('file', file);
        formData.append('comments', comments);
        formData.append('startPeriod', startPeriod);
        formData.append('endPeriod', endPeriod);

        try {
            const result = await submitReport(formData, !!editingId);
            showAlert(`Report ${editingId ? 'updated' : 'submitted'} successfully!`, "success");
            clearForm();
            await fetchReports();
        } catch (error) {
            showAlert(error.message || "Submission failed");
        }
    }
    

   function handleEdit(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    editingId = id;

    // Log to make sure it's found
    console.log("Editing report:", report);

    // ✅ Fix: access properties directly
 if (report.reportPeriod) {
      const [startStr, endStr] = report.reportPeriod.split(' - ');

      // You would need to convert "Feb 2025" to "yyyy-mm" for input[type=month]
      // A helper to parse month name to month number:
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };

      function toInputMonth(str) {
        // str example: "Feb 2025"
        const [monthName, year] = str.split(' ');
        return `${year}-${monthMap[monthName] || '01'}`; // fallback to Jan if unknown
      }

      document.getElementById("start-period").value = toInputMonth(startStr);
      document.getElementById("end-period").value = toInputMonth(endStr);
    } else {
      document.getElementById("start-period").value = "";
      document.getElementById("end-period").value = "";
    }
    // Fill form fields
    document.getElementById("comments").value = report.comments || "";
    // Show current file
    const displayDiv = document.getElementById("file-display") || document.createElement("div");
    displayDiv.id = "file-display";
    displayDiv.innerHTML = `
        <a href="${report.fileUrl}" download="${report.fileName}">
            <i class="fas fa-file-pdf"></i> ${report.fileName} (Current File)
        </a>
    `;
    document.getElementById("file-message").after(displayDiv);

    // Switch to edit mode
    document.querySelector(".submit-button").classList.add("hidden");
    document.querySelector(".edit-buttons").style.display = "flex";
}

    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this report?")) return;

        try {
            const response = await fetch(`${PROGRESS_REPORT_API}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete report');
            }

            showAlert("Report deleted successfully!", "success");
            await fetchReports();
        } catch (error) {
            showAlert(error.message || "Deletion failed");
        }
    }

    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            const displayDiv = document.getElementById("file-display") || document.createElement("div");
            displayDiv.id = "file-display";
            displayDiv.innerHTML = `
                <a href="#" id="file-link" download="${file.name}">
                    <i class="fas fa-file-pdf"></i> ${file.name}
                </a>
            `;
            document.getElementById("file-message").after(displayDiv);
        }
    }

    function handleCancelEdit() {
        clearForm();
    }
    
    function toggleReportsView() {
        const reportsList = document.getElementById("reports-list");
        const toggleBtn = document.getElementById("toggle-reports-btn");
        
        if (reportsList.classList.contains("hidden")) {
            reportsList.classList.remove("hidden");
            toggleBtn.textContent = "Hide Submitted Reports";
            // Only fetch if we don't have reports yet
            if (reports.length === 0) {
                fetchReports();
            }
        } else {
            reportsList.classList.add("hidden");
            toggleBtn.textContent = "View Submitted Reports";
        }
    }

    // ====================== Initialization ======================
    function initializeApp() {
        // Add proper event listeners
        document.querySelector(".submit-button").addEventListener("click", handleSubmit);
        document.querySelector(".save-btn").addEventListener("click", handleSubmit);
        document.querySelector(".cancel-btn").addEventListener("click", handleCancelEdit);
        document.getElementById("file-upload").addEventListener("change", handleFileChange);
        document.getElementById("toggle-reports-btn").addEventListener("click", toggleReportsView);

        // Prevent form submission from refreshing page
        const form = document.querySelector("form");
        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
          //      handleSubmit(e);
            });
        }

        // Add basic alert styling
        const style = document.createElement('style');
        style.textContent = `
            .alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px;
                border-radius: 5px;
                color: white;
                z-index: 1000;
            }
            .error {
                background-color: #f44336;
            }
            .success {
                background-color: #4CAF50;
            }
        `;
        document.head.appendChild(style);

        // Load initial data
        fetchReports().catch(error => {
            console.error("Initialization error:", error);
            showAlert("Failed to initialize. Please refresh the page.");
        });
    }

    // Start the application
    if (document.readyState === "complete") {
        initializeApp();
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();