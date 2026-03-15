/**
 * Console cleanup utility for production builds
 */

const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

if (isProd) {
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
  (console as any).profile = noop;
  (console as any).profileEnd = noop;
  console.timeStamp = noop;
  console.dirxml = noop;
  console.dir = noop;
}

export const devLog = isDev ? console.log : () => {};
export const devWarn = isDev ? console.warn : () => {};
export const devError = isDev ? console.error : () => {};

export const perfLog = (label: string, fn: () => void) => {
  if (isDev) {
    console.time(label);
    fn();
    console.timeEnd(label);
  } else {
    fn();
  }
};

export const memLog = (label: string) => {
  if (isDev && 'memory' in performance) {
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
