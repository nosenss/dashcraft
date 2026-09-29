// Какие аккаунты подключены в Livedune: npm run accounts
// Печатает проект, номер, тип и название — ключ не выводится.
const T = process.env.LIVEDUNE_TOKEN;
if (!T) {
  console.error("Нет LIVEDUNE_TOKEN в .env.local");
  process.exit(1);
}
const rows = [];
let after;
for (let page = 0; page < 30; page++) {
  const u = new URL("/accounts", "https://api.livedune.com");
  u.searchParams.set("access_token", T);
  if (after) u.searchParams.set("after", after);
  const r = await fetch(u);
  if (!r.ok) {
    console.error(`Livedune ответил ${r.status}`);
    process.exit(1);
  }
  const b = await r.json();
  const batch = b.response ?? [];
  rows.push(...batch);
  if (batch.length < 100 || !b.after || b.after === after) break;
  after = b.after;
}
const byProject = new Map();
for (const a of rows) {
  const key = a.project || "без проекта";
  byProject.set(key, [...(byProject.get(key) ?? []), a]);
}
for (const [project, list] of byProject) {
  console.log(`\n${project}`);
  for (const a of list) console.log(`  ${String(a.id).padEnd(10)} ${a.type.padEnd(16)} ${a.name}`);
}
console.log(`\nВсего аккаунтов: ${rows.length}`);
