## 0) Meta
- **Feature-ID**: p0-auth-admin
- **Scope**:
  - `app/api/auth/**`
  - `app/api/admin/users/**`
  - `lib/auth-admin-api.ts`
  - `lib/auth-api-token.ts`
  - `lib/plexon-auth.ts`
- **Risk**: P0
- **Status**: in_review

## 1) Threat model (light)
- **Assets**: user accounts, sessions/tokens, password changes, admin operations
- **Attackers**: unauthenticated, authenticated user, admin-key holder
- **Primary abuse paths**: IDOR, weak admin key, missing rate limits, password brute force

## 2) Current evidence
- Unit test: `__tests__/lib/auth-admin-api.test.ts` verifies key validation rules.

## 3) Open checks (to complete in this audit)
- [ ] Verify that all auth routes use consistent error handling (`apiError`, `API_STATUS`)\n+- [ ] Verify rate limiting on auth endpoints (register/login/change-password/token mgmt)\n+- [ ] Verify user object ownership checks on token deletion (`/api/auth/tokens/[id]`)\n+
