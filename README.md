# WV Family Support Center Map

A GitHub Pages-ready interactive directory for the 2025–2026 West Virginia Family Support Centers.

## Upload these files exactly as shown

- `index.html`
- `style.css`
- `app.js`
- `data/fsc-centers.json`
- `assets/wv-doh-logo.jpg`

## Publish on GitHub Pages

1. Create a repository named `wv-family-support-center-map`.
2. Upload the contents of this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish the site.

## Data notes

The center records are transcribed from the supplied 2025–2026 Family Support Center Directory.
The supplied map states that Family Support Centers serve 54 counties.
Jackson County is not listed in the directory and appears without a current FSC on the supplied map.
West Liberty FSC is stored as a special center serving rural Ohio and Brooke, matching the supplied map annotation.

Source values were preserved as supplied rather than silently corrected. This matters for items such as names,
ZIP codes, email addresses, and spellings that may later need verification with the program owner.

## Future additions

`fsc-centers.json` is intentionally ready for:
- `residentVolume`
- `countyWebsite`
- `additionalLinks`

Those can be added later without rebuilding the core site.

## Map

The site requests county polygons from a public West Virginia GIS ArcGIS service at runtime. No API key or
street-level geocoding is used.
