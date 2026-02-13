declare module 'pa11y' {
    interface Pa11yOptions {
        standard?: string;
        runners?: string[];
        log?: {
            debug: (...args: unknown[]) => void;
            error: (...args: unknown[]) => void;
            info: (...args: unknown[]) => void;
        };
        chromeLaunchConfig?: {
            args?: string[];
        };
        timeout?: number;
        wait?: number;
        ignore?: string[];
    }

    interface Pa11yIssue {
        code: string;
        context: string;
        message: string;
        selector: string;
        type: string;
        typeCode: number;
        runner: string;
        runnerExtras?: Record<string, unknown>;
    }

    interface Pa11yResult {
        documentTitle: string;
        pageUrl: string;
        issues: Pa11yIssue[];
    }

    function pa11y(url: string, options?: Pa11yOptions): Promise<Pa11yResult>;
    export default pa11y;
}
