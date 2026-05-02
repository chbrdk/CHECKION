# SEO keyword stopwords (CHECKION)

- **Approach:** Linguistic stopword lists (not ML). The npm package [`stopword`](https://www.npmjs.com/package/stopword) ships Lucene-style arrays for **English (`eng`)** and **German (`deu`)**; we merge them with a small **extra** list (UI/URL/language codes) in `lib/seo-stopwords.ts`.
- **Single source:** `SEO_STOPWORDS` / `SEO_STOPWORD_LIST` — injected into Puppeteer `page.evaluate` for keyword frequency so the scanner matches `isSeoStopword()` used in domain aggregation.
- **Heuristics:** Tokens shorter than 3 characters and pure numeric tokens are dropped before ranking.
- **Tests:** `__tests__/lib/seo-stopwords.test.ts`.

For additional languages later, add another export from `stopword` (e.g. `fra`) into the merge in `buildSeoStopwordSet`.
