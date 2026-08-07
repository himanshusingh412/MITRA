# UI Guidelines

**Phase 3 deliverable** · MITRA design system

---

## 1. Who this is designed for

The design constraints come from the users, not from taste:

- A 58-year-old widow in rural Bihar with class-5 education, on a ₹6,000 phone, in bright sunlight.
- A CSC operator working at speed, keyboard-first, 40 citizens a day.
- A district officer reviewing a queue on a desktop.

Every decision below traces to one of these. Where "modern" and "usable by Rukmini" conflict, Rukmini wins.

## 2. Colour

### Brand palette

The MITRA identity uses an indigo→green gradient — indigo for institutional trust, green for progress and eligibility.

| Token | Hex | Use |
|---|---|---|
| `brand-500` | `#4F46E5` | Primary actions, active nav, focus rings |
| `brand-600` | `#4338CA` | Hover on primary |
| `brand-50` | `#EEF2FF` | Active nav background, soft panels |
| Gradient | `brand-500 → emerald-400` | Logo, voice assistant CTA |

### Status colours

Status is the most important information in the product, so it never relies on colour alone.

| State | Colour | Icon | Words |
|---|---|---|---|
| Eligible | emerald | `CheckCircle2` | "You may be eligible" |
| Verify | amber | `AlertCircle` | "Likely eligible — verify" |
| Not eligible | slate | `MinusCircle` | "Not eligible right now" |
| Blocker | rose | `OctagonAlert` | "Will likely cause rejection" |

**Rule: colour + icon + text, always.** A colour-blind citizen and a citizen in direct sunlight must both be able to read the verdict.

### Surfaces

Light theme uses a near-white canvas (`#F7F9FE`) with white cards — high contrast for outdoor readability. Dark theme uses `#0B101C` canvas with `#131A2B` cards. Both are verified at WCAG AA on every text pairing.

## 3. Typography

System font stack with explicit Noto fallbacks for Devanagari, Tamil and Bengali, so Indian scripts render correctly without shipping a webfont — a webfont is a cost the target user pays for on every load.

| Role | Size | Weight |
|---|---|---|
| Page title | 28px / 22px mobile | 700 |
| Section heading | 18–20px | 700 |
| Card title | 15px | 700 |
| Body | 14px | 400 |
| Supporting | 13px | 400 |
| Meta | 11–12px | 500 |

Body text never goes below 13px. Layout must survive 200% zoom without breaking — asserted manually on every screen.

## 4. Spacing, radius, elevation

4px base scale. Cards use `rounded-2xl` (18px); pills and inputs `rounded-xl` (14px); the hero `rounded-3xl` (24px).

Three elevation levels only:
- `shadow-card` — resting cards
- `shadow-lift` — hover and raised surfaces
- `shadow-glass` — frosted panels

### Glassmorphism, used sparingly

Frosted surfaces appear on the hero and overlays only. The blur is kept mild and the background gradient light, because text contrast on a frosted surface degrades quickly and this product cannot trade legibility for style.

## 5. Motion

Framer Motion is available; the defaults are conservative.

| Interaction | Duration |
|---|---|
| Hover | 150ms |
| Card entry | 350ms, `fade-up` |
| Panel expand | 350ms |
| Skeleton shimmer | 1.6s loop |

**All animation is decorative and all of it is disabled under `prefers-reduced-motion`** — implemented globally in `globals.css`, not per-component, so it cannot be forgotten.

## 6. Components

Primitives live in `components/ui.tsx`: `Card`, `Button`, `Badge`, `EligibilityBadge`, `StatusPill`, `Skeleton`, `EmptyState`, `ProgressBar`, `Tabs`, `Stat`, `PageHeader`, `SectionHeader`, `Icon`.

Domain components: `SchemeCard`, `SchemeRow` (`components/SchemeCard.tsx`), `AppShell` (`components/shell.tsx`), `AdminShell` (`components/adminShell.tsx`).

### Button sizing

| Size | Height | Use |
|---|---|---|
| `sm` | 36px | Dense tables, admin rows |
| `md` | 44px | Default |
| `lg` | 48px | Primary CTAs |

44px is the minimum for anything a citizen taps. `sm` exists only for administrative surfaces used on desktop with a mouse.

### Icons as data

`<Icon name="Sprout" />` resolves a Lucide icon by name, so the scheme catalogue can specify its own icon as a string. Adding a scheme needs no component change.

## 7. Layout

- Desktop: 240px fixed sidebar, fluid content, max content width 1180px.
- Mobile: sidebar becomes a drawer; admin gets a bottom tab bar.
- Breakpoints: `sm` 640, `lg` 1024.
- Mobile-first: every screen is designed at 360px before it is designed at 1440px.

## 8. Accessibility — non-negotiable

These are enforced, not aspirational:

- WCAG 2.1 AA contrast, both themes.
- Visible focus ring on every interactive element (2px `brand-500`, 2px offset), never removed.
- Skip-to-content link as the first focusable element.
- Semantic landmarks: `header`, `nav`, `main`, `footer`, with `aria-label` where repeated.
- `aria-current="page"` on active navigation.
- Live regions: `role="log"` on the conversation, `role="alert"` on errors, `role="status"` on the offline banner.
- Every icon either has an accessible label or is `aria-hidden` alongside visible text.
- All interactive elements keyboard reachable; dropdowns close on Escape and outside click.
- Zoom to 200% without layout break; `maximum-scale` is never set below 5.
- Form inputs always have an associated `<label>`, visually hidden where the design has no room.

## 9. Content voice

Plain language, at roughly a class-8 reading level. Bureaucratic terms are replaced or explained.

| Instead of | Write |
|---|---|
| "Beneficiary is entitled to disbursement" | "You get ₹6,000 a year, paid into your bank account" |
| "Submit requisite documentation" | "Here is what you need to bring" |
| "Application rejected" | "This did not go through, and here is why" |
| "Ineligible" | "Not eligible right now" — *right now* matters; circumstances change |

Scheme summaries are written as if explaining to a neighbour. Every scheme's `summary` field is checked for this.

## 10. Loading, empty and error states

Every async surface implements all three. This is a hard rule in `CODING_RULES.md`, not a preference:

- **Loading** — skeletons matching final layout, never a spinner on a blank page.
- **Empty** — `EmptyState` with an explanation and a next action, never a blank area.
- **Error** — what happened, in plain language, and what to do about it.

## 11. Honest caveats

The design system was built and verified by hand against these rules; there is no automated accessibility test in CI yet (see `TESTING.md` §2). Contrast pairings were checked during development but not machine-audited across every state combination. Both are the first items in the Phase 10 automation backlog.
