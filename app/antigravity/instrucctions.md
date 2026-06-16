# Best Practices for Developing with Next.js 14, Tailwind CSS, shadcn/ui, Supabase & Recharts

---

## 1️⃣ Next.js 14

### 1.1 App Router & Server‑Components
- Use the **App Router** (`app/` directory) as the default. It embraces **React Server Components** (RSC) which keep heavy data‑fetching and business logic on the server, reducing bundle size.
- Prefer `fetch` inside **server components**; avoid client‑side data fetching unless UI interaction requires it.
- Guard **dynamic routes** with `export const dynamic = 'force-dynamic'` only when needed; otherwise keep them static for ISR.

### 1.2 Incremental Static Regeneration (ISR)
- For pages that rarely change (e.g., marketing pages, public dashboards), enable ISR with `revalidate` to serve cached HTML while periodically refreshing.
- Combine ISR with **edge‑runtime** (`export const runtime = 'edge'`) for ultra‑fast response times.

### 1.3 Middleware & Edge Functions
- Use **middleware** for auth checks, locale redirects, or A/B testing. Keep it lightweight – only inspect cookies/headers, never perform DB queries.
- Deploy heavy logic to **Edge Functions** (Supabase Edge Functions can be invoked from middleware).

### 1.4 Type‑Safety & ESLint
- Enable **strict TypeScript** mode (`strict: true`).
- Use the official `next` ESLint config and enforce `react-hooks/exhaustive-deps`, `no-console`, and `no-var` rules.

### 1.5 Security
- **Content‑Security‑Policy** via `next.config.js` → `headers` to restrict script sources.
- **X‑Frame‑Options**, **X‑Content‑Type‑Options**, **Referrer‑Policy** headers.
- Set `trustedTypes` and enable **Subresource Integrity** for external scripts.
- Enable **Rate‑Limiting** on API routes using `@upstash/ratelimit` or similar.
- Sanitize all user‑generated HTML with a library like `dompurify` before rendering.

---

## 2️⃣ Tailwind CSS

### 2.1 Configuration
- Use **JIT mode** (default in v3+) for on‑the‑fly class generation.
- Enable `content` paths covering `app/**/*.{js,ts,jsx,tsx}` and any component library (`components/**/*`).
- Define a **design system** in `theme.extend` – colors, spacing, border‑radius – to keep a consistent premium look.

### 2.2 Dark Mode & Theming
- Prefer the `class` strategy (`darkMode: 'class'`) and toggle via a top‑level context.
- Create a `theme` CSS variable map (e.g., `--color-primary`) to allow runtime theme switching without rebuilds.

### 2.3 Accessibility
- Leverage Tailwind’s `focus-visible` utilities.
- Use `sr-only` for hidden labels and ensure sufficient color contrast (`color` utilities + `@tailwindcss/forms`).

### 2.4 Security
- Purge unused classes rigorously – Tailwind already removes dead CSS, reducing attack surface.
- Avoid arbitrary values (`[value]`) from user input.

---

## 3️⃣ shadcn/ui (Radix‑based component library)

### 3.1 Composition
- Wrap shadcn components with **Headless UI** patterns: keep state in React context (e.g., `DrawerProvider`).
- Export typed wrappers (`<Button>` → `<Button variant="primary"/>`) to enforce design tokens.

### 3.2 Accessibility & ARIA
- shadcn already follows Radix accessibility guidelines – **never** override built‑in ARIA attributes unless you fully understand the impact.

### 3.3 Security
- Do not pass raw HTML to components; always sanitize.
- When using `Dialog` or `Popover`, ensure **focus trap** works to prevent clickjacking.

---

## 4️⃣ Supabase

### 4.1 Auth & Row‑Level Security (RLS)
- Enable **RLS** on every table. Write policies that reference `auth.uid()`.
- Use **Supabase Auth** with `email‑password` + **OAuth** (Google, Apple). Store tokens securely – never expose `service_role` key to the client.

