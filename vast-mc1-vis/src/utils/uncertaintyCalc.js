/**
 * Uncertainty Calculation Utilities
 * Handles calculations and conversions for uncertainty metrics
 */

/**
 * Convert credible interval range to certainty value (0-1)
 * @param {number} cir - Credible Interval Range
 * @returns {number} Certainty value (0-1)
 */
export const cirToCertainty = (cir) => {
  // CIR of 0 means perfect certainty (1.0)
  // CIR of 10 (full scale) means lowest certainty (0.1)
  // Scale between 0.1 and 0.9 for visualization purposes
  if (cir === undefined || cir === null || isNaN(cir)) {
    return 0.5; // Default to medium certainty
  }
  
  // Clamp CIR to 0-10 range
  const clampedCIR = Math.max(0, Math.min(10, cir));
  
  // Linear mapping from CIR to certainty
  // CIR 0 → certainty 0.9
  // CIR 10 → certainty 0.1
  return 0.9 - (clampedCIR / 10) * 0.8;
};

/**
 * Convert certainty value to credible interval range
 * @param {number} certainty - Certainty value (0-1)
 * @returns {number} Credible Interval Range
 */
export const certaintyToCIR = (certainty) => {
  // Inverse of cirToCertainty
  if (certainty === undefined || certainty === null || isNaN(certainty)) {
    return 5; // Default to medium CIR
  }
  
  // Clamp certainty to 0.1-0.9 range
  const clampedCertainty = Math.max(0.1, Math.min(0.9, certainty));
  
  // Linear mapping from certainty to CIR
  // certainty 0.9 → CIR 0
  // certainty 0.1 → CIR 10
  return (0.9 - clampedCertainty) * (10 / 0.8);
};

/**
 * Convert certainty value to certainty level string
 * @param {number} certainty - Certainty value (0-1)
 * @returns {string} Certainty level ('very_low', 'low', 'medium', 'high', 'very_high')
 */
export const certaintyToLevel = (certainty) => {
  if (certainty === undefined || certainty === null || isNaN(certainty)) {
    return 'medium';
  }
  
  if (certainty < 0.2) return 'very_low';
  if (certainty < 0.4) return 'low';
  if (certainty < 0.6) return 'medium';
  if (certainty < 0.8) return 'high';
  return 'very_high';
};

/**
 * Convert certainty level string to certainty value
 * @param {string} level - Certainty level
 * @returns {number} Certainty value (0-1)
 */
export const levelToCertainty = (level) => {
  if (!level) return 0.5;
  
  const mapping = {
    'very_low': 0.1,
    'low': 0.3,
    'medium': 0.5,
    'high': 0.8,
    'very_high': 0.9
  };
  
  return mapping[level.toLowerCase()] || 0.5;
};

/**
 * Calculate confidence interval range from lower and upper bounds
 * @param {number} lower - Lower bound
 * @param {number} upper - Upper bound
 * @returns {number} Confidence interval range
 */
export const calculateCIR = (lower, upper) => {
  if (lower === undefined || upper === undefined || isNaN(lower) || isNaN(upper)) {
    return 5; // Default to medium CIR
  }
  
  return Math.abs(upper - lower);
};

/**
 * Calculate confidence interval from value and certainty
 * @param {number} value - Central value
 * @param {number} certainty - Certainty value (0-1)
 * @returns {Object} Confidence interval {lower, upper}
 */
export const calculateCI = (value, certainty) => {
  if (value === undefined || isNaN(value)) {
    return { lower: 0, upper: 0 };
  }
  
  // Default to medium certainty
  const cert = certainty === undefined || isNaN(certainty) ? 0.5 : certainty;
  
  // Calculate CIR based on certainty
  const cir = certaintyToCIR(cert);
  
  // Create symmetrical CI around value
  return {
    lower: Math.max(0, value - cir / 2),
    upper: Math.min(10, value + cir / 2)
  };
};

/**
 * Calculate confidence interval from a central value and a Credible Interval Range (CIR).
 * The CIR is assumed to be the full width of the interval.
 * @param {number} value - The central point estimate value.
 * @param {number} cir - The Credible Interval Range (full width).
 * @param {number} [scaleMin=0] - Minimum value for clamping the CI.
 * @param {number} [scaleMax=10] - Maximum value for clamping the CI.
 * @returns {Object} Confidence interval { lower, upper }
 */
export const calculateCIFromValueAndCIR = (value, cir, scaleMin = 0, scaleMax = 10) => {
  if (value === undefined || isNaN(value) || cir === undefined || isNaN(cir)) {
    // Return a point interval at value or default if value is also bad
    const safeValue = (value !== undefined && !isNaN(value)) ? value : (scaleMin + scaleMax) / 2;
    return { lower: Math.max(scaleMin, Math.min(safeValue, scaleMax)), upper: Math.max(scaleMin, Math.min(safeValue, scaleMax)) };
  }

  const halfCIR = Math.abs(cir) / 2; // Use abs for cir, though typically positive
  let lower = value - halfCIR;
  let upper = value + halfCIR;

  // Clamp to scale and ensure lower <= value <= upper
  lower = Math.max(scaleMin, Math.min(lower, value));
  upper = Math.min(scaleMax, Math.max(upper, value));
  
  // Final check to ensure lower <= upper after all clamping
  if (lower > upper) {
    // This can happen if value itself is outside [scaleMin, scaleMax] or CIR is very large.
    // If value is within bounds, make a point interval at value.
    // If value is outside, clamp to the nearest bound.
    if (value >= scaleMin && value <= scaleMax) {
        lower = value;
        upper = value;
    } else if (value < scaleMin) {
        lower = scaleMin;
        upper = scaleMin;
    } else { // value > scaleMax
        lower = scaleMax;
        upper = scaleMax;
    }
  }
  
  return { lower, upper };
};

