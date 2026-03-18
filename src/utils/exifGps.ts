import exifr from "exifr";

export interface PhotoGps {
  file: File;
  latitude: number;
  longitude: number;
}

export interface GpsOutlier {
  file: File;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface GpsValidationResult {
  noGps: File[];
  outliers: GpsOutlier[];
  valid: PhotoGps[];
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

/** Haversine distance in meters between two lat/lon points */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Get the median of a sorted number array */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Validate GPS data: find images without GPS and outliers > threshold from median.
 * @param allFiles All uploaded files
 * @param gpsPhotos Files that had valid GPS extracted
 * @param thresholdMeters Distance from median to flag as outlier (default 500m)
 */
export function validateGpsData(
  allFiles: File[],
  gpsPhotos: PhotoGps[],
  thresholdMeters = 500
): GpsValidationResult {
  // Files without GPS
  const gpsFileSet = new Set(gpsPhotos.map((p) => p.file));
  const noGps = allFiles.filter((f) => !gpsFileSet.has(f));

  if (gpsPhotos.length === 0) {
    return { noGps, outliers: [], valid: [] };
  }

  // Compute median lat/lon
  const medianLat = median(gpsPhotos.map((p) => p.latitude));
  const medianLon = median(gpsPhotos.map((p) => p.longitude));

  const outliers: GpsOutlier[] = [];
  const valid: PhotoGps[] = [];

  for (const photo of gpsPhotos) {
    const dist = haversineDistance(medianLat, medianLon, photo.latitude, photo.longitude);
    if (dist > thresholdMeters) {
      outliers.push({ ...photo, distanceMeters: dist });
    } else {
      valid.push(photo);
    }
  }

  // Sort outliers by distance descending
  outliers.sort((a, b) => b.distanceMeters - a.distanceMeters);

  return { noGps, outliers, valid };
}
