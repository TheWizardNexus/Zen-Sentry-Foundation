import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const pages = ["index.html", "mission.html", "veterans.html", "research.html", "trust.html", "contact.html", "404.html"];
const required = [
  ...pages,
  "README.md",
  "styles.css",
  "app.js",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  ".github/workflows/pages.yml",
  "assets/zen-sentry-logo.jpg",
  "assets/zen-sentry-foundation-readme-header.png",
  "assets/zen-sentry-foundation-readme-header.webp",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function localTarget(reference) {
  const clean = reference.split("#")[0].split("?")[0];
  if (!clean) return null;
  const projectRoot = "/Zen-Sentry-Foundation/";
  if (clean.startsWith(projectRoot)) return join(root, clean.slice(projectRoot.length) || "index.html");
  if (clean === "/") return join(root, "index.html");
  return resolve(root, clean);
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if ([".git", ".codex", "tmp"].includes(entry)) return [];
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("the complete static site contract exists", () => {
  for (const path of required) assert.ok(existsSync(join(root, path)), "missing " + path);
});

for (const page of pages) {
  test(page + " has one accessible, shareable page shell", () => {
    const html = read(page);
    assert.match(html, /<html lang="en">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, page + " must have exactly one h1");
    assert.match(html, /class="skip-link"/);
    assert.match(html, /aria-label="Primary navigation"/);
    assert.match(html, /aria-controls="primary-navigation"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /name="description"/);
    assert.match(html, /data-page="/);
    assert.match(html, /Veterans Crisis Line/);
    assert.match(html, /Dial 988 then Press 1/);
    assert.match(html, /text 838255/i);
    assert.doesNotMatch(html, /mailto:/i);

    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (/^(https?:|#|tel:|mailto:)/i.test(href)) continue;
      const target = localTarget(href);
      assert.ok(target && existsSync(target), page + " links to missing local target " + href);
    }

    for (const match of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)) {
      const markup = match[0];
      const source = match[1];
      if (!/^https?:/i.test(source)) {
        const target = localTarget(source);
        assert.ok(target && existsSync(target), page + " references missing image " + source);
      }
      assert.match(markup, /\bwidth="/, page + " image must declare width");
      assert.match(markup, /\bheight="/, page + " image must declare height");
    }
  });
}

test("every page connects back to TWiN and preserves public brand capitalization", () => {
  for (const page of pages) {
    const html = read(page);
    const visibleText = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
    assert.match(html, /href="https:\/\/thewizardnexus\.github\.io\/TheWizardNexus\.com\/"[^>]*>Visit TWiN ↗<\/a>/);
    assert.doesNotMatch(visibleText, /\bveteran\b/, page + " contains a lowercase public use of Veteran");
    assert.doesNotMatch(visibleText, /\bTWIN\b|The Wizard Nexus/, page + " does not use the TWiN public brand styling");
    assert.doesNotMatch(html, /signal-dot[^>]*><\/span>0[1-5]\s*\/\//, page + " retains a decorative page number");
  }

  assert.match(read("contact.html"), /href="https:\/\/thewizardnexus\.github\.io\/TheWizardNexus\.com\/contact\.html"/);
  assert.match(read("styles.css"), /#primary-navigation \.nav-twin \{[^}]*text-transform:\s*none;/s);
});

test("visible typography keeps an explicit 14 pixel minimum", () => {
  const declarations = [...read("styles.css").matchAll(/(?:font-size:\s*|font:\s*(?:(?:normal|italic)\s+)?\d+\s+)(\d*\.?\d+)(rem|px)/g)];
  const undersized = declarations
    .map((match) => ({ declaration: match[0], pixels: Number(match[1]) * (match[2] === "rem" ? 16 : 1) }))
    .filter(({ pixels }) => pixels < 14);

  assert.deepEqual(undersized, []);
});

test("public claims retain the verified maturity and legal boundaries", () => {
  const publicText = [...pages.map(read), read("README.md")].join("\n");
  assert.doesNotMatch(publicText, /\$25,000|75 veterans|program completed|funds received/i);
  assert.match(publicText, /veteran-owned and operated Texas nonprofit organization/i);
  assert.match(publicText, /tax-exempt under section 501\(c\)\(3\)/i);
  assert.match(publicText, /\$6,000(?:\s|\*)+CenterPoint Energy Foundation/i);
  assert.match(publicText, /selected (?:for|Zen Sentry for)/i);
  assert.match(publicText, /human scoring (remains|is) (the )?next/i);
  assert.doesNotMatch(publicText, /tax-deductible|deductibility/i);
});

test("the custom 404 resolves assets and navigation from the project root", () => {
  assert.match(read("404.html"), /<base href="\/Zen-Sentry-Foundation\/">/);
});

test("the repository header and deployment workflow match the house pattern", () => {
  const readme = read("README.md");
  const workflow = read(".github/workflows/pages.yml");
  assert.match(readme, /assets\/zen-sentry-foundation-readme-header\.webp/);
  assert.match(readme, /thewizardnexus\.github\.io\/Zen-Sentry-Foundation/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /actions\/deploy-pages@/);
});

test("the site stays dependency-free and TypeScript-free", () => {
  assert.ok(!existsSync(join(root, "package.json")), "package.json is not needed for this static site");
  const typedFiles = walk(root).filter((path) => /\.(ts|tsx)$/i.test(path));
  assert.deepEqual(typedFiles, []);
});
