const { defineConfig } = require("@playwright/test");
const fs = require("fs");

// Pe Mac folosim Brave-ul instalat, ca să nu descărcăm alte browsere.
// Pe GitHub (Ubuntu) calea nu există, așa că Playwright își folosește Chromium-ul lui.
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

module.exports = defineConfig({
  testDir: "tests",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    launchOptions: fs.existsSync(BRAVE) ? { executablePath: BRAVE } : {},
  },
});
