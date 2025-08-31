(function() {
    // API Configuration
    const BASE_URL = "https://fyp-backend-8mc0.onrender.com";
    const API_URL = `${BASE_URL}/api/previousbatchfyp`;
    
    // Current data storage
    let allProjects = [];

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
            
            // Transform data to match frontend format
            const transformedData = data.map((project, index) => ({
                sNo: index + 1,
                groupID: project.groupID,
                department: project.department,
                groupMembers: project.groupMembers,
                year: project.year,
                projectTitle: project.projectTitle,
                _id: project._id
            }));
            
            allProjects = transformedData;
            return transformedData;
        } catch (error) {
            console.error("Error fetching previous batch FYPs:", error);
            alert("Error loading previous batch FYPs. Please try again.");
            return [];
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
        tableBody.innerHTML = `<tr><td colspan="6">No previous batch FYPs found</td></tr>`;
        return;
    }

    projects.forEach((project, index) => {
        const row = document.createElement("tr");
        
        // Format group members as simple line breaks (most reliable for left alignment)
        const groupMembersHTML = project.groupMembers.join('<br>');

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${project.groupID}</td>
            <td>${project.department}</td>
            <td class="roll-numbers">${groupMembersHTML}</td>
            <td>${project.year}</td>
            <td>${project.projectTitle}</td>
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
            (project.department && project.department.toLowerCase().includes(searchTerm))
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
            const projects = await fetchPreviousFYPs();
            renderTable(projects);
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }

    // Start the application
    initializeApp();
})();