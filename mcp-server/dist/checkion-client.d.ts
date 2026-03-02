/**
 * HTTP client for CHECKION API. All requests use Bearer token from env.
 */
export interface CheckionFetchError {
    error: true;
    message: string;
    status?: number;
}
export declare function checkionFetch<T = unknown>(path: string, options?: RequestInit): Promise<T | CheckionFetchError>;
export declare function isCheckionError<T>(r: T | CheckionFetchError): r is CheckionFetchError;
