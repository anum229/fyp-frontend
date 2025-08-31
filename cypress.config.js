const { defineConfig } = require("cypress");
const fs = require("fs");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}", // 🔹 Test specs location
    supportFile: "cypress/support/e2e.js", // 🔹 Global support (commands, hooks)
    fixturesFolder: "cypress/fixtures", // 🔹 Test data
    downloadsFolder: "cypress/downloads", // 🔹 Downloaded files
    screenshotsFolder: "cypress/screenshots", // 🔹 Screenshot capture
    videosFolder: "cypress/videos", // 🔹 Video capture
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false, // 🔹 Allows cross-origin iframes
    viewportWidth: 1920,
    viewportHeight: 1080,
    watchForFileChanges: false, // 🔹 Prevent auto re-run on file save

    defaultCommandTimeout: 15000, // 🔹 Command wait
    pageLoadTimeout: 60000, // 🔹 Page load wait
    requestTimeout: 15000, // 🔹 API request wait
    responseTimeout: 15000, // 🔹 API response wait

    retries: {
      runMode: 2, // 🔹 Retries in CI
      openMode: 1, // 🔹 Retries locally
    },

    env: {
      login_email: process.env.CYPRESS_login_email,
      login_password: process.env.CYPRESS_login_password,
    },

    reporter: "mochawesome", // 🔹 Professional reports
    reporterOptions: {
      reportDir: "cypress/reports",
      overwrite: false,
      html: true,
      json: true,
      charts: true,
    },

    experimentalStudio: true, // 🔹 Optional recorder for beginners

    setupNodeEvents(on, config) {
      // 🔹 Custom tasks for files, logging, DB, etc.
      on("task", {
        readJson(filePath) {
          return JSON.parse(fs.readFileSync(filePath, "utf8"));
        },
        log(message) {
          console.log(message);
          return null;
        },
      });
      return config;
    },
  },
});