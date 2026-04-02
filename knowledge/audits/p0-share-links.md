## 0) Meta
- **Feature-ID**: p0-share-links
- **Scope**:
  - `app/api/share/[token]/route.ts`
  - `app/api/share/[token]/access/route.ts`
  - `lib/db/shares.ts`
  - `lib/share-access.ts`
  - `app/share/[token]/page.tsx`
- **Risk**: P0
- **Status**: in_review

## 1) Threat model (light)
- **Assets**: Scan-Ergebnisse, Screenshots/Videos, Share-Token, Passwort-Hash
- **Attackers**: anonymous, shared-link recipients
- **Primary abuse paths**:
  - Token enumeration/guessing
  - Zugriff auf sensitive Artefakte (screenshots/video) ohne Passwort
  - Password brute force auf `/access`

## 2) Security checks (current state)
### AuthZ / Access Control
- `GET /api/share/[token]` ist **öffentlich**; Passwortschutz via Bearer Access Token (HMAC) wenn `passwordHash` gesetzt.
- Mutationen (DELETE/PATCH) sind **auth required** + ownership (über `deleteShare(token, userId)` bzw. `share.userId`).

### Rate limiting
- **TODO**: explizite Rate Limits für `/access` (Passwort brute force) und `/share/[token]` (Enumeration) verifizieren/ergänzen.

### Evidence
- Tests: `__tests__/api/share-token.test.ts` deckt 404/403/200 und access-token issuance ab.

## 3) Findings & actions
- [ ] (med) Rate limit für `/api/share/[token]/access` ergänzen + tests
- [ ] (med) Token entropy & expiry policy dokumentieren (DoD: min length/charset)

