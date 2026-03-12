# ad-arma Museum

The museum is now driven by a shared runtime instead of per-page inline copies.

## Shared files

- `museum/shared/museum.css`
- `museum/shared/page.js`
- `museum/shared/lobby.js`
- `museum/shared/viewer-shell.js`
- `museum/shared/stl-viewer.js`
- `museum/shared/sketchfab-viewer.js`
- `museum/shared/catalog.js`

## What lives in the catalog

Each piece entry in `museum/shared/catalog.js` carries:

- its canonical path
- which museum section it belongs to
- viewer type (`stl` or `sketchfab`)
- tuned viewer defaults and scene orientation
- source and attribution metadata

The lobby is generated from the same catalog, so adding or changing a piece now updates both the museum index and the piece page metadata in one place.

## Adding another piece

1. Add the asset files in the piece directory you want to publish.
2. Add a piece entry to `museum/shared/catalog.js`.
3. Create the route folder with the shared museum bootstrap `index.html`.
4. If the piece belongs in a new grouping, add a section to `museumSections`.

## Current audit outcomes

- Piece pages now share one viewer shell and one source/attribution treatment.
- The lobby can list every live museum piece from the catalog rather than hand-maintained HTML.
- Future museum work should go through `museum/shared/catalog.js` first, not through one-off inline page edits.
- The long-range sculpture queue now lives in `museum/BACKLOG.md`, so future additions can be tracked in batches instead of ad hoc.