### 4.2 Database Design Patterns
- **Soft delete** (`deleted_at` timestamp) instead of hard delete for auditability.
- Store **JSONB** for flexible UI config (e.g., chart settings) – validated with Postgres constraints.
- Use **Supabase Functions** for server‑side business logic (e.g., payment verification) and call them from the client via the generated SDK.

### 4.3 Realtime & Edge Functions
- Subscribe to only needed tables/columns to reduce bandwidth.
- Rate‑limit realtime listeners; debounce UI updates.

### 4.4 Security Best Practices
- Rotate **anon/public** keys periodically; treat them like API keys.
- Enforce **CORS** settings to whitelist only your domains.
- Use **HTTPS** everywhere – Supabase enforces it, but ensure the Next.js app redirects HTTP → HTTPS.
- Log suspicious auth attempts using `functions` and monitor via Supabase **Advisors**.

---

## 5️⃣ Recharts (React charting library)

### 5.1 Data Handling
- Validate incoming data shapes before feeding to charts – defensive programming prevents crashes.
- Memoize large data sets with `React.useMemo` to avoid re‑rendering.

### 5.2 Performance
- Use `ResponsiveContainer` to let charts adapt to layout changes without causing layout thrashing.
- Limit point count for time‑series charts; down‑sample on the server (Supabase) before sending.

### 5.3 Security & UX
- Never render raw user text as a label; sanitize or whitelist.
- Provide **fallback UI** when data fails to load (e.g., skeleton loaders).

---

## 6️⃣ Cross‑Stack Design Patterns

### 6.1 Feature‑First Folder Structure
```
src/
├─ app/            # Next.js App Router pages (RSC & CSR)
├─ components/     # Re‑usable UI (shadcn + Tailwind)
├─ lib/            # Supabase client, helpers, types
├─ hooks/          # Custom React hooks (useAuth, useRealtime)
├─ services/       # API wrappers, edge‑function callers
└─ utils/          # Misc utilities (formatters, validators)
```

### 6.2 Separation of Concerns
- **Server‑only code** (queries, secret keys) lives in `app/api/` or `lib/server/`.
- **Client‑only UI** stays in `components/`.
- Keep **business logic** in `services/` – this makes it testable and reusable across server and client.

### 6.3 State Management
- Prefer **React Query** (or TanStack Query) for data fetching from Supabase. It handles caching, stale‑time, and retries.
- Use **Zod** schemas for request/response validation; combine with **React Hook Form** for form handling.

### 6.4 Testing & CI
- Unit‑test utility functions with **Jest**.
- Component tests with **React Testing Library** + **Playwright** for end‑to‑end.
- Run **Supabase migration checks** in CI (`supabase db push --preview`).
- Add a security lint step (`npm audit`, `npm run lint:security`).

---

## 7️⃣ Security Checklist (Quick Reference)
| Area | Checklist |
|------|-----------|
| **Auth** | RLS on every table, never expose `service_role`, rotate anon keys |
| **Headers** | CSP, X‑Frame‑Options, Referrer‑Policy, Strict‑Transport‑Security |
| **Input Validation** | Zod schema on client & server, sanitize HTML, limit file sizes |
| **Rate Limiting** | Edge Functions or middleware rate‑limit auth routes |
| **Secrets** | Store in Vercel/Env vars, never commit `.env` |
| **Dependencies** | `npm audit --production`, enable `dependabot` PRs |
| **Logging** | Supabase Advisors, server‑side error tracking (Sentry, Logflare) |

---

## 8️⃣ References & Further Reading
- **Next.js 14 Docs** – especially *App Router* and *Middleware* sections.
- **Tailwind CSS Security** – [Tailwind docs on JIT & CSP](https://tailwindcss.com/docs/content-configuration).
- **Shadcn/ui** – official README for composition guidelines.
- **Supabase RLS** – <https://supabase.com/docs/guides/auth/row-level-security>.
- **Recharts Performance** – <https://recharts.org/en-US/FAQ#performance>.

---

*This markdown file is intended as a living reference. Update it as new versions or best‑practice guidelines are released.*
