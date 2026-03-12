---
prd: true
id: PRD-20260309-perceptum-website-rebuild
status: PLANNED
mode: interactive
effort_level: Extended
created: 2026-03-09
updated: 2026-03-09
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: PLAN
failing_criteria: []
verification_summary: "0/24"
parent: null
children: []
---

# Perceptum.nl — Professional Website Rebuild

> Transform Perceptum.nl from a basic Hugo site into a state-of-the-art, sophisticated Astro-powered website that positions Wijnand Baretta as a senior digital technology leader with 20+ years of Dutch digital innovation heritage.

## STATUS

| What | State |
|------|-------|
| Progress | 0/24 criteria passing |
| Phase | PLAN — PRD awaiting approval |
| Next action | Review PRD, approve, then BUILD |
| Blocked by | User approval of this PRD |

## CONTEXT

### Problem Space

The current Perceptum.nl site is a minimal Hugo build with basic styling, no images, limited content, and a generic feel. It doesn't reflect Wijnand's impressive 20+ year track record in Dutch digital innovation (sports tech, telecom, healthcare, fintech). The site needs to become a professional lead-generation tool that conveys authority, sophistication, and deep technical expertise.

### Key Files (Current — Hugo)

- `hugo.toml` — site config (baseURL, params, menu)
- `content/` — markdown content (homepage, about, contact, products, blog)
- `layouts/` — Hugo templates (baseof, index, single, list, partials)
- `static/css/style.css` — single stylesheet (224 lines)
- `static/CNAME` — custom domain file (perceptum.nl)
- `.github/workflows/hugo.yml` — GitHub Pages deployment

### Key Files (Target — Astro)

- `astro.config.mjs` — Astro configuration with Tailwind, sitemap
- `src/layouts/Layout.astro` — base layout
- `src/pages/` — page components (index, about, products, contact, blog)
- `src/components/` — reusable components (Header, Footer, Hero, etc.)
- `src/styles/global.css` — Tailwind base + custom properties
- `public/CNAME` — preserved custom domain
- `.github/workflows/deploy.yml` — Astro GitHub Pages deployment
- `tailwind.config.mjs` — color palette, typography, animations

### Constraints

- Must deploy to GitHub Pages with perceptum.nl custom domain
- All content in Dutch
- FormBridge API endpoints must be preserved exactly:
  - Contact: `https://forms.bollenstreekdigitaal.nl/api/v1/s/f_e6de503e1d49`
  - FormBridge signup: `https://forms.bollenstreekdigitaal.nl/api/v1/s/f_6f7cf77bd01d`
- Zero-JS-by-default (Astro philosophy) — only interactive islands where needed
- No stock photography — use icons, gradients, typography for visual impact

### Decisions Made

None yet — first iteration.

## PLAN

### 1. Framework: Hugo → Astro

**Why Astro over Hugo:**
- Component-based architecture (better reusability)
- Built-in Tailwind CSS integration
- Island architecture (JS only where needed)
- Better TypeScript support
- First-class GitHub Pages deployment
- Growing ecosystem with excellent DX
- Prior experience: multiple successful Astro builds in session history

**Stack:**
- Astro 5.x (latest)
- Tailwind CSS 4.x
- No UI framework (pure Astro components)
- @astrojs/sitemap for SEO
- Vanilla JS for interactions (scroll animations, mobile nav, form handling)

### 2. Design System: "Midnight Authority"

**Color Palette — Dark Navy + Warm Slate:**

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Deep Navy | `#0c1929` | Hero backgrounds, footer, headers |
| Primary Light | Royal Blue | `#1e3a5f` | Hover states, accents, gradients |
| Accent | Electric Blue | `#3b82f6` | CTAs, links, interactive elements |
| Accent Warm | Amber | `#f59e0b` | Highlights, badges, status indicators |
| Surface | Slate 50 | `#f8fafc` | Page backgrounds |
| Surface Alt | Slate 100 | `#f1f5f9` | Card backgrounds, sections |
| Text Primary | Slate 900 | `#0f172a` | Body text |
| Text Secondary | Slate 500 | `#64748b` | Supporting text |
| Border | Slate 200 | `#e2e8f0` | Subtle borders |

**Typography:**
- Headings: **Inter** (variable, 600-800 weight) — clean, authoritative, tech-forward
- Body: **Inter** (variable, 400-500) — excellent readability
- Mono/accent: **JetBrains Mono** — for code snippets, technical labels
- Scale: fluid typography using clamp() for responsive sizing

**Design Principles:**
- Generous whitespace (luxury feel)
- Subtle gradients (navy → blue transitions)
- Geometric accent shapes (triangles, grids — tech feel)
- Card-based layouts with subtle shadows and borders
- Micro-animations: fade-in on scroll, hover lifts, smooth transitions

### 3. Site Architecture & Pages

