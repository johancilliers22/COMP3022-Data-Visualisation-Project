/**
 * Value-Suppressing Uncertainty Palette (VSUP) Implementation
 * Based on "Value-Suppressing Uncertainty Palettes" by Correll et al.
 * 
 * VSUP encodes both value and uncertainty in a single color.
 * When certainty is high, values are shown with saturated colors.
 * When certainty is low, values converge to an unsaturated gray.
 */

// VSUP color ramps for different damage categories
const colorRamps = {
  // General damage color ramp (red gradient with gray for uncertainty)
  damage: [
    // Format: [value, certainty, color]
    // Low damage, low certainty -> light gray
    [0, 0, '#e6e6e6'],
    // Low damage, high certainty -> light green
    [0, 1, '#c6efce'],
    // Medium damage, low certainty -> medium gray
    [5, 0, '#b3b3b3'],
    // Medium damage, high certainty -> yellow/orange
    [5, 1, '#ffcc00'],
    // High damage, low certainty -> dark gray
    [10, 0, '#808080'],
    // High damage, high certainty -> dark red
    [10, 1, '#cc0000']
  ],
  
  // Shake intensity-specific color ramp
  shake_intensity: [
    [0, 0, '#e6e6e6'],
    [0, 1, '#f7fbff'],
    [5, 0, '#b3b3b3'],
    [5, 1, '#6baed6'],
    [10, 0, '#808080'],
    [10, 1, '#08306b']
  ],
  
  // Buildings damage color ramp
  buildings: [
    [0, 0, '#e6e6e6'],
    [0, 1, '#edf8e9'],
    [5, 0, '#b3b3b3'],
    [5, 1, '#74c476'],
    [10, 0, '#808080'],
    [10, 1, '#006d2c']
  ],
  
  // Power outage color ramp
  power: [
    [0, 0, '#e6e6e6'],
    [0, 1, '#fee5d9'],
    [5, 0, '#b3b3b3'],
    [5, 1, '#fc9272'],
    [10, 0, '#808080'],
    [10, 1, '#a50f15']
  ],
  
  // Roads and bridges color ramp
  roads_and_bridges: [
    [0, 0, '#e6e6e6'],
    [0, 1, '#f7f7f7'],
    [5, 0, '#b3b3b3'],
    [5, 1, '#969696'],
    [10, 0, '#808080'],
    [10, 1, '#252525']
  ],
  
  // Sewer and water color ramp
  sewer_and_water: [
    [0, 0, '#e6e6e6'],
    [0, 1, '#edf8fb'],
    [5, 0, '#b3b3b3'],
    [5, 1, '#7bccc4'],
    [10, 0, '#808080'],
    [10, 1, '#0868ac']
  ],
  
  // Medical services color ramp
  medical: [
    [0, 0, '#e6e6e6'],
    [0, 1, '#fee6ce'],
    [5, 0, '#b3b3b3'],
    [5, 1, '#fdae6b'],
    [10, 0, '#808080'],
    [10, 1, '#e6550d']
  ]
};

/**
 * Interpolate between two colors
 * @param {string} color1 - First color in hex format
 * @param {string} color2 - Second color in hex format
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {string} Interpolated color in hex format
 */
const interpolateColor = (color1, color2, factor) => {
  if (factor <= 0) return color1;
  if (factor >= 1) return color2;
  
  // Parse hex colors
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  
  // Interpolate
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  // Convert back to hex
  return `#${(r < 16 ? '0' : '') + r.toString(16)}${(g < 16 ? '0' : '') + g.toString(16)}${(b < 16 ? '0' : '') + b.toString(16)}`;
};

/**
 * Bilinear interpolation for VSUP
 * @param {Array} ramp - Color ramp definition
 * @param {number} value - Data value (0-10)
 * @param {number} certainty - Certainty value (0-1)
 * @returns {string} Interpolated color in hex format
 */
