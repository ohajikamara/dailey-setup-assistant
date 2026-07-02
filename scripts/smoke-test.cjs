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
    await window.getByRole("heading", { name: "Let's set up Dailey on this Mac." }).waitFor({ timeout: 15000 });
    await window.getByRole("button", { name: "Begin setup" }).waitFor({ timeout: 15000 });

    const bodyText = await window.locator("body").innerText();
    const expected = [
      "Welcome",
      "Let's set up Dailey on this Mac.",
      "Begin setup"
    ];
    const missing = expected.filter((text) => !bodyText.includes(text));
    if (missing.length > 0) {
      throw new Error(`Missing expected text: ${missing.join(", ")}`);
    }
    if (bodyText.includes("Setup path") || bodyText.includes("Full Diagnostics")) {
      throw new Error("Welcome screen should not show dashboard or setup-sidebar content");
    }

    await window.screenshot({ path: screenshotPath, fullPage: true });
    await window.getByRole("button", { name: "Begin setup" }).click();
    await window.locator(".setup-step-screen").waitFor({ timeout: 15000 });
    await window.getByText(/Step [1-5] of 5|Getting things ready|Preparation/).first().waitFor({ timeout: 15000 });
    await window.locator(".step-orb").waitFor({ timeout: 15000 });
    const stepText = await window.locator("body").innerText();
    if (stepText.includes("Setup path") || stepText.includes("Full Diagnostics") || stepText.includes("Overall Progress")) {
      throw new Error("Focused setup screen should not expose dashboard scaffolding");
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
    await window.getByRole("heading", { name: "Let's set up Dailey on this Mac." }).waitFor({ timeout: 15000 });
    await window.evaluate(() => window.scrollTo(0, 0));
    console.log(`Smoke test passed. Screenshots: ${screenshotPath}, ${helpScreenshotPath}, ${settingsScreenshotPath}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