```
/                     → Homepage (hero, services, track record, trust bar, CTA)
/over/                → About (founder story, philosophy, approach)
/producten/           → Products overview (4 product cards)
/producten/formbridge → FormBridge detail page
/track-record/        → Full career portfolio with case studies
/blog/                → Blog index
/blog/[slug]          → Blog posts
/contact/             → Contact form + details
```

### 4. Page Designs

#### Homepage (`/`)

```
┌─────────────────────────────────────────────┐
│ [HEADER] Logo ─── Nav ─── CTA Button        │
├─────────────────────────────────────────────┤
│                                             │
│  HERO (full-width, dark navy gradient)      │
│  "Van Eredivisie tot Enterprise"            │
│  Subtitle: 20+ jaar digitale innovatie      │
│  [CTA: Neem contact op]                     │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  TRUST BAR (subtle, single row)             │
│  Ajax · PSV · Feyenoord · Vodafone ·       │
│  KPN · Rabobank · Incision · Sportsplaza   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  SERVICES (3 cards)                         │
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │AI &  │ │Digi- │ │Soft- │                │
│  │Auto  │ │tale  │ │ware  │                │
│  │mati- │ │Stra- │ │op    │                │
│  │sering│ │tegie │ │Maat  │                │
│  └──────┘ └──────┘ └──────┘                │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  TRACK RECORD (horizontal scroll/grid)      │
│  "Hoogtepunten uit 20+ jaar digitaal"       │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │Erediv. │ │Vodafone│ │KPN     │          │
│  │Prof-   │ │Goal    │ │i-mode  │          │
│  │coach   │ │Alert   │ │        │          │
│  │        │ │        │ │        │          │
│  └────────┘ └────────┘ └────────┘          │
│  (+ Incision, Rabobank, Sportsplaza,       │
│    Ajax/PSV/Feyenoord mobiel)              │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  PRODUCTS (2x2 grid)                        │
│  "Onze Producten"                           │
│  FormBridge · Chatbot · WebScan · Analytics │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  CTA SECTION (dark gradient)                │
│  "Klaar om uw digitale ambities             │
│   waar te maken?"                           │
│  [Neem contact op]                          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  FOOTER (4-column, dark navy)               │
│  Perceptum │ Navigatie │ Contact │ Connect  │
│  Tagline   │ Links     │ Phone   │ LinkedIn │
│  KvK/BTW   │           │ Email   │ GitHub   │
│            │           │ Locaties│          │
│  ─────────────────────────────────────────  │
│  © 2026 Perceptum · Privacy · Voorwaarden  │
│                                             │
└─────────────────────────────────────────────┘
```

#### Track Record Highlights

| Project | Period | Client/Context | What |
|---------|--------|----------------|------|
| Eredivisie Profcoach | ~2000s | Eredivisie | Fantasy football platform for Dutch league |
| Vodafone Goal Alert | ~2000s | Vodafone NL | Real-time goal notifications via mobile |
| KPN i-mode | ~2002-2005 | KPN | Mobile internet platform (pioneering era) |
| Rabobank Rondemaster | ~2000s | Rabobank | Tour de France fantasy cycling game |
| Sportsplaza | ~2000s | Sportsplaza | Digital sports platform |
| Ajax/PSV/Feyenoord | ~2000s | Big 3 clubs | First mobile websites for top Dutch football clubs |
| Incision MVP | Recent | Incision | Surgical training platform MVP |

#### Footer Design

The footer is a signature element — a 4-column layout on dark navy:

**Column 1 — Brand:**
- Perceptum logo/wordmark
- "Technologie die werkt voor jou"
- KvK nummer, BTW nummer (adds legitimacy)

**Column 2 — Navigatie:**
- Home, Over ons, Producten, Track Record, Blog, Contact
- Clean link list

**Column 3 — Contact:**
- 071 - 203 2103
- wijnand@perceptum.nl
- Locaties: Noordwijk · Amsterdam · Leiden

**Column 4 — Verbinden:**
- LinkedIn
- GitHub
- Newsletter signup (future)

**Bottom bar:**
- © 2026 Perceptum
- Privacy · Voorwaarden
- "Gebouwd met Astro" (subtle tech credibility)

### 5. Content Strategy

**Tone:** Professional but approachable. Not corporate-stiff, not startup-casual. The voice of someone who has seen trends come and go but stays ahead.

**Key narrative:** "From the first mobile websites for Ajax, PSV, and Feyenoord to building AI solutions today — 20+ years of making technology work for people."

**Hero tagline options:**
1. "Van Eredivisie tot Enterprise — 20+ Jaar Digitale Innovatie"
2. "Technologie die Werkt. Bewezen in 20+ Jaar Digitaal."
3. "Waar Ervaring en Innovatie Samenkomen"

### 6. SEO Strategy

