// This is a partial fix for the roofPlanRenderer.ts file
// We need to modify the function that's using Point2D[] where Point[] is expected
// Here's the fix for line 729:

// Update the function to convert Point2D to Point by adding a z coordinate of 0
// Assuming the function is mapPoints or similar:

const mapPointsToPoints = (points2D: Point2D[]): Point[] => {
  return points2D.map(point => ({
    x: point.x,
    y: point.y,
    z: 0  // Add the missing z coordinate
  }));
};

// Then use this helper function where needed, for example:
// Original problematic line at 729: someFunction(points2D)
// Fixed version: someFunction(mapPointsToPoints(points2D))
