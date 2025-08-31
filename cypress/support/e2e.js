// ***********************************************************
// This file is processed and loaded automatically 
// before your test files.
//
// Good place to put global config and behavior that 
// modifies Cypress across tests.
// ***********************************************************

// ✅ Import custom commands
import './commands';

// ✅ Import waitUntil plugin for conditional retries
import 'cypress-wait-until';

// ✅ Global beforeEach hook (applies to every test)
beforeEach(() => {
  // Clear cookies and local storage before each test
  cy.clearCookies();
  cy.clearLocalStorage();
});