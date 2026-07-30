# Handoff: Rule Prod storefront (mezmo-demos)

## Overview

Rule Prod is a fictional online store selling every kind of ruler — machinist steel rules, boxwood folding rules, framing squares, architect scales, fibreglass tailor's tape, children's plastic rulers, drafting triangles, and a collector's shelf of vintage slide rules.

It exists as a **demo application for Mezmo observability**: a realistic, modern e-commerce storefront running as five services on Kubernetes, deployed by Argo CD. It must look and behave like a real store. It never accepts card data — the checkout completes against an invoice/net-30 stub.

Target: `github.com/mezmo-demos/ruler-shop`.

## About the design files

The `.dc.html` files in this bundle are **design references authored in HTML**. They are prototypes that communicate intended layout, typography, spacing, colour, copy, and screen flow. **They are not production code and should not be copied into the app.**

Your task is to **recreate these designs in the target codebase**, using its framework and conventions. There is no existing frontend yet, so choose the stack — the architecture doc assumes **Next.js (App Router) + TypeScript** for the `frontend` service, which is a good default: it gives server-rendered pages that fan out to the four backend services, which is what makes the distributed traces in the observability demo worth looking at.

To view the prototypes: open any `.dc.html` file directly in a browser. `support.js` and `doc-page.js` are runtime shims for the prototype format only — **do not port them**.

## Fidelity

**High fidelity.** Colours, type, spacing, radii, shadows and copy in `Rule Prod - Modern.dc.html` are final and should be matched closely. The one deliberate gap is imagery: the photos are free-licence stock stand-ins, not a real product shoot — see `IMAGES.md`. Every image slot is a striped placeholder with a monospace label describing the shot required (see **Assets**).

The three-direction exploration file is included for context only — direction **1b (Modern Retail)** was chosen and is the one built out. Ignore 1a and 1c.

---

## Design tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| `bg` | `#fbfbfc` | Page background |
| `surface` | `#ffffff` | Cards, panels, inputs-on-white |
| `surface-sunken` | `#f7f8fa` | Filled form fields |
| `surface-muted` | `#f0f1f4` | Search field, desk background behind the frame |
| `ink` | `#101215` | Primary text, dark buttons, footer |
| `ink-secondary` | `#3d4453` | Nav links |
| `ink-body` | `#4b5261` | Body paragraphs |
| `muted` | `#6a7180` | Secondary text |
| `muted-light` | `#8d95a3` | Tertiary text, labels |
| `line` | `#e6e8ec` | Borders |
| `line-soft` | `#eceef2` | Section dividers |
| `line-softer` | `#f1f2f5` | Row dividers inside cards |
| `border-control` | `#dfe2e8` | Outline-button and control borders |
| `border-dashed` | `#c9cfda` | Dashed “saved cart” containers |
| **`accent`** | **`#3452cf`** | Primary CTA, links, active states, bulk-price emphasis |
| `accent-soft` | `#eef1fb` | Accent-tinted panels and badges |
| `accent-soft-2` | `#f7f9ff` | Selected radio card background |
| `success` | `#2f7a4f` on `#e7f3ec` | Delivered / in-stock badges |
| `disabled` | `#c2c7d0` | Sold-out variant text |

Accent is `oklch(0.52 0.16 265)`. Keep chroma and lightness if you add another accent hue.

### Typography

- **Figtree** (Google Fonts), weights 400/500/600/700/800 — everything.
- **IBM Plex Mono** 400/500 — small caps-ish labels and SKUs.

