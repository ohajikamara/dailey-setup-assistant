const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;
const publish = Array.isArray(pkg.build?.publish) ? pkg.build.publish[0] : null;

if (!publish?.owner || !publish?.repo) {
  throw new Error("package.json build.publish must include owner and repo");
}

const repo = `${publish.owner}/${publish.repo}`;
const releaseDir = path.join(root, pkg.build?.directories?.output || "release");
const baseName = `Dailey-Setup-Assistant-${version}-universal`;
const artifacts = {
  dmg: path.join(releaseDir, `${baseName}.dmg`),
  dmgBlockmap: path.join(releaseDir, `${baseName}.dmg.blockmap`),
  zip: path.join(releaseDir, `${baseName}.zip`),
  zipBlockmap: path.join(releaseDir, `${baseName}.zip.blockmap`),
  latest: path.join(releaseDir, "latest-mac.yml")
};

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8"
  });
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function fileInfo(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    size: buffer.length,
    sha512: crypto.createHash("sha512").update(buffer).digest("base64")
  };
}

for (const filePath of [artifacts.dmg, artifacts.dmgBlockmap, artifacts.zip, artifacts.zipBlockmap]) {
  if (!exists(filePath)) {
    throw new Error(`Missing release artifact: ${path.relative(root, filePath)}`);
  }
}

const zip = fileInfo(artifacts.zip);
const dmg = fileInfo(artifacts.dmg);
const releaseDate = new Date().toISOString();

const latestMac = [
  `version: ${version}`,
  "files:",
  `  - url: ${path.basename(artifacts.zip)}`,
  `    sha512: ${zip.sha512}`,
  `    size: ${zip.size}`,
  `  - url: ${path.basename(artifacts.dmg)}`,
  `    sha512: ${dmg.sha512}`,
  `    size: ${dmg.size}`,
  `path: ${path.basename(artifacts.zip)}`,
  `sha512: ${zip.sha512}`,
  `releaseDate: '${releaseDate}'`,
  ""
].join("\n");

fs.writeFileSync(artifacts.latest, latestMac, "utf8");

try {
  run("git", ["rev-parse", "--verify", tag], { capture: true });
} catch {
  run("git", ["tag", tag]);
}

const branch = run("git", ["branch", "--show-current"], { capture: true }).trim();
if (branch) {
  run("git", ["push", "origin", branch]);
}
run("git", ["push", "origin", tag]);

try {
  run("gh", ["release", "view", tag, "--repo", repo], { capture: true });
} catch {
  run("gh", ["release", "create", tag, "--repo", repo, "--title", version, "--notes", `Dailey Setup Assistant ${version}`]);
}

run("gh", [
  "release",
  "upload",
  tag,
  artifacts.dmg,
  artifacts.dmgBlockmap,
  artifacts.zip,
  artifacts.zipBlockmap,
  artifacts.latest,
  "--repo",
  repo,
  "--clobber"
]);

console.log(`Published ${repo} ${tag}`);
