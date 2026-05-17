# DamaIQ

DamaIQ — это веб-платформа для игры в русские шашки с AI-разбором партии.

Идея простая: сыграть партию, посмотреть, где были сильные и слабые ходы, и понять, как играть лучше. В отличие от обычной онлайн-доски, DamaIQ делает акцент не только на самой игре, но и на обучении: здесь есть правила русских шашек, игра против ИИ, история ходов и coach mode с разбором через Claude.

## Почему DamaIQ?

Многие онлайн-версии шашек либо слишком простые, либо используют правила, которые не совпадают с привычными русскими шашками. Для игроков из Казахстана и постсоветского региона это важно: дамки должны ходить на дальнюю дистанцию, обычные шашки должны бить назад, а взятия должны быть обязательными.

DamaIQ делает знакомую игру более современной, удобной и полезной для развития стратегического мышления.

## Возможности

- Полноценная игра в русские шашки на доске 8x8
- 32 игровые тёмные клетки
- Обязательные взятия
- Цепочки взятий
- Дамки, которые ходят и бьют на дальнюю дистанцию
- Обычные шашки могут бить назад
- Превращение в дамку во время цепочки взятий
- История ходов в нотации вроде `c3-d4` и `e5:g7`
- Режим игрок против игрока
- Режим игрок против ИИ
- Три уровня сложности ИИ:
  - лёгкий: случайные легальные ходы
  - средний: выбирает взятия и длинные цепочки
  - сложный: minimax с alpha-beta pruning
- AI-разбор партии через Claude
- Локализация на русском и казахском языках
- Светлая и тёмная темы
- Городской рейтинг игроков Казахстана (по городам)
- История партий и статистика игрока

## Leaderboard

Leaderboard currently uses `localStorage` per device when Supabase is not configured. Supabase migration enables shared global rankings across devices.

DamaIQ uses Supabase for anonymous authentication, persistent game history, and real-time city leaderboard. No registration required — players choose a nickname and city before their first game.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL from `supabase/schema.sql` in the SQL editor.
3. Enable anonymous sign-ins in Authentication → Providers.
4. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

If Supabase is unavailable or keys are missing, the app falls back to `localStorage` silently (warnings only in the browser console).

## AI Coach

После партии игрок может запросить разбор через AI Coach.

Coach анализирует историю ходов и даёт короткий фидбек:

- ключевые моменты партии;
- сильные ходы;
- упущенные возможности;
- рискованные решения;
- практические советы для следующей игры.

Разбор выполняется на серверной стороне через Claude API, поэтому API-ключ не попадает во frontend.

## Технологии

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Anthropic Claude API
- Supabase (anonymous auth, profiles, game history, realtime leaderboard)
- canvas-confetti
- Node test runner

## Игровая логика

Логика русских шашек отделена от интерфейса и реализована на TypeScript.

UI не решает самостоятельно, какие ходы разрешены. Вместо этого интерфейс обращается к движку, получает список легальных ходов и применяет выбранный ход через отдельный слой игровой логики.

Основной файл движка:

```txt
lib/russianDraughtsEngine.ts
```

## Credits

Логика генерации ходов для русских шашек была разработана с опорой на open-source проект `damka` Антона Медведева:

- https://github.com/antonmedv/damka

Оригинальный проект написан на Go и реализует правила русских шашек, AI с minimax и alpha-beta pruning, а также логику доски и фигур. В DamaIQ эта логика была адаптирована и переписана на TypeScript под архитектуру Next.js-приложения.

DamaIQ не является официальным форком и не связан с оригинальным проектом.
