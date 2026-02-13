import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import type { ScanResult } from '@/lib/types';
import { MSQDX_COLORS } from '@msqdx/tokens';

// Register a standard font (optional, using default Helvetica for now to save time/bandwidth)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 10,
    },
    logoText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    meta: {
        textAlign: 'right',
    },
    metaText: {
        fontSize: 10,
        color: '#6B7280',
    },
    titleSection: {
        marginBottom: 20,
    },
    url: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 5,
    },
    scoreSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    scoreItem: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    scoreLabel: {
        fontSize: 10,
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 20,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 5,
    },
    issueRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F3F4F6',
    },
    issueSeverity: {
        width: 60,
        fontSize: 10,
        fontWeight: 'bold',
    },
    issueContent: {
        flex: 1,
    },
    issueMessage: {
        fontSize: 10,
        color: '#374151',
        marginBottom: 2,
    },
    issueSelector: {
        fontSize: 8,
        color: '#9CA3AF',
        fontFamily: 'Courier',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        fontSize: 8,
        color: '#9CA3AF',
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
    },
});

interface ScanReportProps {
    scan: ScanResult;
}

const SeverityColor = {
    error: '#DC2626',
    warning: '#D97706',
    notice: '#2563EB',
};

export const ScanReportDocument = ({ scan }: ScanReportProps) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logoText}>CHECKION</Text>
                    <View style={styles.meta}>
                        <Text style={styles.metaText}>Scan ID: {scan.id.slice(0, 8)}</Text>
                        <Text style={styles.metaText}>Date: {new Date(scan.timestamp).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Title & URL */}
                <View style={styles.titleSection}>
                    <Text style={{ fontSize: 10, color: '#6B7280' }}>ACCESSIBILITY & UX AUDIT REPORT</Text>
                    <Text style={styles.url}>{scan.url}</Text>
                </View>

                {/* Score Summary */}
                <View style={styles.scoreSection}>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{scan.score}/100</Text>
                        <Text style={styles.scoreLabel}>Checkion Score</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{scan.stats.errors}</Text>
                        <Text style={{ ...styles.scoreLabel, color: SeverityColor.error }}>Errors</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{scan.stats.warnings}</Text>
                        <Text style={{ ...styles.scoreLabel, color: SeverityColor.warning }}>Warnings</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{scan.ux?.cls || 0}</Text>
                        <Text style={styles.scoreLabel}>CLS</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={{
                            ...styles.scoreValue,
                            fontSize: 16,
                            marginTop: 4
                        }}>{scan.eco?.grade || 'N/A'}</Text>
                        <Text style={styles.scoreLabel}>Eco Grade</Text>
                    </View>
                </View>

                {/* UX Audit Section */}
                <Text style={styles.sectionTitle}>UX Audit</Text>
                <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 10, color: '#374151' }}>
                        Mobile Friendly: {scan.ux?.viewport.isMobileFriendly ? 'Yes' : 'No'}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#374151' }}>
                        Readability: {scan.ux?.readability}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#374151' }}>
                        Console Errors: {scan.ux?.consoleErrors?.length || 0}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#374151' }}>
                        Broken Links: {scan.ux?.brokenLinks?.length || 0}
                    </Text>
                </View>

                {/* Top Issues List */}
                <Text style={styles.sectionTitle}>Top Issues Detected</Text>
                {scan.issues.slice(0, 15).map((issue, idx) => (
                    <View key={idx} style={styles.issueRow}>
                        <Text style={{
                            ...styles.issueSeverity,
                            color: SeverityColor[issue.type] || '#000000'
                        }}>
                            {issue.type.toUpperCase()}
                        </Text>
                        <View style={styles.issueContent}>
                            <Text style={styles.issueMessage}>{issue.message}</Text>
                            <Text style={styles.issueSelector}>{issue.selector}</Text>
                        </View>
                    </View>
                ))}
                {scan.issues.length > 15 && (
                    <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 5, fontStyle: 'italic' }}>
                        + {scan.issues.length - 15} more issues not listed in this summary.
                    </Text>
                )}

                {/* Footer */}
                <Text style={styles.footer}>
                    Generated by Checkion • {new Date().getFullYear()} • Automated Accessibility Scan
                </Text>
            </Page>
        </Document>
    );
};
