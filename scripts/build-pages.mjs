// Статическое демо для GitHub Pages: сервера там нет, поэтому собираем отдельную копию,
// где вместо app/ (Livedune, API-роуты) стоит demo-app/ — отчёт считается в браузере.
// Запуск: npm run build:pages → готовый сайт в out/
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tmp = path.join(mkdtempSync(path.join(tmpdir(), "dashcraft-pages-")), "site");
const skip = new Set(["node_modules", ".next", ".git", "out", "app", "demo-app", ".cache"]);

cpSync(root, tmp, { recursive: true, filter: (src) => !skip.has(path.relative(root, src).split(path.sep)[0]) });
cpSync(path.join(root, "demo-app"), path.join(tmp, "app"), { recursive: true });
cpSync(path.join(root, "app", "globals.css"), path.join(tmp, "app", "globals.css"));
symlinkSync(path.join(root, "node_modules"), path.join(tmp, "node_modules"), "dir");

execSync("npx next build", { cwd: tmp, stdio: "inherit", env: { ...process.env, PAGES: "1" } });

rmSync(path.join(root, "out"), { recursive: true, force: true });
cpSync(path.join(tmp, "out"), path.join(root, "out"), { recursive: true });
rmSync(path.dirname(tmp), { recursive: true, force: true });
if (existsSync(path.join(root, "out", "index.html"))) console.log("\nГотово: out/");
