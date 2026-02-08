(() => {
  const API_BASE = "https://swapi.py4e.com/api";
  const DEFAULT_ENDPOINT = `${API_BASE}/people/?page=1`;

  const elements = {
    search: document.getElementById("search"),
    btnPrev: document.getElementById("btnPrev"),
    btnNext: document.getElementById("btnNext"),
    status: document.getElementById("status"),
    results: document.getElementById("results"),
  };

  const state = {
    currentUrl: DEFAULT_ENDPOINT,
    nextUrl: null,
    prevUrl: null,
    lastQuery: "",
    inFlight: null,
  };

  const debounce = (fn, delayMs) => {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delayMs);
    };
  };

  const setStatus = (text) => {
    elements.status.textContent = text ?? "";
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const personIdFromUrl = (url) => {
    // e.g. https://swapi.py4e.com/api/people/1/
    const match = String(url).match(/\/people\/(\d+)\/?$/);
    return match?.[1] ?? "";
  };

  const cardHtml = (person) => {
    const id = personIdFromUrl(person.url);
    const name = escapeHtml(person.name);
    const birthYear = escapeHtml(person.birth_year);
    const gender = escapeHtml(person.gender);
    const height = escapeHtml(person.height);
    const mass = escapeHtml(person.mass);

    return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card sw-card h-100">
          <div class="card-body">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <h5 class="card-title mb-1">${name}</h5>
              <span class="badge text-bg-dark sw-badge">#${escapeHtml(id || "—")}</span>
            </div>
            <div class="card-subtitle mb-3 text-body-secondary">${birthYear}</div>
            <div class="row g-2 small">
              <div class="col-6"><span class="sw-k">Género:</span> ${gender}</div>
              <div class="col-6"><span class="sw-k">Altura:</span> ${height} cm</div>
              <div class="col-6"><span class="sw-k">Peso:</span> ${mass} kg</div>
              <div class="col-6"><span class="sw-k">Films:</span> ${escapeHtml(person.films?.length ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderResults = (people) => {
    if (!people?.length) {
      elements.results.innerHTML = `<div class="col-12"><div class="alert alert-dark mb-0">Sin resultados.</div></div>`;
      return;
    }
    elements.results.innerHTML = people.map(cardHtml).join("");
  };

  const setNavButtons = () => {
    elements.btnPrev.disabled = !state.prevUrl || Boolean(state.inFlight);
    elements.btnNext.disabled = !state.nextUrl || Boolean(state.inFlight);
  };

  const fetchJson = async (url, { signal } = {}) => {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const loadPage = async (url, { reason } = {}) => {
    if (!url) return;

    if (state.inFlight) state.inFlight.abort();
    const controller = new AbortController();
    state.inFlight = controller;

    state.currentUrl = url;
    setNavButtons();
    setStatus(reason ? `${reason}…` : "Cargando…");
    elements.results.innerHTML = `<div class="col-12"><div class="alert alert-dark mb-0">Cargando…</div></div>`;

    try {
      const data = await fetchJson(url, { signal: controller.signal });
      state.nextUrl = data.next;
      state.prevUrl = data.previous;
      renderResults(data.results);
      setStatus(`Mostrando ${data.results?.length ?? 0} personajes.`);
    } catch (error) {
      if (error?.name === "AbortError") return;
      state.nextUrl = null;
      state.prevUrl = null;
      elements.results.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">Error cargando datos (${escapeHtml(error?.message ?? "desconocido")}).</div></div>`;
      setStatus("No se pudo cargar la API.");
    } finally {
      state.inFlight = null;
      setNavButtons();
    }
  };

  const buildSearchUrl = (query) => {
    const q = query.trim();
    if (!q) return DEFAULT_ENDPOINT;
    const params = new URLSearchParams({ search: q });
    return `${API_BASE}/people/?${params.toString()}`;
  };

  const onSearchChange = debounce(() => {
    const query = elements.search.value ?? "";
    if (query.trim() === state.lastQuery.trim()) return;
    state.lastQuery = query;
    loadPage(buildSearchUrl(query), { reason: "Buscando" });
  }, 350);

  elements.search.addEventListener("input", onSearchChange);
  elements.btnPrev.addEventListener("click", () => loadPage(state.prevUrl, { reason: "Cargando" }));
  elements.btnNext.addEventListener("click", () => loadPage(state.nextUrl, { reason: "Cargando" }));

  loadPage(DEFAULT_ENDPOINT);
})();

