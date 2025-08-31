async function suggestProjects() {
    const eventTheme = document.getElementById("eventTheme").value.trim();
    const tags = document.getElementById("tags").value.trim();
    const resultsContainer = document.getElementById("results");

    // Get the submit button using its class inside the form
    const suggestBtn = document.querySelector("#projectSuggestionForm .btn");

    if (!suggestBtn) {
        console.error("Submit button with class 'btn' not found inside the form.");
        return;
    }

    
    resultsContainer.innerHTML = ""; // Clear old results
    suggestBtn.disabled = true;
    const originalText = suggestBtn.innerText;
    suggestBtn.innerText = "Processing...";

    try {
        const response = await fetch("https://fyp-backend-8mc0.onrender.com/suggest-project-name", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                theme: eventTheme,
                tags: tags
            })
        });

        const data = await response.json();

        if (data.suggested_project_names && data.suggested_project_names.length > 0) {
            data.suggested_project_names.forEach((name) => {
                const resultDiv = document.createElement("div");
                resultDiv.className = "result";
                resultDiv.textContent = name.projectTitle;
                resultsContainer.appendChild(resultDiv);
            });
        } else {
            resultsContainer.innerHTML = "<p class='result'>No matching project names found.</p>";
        }

    } catch (error) {
        console.error("Error fetching suggestions:", error);
        resultsContainer.innerHTML = "<p class='result'>Something went wrong. Please try again later.</p>";
    } finally {
        suggestBtn.disabled = false;
        suggestBtn.innerText = originalText;
    }
}
