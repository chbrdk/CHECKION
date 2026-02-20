/**
 * Central place for app-wide paths and asset URLs.
 * Do not hardcode paths in components – reference these constants.
 */

/** Public path for the black MSQDX logo (PDF reports, print). Resolve with origin in browser: `${window.location.origin}${PDF_LOGO_PATH}` */
export const PDF_LOGO_PATH = '/msqdx-logo-black.svg';

/** Cookie and localStorage key for UI language (de/en). Used by lib/i18n. */
export const LOCALE_STORAGE_KEY = 'checkion_locale';

/** Number of scans per page on the dashboard (single + domain lists). */
export const DASHBOARD_SCANS_PAGE_SIZE = 10;
/** Issues per page on the single-scan results page (list view). */
export const RESULTS_ISSUES_PAGE_SIZE = 50;
/** Search results to show initially; "load more" adds this many. */
export const SEARCH_RESULTS_PAGE_SIZE = 15;
/** Saved journeys per page on the dashboard. */
export const DASHBOARD_JOURNEYS_PAGE_SIZE = 10;
/** Domain scan: pages (URLs) to show initially; "load more" adds this many. */
export const DOMAIN_PAGES_INITIAL = 50;
/** Domain scan: increment when "load more" is clicked. */
export const DOMAIN_PAGES_INCREMENT = 50;
/** Share page (deep scan): scanned pages list page size (prev/next pagination). */
export const SHARE_DOMAIN_PAGES_PAGE_SIZE = 10;

/** Base path for public share landing pages. Full URL: origin + SHARE_PATH + '/' + token */
export const SHARE_PATH = '/share';

/** Cache revalidate times (seconds). Used by lib/cache with unstable_cache. */
export const CACHE_REVALIDATE_SCAN = 60;
export const CACHE_REVALIDATE_DOMAIN = 60;
export const CACHE_REVALIDATE_SHARE = 300;
export const CACHE_REVALIDATE_LIST = 30;

/** Screenshot storage: env key for backend (local disk vs S3). Use "s3" for shared storage across instances. */
export const ENV_SCREENSHOT_STORAGE = 'SCREENSHOT_STORAGE';
/** S3 bucket for screenshots when SCREENSHOT_STORAGE=s3. Fallback: S3_BUCKET. */
export const ENV_SCREENSHOT_S3_BUCKET = 'SCREENSHOT_S3_BUCKET';
/** Optional S3 key prefix (e.g. "screenshots"). */
export const ENV_SCREENSHOT_S3_PREFIX = 'SCREENSHOT_S3_PREFIX';
/** AWS region for S3 (default eu-central-1). */
export const ENV_SCREENSHOT_AWS_REGION = 'SCREENSHOT_AWS_REGION';

/** Optional base URL for the UX Journey Agent (Python/Browser Use). If set, POST /api/scan/journey-agent forwards to this service. On Coolify: use internal service URL (e.g. http://ux-journey-agent:8320). */
export const ENV_UX_JOURNEY_AGENT_URL = 'UX_JOURNEY_AGENT_URL';