| Role | Size / weight / leading | Tracking |
|---|---|---|
| Hero H1 | 68px / 800 / 1.0 | −0.045em |
| Page H1 | 36–42px / 800 / 1.0–1.05 | −0.04em |
| Section H2 | 26–32px / 800 / 1.0 | −0.03…−0.035em |
| Card / panel title | 17–21px / 700 / 1.0–1.25 | −0.02em |
| Product title (grid) | 16px / 600 / 1.3 | — |
| Body large | 17–19px / 400 / 1.55–1.6 | — |
| Body | 15px / 400 / 1.5 | — |
| Meta / secondary | 13–14px / 400–500 / 1.0 | — |
| Button label | 14–17px / 600–700 / 1.0 | — |
| Badge | 11–12px / 600 / 1.0 | — |
| Wordmark | 22px / 800 | −0.035em |

Apply `text-wrap: balance` to headings and `text-wrap: pretty` to body paragraphs.

### Spacing

4px base. Common values: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 30, 36, 40, 44, 48, 52, 56, 64.
Page gutter **44px**. Vertical rhythm between major sections **52px**. Grid gutters **20–24px**.

### Radius

| Value | Use |
|---|---|
| 999px | All buttons, chips, filter pills, badges, quantity steppers, search field |
| 26px | Hero panel, large promo bands |
| 22px | Outer page frame, editorial cards |
| 20px | Product image tiles, order/cart cards |
| 18px | Category cards, inner panels |
| 15px | Cart-line thumbnails, radio cards |
| 13px | Form fields |
| 12px | Sidebar nav items, variant buttons |
| 11px | Pagination cells |
| 6px | Checkbox squares |

### Shadow

- **Card** — `0 1px 2px rgba(16,18,21,.06), 0 8px 22px rgba(16,18,21,.05)`
- **Card, raised** — `0 1px 2px rgba(16,18,21,.06), 0 10px 26px rgba(16,18,21,.05)`
- **Page frame (prototype chrome only)** — `0 2px 4px rgba(16,18,21,.04), 0 24px 60px rgba(16,18,21,.08)`

### Layout

Content width **1440px** in the prototype, page gutter 44px → 1352px content box. Treat 1440 as the desktop max-width and centre it. The prototype is desktop-only; responsive rules below are the intent, not drawn.

---

## Screens

All screens share a **header**: 20px/44px padding, 1px `line-soft` bottom border. Left group (38px gap): wordmark “Rule Prod”, then nav — Shop all, Trades, Studio, School, Textile, Vintage (26px gap, 15px/500, `ink-secondary`). Right group (10px gap): search field (250px, `surface-muted`, pill, 11px/18px padding, placeholder “Search 1,240 rulers”), “Sign in” outline pill, “Cart · 2” dark pill.

### 1. Home

Purpose: land, orient by audience, reach the catalogue.

1. **Promo bar** — full-width `ink`, white 13px/500, 12px padding, centred: “Summer clear-out — code **SUMMER15** for 15% off, through 31 August”.
2. **Header** (as above).
3. **Hero** — 32px/44px padding; inner panel radius 26px, photographic background (cover), min-height 560px, 2-col grid `1.05fr 1fr`. Left column 64px padding, 24px gap: white pill badge “New — the vintage archive” (accent text), H1 “Measure twice. / Buy once.”, 19px lede (max 40ch), two buttons (accent pill “Shop all rulers”; white pill “How bulk pricing works”), then a 26px-gap trust row at 14px/500 `muted`: Free shipping over $75 · 60-day returns · Ships same day. Right column holds the image placeholder label, bottom-right.
4. **Category cards** — 4-col grid, 20px gap. Card: radius 20, white, card shadow; 5:4 photo; 18px body with 17px/700 title and 14px `muted` subtitle. Trades / Studio / Classroom / Vintage archive.
5. **Best sellers** — header row (H2 + accent “See everything →”), 4-col grid 22px gap. Each: 1:1 image tile radius 20 with optional badge top-left (dark pill “Best seller”; accent pill “1 of 3 left”), then title 16/600, spec line 14 `muted`, price 17/700.
6. **Bulk band** — radius 26, `accent-soft`, 48px padding, space-between. Left: uppercase accent eyebrow, 34px/800 “Buy ten, pay less. Automatically.”, 17px body. Right: dark pill “See how it works”.
7. **Editorial** — H2 “From the archive”, then `1.4fr 1fr` grid. Large card is a 2-col split (image | text); small card is image over text.
8. **Footer** — `ink` background, white, 52px/44px padding. 5-col grid `1.4fr` + 4 link columns; bottom bar above a `#262a31` divider: “© 2026 Rule Prod. A demonstration store — no payment is ever taken.” and “Privacy · Terms · Accessibility”.

