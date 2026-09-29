const DATA_URL = "data/fsc-centers.json";
const COUNTY_GEOJSON_URL = "data/wv-counties.geojson";
let appData;
let map;
let countyLayer;
let selectedCounty = null;

const normalizeCounty = value =>
  String(value || "").replace(/\s+County$/i, "").trim();

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[ch]));

function countyNameFromFeature(feature) {
  const p = feature.properties || {};

  const countyName =
    p.County_Name_Modified ||
    p.County_Name ||
    p.NAME ||
    p.name ||
    p.NAMELSAD ||
    p.BASENAME ||
    p.COUNTY ||
    p.county ||
    "";

  return normalizeCounty(countyName);
}

function directCenters(county) {
  return appData.centers.filter(c => c.county === county);
}

function specialCenters(county) {
  return appData.specialCenters.filter(c => (c.serviceCounties || []).includes(county));
}

function allCentersForCounty(county) {
  return [...directCenters(county), ...specialCenters(county)];
}

function countyCount(county) {
  return allCentersForCounty(county).length;
}

function fillForCounty(county) {
  const n = countyCount(county);
  if (n === 0) return "#e8edef";
  if (n > 1) return "#ffae00";
  return "#00cfa6";
}

function countyStyle(feature) {
  const county = countyNameFromFeature(feature);
  return {
    color: "#ffffff",
    weight: selectedCounty === county ? 4 : 2,
    fillColor: fillForCounty(county),
    fillOpacity: selectedCounty === county ? 1 : .86
  };
}

function onEachCounty(feature, layer) {
  const county = countyNameFromFeature(feature);
  const n = countyCount(county);
  const wording = n === 1 ? "1 center" : `${n} centers / services`;
  layer.bindTooltip(`<strong>${escapeHTML(county)} County</strong><br>${n ? wording : "No listed FSC"}`, {
    sticky: true, direction: "top"
  });
  layer.on({
    mouseover: e => e.target.setStyle({weight: 4, fillOpacity: 1}),
    mouseout: e => countyLayer.resetStyle(e.target),
    click: () => selectCounty(county, true)
  });
}

function selectCounty(county, fit = false) {
  selectedCounty = county;
  if (countyLayer) countyLayer.setStyle(countyStyle);
  renderCountyPanel(county);

  if (fit && countyLayer) {
    countyLayer.eachLayer(layer => {
      if (countyNameFromFeature(layer.feature) === county) {
        map.fitBounds(layer.getBounds(), {padding:[35,35], maxZoom:9});
      }
    });
  }
  if (window.innerWidth < 900) {
    document.getElementById("countyPanel").scrollIntoView({behavior:"smooth", block:"start"});
  }
}

function emailLinks(raw) {
  if (!raw) return "";
  const emails = raw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
  return emails.map(e => `<a class="action-link secondary" href="mailto:${escapeHTML(e)}">Email</a>`).join("");
}

function phoneLink(raw) {
  if (!raw) return "";
  const first = raw.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/);
  const tel = first ? first[0].replace(/\D/g,"") : "";
  return tel ? `<a class="action-link" href="tel:${tel}">Call</a>` : "";
}

function centerMarkup(center, special=false) {
  return `<article class="center-card">
    <div class="center-name">${escapeHTML(center.name)}</div>
    <p class="detail"><strong>Address</strong><br>${center.address.map(escapeHTML).join("<br>")}</p>
    <p class="detail"><strong>Phone:</strong> ${escapeHTML(center.phone)}</p>
    <p class="detail"><strong>Director:</strong> ${escapeHTML(center.director)}</p>
    <p class="detail"><strong>Email:</strong> ${escapeHTML(center.email)}</p>
    ${special && center.note ? `<p class="special-note">${escapeHTML(center.note)}</p>` : ""}
    <div class="actions">${phoneLink(center.phone)}${emailLinks(center.email)}</div>
  </article>`;
}

