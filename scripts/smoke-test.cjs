const { _electron: electron } = require("playwright");
const path = require("node:path");
const fs = require("node:fs/promises");

const root = path.resolve(__dirname, "..");
const screenshotDir = path.join(root, "test-results");
const screenshotPath = path.join(screenshotDir, "smoke-home.png");
const helpScreenshotPath = path.join(screenshotDir, "smoke-help.png");
const settingsScreenshotPath = path.join(screenshotDir, "smoke-settings-dark.png");

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });

  const app = await electron.launch({
    args: [root],
    env: {
      ...process.env,
      DAILEY_ASSISTANT_TEST: "1"
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.evaluate(() => {
      localStorage.setItem("dailey-theme", "light");
      localStorage.setItem("dailey-settings", JSON.stringify({
        showDiagnostics: true,
        showSampleLogs: true,
        compact: false
      }));
    });
    await window.reload();
    await window.waitForLoadState("domcontentloaded");
    await window.getByText("Dailey Setup Assistant").first().waitFor({ timeout: 15000 });
    await window.locator(".setup-intro-panel h1").waitFor({ timeout: 15000 });
    await window.getByText(/Step [1-5] of 5|Getting things ready|Setup path/).first().waitFor({ timeout: 15000 });
    await window.getByText("Setup path").waitFor({ timeout: 15000 });
    await window.getByText(/Report/).first().waitFor({ timeout: 15000 });
    await window.getByText(/Log/).first().waitFor({ timeout: 15000 });

    const bodyText = await window.locator("body").innerText();
    const expected = [
      "Sign in to Dailey",
      "Sign in to GitHub",
      "Choose your AI platform",
      "Reload your AI app",
      "Finish setup",
      "Setup path",
      "Report",
      "Log"
    ];
    const missing = expected.filter((text) => !bodyText.includes(text));
    if (missing.length > 0) {
      throw new Error(`Missing expected text: ${missing.join(", ")}`);
    }

    await window.getByRole("button", { name: "Help" }).click();
    await window.getByRole("dialog", { name: "Help Guide" }).waitFor({ timeout: 10000 });
    await window.getByText("What this assistant does").waitFor({ timeout: 10000 });
    await window.screenshot({ path: helpScreenshotPath, fullPage: true });
    await window.getByRole("button", { name: "Close" }).click();

    await window.getByRole("button", { name: "Settings" }).click();
    await window.getByRole("dialog", { name: "Settings" }).waitFor({ timeout: 10000 });
    await window.getByText("Dark mode").waitFor({ timeout: 10000 });
    await window.getByRole("checkbox", { name: /Dark mode/ }).check();
    await window.locator(".app-shell.dark").waitFor({ timeout: 10000 });
    await window.getByRole("checkbox", { name: /Compact layout/ }).check();
    await window.locator(".app-shell.compact-mode").waitFor({ timeout: 10000 });
    await window.screenshot({ path: settingsScreenshotPath, fullPage: true });
    await window.getByRole("button", { name: "Close" }).click();

    await window.getByRole("button", { name: "View full log" }).click();
    await window.getByRole("dialog", { name: "Full Installer Log" }).waitFor({ timeout: 10000 });
    await window.getByText(/No installer output yet\.|Checking system requirements|Step-specific status|Reading existing Dailey/).first().waitFor({ timeout: 10000 });
    await window.getByRole("button", { name: "Close" }).click();

    await window.getByRole("button", { name: "Switch to light mode" }).click();
    await window.locator(".app-shell.light").waitFor({ timeout: 10000 });
    await window.evaluate(() => {
      localStorage.setItem("dailey-theme", "light");
      localStorage.setItem("dailey-settings", JSON.stringify({
        showDiagnostics: true,
        showSampleLogs: true,
        compact: false
      }));
    });
    await window.reload();
    await window.waitForLoadState("domcontentloaded");
    await window.getByText("Dailey Setup Assistant").first().waitFor({ timeout: 15000 });
    await window.getByText("Sign in to Dailey").first().waitFor({ timeout: 15000 });
    await window.evaluate(() => window.scrollTo(0, 0));

    await window.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Smoke test passed. Screenshots: ${screenshotPath}, ${helpScreenshotPath}, ${settingsScreenshotPath}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
