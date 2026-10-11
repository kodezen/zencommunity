# ZenCommunity — Gutenberg (FSE) Render Mode

ZenCommunity can render your community in one of two ways, chosen in
**wp-admin → ZenCommunity → Render mode**:

- **React interface (default)** — the built-in single-page app. Nothing to
  configure; works on any theme.
- **Gutenberg blocks (FSE)** — the community is composed from ZenCommunity
  blocks and edited in the WordPress **Site Editor**, so you control the whole
  layout with blocks, columns, template parts and global styles.

This document covers FSE mode.

---

## Requirements

- WordPress **6.7+** (uses `register_block_template`).
- A **block theme** (e.g. Twenty Twenty-Four/Five) to edit templates in the
  Site Editor. Rendering is forced through the block-template canvas so the
  community still displays on classic themes, but the Site Editor — and
  therefore template editing — is only available with a block theme.

The admin settings warn you if the active theme is not a block theme.

---

## Enabling FSE mode

1. **wp-admin → ZenCommunity → Render mode → Gutenberg blocks (FSE) → Save.**
2. Click **Edit in Site Editor** to open the community template.
3. Visit your community path (e.g. `/community`) to see it.

Switch back to **React interface** any time — it's lossless.

---

## How it works

In FSE mode the community route renders a **block template** through
WordPress's own template-canvas pipeline. Each ZenCommunity block outputs a
mount node that the React runtime hydrates into a live "island" — so blocks are
real Gutenberg blocks on the outside and the full React community on the inside.
All islands share one store, one socket and one router, so navigation and
real-time updates work across separately-placed blocks.

---

## Blocks

**Whole-community**

| Block | What it is |
|---|---|
| **Community App** | The entire community in one block (feed, members, groups, profiles…) with built-in sidebars. Drop-in, fully working. |
| **Community Content** (content-outlet) | The routed content area *with* its per-view sidebars — a full community view; place it full-width. |
| **Community Content (no sidebars)** (content-body) | The routed content *without* sidebars — put it in your own center column next to Sidebar blocks. Navigation swaps just this area. |

**Chrome / granular (build your own bar)**

`Community Navigation`, `Community Search`, `Notifications`, `Identity`
(avatar / sign-in), `Light / Dark Toggle`, `Community Header` (the pre-built
bar), `Left Sidebar`, `Right Sidebar`.

**Content widgets**

`Feed Stream`, `Post Composer`, `Welcome Banner`, `Guest Sign-in CTA`.

**Full views** (self-contained): `Groups`, `Members`, `Leaderboard`
(requires GameEngine).

> Blocks only appear in the editor when FSE mode is active.

---

## Preset layouts (patterns)

Insert a ready-made layout from the block inserter → Patterns → **ZenCommunity**:

- **Portal: Classic** — the full Header bar + content.
- **Portal: Modern** — a custom top bar (Navigation + Search + Notifications +
  Toggle + Identity) + content.
- **Portal: Application** — a minimal bar (Navigation + Identity) + content.

There are also two content compositions: **Full Community** (the Community App
block) and **Header + Content**.

### Building a custom layout that navigates

```
Header (or granular nav blocks)
Columns:  [ Left Sidebar | Community Content (no sidebars) | Right Sidebar ]
```

Clicking a nav item swaps only the center column — client-side, no reload — while
your sidebars stay put.

---

## Per-view templates

Each community view can have its **own** template:

- `ZenCommunity: Community` — the base (used for the feed and any view without a
  dedicated template).
- `ZenCommunity: Members`, `…: Groups`, `…: Member Profile`, `…: Single Post`.

Edit any of them in the Site Editor (listed under **ZenCommunity → Render mode
→ Per-view templates**, or Appearance → Editor → Templates). A view uses its
dedicated template **only once you customize it** — until then it falls back to
the base template, so navigation stays smooth by default. Views that have a
distinct template do a full page load so that template renders.

---

## Overriding templates from a custom block theme

Because these are standard block templates, a custom (or child) block theme can
override any of them by adding a file:

```
your-theme/
  templates/
    community.html
    community-members.html
    community-groups.html
    community-profile.html
    community-single-post.html
```

A theme file takes precedence over the plugin default (and over an unedited
template), and automatically activates that view's dedicated rendering. This is
the recommended way to ship a branded community design as part of a theme.

---

## Navigation note

In FSE mode the community uses the WordPress **Navigation** block (or the
ZenCommunity Navigation/Header blocks) — the built-in "Menu Settings" in the
React settings are ignored, as the Menu Settings tab notes.

---

## Extending (developers)

- `zencommunity/fse/blocks` — filter the block manifest (add/remove blocks).
- `zencommunity/fse/templates` — filter the registered template list.
- `zencommunity/fse/view_map` — filter the route-segment → template-slug map.
- `zencommunity/fse/gate/{key}` — satisfy a block's dependency gate.

Blocks are registered from a single manifest in
`includes/fse/manager.php`; the React island components live in
`dev_zencommunity/fse/`.
