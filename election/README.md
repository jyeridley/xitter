# Election Night in America (/i/electionnov22)

Jye's Claude artifact, served by Xitter at /i/electionnov22 (src/election.ts).

- index.html: the artifact as exported, unchanged. src/election.ts rewrites a
  few things when it serves it (title, fonts, county data URLs) and adds
  election-shim.js, which stands in for Claude's `claude.use("db" | "user" | "room")`.
- counties/: the artifact's county data.
- fonts/: Barlow and Barlow Condensed (SIL Open Font License), latin and latin-ext,
  from Google Fonts, so the page needs no outside requests.
