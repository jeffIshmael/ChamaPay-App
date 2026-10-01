# Chamapay landing page — build spec

Companion to `BRAND.md`. This documents the design pass so it can be ported into `chamapay.xyz` (Next.js + Tailwind). Reference implementation: `chamapay-landing.html`.

---

## Design decisions

### Colour

Straight from the brief. No sixth colour was invented — the teal is the only signal on the page, so it stays loud.

| Role | Token | Hex |
|---|---|---|
| Primary — CTAs, active states, links, avatars, step markers | `downy-700` | `#1a6b6b` |
| Page canvas | `downy-50` | `#f1fcfa` |
| Chips, phone card fills, tab track | `downy-100` | `#d1f6f1` |
| Progress bar track, hover, ticks | `downy-200` | `#a3ece4` |
| Dark bands (pay link, footer) | `downy-800` | `#195556` |
| Body ink | — | `#10403f` |
| Muted ink | — | `#4f7370` |
| Hairlines | — | `#cbe8e3` |

The pay-link band and the footer are the only solid teal areas. Everything else is white or mint canvas, which keeps `#1a6b6b` reading as an accent rather than a wash.

### Type

- **Display** — Bricolage Grotesque (500/600). Headlines, wordmark, money amounts, step numerals. Slightly condensed and a bit warm; deliberately not the neutral grotesk every fintech lands on.
- **Body** — Instrument Sans (400/500/600). Everything else, including buttons and labels.
- Body measure capped at ~34rem. Sentence case throughout; no tracked-out all-caps eyebrows.

### Motion

One orchestrated moment: the hero staggers in on load (brand → headline → lede → CTA → note, with the phone mock arriving alongside the lede). No scroll-reveal on subsequent sections — they're static. All of it sits behind `prefers-reduced-motion`.

User-triggered motion only elsewhere: fee tab switch, FAQ accordion, copy-link confirmation.

---

## Section map

| # | Section | Job | Brief checklist item |
|---|---|---|---|
| 0 | Sticky header | Wordmark, anchor nav, persistent **Launch app** | Primary CTA |
| 1 | Hero (split) | Brand + promise, phone mock of a live chama round | Hero shape, brand spelling |
| 2 | Chamas (split, visual right) | ROSCA mechanics, turn order, transparent ledger | Chamas (ROSCAs) |
| 3 | Goals | Three modes side by side | Individual / circle / public |
| 4 | **Pay link** (full-bleed `#195556`) | The loud moment: shareable URL + contribute screen | Every goal gets a pay link; funerals / weddings / emergencies; simple contribute screen |
| 5 | How it works | 3 numbered steps + stablecoin explainer rail | M-Pesa in/out; USDC on Base |
| 6 | Fees | Tab switcher with the active pill | Primary colour matches active fee tab |
| 7 | FAQ | Six accordion items | — |
| 8 | Launch | Centred final CTA | Primary CTA |
| 9 | Footer | Deep teal band | — |

Numbered markers appear only in section 5, because that content genuinely is a sequence.

---

## Copy

### Hero

- Brand: **Chamapay** (display, `#1a6b6b`, ~5.75rem desktop)
- Headline: *Save together, the way chamas already work.*
- Supporting: *Run your chama, save toward a goal, or raise money for someone who needs it — all on M-Pesa. Balances are held in USDC on Base, so what the group saves holds its value.*
- CTAs: **Launch app** (filled) → `https://app.chamapay.xyz` · **See how it works** (ghost) → `#how`
- Note line: *Deposit and withdraw with M-Pesa. No crypto wallet to set up.*

### Chamas

Heading: *Your chama, with the arguments taken out.*
Lede: *Invite-only rotating savings, exactly as the group already runs it — but everyone can see the schedule, the contributions and whose turn it is.*

Four points: invite + set schedule · shared view of whose turn and who's paid · M-Pesa in and out · pool sits in USDC between rounds, not in one member's account.

### Goals

Heading: *Save toward something specific.*
Lede: *School fees, stock for the shop, a trip, a deposit. Create a pot, set the target, and decide who saves into it.*

- **Individual** — Just you, putting money aside toward a target you set.
- **Circle** — Friends or family saving toward one shared target, in private.
- **Public** — Anyone with the link can contribute. Open fundraising.

### Pay link

Heading: *Every goal comes with a pay link.*
Lede: *Share it on WhatsApp and people can send money in seconds. They open the link, see what it's for, and pay with M-Pesa. No app to install, no account to create.*

Link chip: `chamapay.xyz/pay/grace-school-fees` + **Copy link** button (writes the full `https://` URL, swaps label to "Copied" for 2s, announces via `role="status"`).

Use-case pills: Funeral contributions · Weddings · Medical emergencies · Fees and rent · Everyday help.

### How it works

1. **Pay in with M-Pesa** — the usual prompt on your phone.
2. **It's held as USDC** — dollar-backed, on Base, so it isn't quietly losing value while it waits.
3. **Withdraw to M-Pesa** — back out in shillings when it's your turn or the goal is met.

Rail: *Why a stablecoin, in plain terms* — months-long saving, dollar peg, seconds-fast cheap settlement on Base, on-chain ledger nobody can quietly edit.

### FAQ

Do I need to understand crypto · Who holds the money between rounds · Can someone contribute without joining · What if someone misses a contribution · Does the shilling moving affect my balance · What can I use a pay link for.

### Launch

*Start a chama, or a goal, today* / *It takes a few minutes and your first contribution can come straight from M-Pesa.* / **Launch app**

---

## ⚠️ Placeholders to confirm before shipping

These aren't in `BRAND.md`, so I made them up and they need your real numbers:

| Item | Placeholder used |
|---|---|
| Internal transfer fees | Free across the board |
| M-Pesa deposit | 1.5% |
| M-Pesa withdrawal | 2.0% |
| Pay link contribution | 1.5% |
| Safaricom charges | "At cost" |
| Pay link URL shape | `chamapay.xyz/pay/<slug>` |

Sample names (Grace W., Joseph M., Amina K., Peter O.), the "Kilimani Investors" chama and all amounts are illustrative. The brief calls for real product screens and people imagery — the phone mocks here are CSS stand-ins and should be swapped for actual screenshots, and the hero would be stronger with a real photo alongside or instead of the mock.

---

## Porting notes

- Tailwind already has `downy.*`, so most utilities map directly: `bg-downy-700`, `bg-downy-50`, `border-downy-200`, `text-downy-800`.
- The fee tabs use the same `bg-downy-700` active pill as `FeeTabs` in `app/page.tsx` — keep that component and drop the new rows into it rather than rebuilding.
- Add the two fonts via `next/font/google` (`Bricolage_Grotesque`, `Instrument_Sans`) and expose them as `--font-display` / `--font-body` in `globals.css`.
- Suggested component split: `Hero`, `ChamaSection`, `GoalModes`, `PayLinkBand`, `HowItWorks`, `FeeTabs` (existing), `Faq`, `LaunchCta`.
- Accessibility already in: skip link, visible focus rings, arrow-key tab navigation, `role="status"` on copy confirmation, reduced-motion guard, dark-scheme tokens.
