# Дашкрафт

![Дашкрафт: сводка по всем соцсетям на демо-данных](docs/screenshot-overview.png)

[![Лицензия MIT](https://img.shields.io/badge/license-MIT-2a78d6)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-16151a?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

SMM-дашборд по данным Livedune: воронка, динамика и посты по шести соцсетям

Дашкрафт собирает Instagram, Telegram, ВКонтакте, YouTube, TikTok и Дзен в один отчёт. Для каждой сети строится воронка от подписчиков до вовлечения, показывается динамика по дням, неделям и месяцам и видно, какие посты сработали лучше или хуже обычного. Каждое число сравнивается с прошлым периодом такой же длины.

**[Открыть демо →](https://nosenss.github.io/dashcraft/)** Там вымышленная сеть кофеен «Зерно», все цифры сгенерированы.

## Возможности

- **Воронка по каждой сети**: подписчики → просмотры → охват → реакции → ER, между шагами View Rate, ERV и ERR.
- **Сводка «Все сети»**: сети рядом, общий итог и лучшие посты по всем сетям относительно медианы каждой сети.
- **Динамика**: графики по дням, неделям и месяцам поверх прошлого периода. Вирусные всплески не ломают шкалу.
- **Разбор постов**: топ по выбранной метрике, типичный пост по типу контента и дню недели, таблица с подсветкой относительно медианы.
- **Любой период**: «7 / 30 / 90 дней», «этот / прошлый месяц» или свои даты.
- **Бережно к квоте Livedune**: дисковый кэш и повторы при 429/5xx. Если API упал, показываются последние данные с пометкой.

| Воронка Instagram | Разбор постов |
|---|---|
| ![Воронка Instagram](docs/screenshot-network.png) | ![Разбор постов](docs/screenshot-posts.png) |

## Быстрый старт

Нужен Node.js 20 или новее.

```bash
git clone https://github.com/nosenss/dashcraft.git
cd dashcraft
npm install
npm run dev
```

Откройте http://localhost:3000. Без API-ключа Дашкрафт запускается в демо-режиме. Демо-данные детерминированы: один и тот же период всегда показывает одни и те же цифры.

## Подключение своих данных

1. Возьмите API-ключ в Livedune: [pro.livedune.com/settings/api](https://pro.livedune.com/settings/api).
2. Скопируйте пример настроек и впишите ключ:

   ```bash
   cp .env.example .env.local
   ```

3. Перезапустите `npm run dev`.

| Переменная | Что делает |
|---|---|
| `LIVEDUNE_TOKEN` | API-ключ Livedune. Без него работает демо |
| `LIVEDUNE_PROJECT` | Проект в дашборде Livedune. Пусто — берутся все аккаунты, по одному на сеть |
| `DASHBOARD_TITLE` | Название в шапке |
| `DEMO_MODE` | `1` — показывать демо-данные, даже если ключ задан |
| `NEXT_PUBLIC_REPO_URL` | Ссылка на репозиторий в плашке демо-режима |

## Деплой

### Демо на GitHub Pages

Статическая версия на демо-данных собирается командой `npm run build:pages` в папку `out/`. Сервер ей не нужен: отчёт считается прямо в браузере тем же кодом.

`npm run deploy:pages` собирает демо и выкладывает его в ветку `gh-pages`. В форке включите Settings → Pages → Deploy from a branch → `gh-pages`.

### Со своими данными

Ключ Livedune нельзя держать в браузере, поэтому для своих данных нужен сервер Next.js: Vercel или свой сервер с `npm run build && npm start`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnosenss%2Fdashcraft&project-name=dashcraft&repository-name=dashcraft&env=LIVEDUNE_TOKEN)

> [!WARNING]
> Закройте такой дашборд паролем (Vercel Password Protection, basic auth на прокси и т. п.). Иначе вашу статистику увидит любой, у кого есть ссылка.

На хостингах с диском только для чтения кэш не пишется, и каждый запрос уходит в Livedune.

## Как считаются метрики

- Итоги за период считаются по постам, опубликованным в этом периоде. Формулы как в Livedune:
  - **ER** = (вовлечение ÷ постов) ÷ подписчики;
  - **ERV** = вовлечение ÷ просмотры;
  - **ERR** = вовлечение ÷ охват.
- **Вовлечение** = лайки или реакции + комментарии + репосты, пересылки и «поделились» + сохранения.
- Графики «по дням» считают по дате публикации поста. Подписчики, а у Instagram ещё охват и показы аккаунта, берутся из дневной истории Livedune.
- Сравнение идёт с предыдущим периодом такой же длины.
- Ответы Livedune кэшируются в `.cache/`: текущий период на 30 минут, закрытый на сутки. Кнопка «Обновить» сбрасывает кэш.

## Как устроено

```
app/               страницы и API-роуты (Next.js App Router)
components/        интерфейс: шапка, воронка, графики, таблица постов
lib/source.ts      выбор источника: Livedune или демо
lib/livedune/      клиент Livedune API с повторами и дисковым кэшем
lib/demo.ts        генератор демо-данных в формате Livedune API
lib/report.ts      сборка отчёта по сети и сводки
lib/metrics.ts     формулы и агрегации, общие для сервера и браузера
demo-app/          страницы статического демо для GitHub Pages
scripts/           сборка демо, скриншоты для README (WebKit, macOS)
```

Скриншоты в `docs/` снимаются из собранного демо: `npm run build:pages`, раздать `out/` по адресу `http://localhost:3200/dashcraft/` и запустить `swift scripts/screenshots.swift`.

Стек: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Recharts.

## Участие

Баги и идеи пишите в [Issues](https://github.com/nosenss/dashcraft/issues). Перед пулреквестом проверьте, что проходит `npm run build`.

## Лицензия

[MIT](LICENSE)
