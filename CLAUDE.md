# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Tauri 2.0 desktop app for managing frequently used local directories and files. It runs entirely offline. The app has a main window (lists favorites, search, drag-and-drop) and a small floating animal icon window that stays on the desktop edge. Supports Windows and macOS.

## Common Commands

- **Start dev server:** `npm run tauri dev`
- **Build frontend only:** `npm run build`
- **Build release binary:** `npm run tauri build`
- **Type check frontend:** `npx tsc --noEmit`
- **Tauri CLI:** `npm run tauri <cmd>` (e.g., `npm run tauri info`)

The Rust backend is managed through Cargo inside `src-tauri/`. Standard `cargo` commands work there.

## Architecture

### Dual-Window Setup
The app has two independent browser entry points, both built from the same Vite project (`vite.config.ts` uses `rollupOptions.input` for both):

- **Main window** (`index.html` → `src/main.tsx` → `App.tsx`): 420×640, borderless, draggable via `data-tauri-drag-region`. Lists favorites, search, add/remove/reorder. Defined in `tauri.conf.json`.
- **Float window** (`public/float.html` → `src/float.tsx` → `FloatWindow.tsx`): 80×80, transparent, always-on-top. Shows a clickable animal SVG icon. **Created programmatically in Rust** (`main.rs` `create_float_window`), not defined in `tauri.conf.json`, because it needs a custom URL (`/float.html`) and restored position from config.

Window switching is done via Rust invoke commands: `hide_main_show_float` and `show_main_hide_float`.

### System Tray
The tray icon and menu are built programmatically in `main.rs` during the `setup` hook, not via `tauri.conf.json`. Left-clicking the tray icon shows the main window; right-click opens a menu with "Show" and "Quit".

### Frontend-Backend Communication
Frontend calls Rust commands through `invoke()` from `@tauri-apps/api/core`. All backend commands are in `src-tauri/src/commands.rs`. Key commands:
- `get_favorites`, `add_favorite`, `remove_favorite`, `update_favorite`, `reorder_favorites`
- `check_exists`, `open_path`
- `get_config`, `save_config`
- `hide_main_show_float`, `show_main_hide_float`

### Permissions (Tauri Capabilities)
Permissions are declared in `src-tauri/capabilities/default.json`, not in `tauri.conf.json`. Both windows (`main`, `float`) are listed in the `windows` array. Permissions include `core:default`, `dialog:default`, `fs:default`, `shell:default`, `shell:allow-open`, and `autostart:default`.

### State & Persistence
- `AppState` (`src-tauri/src/storage.rs`) holds two `Mutex`-protected fields (`favorites`, `config`) and is managed as a Tauri state object.
- Data is persisted as JSON in the Tauri app data directory: `data.json` (favorites) and `config.json` (settings).
- `serde` is used for serialization; `uuid` generates item IDs.

### Frontend Data Flow
- `useFavorites` hook (`src/hooks/useFavorites.ts`) wraps all favorite-related invoke calls, maintains local React state, and returns sorted items (pinned first, then by `order`).
- `useConfig` hook (`src/hooks/useConfig.ts`) manages app config (animal selection, float window position).
- `FavoriteList` handles drag-and-drop reordering and periodic existence checks (every 30s).

### Window Dragging
Both windows are borderless (`decorations: false`) and rely on `data-tauri-drag-region` HTML attributes for dragging:
- **Main window**: The title bar div has `data-tauri-drag-region`. Interactive elements inside it (buttons container) must explicitly opt out with `data-tauri-drag-region="false"`.
- **Float window**: The root div has `data-tauri-drag-region`. The inner icon container opts out with `data-tauri-drag-region="false"` so clicks register instead of drags.

### Important Constraints
- **TypeScript is in strict mode** with `noUnusedLocals: true` and `noUnusedParameters: true`. Unused variables will fail the build.
- **Tailwind CSS v4** uses CSS-based configuration (`@theme` block in `src/styles/index.css`), not `tailwind.config.js`.
- The float window **must not** be added to `tauri.conf.json` `windows` array — it is created programmatically in `main.rs`. Adding it to both causes a runtime panic (duplicate webview label `float`).
- `open_path` on Windows uses `explorer` directly instead of `tauri-plugin-shell` due to compatibility with local directory paths.

### Rust Dependency Constraints
`Cargo.toml` specifies `rust-version = "1.85"`. Do **not** upgrade `serde_with` beyond 3.11.0 — newer versions pull in `darling` 0.21 which requires Rust 1.88.0. If dependency resolution fails, pin `serde_with` to 3.11.0 via `cargo update -p serde_with --precise 3.11.0`.