### 2. Catalog

Purpose: filter and browse a category.

- Breadcrumb 14px/500 `muted-light`; H1 “Straight edges”; result count “312 products · 148 with bulk pricing”; right-aligned Sort and View pills.
- Two columns `250px 1fr`, 40px gap.
- **Filter rail** — sticky white card, radius 18, 22px padding, sections divided by 1px `line-soft` with 22px padding-top. Sections: Material (checkbox list with counts right-aligned), Length (pill toggles, active = `ink` filled), Graduation (checkbox list), Price (dual-handle range: 5px track `line-soft`, accent fill, 17px white knobs with 2px accent border), and two loose checkboxes (In stock only, Bulk pricing available). Checkbox = 18px square, radius 6; checked = solid accent, unchecked = 1.5px `border-control`.
- **Active filter chips** — “Filters:” label then dark pills with `✕`, then accent “Clear all”.
- **Product grid** — 4 columns, 24px gap, 12 products. Card = 1:1 striped tile (radius 20, optional badge) + title 16/600 + spec 13 `muted` + price row: `$34` at 17/700 beside accent `10+ · $30.60`. Items with no bulk tier show `no bulk` in `muted-light`; the archive item shows `1 of 3 left`.
- **Pagination** — centred 40×40 cells radius 11; current page `ink` filled; ellipsis; “Next →” pill.

### 3. Product

Purpose: understand the item, pick length, pick quantity, see the bulk break, add to cart.

Two columns `1fr 520px`, 52px gap.

**Left**
- Primary image 4:3, radius 24.
- Thumbnail strip: 5 × 1:1, radius 15, 14px gap. Selected has `outline: 2.5px solid accent; outline-offset: -2.5px`.
- Two cards side by side (22px gap), each radius 18 with card shadow, 24px padding:
  - **Specification** — 6 label/value rows, `space-between`, label `muted`, value bold `ink`. Material, Finish, Thickness, Graduation, Tolerance, Made in.
  - **Reviews** — “4.8 · 214 reviews” right of the title; two review blocks separated by a 1px `line-soft` rule, each: 14/600 headline, 14/1.5 `muted` body, 13 `muted-light` attribution “· verified”.

**Right**
- Badge row: `accent-soft` “Best seller”, success “412 in stock”.
- H1 40px/800/1.05. Price row: `$34` 34/800 beside “4R graduation · SKU STARR-6R4” 16 `muted`. Rating line 15/500 `muted`.
- Lede 17/1.6 `ink-body`.
- **Length variants** — 4 buttons, radius 12, 13/20 padding: selected `ink` filled; available white with `border-control` and price suffix (`12 in · $42`); sold-out `line-soft` border, `disabled` colour, strikethrough.
- **Price-break ladder** — white card radius 18, card shadow. Header row (1px `line-soft` bottom): “Buy more, pay less” 16/700 + accent “Save up to 30%”. Body: 4-col grid, 8px padding; each cell 14px padding, radius 12, centred — tier label 13 (`muted-light`, or accent when active) over price 20/700. Active tier (10–24) has `accent-soft` background and accent text.
- **Add to cart** — quantity stepper (white, `border-control`, pill: −, value 17/700 min-width 38px, +) then a flex-1 accent pill “Add to cart · $367.20” at 17/700, 18px padding. Under it, 14/500: accent “✓ 10+ price break applied — you save $40.80” and `muted` “Free shipping”.
- Fulfilment notes above a `line-soft` top border: ship-today cutoff, purchase-order terms.

