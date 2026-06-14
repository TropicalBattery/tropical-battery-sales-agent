# Tropical Battery — Sales Agent Knowledge Base
*Source: tropicalbattery.com (homepage + retail-stores page) and the Inventory Management Supabase project. Compiled for the inbound sales voice agent. June 2026.*

> **Use note:** This is the factual reference the agent draws on for FAQs ("do you have X", "where are you", "what brands", "what services"). Pricing and live stock are **not** authoritative here — the agent gives ranges/soft availability and a rep confirms (see Guardrails).

---

## 1. Company at a glance
- **Tropical Battery Company Limited** — Jamaican retail battery, automotive and energy distributor; publicly listed (Jamaica Stock Exchange, Main Market).
- **Headquarters:** 30 Automotive Parkway, Ferry Commercial Centre, Mandela Highway, Kingston 20. P.O. Box 148. Main line **(876) 923-6231-3**; toll **1-888-767-4225**; `support@tropicalbattery.com`.
- **Group / subsidiaries** (useful for routing and "are you the people who do…" questions):
  - **Rose Batteries / Rose Electronics** — US subsidiary (San Jose, CA; manufacturing in Mexico); marine-grade and mission-critical battery packs.
  - **Kaya Energy Group** — solar EPC / project management (Dominican Republic + US); 300+ Caribbean solar projects.
  - **Tropical Renewable Energy (TRE)** — renewable-energy equipment, procurement, project management.
  - **Tropical Mobility** — EV / e-mobility, including **Tesla vehicle sales, service and maintenance**.
  - **Tropical Finance** — financing arm.
- **Social (real):** facebook.com/tropicalbattery, instagram.com/tropicalbatteryja.

---

## 2. Branches (six retail Sales & Service Centres) — with inventory codes
The agent should route to one of these six. The **Inventory code** column links each branch to live stock in the Inventory Management project (see §5).

| Branch (say it this way) | Parish/region | Address | Phone | Branch email | Inventory `location_code` |
|---|---|---|---|---|---|
| **Ferry** (also HQ) | Kingston | 30 Automotive Parkway, Ferry Commercial Park, Mandela Highway, Kingston 20 | (876) 923-6231-3 | ferry@tropicalbattery.com | `FERRY` |
| **Grove Road** | Kingston | 1E Grove Road, Kingston 10 | (876) 926-6615 | groverd@tropicalbattery.com | `GROVE` |
| **Ashenheim Road** | Kingston | Ashenheim Road (Plus code X5VF+5C) | (876) 923-6231 / 6232 / 6233 | ashen@tropicalbattery.com | `ASH` |
| **Ocho Rios** | St. Ann | Coconut Grove, Ocho Rios | (876) 974-8777-8 | ochorios@tropicalbattery.com | `OCHO-RIOS` |
| **Montego Bay** | St. James | Catherine Hall Trade Centre, Montego Bay | (876) 971-6220 | mobay@tropicalbattery.com | `MOBAY` (warehouse: `W/H - MO`) |
| **Mandeville** (Manchester) | Manchester | 6 Villa Road, Mandeville | (876) 625-0600 | mandeville@tropicalbattery.com | `MANDVILLE` |

**Mobile Response (island-wide roadside):** **1-888-767-4225** — jumpstarts, on-site battery checks, diagnostics, battery replacement/installation.

> ⚠️ **Opening hours are NOT published on the website** — including Saturday hours. These are required for the after-hours gating logic and "what time do you open" FAQs. **Needs Omaro.** (Open question §13.4/13.5 in the brief.)

---

## 3. Products & services (what the agent can speak to)
**Product lines:** automotive batteries (25+ variants — premium "gold," and the red/yellow/blue-top performance lines; from European luxury to heavy-duty commercial), solar products, engine oil, coolant, **Caribrake** brake fluid (DOT3 / DOT4), fuel/oil treatments, tyres, car care, and accessories. **Marine batteries** via Rose.

**Brands explicitly shown as carried:** Armor All, STP (car care), plus own brands Rose (batteries) and Caribrake (brake fluid). *Full battery-brand line-up is not on the site — confirm with Omaro.*

**Services at branches:** battery installation; **free battery & electrical testing**; battery charging; battery repairs; **warranty claim & activation**; tyre installation; tyre balancing; expert advice.