- Semantic HTML5 (header, nav, main, article, section, footer)
- Per-page meta: title, description, OG tags, Twitter cards
- JSON-LD structured data: Organization + Person + LocalBusiness
- Sitemap.xml via @astrojs/sitemap
- robots.txt
- Dutch lang attribute (`lang="nl"`)
- Canonical URLs
- Performance-first (Astro's zero-JS default)

### 7. Deployment

- GitHub Actions workflow for Astro (replaces Hugo workflow)
- Static output (`output: 'static'`) for GitHub Pages
- CNAME file in `public/` directory
- Build: `astro build` → `dist/` directory

### 8. Implementation Phases

**Phase A — Foundation (ISC-ARCH-1,2,3):**
Initialize Astro project, configure Tailwind, set up GitHub Pages deployment.

**Phase B — Design System (ISC-DESIGN-1,2,3,4):**
Color palette, typography, animations, responsive framework.

**Phase C — Components (ISC-FOOTER-1, ISC-FEATURES-2):**
Header, Footer, Hero, Card, Trust Bar — reusable building blocks.

**Phase D — Pages & Content (ISC-CONTENT-1,2,3,4,5):**
All pages with real Dutch content, track record, products.

**Phase E — Features (ISC-FEATURES-1,3):**
Contact form with FormBridge, trust signals, scroll animations.

**Phase F — SEO & Performance (ISC-SEO-1,2,3, ISC-PERF-1):**
Meta tags, structured data, sitemap, performance audit.

## IDEAL STATE CRITERIA (Verification Criteria)

### Architecture
- [ ] ISC-ARCH-1: Astro framework replaces Hugo with full build pipeline [E] | Verify: CLI: npm run build succeeds
- [ ] ISC-ARCH-2: GitHub Pages deployment with perceptum.nl custom domain works [E] | Verify: Read: workflow + CNAME files
- [ ] ISC-ARCH-3: Tailwind CSS integrated for utility-first responsive styling [I] | Verify: Grep: tailwind in astro.config

### Design
- [ ] ISC-DESIGN-1: Dark blue and slate grey color palette implemented sitewide [E] | Verify: Grep: color tokens in tailwind config
- [ ] ISC-DESIGN-2: Typography uses premium font pairing for sophisticated feel [I] | Verify: Read: font declarations in layout
- [ ] ISC-DESIGN-3: Smooth scroll animations and micro-interactions present throughout [R] | Verify: Read: animation classes in components
- [ ] ISC-DESIGN-4: Responsive layout works flawlessly on mobile tablet desktop [E] | Verify: Browser: screenshot at 3 breakpoints

### Content
- [ ] ISC-CONTENT-1: Hero section positions Wijnand as senior digital technology leader [E] | Verify: Read: hero content
- [ ] ISC-CONTENT-2: Track record section showcases all major career highlights [E] | Verify: Grep: all 7+ project names
- [ ] ISC-CONTENT-3: Products section presents four offerings with clear value props [E] | Verify: Read: products section
- [ ] ISC-CONTENT-4: About page tells compelling founder story with authority [E] | Verify: Read: about page
- [ ] ISC-CONTENT-5: All content written in professional Dutch language [E] | Verify: Read: spot-check pages

### Footer
- [ ] ISC-FOOTER-1: Impressive footer with multiple columns and rich content [E] | Verify: Read: footer component

### Features
- [ ] ISC-FEATURES-1: Contact form preserved with FormBridge backend integration [E] | Verify: Grep: FormBridge endpoint
- [ ] ISC-FEATURES-2: Navigation has sticky header with smooth scroll behavior [I] | Verify: Read: header component
- [ ] ISC-FEATURES-3: Trust signals section with client logos or social proof [R] | Verify: Read: trust section

### SEO
- [ ] ISC-SEO-1: Complete meta tags Open Graph and structured data present [E] | Verify: Grep: og:title and schema.org
- [ ] ISC-SEO-2: Semantic HTML with proper heading hierarchy throughout site [I] | Verify: Read: HTML structure
- [ ] ISC-SEO-3: Sitemap and robots.txt generated automatically by Astro [I] | Verify: Grep: @astrojs/sitemap in config

### Performance
- [ ] ISC-PERF-1: Lighthouse performance score above ninety on all pages [R] | Verify: CLI: build output analysis

### Anti-Criteria
- [ ] ISC-A-DESIGN-1: No generic template appearance or stock photography used [E] | Verify: Custom: review design originality
- [ ] ISC-A-CONTENT-1: No English text or placeholder content on any page [E] | Verify: Grep: lorem/placeholder
- [ ] ISC-A-ARCH-1: No heavy JavaScript frameworks or unnecessary client-side bundles [I] | Verify: CLI: bundle size
- [ ] ISC-A-FEATURES-1: No broken links or missing form endpoints after migration [E] | Verify: CLI: build check

## DECISIONS

(None yet — first iteration)

## LOG

### Iteration 0 — 2026-03-09
- Phase reached: PLAN
- Criteria progress: 0/24
- Work done: Created PRD with full design system, page architecture, content strategy, and implementation plan
- Failing: All (not yet started)
- Context for next iteration: Awaiting user approval of PRD to proceed to BUILD