Below the fold: **“Often bought together”** — H2 28/800, 4-col grid of image + title + price.

### 4. Cart

Two columns `1fr 400px`, 40px gap; the summary is `position: sticky; top: 90px`.

- H1 “Your cart” with a 18/500 `muted-light` sibling “3 lines · 15 units”.
- **Line items** — one white card radius 20 with 8px padding wrapping three rows; rows divided by 1px `line-softer`. Row: 96px thumb radius 15 → title 17/600 + spec 14 `muted` + optional accent “Bulk price applied — $30.60 each” → stepper (pill, `bg`-filled, 20px right margin) → right column with line total 18/700 above 13/500 `muted-light` “Save for later”.
- **Bulk nudge** — `accent-soft` radius 18, 20/24 padding: accent 16/700 “Add 13 more steel rules to reach the 25+ price”, 14px explanation, white pill “Bump to 25”. This is the key merchandising moment — implement it.
- **Saved for later** — H2 20/700 then a white card with one 72px-thumb row and a “Move to cart” outline pill.
- **Saved carts** — dashed `border-dashed` 1.5px container radius 20, 24px padding: header row (“Saved carts” + accent “Save this cart”) then a 2-col grid of white cards radius 15, each name + “7 items · $412.00 · 14 Jul” + “Restore” pill.
- **Summary card** — Subtotal (15 units), accent Bulk savings, Shipping, Estimated tax; `line-soft` rule; Total 24/800; accent pill “Checkout as guest”; outline pill “Sign in & checkout”; text link “Save cart for later”; a `line-soft` rule then 14px `muted-light` fine print.

### 5. Checkout

Two columns `1fr 420px`, 44px gap; sticky summary.

Four numbered white cards (radius 20, 26px padding, card shadow):
1. **Contact** — title row with accent “Have an account? Sign in”; filled field showing the email; checked checkbox “Create an account after checkout to keep order history and saved carts”.
2. **Shipping address** — 2-col grid of filled fields (radius 13, `surface-sunken`, 1px `line`); street spans both; state and ZIP share a nested 2-col grid.
3. **Delivery** — two radio cards. Selected: 1.5px accent border, `accent-soft-2` background, 18px dot (`border: 5.5px solid accent`), title + ETA, price “Free” in accent. Unselected: 1px `line`, hollow 1.5px `#c9cfda` dot, “$18.00”.
4. **Payment** — selected radio card “Invoice — net 30” with the explicit note: *“This is a demonstration store. No card details are requested, transmitted, or stored at any point in this flow.”* Second option “Pay against a purchase order” at 55% opacity. **There is no card form anywhere. Do not add one.**

**Summary card** — three line rows with 52px thumbs; a `line-soft` rule; promo input row (filled field showing `SUMMER15` at 14/700 with 0.05em tracking + dark “Apply” button, radius 13); accent-soft success chip “✓ SUMMER15 applied — 15% off your order”; totals (Subtotal, accent Bulk savings, accent Promo, Shipping, Tax); Total 26/800; accent pill “Place order”; 13px `muted-light` disclaimer.

### 6. Confirmation

Centred column, 56px/44px padding, 36px gap.

- 64px success circle (`#e7f3ec` bg, `#2f7a4f` ✓ at 30/700), H1 “Order RP-10517 is placed” 42/800, 18px lede naming the email and net-30 terms.
- **Receipt card**, 820px wide, radius 22: a 4-col header strip (Order / Placed / Arrives / Total, each 13px `muted-light` label over 16/700 value) above a `line-soft` rule; three item rows with 60px thumbs; then a `surface-sunken` two-column footer (Shipping to / Payment) with “No card was charged — demo store” in `muted-light`.
- **Account upsell band**, 820px, `accent-soft`, radius 22, 30px padding: “Keep this order in your history” + explanation + accent pill “Create account”. This is the guest→account conversion moment.
- Two outline pills: “Track this order”, “Continue shopping”.

