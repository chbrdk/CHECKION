/** @type {import('next').NextConfig} */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
    openAnalyzer: false,
});

const __dirname = dirname(fileURLToPath(import.meta.url));

// In Docker/Coolify set DS_BASE=../msqdx-design-system so design system resolves
const dsBase = process.env.DS_BASE
    ? resolve(__dirname, process.env.DS_BASE, 'packages')
    : resolve(__dirname, '..', 'MSQDX-DS', 'msqdx-design-system', 'packages');

// Proxy /mcp to MCP server when MCP_SERVER_URL is set (see lib/constants.ts ENV_MCP_SERVER_URL).
// Enables single-domain deployment: https://checkion.example.com/mcp → MCP server.
const mcpBase = process.env.MCP_SERVER_URL?.replace(/\/$/, '') ?? '';

const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@msqdx/react', '@msqdx/tokens'],
    experimental: {
        optimizePackageImports: ['@mui/material', '@msqdx/tokens'],
    },
    rewrites: mcpBase
        ? () => [
              { source: '/mcp', destination: `${mcpBase}/` },
              { source: '/mcp/:path*', destination: `${mcpBase}/:path*` },
          ]
        : undefined,
    // pa11y uses puppeteer – these modules must stay server-side only
    serverExternalPackages: ['pa11y', 'puppeteer'],
    // Webpack config (used for production build via --webpack flag)
    webpack: (config) => {
        config.resolve.symlinks = true;
        // Ensure external DS packages can resolve peer deps from CHECKION's node_modules
        config.resolve.modules = [
            resolve(__dirname, 'node_modules'),
            'node_modules',
        ];
        return config;
    },
    // Turbopack config (used for dev server)
    turbopack: {
        resolveAlias: {
            '@msqdx/react': resolve(dsBase, 'react', 'dist', 'index.js'),
            '@msqdx/tokens': resolve(dsBase, 'tokens', 'dist', 'index.js'),
        },
    },
};

export default withBundleAnalyzer(nextConfig);
