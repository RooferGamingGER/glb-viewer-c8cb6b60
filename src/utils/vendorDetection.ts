export type Vendor = 'roofergaming' | 'unknown';

export interface VendorInfo {
  vendor: Vendor;
  reason?: string;
}

// Simple mapping based on orientation detection result label or metadata strings
export function detectVendorFromMetadata(gltfScene: any): VendorInfo {
  try {
    const extras = (gltfScene?.userData as any) || {};
    const name: string = (gltfScene?.name as string) || '';
    const metaStr = JSON.stringify(extras).toLowerCase() + ' ' + name.toLowerCase();
    if (metaStr.includes('roofergaming')) {
      return { vendor: 'roofergaming', reason: 'Metadata/Name enthält "roofergaming"' };
    }
  } catch {}
  return { vendor: 'unknown' };
}

export function combineVendorHints(meta: VendorInfo, orientationHint?: Vendor): VendorInfo {
  if (meta.vendor === 'roofergaming' || orientationHint === 'roofergaming') {
    const reason = [meta.reason, orientationHint === 'roofergaming' ? 'Orientierungsheuristik: ry-90' : undefined]
      .filter(Boolean)
      .join(' | ');
    return { vendor: 'roofergaming', reason };
  }
  return meta;
}
