import * as THREE from 'three';

export type OrientationCandidate = {
  label: string;
  euler: THREE.Euler; // rotation to apply to make Z-up
};

export type OrientationResult = {
  best: OrientationCandidate;
  score: number; // lower is better
  scores: Array<{ candidate: OrientationCandidate; score: number; size: THREE.Vector3 }>; 
  vendorHint?: 'roofergaming' | 'unknown';
};

// Generate common axis-rotation candidates
const candidates: OrientationCandidate[] = [
  { label: 'identity', euler: new THREE.Euler(0, 0, 0) },
  { label: 'rx-90', euler: new THREE.Euler(-Math.PI / 2, 0, 0) },
  { label: 'rx+90', euler: new THREE.Euler(Math.PI / 2, 0, 0) },
  { label: 'ry-90', euler: new THREE.Euler(0, -Math.PI / 2, 0) },
  { label: 'ry+90', euler: new THREE.Euler(0, Math.PI / 2, 0) },
  { label: 'rz-90', euler: new THREE.Euler(0, 0, -Math.PI / 2) },
  { label: 'rz+90', euler: new THREE.Euler(0, 0, Math.PI / 2) },
];

// Score heuristic: prefer minimal Z-extent relative to X/Y footprint (roof thickness should be smallest)
function scoreSize(size: THREE.Vector3): number {
  const xy = Math.max(size.x, size.y);
  const z = size.z;
  // Avoid division by zero
  const denom = Math.max(1e-6, xy);
  return z / denom;
}

export function detectOptimalOrientation(root: THREE.Object3D): OrientationResult {
  // Create a temp group with a clone of the object to avoid mutating original
  const temp = new THREE.Group();
  const clone = root.clone(true);
  temp.add(clone);

  const scores: Array<{ candidate: OrientationCandidate; score: number; size: THREE.Vector3 }> = [];

  for (const cand of candidates) {
    // Apply rotation
    temp.rotation.copy(cand.euler);
    temp.updateMatrixWorld(true);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(temp);
    const size = box.getSize(new THREE.Vector3());

    const sc = scoreSize(size);
    scores.push({ candidate: cand, score: sc, size: size.clone() });
  }

  // Restore
  temp.clear();

  // Pick best (lowest score)
  scores.sort((a, b) => a.score - b.score);
  const best = scores[0];

  // Vendor hint: RooferGaming models typically need Y- rotation (-90° around Y)
  const vendorHint: OrientationResult['vendorHint'] = best.candidate.label === 'ry-90' ? 'roofergaming' : 'unknown';

  return {
    best: best.candidate,
    score: best.score,
    scores,
    vendorHint,
  };
}
