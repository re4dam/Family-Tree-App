# Family Tree Application — TODO

Status: **Implementation phase**. The database models, core validation, backend API queries/mutations, and basic frontend scaffolding have been initialized.

---

## 0. Tech Stack

**Recommended:**

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js (React) + TypeScript | Fits an app with both a marketing/landing surface and an interactive app surface; TypeScript matters here since the relationship data model has enough shape (nullable dates, relationship types, nested person refs) that untyped JS will bite you. |
| Graph visualization | React Flow | Purpose-built for node/edge diagrams with click handlers, custom node renderers, and pan/zoom out of the box. D3.js is more powerful but you'd hand-roll drag, zoom, and hit-testing that React Flow gives for free. Reach for D3 only if you later need a layout React Flow can't do (e.g. a strict radial pedigree chart). |
| Backend API | **.NET (ASP.NET Core) + HotChocolate GraphQL** | GraphQL is a strong fit here specifically because the frontend's data needs are shape-variable — the detail panel wants a deep object (person + parents + children + partners + media), while the graph view wants a shallow list (id, name, edges). GraphQL lets each view request exactly that shape in one round trip. .NET is the deeper of your two backgrounds for this kind of modeling work, and HotChocolate's code-first schema plus EF Core makes the recursive relationship queries (below) straightforward to express. |
| Database | PostgreSQL | Native recursive CTEs make ancestor/descendant traversal (e.g. "all ancestors of X," "shortest path between X and Y") tractable in SQL rather than pulling the whole table into app code to walk it. EF Core + Npgsql support this cleanly. |
| Auth | ASP.NET Core Identity + JWT | Standard token-based auth for a Next.js SPA consumer; no need for cookie-session complexity since this isn't a server-rendered Razor app. |
| Mobile (optional, later) | Flutter | Only if you want a native mobile surface eventually — not needed for MVP; the graph interaction model (pan/zoom/tap) is web-first anyway. |

**Other backend options considered:**

| Option | When it makes sense |
|---|---|
| **Node.js (NestJS) + Apollo/Yoga GraphQL + Prisma** | If you want one language (TypeScript) across frontend and backend, and to reuse types between the Next.js client and the API layer. NestJS gives you the same structured, DI-based architecture feel as .NET/Laravel, so it won't feel like a step down in rigor. |
| **.NET minimal API (plain REST) instead of GraphQL** | If you'd rather skip GraphQL's setup cost entirely — a couple of purpose-built endpoints (`GET /people/{id}/full`, `GET /people/{id}/graph`) cover the two data shapes you actually need (deep detail-panel object vs. shallow graph list) without a schema layer at all. |
| **Laravel + Lighthouse GraphQL** | Still a fine choice if you'd rather stay in PHP for this project specifically — no technical reason to exclude it, it's simply not the strongest match to your deeper background compared to .NET. |

Reach for GraphQL (whichever backend you pick) only if you expect the frontend's data-shape needs to keep shifting as you build — otherwise a couple of well-shaped REST endpoints is less setup for a single-consumer API.

**Not recommended for this project:** EventStoreDB / event sourcing. Family tree data is fundamentally *current-state* data people edit directly (fix a birth date, correct a relationship) — there's little value in an append-only event log here, and it adds real complexity (projections, checkpoints) for no corresponding benefit, unlike your KerjaKu-style systems where audit trail and event replay actually matter.

---

## 1. Person Node (Individual)

- [x] Define `Person` entity with core fields:
  - `id`, `firstName`, `lastName`, `nickname`
  - `gender`: enum, `male` / `female` only (drives husband/wife relationship labeling — no other values needed per project decision)
  - `birthDate`: either a full date OR an `estimatedYear` (int only, no month/day) — pick one representation per person, don't force a fake full date when only a year is known
  - `deathDate` (nullable — living vs deceased)
  - `birthPlace`, `photoUrl`, `notes/bio`
  - `livingStatus` derived from `deathDate` presence, not a separate manual flag
- [x] Define relationship types as first-class edges, not just fields on `Person`:
  - Parent–child (biological, adoptive, step, foster, guardian)
  - Partner (married, divorced, separated, unmarried/de facto, widowed)
- [x] Support multiple partners per person over time (marriage history), not just one spouse field
- [x] Support unknown parent as an explicit **placeholder `Person`** (e.g. `isUnknown: true`, no name/dates) rather than a null reference — keeps the edge (and future "resolve this person later" flow) intact instead of just leaving a gap
- [x] Validation: prevent cycles (a person cannot be their own ancestor)
- [ ] **Merge tool**: detect/flag likely duplicate people (same name + overlapping dates or shared relatives) and support merging two `Person` records into one, re-pointing all relationship edges from the discarded record to the kept one

## 2. Graph Visualization

