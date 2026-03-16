import exifr from "exifr";

export interface PhotoGps {
  file: File;
  latitude: number;
  longitude: number;
}

/**
 * Extract GPS coordinates from JPEG drone images.
 * Images without GPS data are silently skipped.
 */
export async function extractGpsFromImages(files: File[]): Promise<PhotoGps[]> {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const gps = await exifr.gps(file);
      if (!gps || gps.latitude == null || gps.longitude == null) return null;
      return { file, latitude: gps.latitude, longitude: gps.longitude } as PhotoGps;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PhotoGps | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is PhotoGps => v !== null);
}
