# Tracking & audit extensions (8-phase plan)

Central references:

- Types: `lib/types.ts` — `ConsentSignals`, extended `SecurityAudit`, `UxResult.longTasks` / `formAccessibility`, `SeoAudit.jsonLdRichResultGaps`, `performance.nextHopProtocol`, `scriptTransferBytesApprox`, `TechnicalInsights` cache hints, `eco.greenWeb*`.
- Scanner: `lib/scanner.ts` — collects signals; Green Web when `GREEN_WEB_API_ENABLED=1` (see `lib/external-apis.ts`).
- Domain rollup: `lib/domain-aggregation.ts` — `aggregateSeo` duplicates/canonical/hreflang; `aggregateInfra` consent + security counts; `aggregateUx` lab long-tasks / script bytes.
- UI: `PrivacyCard`, `SecurityCard`, `InfraCard`, `EcoCard`, `SeoCard`, `UxCard`, domain `DomainResultLinksSeoSection`, `DomainResultInfraSection`, `DomainResultUxAuditSection`.
- Tests: `__tests__/lib/consent-signals-merge.test.ts`, `domain-aggregation-seo-dup.test.ts`.

i18n keys live under `results.*` (single-scan cards) and `domainResult.*` (domain tabs).