const bilinearInterpolate = (ramp, value, certainty) => {
  // Clamp input values
  const v = Math.max(0, Math.min(10, value));
  const c = Math.max(0, Math.min(1, certainty));
  
  // Find the four corners for interpolation
  let lowerValue = 0;
  let upperValue = 10;
  let lowerCertainty = 0;
  let upperCertainty = 1;
  
  let lowerLowerColor = '#cccccc'; // Default gray
  let lowerUpperColor = '#cccccc';
  let upperLowerColor = '#cccccc';
  let upperUpperColor = '#cccccc';
  
  // Find the bounding box in the ramp
  for (let i = 0; i < ramp.length; i++) {
    const [rampValue, rampCertainty, rampColor] = ramp[i];
    
    if (rampValue <= v && rampCertainty <= c) {
      if (rampValue >= lowerValue && rampCertainty >= lowerCertainty) {
        lowerValue = rampValue;
        lowerCertainty = rampCertainty;
        lowerLowerColor = rampColor;
      }
    }
    
    if (rampValue <= v && rampCertainty >= c) {
      if (rampValue >= lowerValue && rampCertainty <= upperCertainty) {
        lowerValue = rampValue;
        upperCertainty = rampCertainty;
        lowerUpperColor = rampColor;
      }
    }
    
    if (rampValue >= v && rampCertainty <= c) {
      if (rampValue <= upperValue && rampCertainty >= lowerCertainty) {
        upperValue = rampValue;
        lowerCertainty = rampCertainty;
        upperLowerColor = rampColor;
      }
    }
    
    if (rampValue >= v && rampCertainty >= c) {
      if (rampValue <= upperValue && rampCertainty <= upperCertainty) {
        upperValue = rampValue;
        upperCertainty = rampCertainty;
        upperUpperColor = rampColor;
      }
    }
  }
  
  // Interpolate along value axis first
  const valueFactor = (upperValue === lowerValue) ? 0 : (v - lowerValue) / (upperValue - lowerValue);
  const lowerColor = interpolateColor(lowerLowerColor, upperLowerColor, valueFactor);
  const upperColor = interpolateColor(lowerUpperColor, upperUpperColor, valueFactor);
  
  // Then interpolate along certainty axis
  const certaintyFactor = (upperCertainty === lowerCertainty) ? 0 : (c - lowerCertainty) / (upperCertainty - lowerCertainty);
  return interpolateColor(lowerColor, upperColor, certaintyFactor);
};

/**
 * Get a VSUP color for a value-certainty pair
 * @param {number} value - Data value (0-10)
 * @param {number} certainty - Certainty value (0-1)
 * @param {string} category - Damage category
 * @returns {string} Color in hex format
 */
export const getUncertaintyColor = (value, certainty, category = 'damage') => {
  // Get the appropriate color ramp
  const ramp = colorRamps[category] || colorRamps.damage;
  
  // Use bilinear interpolation to get the final color
  return bilinearInterpolate(ramp, value, certainty);
};

/**
 * Generate a color scale for a category
 * @param {string} category - Damage category
 * @param {number} steps - Number of steps in the scale
 * @returns {Array} Array of colors
 */
export const generateColorScale = (category = 'damage', steps = 10) => {
  const ramp = colorRamps[category] || colorRamps.damage;
  const colors = [];
  
  for (let i = 0; i < steps; i++) {
    const value = (i / (steps - 1)) * 10;
    colors.push(bilinearInterpolate(ramp, value, 0.9)); // High certainty colors
  }
  
  return colors;
};

/**
 * Generate a certainty scale for a specific value
 * @param {number} value - Data value (0-10)
 * @param {string} category - Damage category
 * @param {number} steps - Number of steps in the scale
 * @returns {Array} Array of colors
 */
export const generateCertaintyScale = (value = 5, category = 'damage', steps = 5) => {
  const ramp = colorRamps[category] || colorRamps.damage;
  const colors = [];
  
  for (let i = 0; i < steps; i++) {
    const certainty = i / (steps - 1);
    colors.push(bilinearInterpolate(ramp, value, certainty));
  }
  
  return colors;
};

/**
 * Get color ramp for a category
 * @param {string} category - Damage category
 * @returns {Array} Color ramp
 */
export const getColorRamp = (category = 'damage') => {
  return colorRamps[category] || colorRamps.damage;
};

export default {
  getUncertaintyColor,
  generateColorScale,
  generateCertaintyScale,
  getColorRamp
}; 