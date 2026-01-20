#!/usr/bin/env tsx
/**
 * MinistryPath System Integrity Audit Script
 * 
 * This script validates routes, links, and detects potential issues.
 * Run with: npx tsx scripts/integrity-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  category: string;
  issue: string;
  file: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
  recommendation?: string;
}

interface LinkInfo {
  file: string;
  line: number;
  route: string;
  valid: boolean;
  gating?: string;
}

const results: AuditResult[] = [];
const allLinks: LinkInfo[] = [];

// Extract routes dynamically from App.tsx
function extractRoutesFromAppTsx(): Set<string> {
  const routes = new Set<string>();
  const appPath = 'client/src/App.tsx';
  
  if (!fs.existsSync(appPath)) {
    console.error('App.tsx not found');
    return routes;
  }
  
  const content = fs.readFileSync(appPath, 'utf-8');
  
  // Match Route path="..." patterns
  const routeMatches = content.matchAll(/Route\s+path=["']([^"']+)["']/g);
  for (const match of routeMatches) {
    routes.add(match[1]);
  }
  
  // Also add public routes mentioned in Router function
  routes.add('/admin');
  routes.add('/help');
  routes.add('/reset-password');
  
  return routes;
}

const VALID_ROUTES = extractRoutesFromAppTsx();

// Dynamic route patterns
const DYNAMIC_ROUTE_PATTERNS = [
  /^\/trainings\/[\w-]+$/,
  /^\/invite\/[\w-]+$/,
  /^\/help\/article\/[\w-]+$/,
  /^\/help\?category=[\w-]+$/,
];

function isValidRoute(route: string): boolean {
  // Exact match
  if (VALID_ROUTES.has(route)) return true;
  
  // API routes
  if (route.startsWith('/api/')) return true;
  
  // External links
  if (route.startsWith('#')) return true;
  if (route.startsWith('mailto:')) return true;
  if (route.startsWith('http')) return true;
  
  // Dynamic patterns
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(route)) return true;
  }
  
  // Template literals (can't validate statically)
  if (route.includes('${')) return true;
  
  // Check if it's a parameterized route (e.g., /trainings/:id matches /trainings/abc)
  for (const validRoute of VALID_ROUTES) {
    if (validRoute.includes(':')) {
      const pattern = validRoute.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(route)) return true;
    }
  }
  
  return false;
}

function getRouteGating(route: string): string {
  if (route.startsWith('/leadership')) return 'Leadership (leader+)';
  if (route.startsWith('/onboarding')) return 'Authenticated';
  if (route === '/help' || route.startsWith('/help/')) return 'Public';
  if (route.startsWith('/invite/')) return 'Public';
  if (route === '/admin') return 'Public (admin login)';
  if (route === '/reset-password') return 'Public';
  if (route === '/') return 'Public (landing) / Auth (dashboard)';
  return 'Authenticated';
}

function extractLinks(content: string, filePath: string): void {
  const lines = content.split('\n');
  
  // Match various link patterns
  const patterns = [
    { regex: /href=["']([^"']+)["']/g, type: 'href' },
    { regex: /<Link[^>]+href=["']([^"']+)["']/g, type: 'Link' },
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    const contentCopy = content;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(contentCopy)) !== null) {
      const route = match[1];
      
      // Skip non-route hrefs
      if (route.startsWith('mailto:') || route.startsWith('http') || route.startsWith('#')) {
        continue;
      }
      
      // Find line number
      let lineNum = 1;
      let pos = 0;
      for (const line of lines) {
        if (pos + line.length >= match.index) break;
        pos += line.length + 1;
        lineNum++;
      }
      
      const valid = isValidRoute(route);
      
      allLinks.push({
        file: filePath,
        line: lineNum,
        route,
        valid,
        gating: getRouteGating(route)
      });
      
      if (!valid) {
        results.push({
          category: 'BROKEN_LINK',
          issue: `Invalid route: ${route}`,
          file: filePath,
          line: lineNum,
          severity: 'error',
          recommendation: `Verify route exists or add redirect`
        });
      }
    }
  }
}

function checkHelpCenterData(): void {
  const helpDataPath = 'client/src/lib/helpCenterData.ts';
  if (!fs.existsSync(helpDataPath)) return;
  
  const content = fs.readFileSync(helpDataPath, 'utf-8');
  const lines = content.split('\n');
  
  // Extract relatedLinks paths
  let lineNum = 0;
  for (const line of lines) {
    lineNum++;
    const match = line.match(/path:\s*['"]([^'"]+)['"]/);
    if (match) {
      const route = match[1];
      const valid = isValidRoute(route);
      
      allLinks.push({
        file: helpDataPath,
        line: lineNum,
        route,
        valid,
        gating: getRouteGating(route)
      });
      
      if (!valid) {
        results.push({
          category: 'HELP_LINK',
          issue: `Help article points to invalid route: ${route}`,
          file: helpDataPath,
          line: lineNum,
          severity: 'warning',
          recommendation: `Update path to valid route`
        });
      }
    }
  }
}

function checkForDuplicateEndpoints(): void {
  const routesPath = 'server/routes.ts';
  if (!fs.existsSync(routesPath)) return;
  
  const content = fs.readFileSync(routesPath, 'utf-8');
  const endpoints: Map<string, number[]> = new Map();
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const match = line.match(/app\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/);
    if (match) {
      const endpoint = `${match[1].toUpperCase()} ${match[2]}`;
      if (!endpoints.has(endpoint)) {
        endpoints.set(endpoint, []);
      }
      endpoints.get(endpoint)!.push(index + 1);
    }
  });
  
  for (const [endpoint, lineNums] of endpoints) {
    if (lineNums.length > 1) {
      results.push({
        category: 'DUPLICATE_ENDPOINT',
        issue: `Duplicate endpoint: ${endpoint} on lines ${lineNums.join(', ')}`,
        file: routesPath,
        severity: 'error',
        recommendation: `Remove duplicate endpoint`
      });
    }
  }
}

function checkForDisabledPlaceholders(): void {
  const clientDir = 'client/src';
  
  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.includes('disabled') && line.includes('Button') && 
              !line.includes('isPending') && !line.includes('isLoading') &&
              !line.includes('disabled={') && line.includes('disabled data-testid')) {
            results.push({
              category: 'DISABLED_PLACEHOLDER',
              issue: `Permanently disabled button found`,
              file: filePath,
              line: index + 1,
              severity: 'info',
              recommendation: `Review if this is an intentional placeholder`
            });
          }
        });
      }
    }
  }
  
  walkDir(clientDir);
}

function scanClientFiles(): void {
  const clientDir = 'client/src';
  
  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        extractLinks(content, filePath);
      }
    }
  }
  
  walkDir(clientDir);
}

function printLinkTable(): void {
  console.log('\n## Link Audit Table\n');
  console.log('| File | Line | Route | Valid | Gating |');
  console.log('|------|------|-------|-------|--------|');
  
  // Sort by file then line
  allLinks.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });
  
  // Group by file, show first 5 per file
  const byFile: Map<string, LinkInfo[]> = new Map();
  for (const link of allLinks) {
    if (!byFile.has(link.file)) byFile.set(link.file, []);
    byFile.get(link.file)!.push(link);
  }
  
  for (const [file, links] of byFile) {
    const shortFile = file.replace('client/src/', '');
    for (const link of links) {
      const validIcon = link.valid ? '✅' : '❌';
      console.log(`| ${shortFile} | ${link.line} | ${link.route} | ${validIcon} | ${link.gating} |`);
    }
  }
}

function printResults(): void {
  console.log('\n=== MinistryPath Integrity Audit Results ===\n');
  
  console.log('## Registered Routes (from App.tsx)\n');
  const sortedRoutes = Array.from(VALID_ROUTES).sort();
  for (const route of sortedRoutes) {
    console.log(`- ${route} [${getRouteGating(route)}]`);
  }
  
  printLinkTable();
  
  const grouped: Record<string, AuditResult[]> = {};
  
  for (const result of results) {
    if (!grouped[result.category]) {
      grouped[result.category] = [];
    }
    grouped[result.category].push(result);
  }
  
  let hasErrors = false;
  
  console.log('\n## Issues Found\n');
  
  if (Object.keys(grouped).length === 0) {
    console.log('No issues found!\n');
  } else {
    for (const [category, items] of Object.entries(grouped)) {
      console.log(`\n### ${category} (${items.length} issues)\n`);
      
      for (const item of items) {
        const lineInfo = item.line ? `:${item.line}` : '';
        const icon = item.severity === 'error' ? '❌' : item.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${item.file}${lineInfo}`);
        console.log(`   ${item.issue}`);
        if (item.recommendation) {
          console.log(`   → ${item.recommendation}`);
        }
        if (item.severity === 'error') hasErrors = true;
      }
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total links scanned: ${allLinks.length}`);
  console.log(`Valid links: ${allLinks.filter(l => l.valid).length}`);
  console.log(`Invalid links: ${allLinks.filter(l => !l.valid).length}`);
  console.log(`Total issues: ${results.length}`);
  console.log(`Errors: ${results.filter(r => r.severity === 'error').length}`);
  console.log(`Warnings: ${results.filter(r => r.severity === 'warning').length}`);
  console.log(`Info: ${results.filter(r => r.severity === 'info').length}`);
  
  if (hasErrors) {
    console.log('\n⚠️ Critical issues found! Review and fix before deployment.\n');
    process.exit(1);
  } else {
    console.log('\n✅ No critical issues found.\n');
  }
}

// Run the audit
console.log('Running MinistryPath Integrity Audit...');
console.log(`Extracted ${VALID_ROUTES.size} routes from App.tsx`);

scanClientFiles();
checkHelpCenterData();
checkForDuplicateEndpoints();
checkForDisabledPlaceholders();

printResults();
