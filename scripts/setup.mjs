// Подключение Livedune одной командой: npm run setup
//
// Человек: просто запустите — скрипт спросит ключ и какие проекты показывать.
// ИИ-агент: без вопросов, всё флагами:
//   npm run setup -- --token-stdin < файл_или_echo   ключ из stdin (не попадает в историю команд)
//   npm run setup -- --projects "Проект А, Проект Б"   какие проекты показывать ("" — все)
//   npm run setup -- --accounts "123,456"              какие аккаунты показывать ("" — все)
//   npm run setup -- --check                           только проверить ключ и показать аккаунты
//
// Ключ сохраняется в .env.local (он в .gitignore) и нигде не печатается.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env.local");
const API = "https://api.livedune.com";
const SIGNUP = "https://pro.livedune.com?from=72df001bad";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const interactive = process.stdin.isTTY && !flag("token-stdin");

// ---------- .env.local ----------

function readEnv() {
  if (!existsSync(envFile)) return new Map();
  const map = new Map();
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m) map.set(m[1], m[2].replace(/^["']|["']$/g, ""));
  }
  return map;
}

// Меняем только свои строки, остальное в файле сохраняем как есть
function writeEnv(values) {
  const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split("\n") : [];
  const left = new Map(Object.entries(values));
  const out = lines.map((line) => {
    const key = line.match(/^\s*([A-Z_]+)\s*=/)?.[1];
    if (!key || !left.has(key)) return line;
    const v = left.get(key);
    left.delete(key);
    return `${key}=${quote(v)}`;
  });
  while (out.length && !out.at(-1).trim()) out.pop();
  for (const [k, v] of left) out.push(`${k}=${quote(v)}`);
  writeFileSync(envFile, out.join("\n").replace(/\n*$/, "\n"));
}
const quote = (v) => (/[\s#"']/.test(v) ? `"${v.replace(/"/g, '\\"')}"` : v);

// ---------- ввод ----------

// readline создаём только для обычных вопросов: пока он есть, он сам печатает всё, что вводится
let rl = null;
const ask = (q) => {
  rl ??= readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
};

// Ключ вводится без эха — чтобы он не остался на экране
function askSecret(q) {
  return new Promise((resolve) => {
    process.stdout.write(q);
    const onData = (buf) => {
      const s = buf.toString();
      if (s === "\u0003") process.exit(1);
      if (s.includes("\r") || s.includes("\n")) {
        secret += s.split(/[\r\n]/)[0];
        process.stdin.setRawMode(false);
        process.stdin.off("data", onData);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(secret.trim());
        return;
      }
      if (s === "\u007f") secret = secret.slice(0, -1); // Backspace
      else secret += s;
    };
    let secret = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

// ---------- Livedune ----------

async function get(pathname, token, params = {}) {
  const u = new URL(pathname, API);
  u.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  const r = await fetch(u);
  if (r.status === 401 || r.status === 403) throw new Error("Livedune не принял ключ. Проверьте, что скопировали его целиком: pro.livedune.com/settings/api");
  if (r.status === 402) throw new Error("В Livedune закончились запросы к API на этот месяц. Докупите запросы или перейдите на тариф с большим лимитом");
  if (!r.ok) throw new Error(`Livedune ответил ${r.status}. Попробуйте ещё раз через минуту`);
  return r.json();
}

async function accounts(token) {
  const rows = [];
  let after;
  for (let page = 0; page < 30; page++) {
    const b = await get("/accounts", token, { after });
    const batch = b.response ?? [];
    rows.push(...batch);
    if (batch.length < 100 || !b.after || b.after === after) break;
    after = b.after;
  }
  return rows;
}

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const fmt = (n) => n.toLocaleString("ru-RU");

// ---------- сценарий ----------

async function main() {
  console.log("\nДашкрафт: подключение Livedune\n");
  const env = readEnv();

  // 1. Ключ
  let token = flag("token-stdin") ? await readStdin() : env.get("LIVEDUNE_TOKEN") || "";
  if (!token && interactive) {
    console.log("Нужен API-ключ Livedune: pro.livedune.com/settings/api");
    console.log(`Ещё нет Livedune — регистрация: ${SIGNUP}\n`);
    token = await askSecret("Вставьте ключ и нажмите Enter (символы не отображаются): ");
  }
  if (!token) {
    console.error("Нет ключа. Впишите LIVEDUNE_TOKEN в .env.local или передайте его: npm run setup -- --token-stdin");
    process.exit(1);
  }

  // 2. Проверка ключа и лимита
  const info = await get("/info", token);
  const t = info.total ?? info.tariff ?? {};
  console.log("✓ Ключ работает");
  if (t.requests != null) {
    console.log(`  Запросы к API: осталось ${fmt(t.left)} из ${fmt(t.requests)} в этом месяце${info.tariff?.end_date ? `, тариф до ${info.tariff.end_date}` : ""}`);
    if (t.requests <= 100) console.log("  ! 100 запросов хватит на несколько просмотров. Для постоянной работы нужен тариф от «Блогера»");
    else if (t.left < 100) console.log("  ! Запросы почти закончились. Докупите их в Livedune или дождитесь нового месяца");
  }

  // 3. Аккаунты по проектам
  const list = await accounts(token);
  const projects = [];
  for (const a of list) {
    const p = a.project || "без проекта";
    if (!projects.some((x) => same(x, p))) projects.push(p);
  }
  console.log(`\n✓ Аккаунтов в Livedune: ${list.length}`);
  projects.forEach((p, i) => {
    console.log(`\n  ${i + 1}. ${p}`);
    for (const a of list.filter((a) => same(a.project || "без проекта", p))) console.log(`     ${String(a.id).padEnd(10)} ${a.type.padEnd(16)} ${a.name}`);
  });
  if (!list.length) console.log("  Подключите соцсети в Livedune, иначе дашборду нечего показать");

  if (flag("check")) {
    rl?.close();
    return;
  }

  // 4. Что показывать
  let chosen = option("projects");
  const ids = option("accounts");
  if (chosen == null && interactive && projects.length > 1) {
    const answer = await ask("\nКакие проекты показывать? Номера через запятую, Enter — все: ");
    chosen = answer
      .split(",")
      .map((s) => projects[Number(s.trim()) - 1])
      .filter(Boolean)
      .join(", ");
  }

  // Проект, которого нет в Livedune, — скорее всего опечатка: дашборд покажет пустоту
  const unknown = (chosen ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((p) => p && !projects.some((x) => same(x, p)));
  if (unknown.length) console.log(`\n! Таких проектов нет в Livedune: ${unknown.join(", ")}. Проверьте названия в списке выше`);

  const values = { LIVEDUNE_TOKEN: token };
  if (chosen != null) values.LIVEDUNE_PROJECT = chosen;
  if (ids != null) values.LIVEDUNE_ACCOUNTS = ids;
  if (env.get("DEMO_MODE") === "1") values.DEMO_MODE = "";
  writeEnv(values);
  rl?.close();

  const shown = values.LIVEDUNE_PROJECT ?? env.get("LIVEDUNE_PROJECT") ?? "";
  console.log(`\n✓ Настройки сохранены в .env.local${shown ? ` (проекты: ${shown})` : " (все проекты, в шапке будет переключатель)"}`);
  console.log("\nЗапустите дашборд:  npm run dev  →  http://localhost:3000\n");
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
