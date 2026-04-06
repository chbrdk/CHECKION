'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import dynamic from 'next/dynamic';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedInfra } from '@/lib/domain-aggregation';

const DomainToolsCard = dynamic(
    () => import('@/components/DomainToolsCard').then((m) => ({ default: m.DomainToolsCard })),
    { ssr: false }
);

export type DomainResultInfraSectionProps = {
    t: (key: string) => string;
    infra: AggregatedInfra;
    onOpenPageUrl: (url: string) => void;
};

function DomainResultInfraSectionInner({ t, infra, onOpenPageUrl }: DomainResultInfraSectionProps) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--msqdx-spacing-md)' }}>
            <MsqdxMoleculeCard title="Privacy (Domain)" headerActions={<InfoTooltip title={t('info.infraPrivacy')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <MsqdxTypography variant="body2">Seiten mit Datenschutz: {infra.privacy.withPolicy} / {infra.privacy.totalPages}</MsqdxTypography>
                    <MsqdxTypography variant="body2">Seiten mit Cookie-Banner: {infra.privacy.withCookieBanner} / {infra.privacy.totalPages}</MsqdxTypography>
                    <MsqdxTypography variant="body2">Seiten mit AGB: {infra.privacy.withTerms} / {infra.privacy.totalPages}</MsqdxTypography>
                    {(infra.privacy.urlsWithPolicy.length > 0 || infra.privacy.urlsWithCookieBanner.length > 0) && (
                        <Box sx={{ mt: 1 }}>
                            {infra.privacy.urlsWithPolicy.length > 0 && infra.privacy.urlsWithPolicy.length <= 8 && (
                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>URLs mit Datenschutz:</MsqdxTypography>
                            )}
                            {infra.privacy.urlsWithPolicy.length > 0 && infra.privacy.urlsWithPolicy.length <= 8 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {infra.privacy.urlsWithPolicy.slice(0, 5).map((url) => (
                                        <MsqdxButton
                                            key={url}
                                            size="small"
                                            variant="text"
                                            onClick={() => onOpenPageUrl(url)}
                                            sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                                        >
                                            {url}
                                        </MsqdxButton>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            </MsqdxMoleculeCard>
            <MsqdxMoleculeCard title="Security (Domain)" headerActions={<InfoTooltip title={t('info.infraPrivacy')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <MsqdxTypography variant="body2">Seiten mit CSP: {infra.security.withCsp} / {infra.security.totalPages}</MsqdxTypography>
                    <MsqdxTypography variant="body2">Seiten mit X-Frame-Options: {infra.security.withXFrame} / {infra.security.totalPages}</MsqdxTypography>
                    {infra.security.urlsWithCsp.length > 0 && infra.security.urlsWithCsp.length <= 8 && (
                        <Box sx={{ mt: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit CSP:</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {infra.security.urlsWithCsp.slice(0, 5).map((url) => (
                                    <MsqdxButton
                                        key={url}
                                        size="small"
                                        variant="text"
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                                    >
                                        {url}
                                    </MsqdxButton>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </MsqdxMoleculeCard>
        </Box>
    );
}

export const DomainResultInfraSection = memo(DomainResultInfraSectionInner);

export type DomainResultInfraTabProps = {
    t: (key: string) => string;
    domainHost: string | undefined;
    infra: AggregatedInfra | null | undefined;
    onOpenPageUrl: (url: string) => void;
};

function DomainResultInfraTabInner({ t, domainHost, infra, onOpenPageUrl }: DomainResultInfraTabProps) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
            {domainHost && <DomainToolsCard domainUrl={`https://${domainHost}`} />}
            {infra ? (
                <DomainResultInfraSection t={t} infra={infra} onOpenPageUrl={onOpenPageUrl} />
            ) : (
                <MsqdxMoleculeCard title="Infrastruktur & Privacy (Domain)" headerActions={<InfoTooltip title={t('info.infraPrivacy')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine Infrastruktur-Daten verfügbar.</MsqdxTypography>
                </MsqdxMoleculeCard>
            )}
        </Box>
    );
}

export const DomainResultInfraTab = memo(DomainResultInfraTabInner);