/**
 * Get a descriptive text for a certainty level
 * @param {string|number} certainty - Certainty level or value
 * @returns {string} Descriptive text
 */
export const getCertaintyDescription = (certainty) => {
  // Convert numeric certainty to level if needed
  const level = typeof certainty === 'number' ? 
    certaintyToLevel(certainty) : 
    (certainty || 'medium');
  
  const descriptions = {
    'very_low': 'Very low confidence in this estimate',
    'low': 'Low confidence in this estimate',
    'medium': 'Medium confidence in this estimate',
    'high': 'High confidence in this estimate',
    'very_high': 'Very high confidence in this estimate'
  };
  
  return descriptions[level.toLowerCase()] || descriptions.medium;
};

/**
 * Get damage description from damage value
 * @param {number} value - Damage value (0-10)
 * @returns {string} Damage description
 */
export const getDamageDescription = (value) => {
  if (value === undefined || isNaN(value)) {
    return 'Unknown';
  }
  
  if (value < 0.5) return 'None';
  if (value <= 2) return 'Minor';
  if (value <= 4) return 'Moderate';
  if (value <= 6) return 'Severe';
  if (value <= 8) return 'Very severe';
  return 'Catastrophic';
};

/**
 * Calculate certainty from Credible Interval Range (CIR)
 * @param {number} cir - Credible Interval Range
 * @param {number} [maxCredibleCIR=4.0] - The CIR value that corresponds to the lowest desired certainty.
 * @returns {number} Certainty value (clamped between 0.1 and 0.9, or 0.5 if input is invalid)
 */
export const calculateCertaintyFromCIR = (cir, maxCredibleCIR = 4.0) => {
  if (cir === undefined || cir === null || isNaN(cir) || maxCredibleCIR <= 0) {
    return 0.5; // Default to medium certainty for invalid inputs
  }
  const clampedCIR = Math.max(0, cir); // CIR cannot be negative
  // Certainty decreases as CIR increases.
  // If CIR is 0, certainty is 0.9 (high).
  // If CIR >= maxCredibleCIR, certainty is 0.1 (low).
  const certainty = 0.9 - (clampedCIR / maxCredibleCIR) * 0.8;
  return Math.max(0.1, Math.min(0.9, certainty));
};

/**
 * Calculate certainty from Standard Deviation (SD)
 * @param {number} sd - Standard Deviation
 * @param {number} [maxExpectedSD=2.5] - The SD value that corresponds to the lowest desired certainty.
 * @returns {number} Certainty value (clamped between 0.1 and 0.9, or 0.5 if input is invalid)
 */
export const calculateCertaintyFromSD = (sd, maxExpectedSD = 2.5) => {
  if (sd === undefined || sd === null || isNaN(sd) || maxExpectedSD <= 0) {
    return 0.5; // Default to medium certainty for invalid inputs
  }
  const clampedSD = Math.max(0, sd); // SD cannot be negative
  // Certainty decreases as SD increases.
  // If SD is 0, certainty is 0.9 (high).
  // If SD >= maxExpectedSD, certainty is 0.1 (low).
  const certainty = 0.9 - (clampedSD / maxExpectedSD) * 0.8;
  return Math.max(0.1, Math.min(0.9, certainty));
};

/**
 * Calculate certainty from the width of a Confidence Interval (CI).
 * @param {number} ciLower - The lower bound of the confidence interval.
 * @param {number} ciUpper - The upper bound of the confidence interval.
 * @param {number} value - The central point estimate value. Used for context with point estimates.
 * @param {number} [scaleMax=10.0] - The maximum possible value of the scale (e.g., 10 for a 0-10 scale).
 * @returns {number} Certainty value (ranging from 0.0 to 0.9).
 */
export const calculateCertaintyFromCIWidth = (ciLower, ciUpper, value, scaleMax = 10.0) => {
  if (ciLower === undefined || ciUpper === undefined || isNaN(ciLower) || isNaN(ciUpper) || scaleMax <= 0) {
    return 0.5; // Default for invalid inputs
  }

  const ciWidth = Math.abs(ciUpper - ciLower);

  if (ciWidth >= scaleMax) { // CI spans the entire possible data range or more
    return 0.0;
  } else if (ciWidth <= 0.01) { // Point estimate or very narrow CI
    // Differentiate based on the value itself for point estimates at zero vs non-zero
    if (value !== undefined && !isNaN(value) && value === 0) {
        return 0.7; // Reasonably certain for a point estimate at zero
    }
    return 0.9; // High certainty for non-zero precise estimates or very narrow CIs
  } else {
    // General case: scale certainty inversely with CI width
    // Certainty = 1.0 - (normalized width), then clamped.
    // We map it to a 0.1 - 0.9 range for consistency with other certainty metrics,
    // but allow 0.0 for full width.
    const rawCertainty = 1.0 - (ciWidth / scaleMax);
    return Math.max(0.1, Math.min(0.9, rawCertainty));
    // If strict 0.0 to 0.9 is desired, this would be:
    // return Math.max(0.0, Math.min(0.9, rawCertainty));
    // For now, sticking to 0.1-0.9 for typical cases, with 0.0 as a special case for full width.
  }
};

export default {
  cirToCertainty,
  certaintyToCIR,
  certaintyToLevel,
  levelToCertainty,
  calculateCIR,
  calculateCI,
  calculateCIFromValueAndCIR,
  getCertaintyDescription,
  getDamageDescription,
  calculateCertaintyFromCIR,
  calculateCertaintyFromSD,
  calculateCertaintyFromCIWidth
}; 