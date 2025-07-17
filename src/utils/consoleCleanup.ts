/**
 * Console cleanup utility for production builds
 * This file removes all console statements in production
 */

// Override console methods in production
if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
  console.info = noop;
  console.trace = noop;
  console.table = noop;
  console.group = noop;
  console.groupEnd = noop;
  console.groupCollapsed = noop;
  console.clear = noop;
  console.count = noop;
  console.countReset = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.timeLog = noop;
  console.assert = noop;
  console.profile = noop;
  console.profileEnd = noop;
  console.timeStamp = noop;
  console.dirxml = noop;
  console.dir = noop;
}

// Export development-only logging functions
export const devLog = process.env.NODE_ENV === 'development' ? console.log : () => {};
export const devWarn = process.env.NODE_ENV === 'development' ? console.warn : () => {};
export const devError = process.env.NODE_ENV === 'development' ? console.error : () => {};

// Performance logging that only runs in development
export const perfLog = (label: string, fn: () => void) => {
  if (process.env.NODE_ENV === 'development') {
    console.time(label);
    fn();
    console.timeEnd(label);
  } else {
    fn();
  }
};

// Memory usage logging
export const memLog = (label: string) => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`${label} - Memory: ${formatBytes(memory.usedJSHeapSize)} / ${formatBytes(memory.jsHeapSizeLimit)}`);
  }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}