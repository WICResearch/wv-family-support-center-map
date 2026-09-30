const DATA_URL = "data/fsc-centers.json";
const COUNTY_GEOJSON_URL = "data/wv-counties.geojson";

let appData;
let map;
let countyLayer;
let selectedCounty = null;


/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */

const normalizeCounty = value =>
  String(value || "")
    .replace(/\s+County$/i, "")
    .trim();


const escapeHTML = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    ch => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[ch])
  );


function countyNameFromFeature(feature){

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


/* -------------------------------------------------
   CENTER LOOKUPS
-------------------------------------------------- */

function directCenters(county){

  return appData.centers.filter(
    c => c.county === county
  );

}


function specialCenters(county){

  return (appData.specialCenters || []).filter(
    c =>
      (c.serviceCounties || [])
        .includes(county)
  );

}


function allCentersForCounty(county){

  return [
    ...directCenters(county),
    ...specialCenters(county)
  ];

}


function countyCount(county){

  return allCentersForCounty(county).length;

}


/* -------------------------------------------------
   MAP COLORS
-------------------------------------------------- */

function fillForCounty(county){

  const n = countyCount(county);

  if(n > 1){
    return "#ffae00";
  }

  return "#00cfa6";

}


function countyStyle(feature){

  const county =
    countyNameFromFeature(feature);

  const selected =
    selectedCounty === county;

  return {

    color:
      selected
        ? "#004d61"
        : "#ffffff",

    weight:
      selected
        ? 4
        : 2,

    fillColor:
      fillForCounty(county),

    fillOpacity:
      selected
        ? 1
        : .88

  };

}


/* -------------------------------------------------
   COUNTY MAP
-------------------------------------------------- */

function onEachCounty(feature,layer){

  const county =
    countyNameFromFeature(feature);

  const n =
    countyCount(county);

  const wording =
    n === 1
      ? "1 Family Support Center"
      : `${n} centers / services`;


  layer.bindTooltip(

    `
      <strong>${escapeHTML(county)} County</strong>
      <br>
      ${wording}
      <br>
      <span style="font-size:.72rem;color:#60747c">
        Click to view
      </span>
    `,

    {
      sticky:true,
      direction:"top"
    }

  );


  layer.on({

    mouseover:e => {

      if(selectedCounty !== county){

        e.target.setStyle({
          weight:4,
          fillOpacity:1
        });

      }

    },


    mouseout:e => {

      if(countyLayer){
        countyLayer.resetStyle(e.target);
      }

    },


    click:() => {

      selectCounty(
        county,
        true
      );

    }

  });


  /* County name directly on map */

  layer.bindTooltip(
    county,
    {
      permanent:true,
      direction:"center",
      className:"county-map-label",
      opacity:1
    }
  );

}


/* -------------------------------------------------
   SELECT COUNTY
-------------------------------------------------- */

function selectCounty(
  county,
  fit=false
){

  if(!county){
    return;
  }

  selectedCounty =
    county;


  if(countyLayer){

    countyLayer.setStyle(
      countyStyle
    );

  }


  renderCountyPanel(
    county
  );


  const dropdown =
    document.getElementById(
      "countySelect"
    );

  if(dropdown){

    dropdown.value =
      county;

  }


  if(
    fit &&
    countyLayer
  ){

    countyLayer.eachLayer(
      layer => {

        if(
          countyNameFromFeature(
            layer.feature
          ) === county
        ){

          map.fitBounds(
            layer.getBounds(),
            {
              padding:[55,55],
              maxZoom:8
            }
          );

        }

      }
    );

  }


  if(
    window.innerWidth < 1000
  ){

    document
      .getElementById(
        "countyPanel"
      )
      .scrollIntoView({
        behavior:"smooth",
        block:"start"
      });

  }

}


/* -------------------------------------------------
   PHONE + EMAIL
-------------------------------------------------- */

function emailLinks(raw){

  if(!raw){
    return "";
  }

  const emails =
    raw
      .split(/\s*\/\s*/)
      .map(s => s.trim())
      .filter(Boolean);


  return emails
    .map(
      e =>
        `
        <a
          class="action-link secondary"
          href="mailto:${escapeHTML(e)}"
        >
          Email
        </a>
        `
    )
    .join("");

}


function phoneLink(raw){

  if(!raw){
    return "";
  }

  const first =
    raw.match(
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/
    );


  const tel =
    first
      ? first[0]
          .replace(/\D/g,"")
      : "";


  return tel
    ? `
      <a
        class="action-link"
        href="tel:${tel}"
      >
        Call ${escapeHTML(first[0])}
      </a>
      `
    : "";

}


/* -------------------------------------------------
   CENTER CARD
-------------------------------------------------- */

function centerMarkup(
  center,
  special=false
){

  const address =
    (center.address || [])
      .map(escapeHTML)
      .join("<br>");


  return `

    <article class="center-card">

      <div class="center-name">
        ${escapeHTML(center.name)}
      </div>


      ${
        address
          ? `
            <p class="detail">
              <strong>Address</strong>
              <br>
              ${address}
            </p>
          `
          : ""
      }


      ${
        center.phone
          ? `
            <p class="detail">
              <strong>Phone:</strong>
              ${escapeHTML(center.phone)}
            </p>
          `
          : ""
      }


      ${
        center.director
          ? `
            <p class="detail">
              <strong>Director:</strong>
              ${escapeHTML(center.director)}
            </p>
          `
          : ""
      }


      ${
        center.email
          ? `
            <p class="detail">
              <strong>Email:</strong>
              ${escapeHTML(center.email)}
            </p>
          `
          : ""
      }


      ${
        special &&
        center.note
          ? `
            <p class="special-note">
              ${escapeHTML(center.note)}
            </p>
          `
          : ""
      }


      <div class="actions">

        ${phoneLink(center.phone)}

        ${emailLinks(center.email)}

      </div>

    </article>

  `;

}


/* -------------------------------------------------
   COUNTY PROFILE PANEL
-------------------------------------------------- */

function renderCountyPanel(county){

  const panel =
    document.getElementById(
      "countyPanel"
    );


  const direct =
    directCenters(county);


  const special =
    specialCenters(county);


  const total =
    direct.length +
    special.length;


  const centerText =
    total === 1
      ? "1 Family Support Center"
      : `${total} Family Support Centers / Services`;


  panel.innerHTML = `

    <div class="county-panel-header">

      <span class="county-badge">
        West Virginia
      </span>

      <h2>
        ${escapeHTML(county)} County
      </h2>

      <p>
        ${centerText}
      </p>

    </div>


    ${direct
      .map(
        c =>
          centerMarkup(c)
      )
      .join("")
    }


    ${special
      .map(
        c =>
          centerMarkup(
            c,
            true
          )
      )
      .join("")
    }


    <div
      class="future-fields"
      hidden
    >

      <!--

      Future Daniel additions:

      countyWebsite
      residentVolume
      additionalLinks

      -->

    </div>

  `;

}


/* -------------------------------------------------
   DIRECTORY
-------------------------------------------------- */

function renderDirectory(
  filter=""
){

  const q =
    filter
      .trim()
      .toLowerCase();


  const grid =
    document.getElementById(
      "directoryGrid"
    );


  const records = [

    ...appData.centers,

    ...(appData.specialCenters || [])
      .map(
        c => ({
          ...c,
          county:"Regional"
        })
      )

  ];


  const matches =
    records.filter(
      c => {

        const haystack = [

          c.county,
          c.name,

          ...(c.address || []),

          c.phone,
          c.director,
          c.email,

          ...(c.serviceCounties || [])

        ]
          .join(" ")
          .toLowerCase();


        return haystack.includes(q);

      }
    );


  grid.innerHTML =
    matches
      .map(
        c => {

          const countyLabel =
            c.county === "Regional"
              ? `${(c.serviceCounties || []).join(" + ")} Service`
              : `${c.county} County`;


          const address =
            (c.address || [])
              .map(escapeHTML)
              .join(" · ");


          return `

            <article
              class="directory-card"
              tabindex="0"

              data-county="${escapeHTML(c.county)}"

              data-services="${escapeHTML(
                (c.serviceCounties || [])
                  .join("|")
              )}"
            >

              <span class="county-label">
                ${escapeHTML(countyLabel)}
              </span>


              <h3>
                ${escapeHTML(c.name)}
              </h3>


              ${
                address
                  ? `
                    <p>
                      ${address}
                    </p>
                  `
                  : ""
              }


              ${
                c.phone
                  ? `
                    <p>
                      ${escapeHTML(c.phone)}
                    </p>
                  `
                  : ""
              }

            </article>

          `;

        }
      )
      .join("");


  document
    .getElementById(
      "noResults"
    )
    .hidden =
      matches.length > 0;


  grid
    .querySelectorAll(
      ".directory-card"
    )
    .forEach(
      card => {

        const activate =
          () => {

            let county =
              card.dataset.county;


            if(
              county ===
              "Regional"
            ){

              county =
                (
                  card.dataset.services ||
                  ""
                )
                  .split("|")[0];

            }


            if(county){

              selectCounty(
                county,
                true
              );

            }


            document
              .querySelector(
                ".explorer"
              )
              .scrollIntoView({
                behavior:"smooth"
              });

          };


        card.addEventListener(
          "click",
          activate
        );


        card.addEventListener(
          "keydown",
          e => {

            if(
              e.key === "Enter" ||
              e.key === " "
            ){

              e.preventDefault();

              activate();

            }

          }
        );

      }
    );

}


/* -------------------------------------------------
   STATS
-------------------------------------------------- */

function updateStats(){

  document
    .getElementById(
      "servedCount"
    )
    .textContent =
      appData.metadata.countiesServed;


  document
    .getElementById(
      "locationCount"
    )
    .textContent =

      appData.centers.length +

      (
        appData.specialCenters ||
        []
      ).length;

}


/* -------------------------------------------------
   COUNTY DROPDOWN
-------------------------------------------------- */

function buildCountyDropdown(){

  const select =
    document.getElementById(
      "countySelect"
    );


  const counties =
    [
      ...new Set(
        appData.centers
          .map(
            c => c.county
          )
      )
    ]
      .sort(
        (a,b) =>
          a.localeCompare(b)
      );


  counties.forEach(
    county => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        county;


      option.textContent =
        `${county} County`;


      select.appendChild(
        option
      );

    }
  );


  select.addEventListener(
    "change",
    e => {

      if(
        e.target.value
      ){

        selectCounty(
          e.target.value,
          true
        );

      }

    }
  );

}


