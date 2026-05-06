const form = document.querySelector("#search-form");
const resultsRoot = document.querySelector("#results");
const providerStatus = document.querySelector("#provider-status");
const privacyNotice = document.querySelector("#privacy-notice");
const submitButton = form.querySelector("button[type='submit']");

checkHealth();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = {
    query: String(formData.get("query") || "").trim(),
    targetType: String(formData.get("targetType") || "business"),
    location: String(formData.get("location") || "").trim()
  };

  setLoading(true);

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Arama başarısız oldu.");
    }

    renderResults(data);
  } catch (error) {
    renderError(error.message);
  } finally {
    setLoading(false);
  }
});

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    providerStatus.textContent = data.providerConfigured ? "Canlı arama hazır" : "Demo modu";
    providerStatus.classList.toggle("live", data.providerConfigured);
  } catch {
    providerStatus.textContent = "API kapalı";
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Aranıyor" : "Ara";
}

function renderResults(data) {
  privacyNotice.textContent = data.privacyNotice;

  resultsRoot.innerHTML = `
    <div class="summary-panel">
      <div class="metrics">
        <span class="pill">${escapeHtml(data.provider)} · ${data.mode === "live" ? "canlı" : "demo"}</span>
        <span class="pill">Güven skoru ${Number(data.confidence)} / 100</span>
        <span class="pill">${data.sources.length} kaynak</span>
      </div>
      <p class="summary-copy">${escapeHtml(data.summary)}</p>
    </div>

    <div class="result-grid">
      <div class="section">
        <h2>Sosyal ve profesyonel profiller</h2>
        ${renderSocial(data.socialProfiles)}
      </div>

      <div class="section">
        <h2>${data.targetType === "person" ? "Kaynak politikası" : "İletişim"}</h2>
        ${data.targetType === "person" ? renderPersonPolicy(data) : renderContacts(data.contacts)}
      </div>

      <div class="section">
        <h2>Resmi kaynak adayları</h2>
        ${renderOfficial(data.officialSources)}
      </div>

      <div class="section">
        <h2>Arama kaynakları</h2>
        ${renderSources(data.sources)}
      </div>
    </div>
  `;
}

function renderSocial(items) {
  if (!items.length) {
    return `<p class="muted">Sosyal profil adayı bulunamadı.</p>`;
  }

  return `
    <div class="list">
      ${items.map((item) => `
        <a class="social-row" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(item.platform)}</strong>
          <span>${escapeHtml(item.title || item.sourceHost)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderContacts(items) {
  if (!items.length) {
    return `<p class="muted">İşletme/kurum iletişimi için kaynaklı kayıt bulunamadı.</p>`;
  }

  return `
    <div class="list">
      ${items.map((item) => `
        <a class="contact-row" href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">
          <strong>${labelContactType(item.type)}</strong>
          <span>${escapeHtml(item.value)}</span>
          <span>${escapeHtml(item.sourceHost)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderPersonPolicy(data) {
  return `
    <div class="contact-row">
      <strong>Gizlilik filtresi aktif</strong>
      <span>${escapeHtml(data.privacyNotice)}</span>
    </div>
  `;
}

function renderOfficial(items) {
  if (!items.length) {
    return `<p class="muted">Resmi kaynak adayı bulunamadı.</p>`;
  }

  return `
    <div class="list">
      ${items.map((item) => `
        <a class="official-row" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.host)} · ${escapeHtml(item.confidence)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderSources(items) {
  if (!items.length) {
    return `<p class="muted">Kaynak bulunamadı.</p>`;
  }

  return `
    <div>
      ${items.map((item) => `
        <article class="source-card">
          <div>
            <a class="source-title" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || item.host)}</a>
            <div class="source-meta">
              <span>${escapeHtml(item.sourceLabel || "Web kaynağı")}</span>
              <span>${escapeHtml(trustLabel(item.sourceTrust))}</span>
            </div>
            <p class="source-snippet">${escapeHtml(item.snippet || "")}</p>
          </div>
          <span class="source-host">${escapeHtml(item.host)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderError(message) {
  resultsRoot.innerHTML = `
    <div class="empty-state error">
      <h2>Arama tamamlanamadı.</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function labelContactType(type) {
  const labels = {
    email: "E-posta",
    phone: "Telefon",
    address: "Adres"
  };
  return labels[type] || type;
}

function trustLabel(trust) {
  const labels = {
    high: "yüksek güven",
    medium: "orta güven",
    low: "kontrol gerekli"
  };
  return labels[trust] || "kontrol gerekli";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