- [x] Render people as nodes, relationships as edges
- [x] Distinguish edge styles: parent-child vs partner vs divorced vs adoptive
- [x] Layout algorithm for generational alignment (siblings same row, ancestors above, descendants below)
- [x] Zoom / pan
- [ ] Collapse/expand a branch (hide descendants or ancestors of a node)
- [ ] Handle large trees — clustering, virtualization, or lazy-loading off-screen nodes
- [ ] Highlight direct lineage path between two selected people
- [ ] **Multiple view modes** over the same underlying data (user-toggleable):
  - Network graph (default, full web of relationships)
  - Pedigree chart (strict ancestors-only, fan or tree layout from one person up)
  - Descendant chart (strict descendants-only from one person down)

## 3. Detail Panel (Right Drawer) [COMPLETED]

- [x] Opens on node click/tap, shows selected person's full profile
- [x] Sections: basic info, relationships (parents/children/partners), photos, notes
- [x] Edit-in-place from the panel (create/update without a separate modal)
- [x] "Jump to" links from listed relatives (clicking a parent's name re-centers graph + panel on them)
- [x] Close panel returns graph to previous view state (no re-render/reset)

## 4. Accounts & Permissions (multi-family-member access)

- [x] Multi-account support — each family member can have their own login (not
  a single shared account)
- [x] Authentication (ASP.NET Core Identity + JWT, per Tech Stack section)
- [x] Authorization model — three roles:
  - **Viewer**: browse/search the tree only, no edits (family members with an account)
  - **Admin**: everything a Viewer can do, plus create/edit/merge people and
    relationships; can switch into view-only mode at will
  - **Super Admin**: everything an Admin can do, plus manage accounts —
    invite/remove users, assign/change roles (Viewer ↔ Admin), and
    create/revoke share links (see below)
- [x] Decide scope of permissions: whole-tree roles (simplest, start here) vs.
  per-branch permissions (e.g. only edit your own immediate family) — start
  with whole-tree roles and revisit only if it becomes a real problem
- [ ] Invite flow — how does a Super Admin add another family member's account?
- [ ] **Shareable time-limited access links** — a way to let someone view the
  tree without creating an account at all:
  - Super Admin generates a link + access token pair, view-only (never grants edit)
  - Expiry options: 1 week / 1 month / 1 year / custom date / never expires
  - Token is checked against expiry on each access; expired tokens 403 with a
    clear "this link has expired" message rather than a generic error
  - Super Admin can see a list of active/expired share links and manually
    revoke any of them before their natural expiry
  - Share-link viewers see living people the same as an authenticated Viewer
    — no extra redaction for the account-free path

## 5. Search

- [ ] Search by name (fuzzy/partial match)
- [ ] Search by other attributes: birth year range, place, relationship (e.g. "children of X")
- [ ] On result select: center graph on that node + open detail panel
- [ ] Handle duplicate/similar names in results (show birth year or parents as disambiguator)

---

## Decisions Log

Resolved during planning — recorded here so the reasoning isn't lost by the
time implementation starts:

1. **Gender model** — decided: strict `male` / `female` enum, husband/wife
   labeling only, no other cases supported.
2. **Uncertain/partial data** — decided: unknown parents are explicit
   placeholder `Person` records (not nulls); dates support an
   estimated-year-only mode instead of a full date.
3. **Merging duplicate people** — decided: yes, build a merge tool (see
   Person Node section).
4. **Multi-editor / permissions** — decided: multi-account, three-tier
   role-based authorization (Viewer / Admin / Super Admin), plus expiring
   share links for account-free viewing (see Accounts & Permissions section).
5. **View modes** — decided: support network graph, pedigree chart, and
   descendant chart as togglable views (see Graph Visualization section).
6. **Import/export** — parked for later consideration, not a v1 requirement.
   Revisit GEDCOM support if interoperability with tools like Ancestry ever
   comes up.
7. **Privacy for living people** — decided: visible to authenticated
   Viewer/Admin/Super Admin accounts. Share-link viewers get the same
   visibility as an authenticated Viewer — no extra redaction for the
   account-free path.

---

## Suggested Build Order

1. [x] Data model + schema (get relationships right first — this is the hardest
   part to change later)
2. [x] Authentication + role model (Viewer/Admin/Super Admin) — build this early
   since editing is gated by it from day one, not bolted on after
3. [x] CRUD for Person + relationships (no visualization yet — plain forms/list)
4. [x] Graph visualization (read-only, network view)
5. [x] Node click → detail panel
6. Search
7. [x] Editing from within the graph/panel
8. Merge tool for duplicate people
9. Pedigree/descendant view modes, branch collapse, large-tree performance
10. Shareable expiring access links (view-only, account-free)
11. Import/export (if it becomes a real need)