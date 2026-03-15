# Security-Header-Check (Struktur & Ablauf)

## Wo implementiert

- **Erfassung:** `lib/scanner.ts` – bei der Puppeteer-Navigation wird auf das `response`-Event gehört.
- **Auswertung:** Security-Header (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy) werden aus `mainHeaders` gelesen (lowercase Keys, siehe Kommentar im Code).
- **Anzeige:** Results-Page (Security Headers Card), Domain-Aggregation, PDF-Report, Share-View.

## Wichtig: Finale Dokument-Response nutzen

Die Header müssen von der **finalen Dokument-Response (2xx)** kommen, nicht von einer Redirect-Response (301/302). Redirects liefern in der Regel keine Security-Header; die stehen auf der abschließenden 200-Antwort.

- **Vorher:** Es wurde nur die **erste** Response mit passender URL ausgewertet (`!serverIp`). Bei Weiterleitung war das oft die 301/302 → Anzeige fast immer „Missing“.
- **Jetzt:** `mainHeaders` wird nur bei Response-URL = Scan-URL **und** Status 2xx gesetzt. Damit zählen nur die Header der letzten (Dokument-)Antwort.

## Redirect auf andere Pfade

Wenn die Ziel-URL zu einer anderen Pfad-URL weiterleitet (z. B. `/foo` → `/bar`), hat die 200-Response eine andere `response.url()`. Die Bedingung „Response-URL = Scan-URL“ trifft dann nicht zu; in solchen Fällen können Security-Header weiterhin als „Missing“ erscheinen. Eine spätere Erweiterung könnte die finale Dokument-URL nach Redirect-Kette auswerten.
