/**
 * SEO keyword stopwords: interface terms, conjunctions, URL fragments.
 * Used to filter topKeywords (scanner) and crossPageKeywords (domain-aggregation).
 * Keep in sync with scanner.ts inline Set for page.evaluate().
 */
export const SEO_STOPWORDS = new Set([
  // DE: Artikel, Bindewörter, häufige Wörter
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
  'und', 'oder', 'aber', 'dass', 'ist', 'sind', 'war', 'waren', 'werden', 'wird',
  'hat', 'haben', 'kann', 'können', 'muss', 'müssen', 'soll', 'sollen',
  'noch', 'auch', 'nur', 'schon', 'sehr', 'bei', 'von', 'zum', 'zur',
  'mit', 'für', 'auf', 'aus', 'nach', 'bis', 'durch', 'gegen', 'ohne', 'um',
  // EN: articles, conjunctions
  'the', 'a', 'an', 'and', 'or', 'but', 'that', 'is', 'are', 'was', 'were',
  'will', 'would', 'has', 'have', 'had', 'can', 'could', 'must', 'should',
  'also', 'only', 'just', 'very', 'with', 'for', 'from', 'to', 'in', 'on', 'at', 'by', 'as',
  'it', 'its', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'how', 'all', 'each', 'every', 'both', 'some', 'any', 'not',
  // Sprachcodes / Kurzwörter
  'en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'ru', 'ja', 'zh',
  // Interface / Fehlerseiten / URL
  'access', 'denied', 'don', 'permission', 'http', 'https', 'www', 'com', 'org', 'net',
  'href', 'url', 'link', 'click', 'login', 'sign', 'cookie', 'session', 'error', 'page',
  'content', 'index', 'home', 'null', 'undefined', 'view', 'edit', 'search', 'menu',
  'submit', 'back', 'next', 'previous', 'loading', 'please', 'wait', 'ok', 'cancel',
  'yes', 'no', 'true', 'false', 'default', 'custom', 'select', 'optional', 'required',
]);

/** Returns true if the keyword should be excluded from SEO keyword lists. */
export function isSeoStopword(keyword: string): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k || k.length < 3) return true; // very short tokens
  return SEO_STOPWORDS.has(k);
}
