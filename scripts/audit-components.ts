/**
 * Component Audit Tool
 * 
 * Scans the codebase to find all component usage patterns,
 * dead code, and potential consolidation opportunities.
 * 
 * Run with: npx ts-node scripts/audit-components.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComponentUsage {
    name: string;
    importCount: number;
    importedFrom: string[];
    files: string[];
    category: 'mobile' | 'ui' | 'contracts' | 'landing' | 'layout' | 'admin' | 'root';
    sizeBytes: number;
    status: 'active' | 'low-usage' | 'dead' | 'unknown';
}

interface AuditReport {
    timestamp: string;
    totalComponents: number;
    activeComponents: number;
    lowUsageComponents: number;
    deadComponents: number;
    components: ComponentUsage[];
    consolidationOpportunities: string[];
    recommendations: string[];
}

const SRC_DIR = path.join(process.cwd(), 'src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

function getAllComponentFiles(dir: string): { file: string; category: string }[] {
    const results: { file: string; category: string }[] = [];

    function scanDir(currentDir: string, category: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                scanDir(fullPath, entry.name);
            } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.') && !entry.name.includes('.stories.')) {
                results.push({ file: fullPath, category });
            }
        }
    }

    scanDir(dir, 'root');
    return results;
}

function extractComponentName(filePath: string): string {
    const fileName = path.basename(filePath, '.tsx');
    return fileName;
}

function findComponentUsage(componentName: string, srcDir: string): { count: number; files: string[] } {
    const files: string[] = [];
    let count = 0;

    function scanDir(dir: string) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    scanDir(fullPath);
                } else if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.includes('.test.')) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');

                        // Check for imports of this component
                        const importPatterns = [
                            new RegExp(`import\\s*{[^}]*\\b${componentName}\\b[^}]*}\\s*from`, 'g'),
                            new RegExp(`import\\s+${componentName}\\s+from`, 'g'),
                            new RegExp(`<${componentName}[\\s/>]`, 'g'),
                        ];

                        for (const pattern of importPatterns) {
                            const matches = content.match(pattern);
                            if (matches) {
                                count += matches.length;
                                if (!files.includes(fullPath)) {
                                    files.push(fullPath);
                                }
                            }
                        }
                    } catch (e) {
                        // Skip files that can't be read
                    }
                }
            }
        } catch (e) {
            // Skip directories that can't be read
        }
    }

    scanDir(srcDir);
    return { count, files };
}

function findSimilarComponents(components: ComponentUsage[]): string[] {
    const opportunities: string[] = [];
    const namePatterns: Record<string, string[]> = {};

    // Group by common prefixes/suffixes
    for (const comp of components) {
        const name = comp.name;

        // Check for common patterns
        const patterns = [
            { pattern: /^(.+)Card$/, key: 'Card' },
            { pattern: /^(.+)Modal$/, key: 'Modal' },
            { pattern: /^(.+)Button$/, key: 'Button' },
            { pattern: /^(.+)List$/, key: 'List' },
            { pattern: /^(.+)Form$/, key: 'Form' },
            { pattern: /^(.+)Section$/, key: 'Section' },
            { pattern: /^(.+)Badge$/, key: 'Badge' },
            { pattern: /^(.+)Header$/, key: 'Header' },
            { pattern: /^(.+)Nav$/, key: 'Nav' },
            { pattern: /^(.+)Skeleton$/, key: 'Skeleton' },
        ];

        for (const { pattern, key } of patterns) {
            if (pattern.test(name)) {
                if (!namePatterns[key]) namePatterns[key] = [];
                namePatterns[key].push(name);
            }
        }
    }

    // Find patterns with many variations (potential consolidation)
    for (const [pattern, names] of Object.entries(namePatterns)) {
        if (names.length >= 3) {
            opportunities.push(
                `Multiple ${pattern} components (${names.length}): ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''}`
            );
        }
    }

    return opportunities;
}

function generateRecommendations(components: ComponentUsage[]): string[] {
    const recommendations: string[] = [];

    const deadComponents = components.filter(c => c.status === 'dead');
    const lowUsage = components.filter(c => c.status === 'low-usage');
    const largeComponents = components.filter(c => c.sizeBytes > 15000).sort((a, b) => b.sizeBytes - a.sizeBytes);

    if (deadComponents.length > 0) {
        recommendations.push(
            `🗑️ DEAD CODE: ${deadComponents.length} components have zero usage. Consider deleting: ${deadComponents.slice(0, 5).map(c => c.name).join(', ')}`
        );
    }

    if (lowUsage.length > 0) {
        recommendations.push(
            `⚠️ LOW USAGE: ${lowUsage.length} components used only 1-2 times. Review if they should be inlined: ${lowUsage.slice(0, 5).map(c => c.name).join(', ')}`
        );
    }

    if (largeComponents.length > 0) {
        recommendations.push(
            `📦 LARGE COMPONENTS: ${largeComponents.length} components are >15KB. Consider splitting: ${largeComponents.slice(0, 3).map(c => `${c.name} (${(c.sizeBytes / 1024).toFixed(1)}KB)`).join(', ')}`
        );
    }

    return recommendations;
}

async function runAudit(): Promise<AuditReport> {
    console.log('🔍 Starting component audit...\n');

    const componentFiles = getAllComponentFiles(COMPONENTS_DIR);
    console.log(`Found ${componentFiles.length} component files\n`);

    const components: ComponentUsage[] = [];

    for (const { file, category } of componentFiles) {
        const name = extractComponentName(file);
        const stats = fs.statSync(file);
        const usage = findComponentUsage(name, SRC_DIR);

        let status: ComponentUsage['status'] = 'unknown';
        if (usage.count === 0) {
            status = 'dead';
        } else if (usage.count <= 2) {
            status = 'low-usage';
        } else {
            status = 'active';
        }

        components.push({
            name,
            importCount: usage.count,
            importedFrom: [],
            files: usage.files.map(f => path.relative(SRC_DIR, f)),
            category: category as ComponentUsage['category'],
            sizeBytes: stats.size,
            status,
        });

        process.stdout.write(`Analyzed: ${name} (${usage.count} usages)\r`);
    }

    console.log('\n\n📊 Generating report...\n');

    const consolidationOpportunities = findSimilarComponents(components);
    const recommendations = generateRecommendations(components);

    const report: AuditReport = {
        timestamp: new Date().toISOString(),
        totalComponents: components.length,
        activeComponents: components.filter(c => c.status === 'active').length,
        lowUsageComponents: components.filter(c => c.status === 'low-usage').length,
        deadComponents: components.filter(c => c.status === 'dead').length,
        components: components.sort((a, b) => b.importCount - a.importCount),
        consolidationOpportunities,
        recommendations,
    };

    return report;
}

function printReport(report: AuditReport) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    COMPONENT AUDIT REPORT                  ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📅 Generated: ${report.timestamp}`);
    console.log(`📦 Total Components: ${report.totalComponents}`);
    console.log(`✅ Active (3+ usages): ${report.activeComponents}`);
    console.log(`⚠️ Low Usage (1-2): ${report.lowUsageComponents}`);
    console.log(`🗑️ Dead (0 usages): ${report.deadComponents}`);
    console.log('');

    console.log('🔄 CONSOLIDATION OPPORTUNITIES:');
    for (const opp of report.consolidationOpportunities) {
        console.log(`  • ${opp}`);
    }
    console.log('');

    console.log('💡 RECOMMENDATIONS:');
    for (const rec of report.recommendations) {
        console.log(`  ${rec}`);
    }
    console.log('');

    console.log('📈 TOP 10 MOST USED COMPONENTS:');
    for (const comp of report.components.slice(0, 10)) {
        console.log(`  ${comp.name}: ${comp.importCount} usages (${comp.category})`);
    }
    console.log('');

    if (report.deadComponents > 0) {
        console.log('🗑️ DEAD COMPONENTS (0 usages):');
        for (const comp of report.components.filter(c => c.status === 'dead')) {
            console.log(`  • ${comp.name} (${comp.category}, ${(comp.sizeBytes / 1024).toFixed(1)}KB)`);
        }
    }
}

// Run the audit
runAudit().then(report => {
    printReport(report);

    // Save full report to JSON
    const reportPath = path.join(process.cwd(), 'component-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
}).catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
