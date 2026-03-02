/**
 * CHECKION MCP tools: proxy to CHECKION API with Bearer token.
 */
import { z } from 'zod';
export declare function registerCheckionTools(server: {
    registerTool: (name: string, config: {
        title?: string;
        description?: string;
        inputSchema?: z.ZodTypeAny;
    }, cb: (args: unknown) => Promise<{
        content: Array<{
            type: 'text';
            text: string;
        }>;
    }>) => void;
}): void;
