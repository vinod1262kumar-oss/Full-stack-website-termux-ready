document.addEventListener("DOMContentLoaded", () => {
  const API = "/api";

  // Mobile navigation
  const menuBtn = document.getElementById("menuBtn");
  const navMenu = document.getElementById("navMenu");
  if (menuBtn && navMenu) {
    menuBtn.addEventListener("click", () => {
      navMenu.classList.toggle("show");
      menuBtn.textContent = navMenu.classList.contains("show") ? "✕" : "☰";
    });
    navMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      navMenu.classList.remove("show");
      menuBtn.textContent = "☰";
    }));
  }

  // Glass button ripple
  document.querySelectorAll(".glass-btn").forEach(button => {
    button.addEventListener("click", function(event) {
      const ripple = document.createElement("span");
      ripple.classList.add("ripple");
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (event.clientX - rect.left - size / 2) + "px";
      ripple.style.top = (event.clientY - rect.top - size / 2) + "px";
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  // Track a lightweight page view. No personal information is collected here.
  api("/analytics/page-view", {
    method: "POST",
    body: JSON.stringify({
      page: location.pathname,
      propertyId: new URLSearchParams(location.search).get("property") || null
    })
  }).catch(() => {});

  async function loadProperties() {
    const grid = document.getElementById("propertyGrid");
    if (!grid) return;

    try {
      const properties = await api("/properties");
      if (!properties.length) {
        grid.innerHTML = '<p class="empty-state">No properties are currently available.</p>';
        return;
      }

      grid.innerHTML = properties.map((p, i) => `
        <article class="property-card">
          <div class="property-image" style="background-image:url('${escapeAttr(p.image_url || fallbackImage(i))}')"></div>
          <div class="property-info">
            <span>${escapeHtml(p.type)}</span>
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.beds)} Beds • ${escapeHtml(p.baths)} Baths • ${escapeHtml(p.area)}</p>
            <a class="small-btn property-btn" href="property-details.html?property=${encodeURIComponent(p.slug)}">View Details →</a>
          </div>
        </article>
      `).join("");
    } catch (err) {
      grid.innerHTML = '<p class="empty-state">Unable to load properties right now.</p>';
    }
  }

  async function loadFeatured() {
    const grid = document.getElementById("featuredPropertyGrid");
    if (!grid) return;
    try {
      const properties = await api("/properties");
      grid.innerHTML = properties.slice(0, 3).map((p, i) => `
        <article class="property-card">
          <div class="property-image" style="background-image:url('${escapeAttr(p.image_url || fallbackImage(i))}')"></div>
          <div class="property-info">
            <span>${escapeHtml(p.type)}</span>
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.beds)} Beds • ${escapeHtml(p.baths)} Baths • ${escapeHtml(p.area)}</p>
            <a href="property-details.html?property=${encodeURIComponent(p.slug)}" class="small-btn">View Property →</a>
          </div>
        </article>
      `).join("");
    } catch {}
  }

  async function loadPropertyDetail() {
    const nameEl = document.getElementById("propertyName");
    if (!nameEl) return;

    const slug = new URLSearchParams(location.search).get("property");
    if (!slug) return;

    try {
      const p = await api("/properties/" + encodeURIComponent(slug));
      document.title = `${p.name} | AURA ESTATES`;
      document.getElementById("propertyType").textContent = p.type;
      document.getElementById("propertyName").textContent = p.name;
      document.getElementById("propertyDescription").textContent = p.description || "";
      document.getElementById("propertyOverview").textContent = p.overview || "";
      document.getElementById("propertyPrice").textContent = p.price || "";
      document.getElementById("propertyBeds").textContent = p.beds || "";
      document.getElementById("propertyBaths").textContent = p.baths || "";
      document.getElementById("propertyArea").textContent = p.area || "";
      const hero = document.getElementById("propertyHeroImage");
      if (hero && p.image_url) hero.style.backgroundImage = `url("${p.image_url}")`;
      const type = document.getElementById("propertyTypeValue");
      if (type) type.textContent = p.type || "";
      const enquire = document.getElementById("propertyEnquire");
      if (enquire) enquire.href = `contact.html?property=${encodeURIComponent(p.slug)}`;
    } catch {
      nameEl.textContent = "Property Not Found";
      document.getElementById("propertyDescription").textContent = "This property may have been removed.";
    }
  }

  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    const params = new URLSearchParams(location.search);
    const propertySlug = params.get("property");
    if (propertySlug) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "propertySlug";
      hidden.value = propertySlug;
      contactForm.appendChild(hidden);
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formMessage = document.getElementById("formMessage");
      const payload = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone")?.value.trim() || "",
        message: document.getElementById("message").value.trim(),
        propertySlug: contactForm.querySelector('[name="propertySlug"]')?.value || null
      };

      if (!payload.name || !payload.email || !payload.message) {
        formMessage.textContent = "Please complete all required fields.";
        return;
      }

      try {
        await api("/leads", { method: "POST", body: JSON.stringify(payload) });
        formMessage.textContent = `Thank you, ${payload.name}! Your enquiry has been received.`;
        contactForm.reset();
      } catch (err) {
        formMessage.textContent = err.message || "Unable to send your enquiry.";
      }
    });
  }

  function fallbackImage(i) {
    return [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85"
    ][i % 3];
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escapeAttr(value) { return escapeHtml(value); }

  loadProperties();
  loadFeatured();
  loadPropertyDetail();
});
