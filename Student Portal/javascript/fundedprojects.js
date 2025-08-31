(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/fundedprojects`;
    
    // Current data storage
    let allProjects = [];

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
            
            // Transform data to match frontend format
            const transformedData = data.map((project, index) => ({
                sNo: index + 1,
                groupID: project.groupID,
                department: project.department,
                groupMembers: project.groupMembers,
                projectTitle: project.projectTitle,
                fundedBy: project.fundedBy,
                _id: project._id
            }));
            
            allProjects = transformedData;
            return transformedData;
        } catch (error) {
            console.error("Error fetching funded projects:", error);
            alert("Error loading funded projects. Please try again.");
            return [];
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
            tableBody.innerHTML = `<tr><td colspan="6">No funded projects found</td></tr>`;
            return;
        }

        projects.forEach((project, index) => {
            const row = document.createElement("tr");
            
            // Update serial number
            project.sNo = index + 1;

            // Format group members as vertical list
            const groupMembersHTML = project.groupMembers.join('<br>');

            row.innerHTML = `
                <td>${project.sNo}</td>
                <td>${project.groupID}</td>
                <td>${project.department}</td>
                <td class="roll-numbers">${groupMembersHTML}</td>
                <td>${project.projectTitle}</td>
                <td>${project.fundedBy}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function handleSearch() {
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        
        if (!searchTerm) {
            renderTable(allProjects);
            return;
        }

        const filteredProjects = allProjects.filter(project => 
            project.projectTitle.toLowerCase().includes(searchTerm) ||
            (project.groupID && project.groupID.toLowerCase().includes(searchTerm)) ||
            (project.department && project.department.toLowerCase().includes(searchTerm)) ||
            (project.fundedBy && project.fundedBy.toLowerCase().includes(searchTerm))
        );

        renderTable(filteredProjects);
    }

    // ====================== Event Listeners ======================
    function initializeEventListeners() {
        // Search functionality
        document.getElementById("searchBar")?.addEventListener("input", handleSearch);
    }

    // ====================== Initialization ======================
    async function initializeApp() {
        initializeEventListeners();
        try {
            const projects = await fetchFundedProjects();
            renderTable(projects);
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }

    // Start the application
    initializeApp();
})();