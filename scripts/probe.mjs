// Проверка форм ответов Livedune: node --env-file=.env.local scripts/probe.mjs
const T = process.env.LIVEDUNE_TOKEN;
const get = async (p, q = {}) => {
  const u = new URL(p, "https://api.livedune.com");
  u.searchParams.set("access_token", T);
  for (const [k, v] of Object.entries(q)) if (v != null) u.searchParams.set(k, v);
  const r = await fetch(u);
  return { status: r.status, body: await r.json().catch(() => null) };
};
const [, , cmd, ...args] = process.argv;
if (cmd === "info") console.log(JSON.stringify((await get("/info")).body));
else if (cmd === "post") {
  const r = await get(`/accounts/${args[0]}/posts/${args[1]}`);
  console.log(r.status, JSON.stringify(r.body).slice(0, 3000));
} else if (cmd === "page") {
  const r = await get(`/accounts/${args[0]}/${args[1]}`, { date_from: args[2], date_to: args[3], after: args[4] });
  const b = r.body;
  console.log(r.status, "count", b?.count, "after", b?.after, "n", b?.response?.length, "first", b?.response?.[0]?.created, "last", b?.response?.at(-1)?.created);
  // Пример строки целиком — чтобы увидеть, как сеть называет поля реакций
  console.log(JSON.stringify(b?.response?.[0] ?? null, null, 2)?.slice(0, 3000));
}