function renderCountyPanel(county) {
  const panel = document.getElementById("countyPanel");
  const direct = directCenters(county);
  const special = specialCenters(county);
  const total = direct.length + special.length;

  panel.innerHTML = `
    <span class="county-badge">${escapeHTML(county)} County</span>
    <h2>${total ? `${total} ${total === 1 ? "Center / Service" : "Centers / Services"}` : "No Listed FSC"}</h2>
    ${!total ? `<p>The supplied 2025–2026 directory does not list a Family Support Center for ${escapeHTML(county)} County.</p>` : ""}
    ${direct.map(c => centerMarkup(c)).join("")}
    ${special.map(c => centerMarkup(c, true)).join("")}
    <div class="future-fields" hidden>
      <!-- Future: countyWebsite, residentVolume, additionalLinks -->
    </div>`;
}

function renderDirectory(filter="") {
  const q = filter.trim().toLowerCase();
  const grid = document.getElementById("directoryGrid");
  const records = [...appData.centers, ...appData.specialCenters.map(c => ({...c, county:"Regional"}))];

  const matches = records.filter(c => {
    const haystack = [
      c.county, c.name, ...(c.address || []), c.phone, c.director, c.email,
      ...(c.serviceCounties || [])
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  });

  grid.innerHTML = matches.map((c, i) => `
    <article class="directory-card" tabindex="0"
      data-county="${escapeHTML(c.county)}"
      data-services="${escapeHTML((c.serviceCounties || []).join("|"))}">
      <span class="county-label">${escapeHTML(c.county === "Regional" ? (c.serviceCounties || []).join(" + ") + " service" : c.county + " County")}</span>
      <h3>${escapeHTML(c.name)}</h3>
      <p>${(c.address || []).map(escapeHTML).join(" · ")}</p>
      <p>${escapeHTML(c.phone)}</p>
    </article>`).join("");

  document.getElementById("noResults").hidden = matches.length > 0;

  grid.querySelectorAll(".directory-card").forEach(card => {
    const activate = () => {
      let county = card.dataset.county;
      if (county === "Regional") county = (card.dataset.services || "").split("|")[0];
      if (county) selectCounty(county, true);
      document.querySelector(".explorer").scrollIntoView({behavior:"smooth"});
    };
    card.addEventListener("click", activate);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") activate(); });
  });
}

function updateStats() {
  const countyNames = new Set(appData.centers.map(c => c.county));
  (appData.specialCenters || []).forEach(c => (c.serviceCounties || []).forEach(x => countyNames.add(x)));

  const counts = {};
  countyNames.forEach(c => counts[c] = countyCount(c));

  document.getElementById("servedCount").textContent = appData.metadata.countiesServed;
  document.getElementById("locationCount").textContent =
    appData.centers.length + appData.specialCenters.length;
  document.getElementById("multiCount").textContent =
    Object.values(counts).filter(n => n > 1).length;
  document.getElementById("unservedCount").textContent =
    55 - appData.metadata.countiesServed;
}

async function initMap() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true
  });

  // No basemap is needed: the county polygons are the map.
  map.setView([38.65, -80.6], 7);

  try {
    const response = await fetch(COUNTY_GEOJSON_URL);
    if (!response.ok) throw new Error(`County service returned ${response.status}`);
    const geojson = await response.json();
    countyLayer = L.geoJSON(geojson, {style:countyStyle, onEachFeature:onEachCounty}).addTo(map);
    map.fitBounds(countyLayer.getBounds(), {padding:[20,20]});
  } catch (error) {
    console.error(error);
    document.getElementById("map").innerHTML =
      `<div style="padding:30px;text-align:center"><strong>County map could not load.</strong><br>
       The searchable directory below is still available.</div>`;
  }
}

async function init() {
  const response = await fetch(DATA_URL);
  appData = await response.json();
  updateStats();
  renderDirectory();
  await initMap();

  const search = document.getElementById("countySearch");
  search.addEventListener("input", e => renderDirectory(e.target.value));
  document.getElementById("clearSearch").addEventListener("click", () => {
    search.value = "";
    renderDirectory();
    search.focus();
  });
}

init().catch(error => {
  console.error(error);
  document.body.insertAdjacentHTML("beforeend",
    `<p style="padding:20px;text-align:center">The directory data could not be loaded. Please refresh the page.</p>`);
});