### 7. Account

Two columns `230px 1fr`, 40px gap; sticky sidebar.

- **Sidebar** — Orders (active: `accent-soft` bg, accent text, radius 12), Saved carts, Addresses, Purchase orders, Account details.
- **Header** — H1 “Orders” + “12 orders · $4,208.40 lifetime”; right-aligned “All time ▾” and “Export CSV” pills.
- **Order cards** — white radius 20, 22px padding, 16px gap between cards. Row: 82px thumb radius 15 → order number 17/700 with a status badge (Processing / In transit = `accent-soft`; Delivered = success) + 15px `muted` summary line → total 19/700 → two outline pills whose labels vary by status (View/Invoice, Buy again/Return, Track/Invoice).
- **Saved carts** — H2 26/800 + accent “New saved cart”, then a 2-col grid of dashed cards with Restore pills.

---

## Interactions & behaviour

The prototype is static apart from the screen switcher. Intended behaviour:

**Navigation** — Header nav → category listings. Product card → PDP. Cart pill → cart. Breadcrumbs reflect the real category path.

**Catalog** — Filters are multi-select and compose into the URL query so a filtered view is shareable and server-renderable. Facet counts come from `catalog` and update with the active filter set. Sort options: Popular, Price ↑, Price ↓, Newest, Name. Filter changes re-fetch server-side; show skeleton cards in the grid, never a full-page spinner.

**Product** — Changing the length variant swaps price, SKU, stock, images and the whole break ladder. The quantity stepper re-evaluates the tier live: the active ladder cell moves, the CTA label recomputes (`Add to cart · $367.20`), and the savings line updates. Sold-out variants are not clickable. Add-to-cart is optimistic with a rollback on failure.

**Cart** — Quantity changes recompute the tier and the summary. “Save for later” moves a line into the saved section without losing it. The bulk nudge appears only when the next tier is within a reasonable reach (say ≤ 30% more units) and “Bump to N” sets the quantity to the tier floor. “Save this cart” prompts for a name; restoring merges or replaces after confirmation.

**Checkout** — Sections validate on blur; the Place order button is enabled only when contact, address, delivery and payment are all valid. Promo codes validate server-side in `checkout` (invalid / expired / minimum-not-met each get their own message under the field). Order placement is idempotent — key it on a client-generated request id so a double click cannot make two orders.

**Guest → account** — Every visitor gets an anonymous session id on first request. Creating an account after checkout re-keys the cart and back-fills the order into history. Build this in `cart` and `orders` from the start.

**Hover** — Buttons darken ~8%; product cards lift the image tile 2px with a 150ms ease-out transform; links go `#3452cf` → `#2740ad`. Focus rings: 2px accent at 2px offset, on every interactive element.

**Responsive intent** (not drawn — confirm before building):
- ≥1440 — as designed, centred.
- 1024–1439 — fluid; product grids 4→3 columns.
- 768–1023 — filter rail collapses to a “Filters” button opening a sheet; PDP stacks to one column; grids 2 columns.
- <768 — single column; sticky bottom add-to-cart bar on the PDP; summary collapses to an expandable row above the CTA.

**Loading and error states** — Skeletons matching card geometry for grids and PDP. Empty cart, empty order history, and zero-result catalog each need a real designed state; they aren't drawn yet — ask before inventing them. A failed checkout keeps all entered data and shows the error inline at the failing section.

## State

| State | Owner | Notes |
|---|---|---|
| `sessionId` | cookie, set by `frontend` | Anonymous; survives account creation |
| `cart` | `cart` service | Lines, quantities, applied tier, saved-for-later lines |
| `savedCarts[]` | `cart` service | Named snapshots |
| `catalogQuery` | URL | Filters, sort, page — server-rendered |
| `product.selectedVariant` | client | Drives price/stock/images/ladder |
| `product.quantity` | client | Drives the active tier and CTA label |
| `checkout.draft` | client + `checkout` | Contact, address, delivery, payment; validated per section |
| `promo` | `checkout` service | Server-validated; never trust a client-computed discount |
| `orders[]` | `orders` service | History, status, invoices |