**Other services:** on-site industrial & marine battery install/repair; used lead-acid battery collection & export (85%+ recycled); battery-maintenance training; tyre training.

---

## 4. Source-quality caveats (so we don't ingest junk)
The site is a dated Drupal 7 build (© 2016) with **template placeholder content mixed in**. Treat as **non-authoritative / ignore**: the homepage "+61 383 766 284" number and `envato.com` email, the zeroed stat counters ("0 years in operation", etc.), the "Beantown Themes"/stock social links, and the 2014–2015 blog dates. The branch, product, group-company and contact facts above **are** real and cross-checked against the retail-stores page.

---

## 5. Inventory wiring — Inventory Management project (`qunnxsxeevoeflqfrzwz`)
**Goal:** let the agent answer "do you carry / do you have X, and at which branch."

**Relevant tables**
- `products` — **13,076 rows**, all `is_active`. Useful columns: `sku`, `name`, `description`, `category` (**69 categories populated**), `unit_of_measure`, `external_id`.
- `inventory_balances` — **54,355 rows**. Per-location stock: `location_code`, `quantity_available`, `quantity_on_hand`, `quantity_reserved`, `quantity_on_order`, joined to products by `sku` / `product_external_id`.

**Data-quality reality (verified — read this before promising anything):**
- `products.brand` — **100% empty.** The agent cannot answer "do you carry brand Y" from this data; use the website brand facts instead and capture the lead.
- `products.selling_price` and `item_costing.retail_price` — **100% empty.** No pricing in the DB. Fine — it matches the "no firm prices" guardrail.
- `inventory_balances.location_name` — **empty**; only `location_code` is populated (63 distinct codes). The six retail codes are mapped in §2; the rest (`MWF`, `TROP-PLAZA`, `IND. DEPT`, `P-POWER`, `FACT - WET`, `ADM`, `LIQ-PROD`, blank, etc.) are **warehouses/departments/production — exclude from customer answers.**
- Only **781 SKUs** currently show `quantity_available > 0` (out of 6,538 tracked). Live availability is **sparse and possibly stale**, so hard "yes, N in stock" claims are unsafe today.

**Recommended agent behaviour:** confirm **catalogue presence + category** ("yes, we carry car batteries / solar / brake fluid") reliably; give **soft availability** ("looks like we have that at Montego Bay — a rep will confirm exact stock") rather than firm counts; always capture the lead. This keeps us inside the existing capture-and-route guardrail.

**Access pattern:** the sales service is a *separate* Supabase project (Sales Call Agent). To read inventory it needs a **read-only connection to the Inventory project** (second Supabase client / read-only key) — projects are separate databases, so this is cross-project, not a join within one DB.

**Proposed convenience view** (retail-only, in-stock; *draft — not yet applied to the production Inventory DB, awaiting your go*):
```sql
create or replace view public.view_branch_availability as
select
  p.sku,
  p.name              as product_name,
  p.category,
  ib.location_code,
  case ib.location_code
    when 'FERRY'     then 'Ferry (Kingston)'
    when 'GROVE'     then 'Grove Road (Kingston)'
    when 'ASH'       then 'Ashenheim Road (Kingston)'
    when 'OCHO-RIOS' then 'Ocho Rios'
    when 'MOBAY'     then 'Montego Bay'
    when 'MANDVILLE' then 'Mandeville (Manchester)'
  end                 as branch_name,
  ib.quantity_available
from products p
join inventory_balances ib on ib.sku = p.sku   -- verify sku vs external_id is the correct join key before relying on it
where p.is_active
  and ib.location_code in ('FERRY','GROVE','ASH','OCHO-RIOS','MOBAY','MANDVILLE')
  and ib.quantity_available > 0;
```

---

## 6. Still needed from Omaro (gaps this KB can't fill)
1. **Opening hours** per branch, especially **Saturday** — drives the after-hours gating and the most common FAQ.
2. **Full battery brand line-up** carried (site only names Armor All, STP, Rose, Caribrake).
3. **Which branches are in scope** for routing (all six? Kingston-only to start?).
4. **Pricing source**, if any — otherwise the agent stays price-agnostic and captures the lead.
5. Confirm the **inventory join key** (`sku` vs `external_id`) and whether the read-only `view_branch_availability` should be created.
