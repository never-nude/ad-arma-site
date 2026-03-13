const MODULE_VERSION = "20260313-0018";

let catalogPromise = null;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = import(`./catalog.js?v=${MODULE_VERSION}`);
  }
  return catalogPromise;
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function renderBootError(message, error) {
  console.error(error);
  document.body.innerHTML = `<p style="margin:16px;font-family:IBM Plex Sans, Avenir Next, sans-serif;color:#2f2a22;">${message}</p>`;
}

export async function initMuseumLobbyPage() {
  try {
    const [{ museumLobby, museumPieces }, { renderMuseumLobby }] = await Promise.all([
      loadCatalog(),
      import(`./lobby.js?v=${MODULE_VERSION}`)
    ]);
    renderMuseumLobby(museumLobby, museumPieces);
  } catch (error) {
    renderBootError("Failed to load the museum lobby.", error);
  }
}

export async function initMuseumPiecePage(pieceId) {
  const { museumPieces } = await loadCatalog();
  const piece = museumPieces[pieceId];
  if (!piece) {
    renderBootError(`Unknown museum piece: ${pieceId}`, new Error(`Unknown museum piece: ${pieceId}`));
    return;
  }

  try {
    if (piece.kind === "stl") {
      const { initStlMuseumPage } = await import(`./stl-viewer.js?v=${MODULE_VERSION}`);
      await initStlMuseumPage(piece);
      return;
    }

    if (piece.kind === "sketchfab") {
      const { initSketchfabMuseumPage } = await import(`./sketchfab-viewer.js?v=${MODULE_VERSION}`);
      await initSketchfabMuseumPage(piece);
      return;
    }

    throw new Error(`Unsupported museum piece kind: ${piece.kind}`);
  } catch (error) {
    renderBootError(`Failed to initialize ${piece.viewerTitle}.`, error);
  }
}

export async function initMuseumPageForCurrentPath() {
  try {
    const { museumRouteMap } = await loadCatalog();
    const currentPath = normalizePath(window.location.pathname);

    if (currentPath === "/museum/") {
      await initMuseumLobbyPage();
      return;
    }

    const pieceId = museumRouteMap[currentPath];
    if (!pieceId) {
      renderBootError(`No museum entry is registered for ${currentPath}`, new Error(`Unknown museum route: ${currentPath}`));
      return;
    }

    await initMuseumPiecePage(pieceId);
  } catch (error) {
    renderBootError("Failed to initialize the museum page.", error);
  }
}
