// Выкладывает статическое демо в ветку gh-pages (GitHub Pages → Deploy from a branch).
// Запуск: npm run deploy:pages
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, encoding: "utf8" }).trim();

const remote = sh("git remote get-url origin");
const [, owner, repo] = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/) ?? [];
if (!repo) throw new Error(`Не похоже на GitHub: ${remote}`);

execSync("node scripts/build-pages.mjs", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PAGES_BASE_PATH: `/${repo}`, NEXT_PUBLIC_REPO_URL: `https://github.com/${owner}/${repo}` },
});

const out = path.join(root, "out");
writeFileSync(path.join(out, ".nojekyll"), ""); // иначе GitHub Pages спрячет папку _next
sh("git init -q -b gh-pages", out);
sh("git add -A", out);
sh(`git -c user.name="${sh("git config user.name")}" -c user.email="${sh("git config user.email")}" commit -q -m "Демо ${sh("git rev-parse --short HEAD")}"`, out);
sh(`git push -f -q ${remote} gh-pages`, out);
console.log(`\nВыложено: https://${owner}.github.io/${repo}/`);
