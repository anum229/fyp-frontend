describe('Login Flow', () => {

  // =========================================================
  // Before Each Test: Clear storage & visit login page
  // =========================================================
  beforeEach(() => {
    cy.visit('/login.html', {
      onBeforeLoad(win) {
        // Clear session & local storage to ensure clean state
        win.sessionStorage.clear();
        win.localStorage.clear();
      }
    });

    // Wait until the login form is fully loaded
    cy.waitUntil(() => cy.get('#form-title').should('be.visible'));
  });

  // =========================================================
  // Test Case: Login with valid credentials
  // =========================================================
  it('Login with valid credentials', () => {

    // 1️⃣ Select the FYP role tab
    cy.get('.role-tab-fyp').should('be.visible').click().wait(500);

    // 2️⃣ Assert the role title is displayed correctly
    cy.get('#form-title')
      .should('be.visible')
      .and('contain.text', 'FYP Team Login')
      .wait(500);

    // 3️⃣ Enter login credentials from environment variables
    cy.get('#email').should('be.visible').type(Cypress.env('login_email')).wait(500);
    cy.get('#password').should('be.visible').type(Cypress.env('login_password'), { log: false }).wait(500);

    // 4️⃣ Click the login button
    cy.get('#login-button').should('be.visible').click().wait(1000);

    // 5️⃣ Assert that the URL navigates to FYP landing page with extended timeout
    cy.url({ timeout: 60000 }).should('include', '/FYP%20Team/fyplandingpage.html');
  });

});