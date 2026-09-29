// Ярлык «Дашкрафт» на рабочем столе: двойной клик запускает дашборд и открывает его в браузере.
// Запуск: npm run shortcut  (или npm run shortcut -- --dir <папка>, чтобы положить ярлык в другое место)
//
// macOS — Дашкрафт.command, Windows — Дашкрафт.bat, Linux — dashcraft.sh.
// При запуске открывается окно с журналом сервера: пока дашборд нужен, окно не закрывают.
import { chmodSync, existsSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const i = process.argv.indexOf("--dir");
// В Windows рабочий стол часто лежит в OneDrive
const home = os.homedir();
const desktop = [
  ...(process.platform === "win32" ? [path.join(home, "OneDrive", "Desktop"), path.join(home, "OneDrive", "Рабочий стол")] : []),
  path.join(home, "Desktop"),
  path.join(home, "Рабочий стол"),
  home,
].find(existsSync);
const dir = i >= 0 ? path.resolve(process.argv[i + 1]) : desktop;
// Свой порт, чтобы не столкнуться с другими программами на привычном 3000
const PORT = 3737;
const URL = `http://localhost:${PORT}`;

let file;
let body;
if (process.platform === "darwin") {
  file = path.join(dir, "Дашкрафт.command");
  body = `#!/bin/zsh -l
# Дашкрафт: запускает дашборд и открывает его в браузере. Пока смотрите дашборд, не закрывайте это окно.
cd ${JSON.stringify(root)} || exit 1
# Уже запущен — просто открываем
if curl -s ${URL} | grep -q Дашкрафт; then open ${URL}; exit 0; fi
(for i in {1..90}; do sleep 1; curl -s ${URL} | grep -q Дашкрафт && open ${URL} && break; done) &
npm run dev -- -p ${PORT}
`;
} else if (process.platform === "win32") {
  file = path.join(dir, "Дашкрафт.bat");
  body = `@echo off
chcp 65001 >nul
rem Дашкрафт: запускает дашборд и открывает его в браузере. Пока смотрите дашборд, не закрывайте это окно.
cd /d "${root}"
start "" cmd /c "timeout /t 8 >nul & start ${URL}"
call npm run dev -- -p ${PORT}
`;
} else {
  file = path.join(dir, "dashcraft.sh");
  body = `#!/bin/sh
# Дашкрафт: запускает дашборд и открывает его в браузере. Пока смотрите дашборд, не закрывайте это окно.
cd ${JSON.stringify(root)} || exit 1
(sleep 8; xdg-open ${URL}) &
npm run dev -- -p ${PORT}
`;
}

writeFileSync(file, body);
if (process.platform !== "win32") chmodSync(file, 0o755);
console.log(`✓ Ярлык создан: ${file}`);
console.log(`  Двойной клик запускает Дашкрафт и открывает его в браузере: ${URL}`);