Pricing arithmetic has exactly one home per concern: **`catalog`** owns unit price and the break ladder; **`checkout`** owns order-level promo, tax and shipping. Do not let `cart` compute either, or you will get three rounding implementations and a one-cent discrepancy nobody can find.

## Assets

**The imagery in the prototype is free-licence stock, hotlinked from the Unsplash and Pexels CDNs.** It is a stand-in for a real product shoot: the pieces are correct but the lighting, background and camera height are not consistent across the catalogue. `IMAGES.md` lists every URL currently referenced. Before production, self-host them (AVIF + WebP at 400/800/1600) or replace with a real shoot. Every image tile falls back to `#e9ebf1` behind the photo, so a failed load degrades to flat grey rather than a broken icon. Slots and aspect ratios:

| Slot | Ratio | Shot |
|---|---|---|
| Home hero | 3:2 | Rulers fanned across a pale backdrop |
| Category cards (×4) | 5:4 | One representative grouping per audience |
| Product cards (grid) | 1:1 | Single ruler, neutral seamless, consistent shadow |
| PDP primary | 4:3 | Hero product shot, soft daylight |
| PDP thumbnails (×5) | 1:1 | Alternate angle, macro of graduations, in-hand, packaging |
| Editorial cards | 1:1 and 16:9 | Lifestyle / workbench |
| Cart, order, receipt thumbs | 1:1 | Reuse the product card crop |

Sources: **Unsplash** and **Pexels** for hero and lifestyle; **Pixabay** for white-background cutouts; **Rijksmuseum** and **Smithsonian Open Access** for public-domain scans of antique boxwood rules and slide rules (ideal for the vintage archive). Verify each licence before use.

Consistency beats variety: one background, one light direction, one shadow angle across the whole catalogue. Serve WebP/AVIF at 1x/2x, lazy-load below the fold, and set explicit width/height to avoid layout shift.

Icons: none are drawn. Use a single outline set at 1.5px stroke (Lucide or Phosphor) for search, cart, chevrons and the stepper glyphs.

## Architecture

`Rule Prod Architecture.dc.html` (open in a browser, or print to PDF) covers this in full. Summary:

- One app repo `mezmo-demos/ruler-shop` with `services/{frontend,catalog,cart,checkout,orders}/`, plus a separate `ruler-shop-gitops` repo holding the Argo manifests, so image-tag commits don't retrigger CI.
- GitHub Actions builds a matrix of the five services, pushes to `ghcr.io/mezmo-demos/ruler-shop/<service>:<sha>`, and commits the new tag into the gitops repo. Tag by commit SHA, never `:latest`.
- Argo CD syncs `services/` — a single Application with recursive directory sync, or an ApplicationSet with a git directory generator for per-service health and rollback in the UI.
- `frontend` is the only service behind the Ingress. `catalog` (Postgres + Redis), `cart` (Redis + Postgres) and `orders` (Postgres) hold state; `checkout` is stateless.
- `checkout` is the trace-worthy path: frontend → checkout → cart → catalog → orders. Give it deliberate, legible failure modes (expired promo, inventory drift, orders write timeout).

## Files in this bundle

| File | What it is |
|---|---|
| `Rule Prod - Modern.dc.html` | **The design to build.** Seven screens behind a tab switcher at the top. |
| `Rule Prod Storefront.dc.html` | Earlier exploration — 1a, 1b, 1c. Context only; 1b was chosen. |
| `IMAGES.md` | Every image URL the prototype loads, plus the production shot list. |
| `Rule Prod Architecture.dc.html` | Repo layout, CI, Argo, service responsibilities, photo sources. |
| `support.js`, `doc-page.js` | Runtime shims for the prototype format. **Do not port.** |
