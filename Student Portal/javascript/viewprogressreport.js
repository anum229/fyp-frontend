(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/progress-reports/student`;
    
    // Current state
    let reports = [];
    const token = localStorage.getItem("authToken");

    // ====================== API Functions ======================
    async function fetchProgressReports() {
        try {
            const res = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            reports = Array.isArray(data) ? data : [];

            // Transform data for UI
            reports = reports.map((report, index) => ({
                sNo: index + 1,
                fileName: report.fileName,
                fileUrl: report.fileUrl,
                comments: report.comments || "No comments provided",
                reportPeriod: report.reportPeriod,
                teacherName: report.teacherName || "N/A",
                submittedDate: report.createdAt ? new Date(report.createdAt).toLocaleString() : "N/A"
            }));

            renderReports(reports);
        } catch (err) {
            console.error("Error fetching progress reports:", err);
            showError("Failed to load progress reports. Please try again later.");
        }
    }

    // ====================== UI Functions ======================
    function renderReports(data) {
        const reportsList = document.getElementById("reports-list");
        reportsList.innerHTML = "";

        if (!data || data.length === 0) {
            reportsList.innerHTML = `
                <li class="no-reports">
                    <div class="report-details">
                        No progress reports available
                    </div>
                </li>
            `;
            return;
        }

        data.forEach((report) => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <div class="report-details">
                    <strong>Progress Report:</strong> 
                    <a href="${report.fileUrl}" target="_blank" class="download-link">${report.fileName}</a><br>
                    <strong>Comments:</strong> ${report.comments}<br>
                    <strong>Report Period:</strong> 
                    <span class="period-highlight">${report.reportPeriod}</span><br>
                    <strong>Submitted On:</strong> ${report.submittedDate}
                    ${report.teacherName ? `<br><strong>Supervisor:</strong> ${report.teacherName}` : ''}
                </div>
            `;
            reportsList.appendChild(listItem);
        });
    }

    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        document.querySelector('.container').prepend(errorElement);
        
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        const filteredReports = reports.filter(report => 
            report.fileName.toLowerCase().includes(searchTerm) || 
            report.comments.toLowerCase().includes(searchTerm) ||
            report.teacherName.toLowerCase().includes(searchTerm)
        );
        renderReports(filteredReports);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Search functionality (if you add a search bar later)
        const searchBar = document.getElementById("searchBar");
        if (searchBar) {
            searchBar.addEventListener("input", handleSearch);
            searchBar.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleSearch();
            });
        }
    }

    // ====================== Initialization ======================
    function initializeApp() {
        // Check authentication
        if (!token) {
            showError('Please login to view progress reports');
            // Redirect to login if needed
            return;
        }

        initializeEventListeners();
        fetchProgressReports();
    }

    // Start the application when DOM is fully loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initializeApp, 1);
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }
})();