# Dashboard redesign verification — 16 September 2026

## Scope

All 15 dashboard destinations were restyled and regrouped. Navigation and page headings use plain names, with contextual guidance. Cases use a named record picker; details use a native dialog with Escape/focus behavior; clickable rows support Enter/Space. The editor and relationship graph use the light palette. API schemas and database migrations were unchanged.

## Checks completed

- TypeScript compilation passed.
- Production Docker build passed, including Next.js TypeScript and static page generation. The host-native Turbopack build could not bind a required worker port; the production build was therefore verified in Docker.
- All 15 destinations opened through Computer browser controls using actual local API data.
- Sidebar search found Script studio using the old name “playground”; keyboard clearing restored navigation.
- Keyboard Enter selected a computer. Identity & risk opened the native dialog; Escape closed it.
- An existing benign test case accepted the named computer attachment. Reattaching the existing computer kept its attachment count at one. Changing the type listed evidence by collector/date/short ID.
- Script studio Validate returned `valid: true` for the process-inventory example.
- Compiler lab comparison returned structural equivalence and two representation hashes.
- Settings showed healthy backend dependencies, AI disabled and YARA unavailable.
- Public AWS dashboard rebuilt successfully. New page names/help were observed in the public browser.
- All 11 `scripts/verify-cloud.py` checks passed after deployment: HTTPS, health, anonymous denial, protected login cookies, five authenticated resources, origin rejection and logout.
- Real screenshots are in the ignored `.local/guide/screenshots/` folder. The guide bundle excludes credentials and keeps real lab telemetry out of Git.

## Limits of this check

- Browser viewport override calls did not change the observed 884px viewport. Responsive CSS was implemented, but a 360px/768px browser layout pass is **not claimed**. The attempted iframe test was not used because the dashboard intentionally denies embedding; that protection was preserved.
- This redesign check reused stored lab observations. It did not run a fresh Windows scan, install a service, enroll PC 2, enable AI/YARA, or validate every collector.
- Backend authorization remains authoritative; some controls are still visible to roles that cannot perform their actions.
- Full-page browser screenshot capture produced unusable oversized canvases; the illustrated guide uses viewport captures instead.

## Deployment

The existing EC2 dashboard service was rebuilt from committed dashboard source. The previous dashboard source was backed up on the server before replacement. Database volumes, agent identities and backend configuration were preserved. SSH remains restricted to one administrator IP; the user approved the updated current-IP restriction in the AWS console.