/* -------------------------------------------------
   RESET MAP
-------------------------------------------------- */

function resetMap(){

  selectedCounty =
    null;


  if(countyLayer){

    countyLayer.setStyle(
      countyStyle
    );


    map.fitBounds(
      countyLayer.getBounds(),
      {
        padding:[25,25]
      }
    );

  }


  const select =
    document.getElementById(
      "countySelect"
    );


  if(select){
    select.value = "";
  }


  document
    .getElementById(
      "countyPanel"
    )
    .innerHTML = `

      <div class="empty-state">

        <div class="map-pin">
          WV
        </div>

        <span class="eyebrow">
          Statewide Support
        </span>

        <h3>
          Select a County
        </h3>

        <p>
          Click a county on the map
          or select one from the menu
          to view local Family Support
          Center information.
        </p>

      </div>

    `;

}


/* -------------------------------------------------
   INITIALIZE MAP
-------------------------------------------------- */

async function initMap(){

  map =
    L.map(
      "map",
      {

        zoomControl:true,

        scrollWheelZoom:false,

        attributionControl:false

      }
    );


  map.setView(
    [
      38.65,
      -80.6
    ],
    7
  );


  try{

    const response =
      await fetch(
        COUNTY_GEOJSON_URL
      );


    if(
      !response.ok
    ){

      throw new Error(
        `County data returned ${response.status}`
      );

    }


    const geojson =
      await response.json();


    countyLayer =
      L.geoJSON(
        geojson,
        {

          style:
            countyStyle,

          onEachFeature:
            onEachCounty

        }
      )
      .addTo(map);


    map.fitBounds(
      countyLayer.getBounds(),
      {
        padding:[25,25]
      }
    );


  }catch(error){

    console.error(error);


    document
      .getElementById(
        "map"
      )
      .innerHTML = `

        <div
          style="
            padding:40px;
            text-align:center;
          "
        >

          <strong>
            County map could not load.
          </strong>

          <br>

          The searchable directory
          below is still available.

        </div>

      `;

  }

}


/* -------------------------------------------------
   INITIALIZE APP
-------------------------------------------------- */

async function init(){

  const response =
    await fetch(
      DATA_URL
    );


  if(
    !response.ok
  ){

    throw new Error(
      `Directory data returned ${response.status}`
    );

  }


  appData =
    await response.json();


  updateStats();

  buildCountyDropdown();

  renderDirectory();

  await initMap();


  const search =
    document.getElementById(
      "countySearch"
    );


  search.addEventListener(
    "input",
    e =>
      renderDirectory(
        e.target.value
      )
  );


  document
    .getElementById(
      "clearSearch"
    )
    .addEventListener(
      "click",
      () => {

        search.value = "";

        renderDirectory();

        search.focus();

      }
    );


  document
    .getElementById(
      "resetMap"
    )
    .addEventListener(
      "click",
      resetMap
    );

}


init()
  .catch(
    error => {

      console.error(error);


      document.body
        .insertAdjacentHTML(
          "beforeend",

          `
            <p
              style="
                padding:20px;
                text-align:center;
              "
            >
              The directory data
              could not be loaded.
              Please refresh the page.
            </p>
          `
        );

    }
  );
