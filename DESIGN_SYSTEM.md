# Design system and visual implementation contract

Chaze Bank owns the product identity under PRD.md. Use one replaceable BankLogo component displaying Chaze Bank and only original branding assets. This document establishes the shared token and component structure.

## Evidence and token status

Chaze Bank uses audience navigation, a large lifestyle hero, a prominent product-icon row, promotional image cards and deep footer grouping. The body stack is Open Sans, Helvetica Neue, Helvetica, Arial, sans-serif at 16px with near-black #101820 text. Chaze Bank uses original generated photography, original line icons and its own wordmark; no third-party bank logo or proprietary illustration asset is included.

## Planned semantic tokens

| Group | Provisional values / rule |
| --- | --- |
| Brand/action | brand/action #005EB8, action-hover #004A8F |
| Surfaces | canvas #F7F8F9, surface #FFFFFF, subtle #F1F3F5 |
| Text | primary #101820, secondary #4A5560, inverse #FFFFFF |
| Feedback | success #166534, warning #854D0E, danger #B91C1C, info #075985; pair with text/icons, not color alone |
| Borders/focus | border #C7CDD3, focus #005FCC, 2px visible outline plus offset; contrast-test actual combinations |
| Font | Open Sans, Helvetica Neue, Helvetica, Arial, sans-serif; tabular numerals for balances |
| Type scale | 12/16 caption, 14/20 small, 16/24 body, 20/28 heading-sm, 24/32 heading-md, 32/40 heading-lg, 40/48 hero; size/line-height in px equivalents using rem |
| Weight | 400 body, 600 emphasis, 700 headings; use semantic headings without skipping levels |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px equivalents; shared CSS variables |
| Containers | public max 1200px, banking max 1280px, form max 480px; gutters 16 mobile / 24 tablet / 32 desktop |
| Shape | border 1px, radii 4px controls / 8px cards / 12px dialogs; avoid arbitrary pill shapes |
| Elevation | card 0 1px 3px rgb(0 0 0 / 0.10); overlay 0 8px 24px rgb(0 0 0 / 0.18) |
| Control sizing | min-height 44px, body text 16px, horizontal padding 16px; full-width primary form action on narrow screens |
| Breakpoints | 640px small, 768px tablet, 1024px desktop, 1280px large; content-driven adjustments after reference comparison |
| Motion | 120–200ms simple transitions; respect prefers-reduced-motion; no decorative blocking animation |

Phase 1 implemented src/styles/tokens.css with Tailwind theme mappings as the sole token authority. Shared primitives live in src/components/ui and can be inspected in local/test mode at /foundation. Banking compositions remain for their domain phases. Semantic names go into components; feature files cannot invent slightly different blues, radii or gaps. Document justified exceptions with reference evidence. No dark-mode redesign is currently required.

## Component contracts

Primitive inventory: Button, Input, Select, Checkbox, Radio, Modal, Drawer, Tabs, Alert, Toast, Card, Table, Pagination, Skeleton, Spinner, EmptyState, ErrorState, BankLogo. Banking inventory: AccountCard, BalanceDisplay, TransactionRow, TransactionTable, CardPreview, TransferForm, PaymentCard, StatementRow, SecurityAlert, NotificationItem.

Primitives own accessibility and visual variants. Banking components accept typed view models and callbacks; they do not directly query Supabase or post money. Feature forms use React Hook Form and shared Zod input contracts; server validation remains authoritative. Compose rather than clone.

- Buttons: primary, secondary, tertiary, destructive; size and pending/disabled states; pending blocks duplicate submissions but is not idempotency protection.
- Fields: persistent label, optional helper, required indication and linked error; preserve safe values after validation. Password fields never reappear in logged state.
- Dialogs/drawers: labelled title, focus containment, initial focus, Escape/close and focus restoration. Confirm critical operations on a review screen before submitting.
- Tables: caption/headers, right-aligned amounts, visible sort state, stable pagination and row action labels. Mobile cards retain transaction meaning; use labelled local scroll regions only where table semantics require them.
- Alerts/toasts: status role/live regions appropriate to urgency; durable financial receipt/errors stay in the page. Never rely on a transient toast as the only result.
- BankLogo: one label and asset owner with an accessible home link at the navigation layer. The Chaze Bank wordmark uses an original bold geometric Open Sans treatment.

## Layout and responsive rules

Public shell: audience navigation, primary product navigation, content and footer. Banking shell: customer navigation, greeting, account summary and task areas. Staff shell is visually consistent but explicitly distinct. Authentication forms use a focused shell. Shared header/sidebar patterns own their breakpoints and menu state.

At narrow widths stack cards, allow text wrapping, move navigation into a labelled keyboard-accessible drawer and keep actions reachable. Verify 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px plus zoom/reflow. No page-level horizontal overflow. Avoid fixed heights that clip translated/large text. Keep money sign/currency readable and masked identifiers consistently formatted. Format timezone/currency explicitly; do not imply live balances while displaying stale data.

## State and accessibility contract

Every async feature defines initial, loading, success, empty, validation error, server error, unauthenticated, forbidden and not-found states. Financial confirmation waits for a persisted server receipt; uncertain outcomes offer status lookup using the same idempotency key. Disabled future-phase actions include an explanation of availability. Never fake a successful transfer or fill a chart with screenshot-derived values.

Target WCAG 2.2 AA through semantic HTML, labels, contrast, keyboard access, visible focus, error summaries and screen-reader announcements. Automated tests supplement manual keyboard, screen-reader and zoom checks. Use readable fallback content for charts and text/table summaries of actual simulator data.

## Visual review procedure

Before each screen, inspect its reference; record composition, component boundaries, typography, colors, dimensions, spacing, navigation and responsive evidence. Build using existing tokens/components; compare screenshots at the same viewport, including loading/errors and mobile. Correct meaningful differences. Record unavailable reference states honestly and use consistent provisional patterns until supplied evidence exists. Assess private dashboards against Chaze Bank product requirements, usability evidence and the shared design system.
