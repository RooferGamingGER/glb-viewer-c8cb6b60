/**
 * Code cleanup utilities and dead code elimination
 */

// Remove all console.log statements from production code
export const removeConsoleStatements = (code: string): string => {
  return code
    .replace(/console\.log\([^)]*\);?\s*/g, '')
    .replace(/console\.error\([^)]*\);?\s*/g, '')
    .replace(/console\.warn\([^)]*\);?\s*/g, '')
    .replace(/console\.debug\([^)]*\);?\s*/g, '')
    .replace(/console\.info\([^)]*\);?\s*/g, '');
};

// List of potentially unused files that could be removed
export const POTENTIALLY_UNUSED_FILES = [
  'src/pages/Test.tsx',
  'src/hooks/usePointSnapping.old.ts',
  'src/components/ui/use-toast.tsx', // Duplicate of use-toast.ts
] as const;

// List of large dependencies that might not be needed
export const HEAVY_DEPENDENCIES = [
  'html2canvas',
  'jspdf',
  'recharts',
  'react-day-picker',
  'embla-carousel-react',
] as const;

// Unused imports that can be removed
export const UNUSED_IMPORTS = [
  'import { Progress } from "@/components/ui/progress";', // If not used in measurement calculations
  'import { Card } from "@/components/ui/card";', // If only used in one place
  'import { Badge } from "@/components/ui/badge";', // If rarely used
] as const;

// Performance-critical components that need optimization
export const PERFORMANCE_CRITICAL_COMPONENTS = [
  'src/components/ModelViewer.tsx',
  'src/hooks/useMeasurements.ts',
  'src/utils/measurementCalculations.ts',
  'src/components/measurement/MeasurementTools.tsx',
  'src/hooks/useMeasurementInteraction.ts',
] as const;

// Memory-intensive operations to monitor
export const MEMORY_INTENSIVE_OPERATIONS = [
  'calculateArea',
  'triangulate3D',
  'generateSegments',
  'calculatePVMaterials',
  'exportModelWithMeasurements',
] as const;

// Optimization recommendations
export const OPTIMIZATION_RECOMMENDATIONS = {
  // Remove console.log statements
  removeConsoleStatements: {
    impact: 'Low',
    description: 'Remove all console.log statements for production',
    files: ['src/**/*.ts', 'src/**/*.tsx']
  },
  
  // Implement lazy loading
  lazyLoading: {
    impact: 'High',
    description: 'Implement lazy loading for measurement tools',
    files: ['src/components/MeasurementTools.tsx']
  },
  
  // Optimize Three.js objects
  optimizeThreeJS: {
    impact: 'High',
    description: 'Implement proper disposal of Three.js objects',
    files: ['src/hooks/useMeasurementCleanup.ts', 'src/components/ModelViewer.tsx']
  },
  
  // Bundle splitting
  bundleSplitting: {
    impact: 'Medium',
    description: 'Split large bundles into smaller chunks',
    files: ['vite.config.ts']
  },
  
  // Remove unused dependencies
  removeUnusedDeps: {
    impact: 'Medium',
    description: 'Remove unused dependencies from package.json',
    files: ['package.json']
  },
  
  // Optimize images
  optimizeImages: {
    impact: 'Low',
    description: 'Optimize image sizes and formats',
    files: ['public/**/*.png', 'public/**/*.jpg']
  }
} as const;

// Dead code patterns to look for
export const DEAD_CODE_PATTERNS = [
  /\/\*[\s\S]*?\*\//g, // Multi-line comments
  /\/\/.*$/gm, // Single-line comments
  /^\s*import\s+.*\s+from\s+['"].*['"];\s*$/gm, // Potentially unused imports
  /^\s*const\s+\w+\s*=\s*.*;\s*$/gm, // Potentially unused constants
  /^\s*function\s+\w+\s*\(.*\)\s*\{[\s\S]*?\}\s*$/gm, // Potentially unused functions
] as const;

// Memory leak patterns
export const MEMORY_LEAK_PATTERNS = [
  /setInterval\s*\(/g, // Intervals without clearInterval
  /setTimeout\s*\(/g, // Timeouts without clearTimeout
  /addEventListener\s*\(/g, // Event listeners without removal
  /new\s+THREE\./g, // Three.js objects without disposal
  /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\}\s*,\s*\[\s*\]\s*\)/g, // useEffect without cleanup
] as const;

/**
 * Analyzes code for potential performance issues
 */
export const analyzeCodeForPerformanceIssues = (code: string): {
  consoleStatements: number;
  potentialMemoryLeaks: number;
  unusedImports: number;
  suggestions: string[];
} => {
  const consoleStatements = (code.match(/console\.(log|error|warn|debug|info)/g) || []).length;
  const potentialMemoryLeaks = MEMORY_LEAK_PATTERNS.reduce((count, pattern) => {
    return count + (code.match(pattern) || []).length;
  }, 0);
  const unusedImports = (code.match(/import\s+.*\s+from\s+['"].*['"];/g) || []).length;
  
  const suggestions: string[] = [];
  
  if (consoleStatements > 0) {
    suggestions.push(`Found ${consoleStatements} console statements - consider removing for production`);
  }
  
  if (potentialMemoryLeaks > 0) {
    suggestions.push(`Found ${potentialMemoryLeaks} potential memory leak patterns - review cleanup`);
  }
  
  if (code.includes('useGLTF') && !code.includes('useGLTF.clear')) {
    suggestions.push('useGLTF found without cleanup - consider adding useGLTF.clear()');
  }
  
  if (code.includes('new THREE.') && !code.includes('dispose()')) {
    suggestions.push('Three.js objects found without disposal - consider adding dispose()');
  }
  
  return {
    consoleStatements,
    potentialMemoryLeaks,
    unusedImports,
    suggestions
  };
};