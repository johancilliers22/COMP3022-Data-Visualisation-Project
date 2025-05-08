import { useMemo } from 'react';

/**
 * Custom hook to filter data based on user-selected filters
 * @param {Object} data - The complete data object from R analysis
 * @param {Object} filters - The filter criteria
 * @returns {Object} - Filtered data
 */
const useFilteredData = (data, filters) => {
  const filteredData = useMemo(() => {
    if (!data || !data.reports) return null;
    
    const { 
      categories = [], 
      neighborhood = null, 
      timeRange = null,
      certaintyLevel = null
    } = filters;
    
    // Create a clone of the data object
    const result = {
      ...data,
      reports: [...data.reports],
      neighborhoodGroups: { ...data.neighborhoodGroups },
      timeSeriesData: { ...data.timeSeriesData }
    };
    
    // Filter by categories if specified
    if (categories && categories.length > 0) {
      // Convert to set for faster lookups
      const categorySet = new Set(categories);
      
      // Filter reports by category
      result.reports = result.reports.filter(report => categorySet.has(report.category));
      
      // Filter neighborhood groups
      Object.keys(result.neighborhoodGroups).forEach(neighborhood => {
        result.neighborhoodGroups[neighborhood] = result.neighborhoodGroups[neighborhood].filter(
          report => categorySet.has(report.category)
        );
      });
      
      // Filter time series data
      if (result.timeSeriesData) {
        Object.keys(result.timeSeriesData).forEach(category => {
          if (!categorySet.has(category)) {
            delete result.timeSeriesData[category];
          }
        });
      }
    }
    
    // Filter by neighborhood if specified
    if (neighborhood) {
      // Filter reports by neighborhood
      result.reports = result.reports.filter(report => report.location === neighborhood);
      
      // Filter neighborhood groups
      const filtered = {};
      if (result.neighborhoodGroups[neighborhood]) {
        filtered[neighborhood] = result.neighborhoodGroups[neighborhood];
      }
      result.neighborhoodGroups = filtered;
    }
    
    // Filter by time range if specified
    if (timeRange && (timeRange.start || timeRange.end)) {
      const startTime = timeRange.start ? new Date(timeRange.start).getTime() : 0;
      const endTime = timeRange.end ? new Date(timeRange.end).getTime() : Infinity;
      
      // Filter reports by time range
      result.reports = result.reports.filter(report => {
        const reportTime = report.time.getTime();
        return reportTime >= startTime && reportTime <= endTime;
      });
      
      // Filter neighborhood groups
      Object.keys(result.neighborhoodGroups).forEach(neighborhood => {
        result.neighborhoodGroups[neighborhood] = result.neighborhoodGroups[neighborhood].filter(report => {
          const reportTime = report.time.getTime();
          return reportTime >= startTime && reportTime <= endTime;
        });
      });
      
      // Filter time series data
      if (result.timeSeriesData) {
        Object.keys(result.timeSeriesData).forEach(category => {
          result.timeSeriesData[category] = result.timeSeriesData[category].filter(point => {
            const pointTime = point[0].getTime();
            return pointTime >= startTime && pointTime <= endTime;
          });
        });
      }
    }
    
    // Filter by certainty level if specified
    if (certaintyLevel && certaintyLevel !== 'any') { // 'any' means no filtering
      // Define numeric thresholds for certainty levels
      // These thresholds should align with how levels are defined elsewhere (e.g., in uncertaintyCalc.js or display components)
      const THRESHOLDS = {
        VERY_LOW_MAX: 0.199,  // Certainty < 0.2
        LOW_MAX: 0.399,       // Certainty 0.2 to < 0.4
        MEDIUM_MAX: 0.799,    // Certainty 0.4 to < 0.8 (adjust if high starts at 0.7 or 0.75)
        HIGH_MIN: 0.8         // Certainty >= 0.8
      };

      result.reports = result.reports.filter(report => {
        const numericCertainty = report.certainty; // Assumes report.certainty is numeric (0-1)
        if (numericCertainty === undefined || numericCertainty === null) return true; // Don't filter if certainty is not set

        switch (certaintyLevel) {
          case 'high':
            return numericCertainty >= THRESHOLDS.HIGH_MIN;
          case 'medium':
            return numericCertainty >= THRESHOLDS.LOW_MAX && numericCertainty < THRESHOLDS.HIGH_MIN; // Adjusted to be between low and high
          case 'low':
            return numericCertainty < THRESHOLDS.LOW_MAX && numericCertainty >= THRESHOLDS.VERY_LOW_MAX; // Adjusted for low
          case 'very_low':
            return numericCertainty < THRESHOLDS.VERY_LOW_MAX;
          default: // Includes 'any' or unrecognized levels
            return true;
        }
      });
      
      // Filter neighborhood groups by certainty level
      Object.keys(result.neighborhoodGroups).forEach(neighborhood => {
        result.neighborhoodGroups[neighborhood] = result.neighborhoodGroups[neighborhood].filter(report => {
          const numericCertainty = report.certainty;
          if (numericCertainty === undefined || numericCertainty === null) return true;

          switch (certaintyLevel) {
            case 'high':
              return numericCertainty >= THRESHOLDS.HIGH_MIN;
            case 'medium':
              return numericCertainty >= THRESHOLDS.LOW_MAX && numericCertainty < THRESHOLDS.HIGH_MIN;
            case 'low':
              return numericCertainty < THRESHOLDS.LOW_MAX && numericCertainty >= THRESHOLDS.VERY_LOW_MAX;
            case 'very_low':
              return numericCertainty < THRESHOLDS.VERY_LOW_MAX;
            default:
              return true;
          }
        });
      });
      // Note: Filtering timeSeriesData by certainty might be complex as its structure is different.
      // This is typically an aggregation and might not have per-point certainty in the same way.
      // If needed, logic for timeSeriesData would go here, but it depends on its structure.
    }
    
    // Add grouping by time, category for convenience
    result.timeGroups = groupByProperty(result.reports, 'time', time => time.toISOString());
    result.categoryGroups = groupByProperty(result.reports, 'category');
    
    return result;
  }, [data, filters]);
  
  return filteredData;
};

/**
 * Helper function to group data by a property
 * @param {Array} data - Array of data items
 * @param {string} property - Property to group by
 * @param {Function} keyFn - Optional function to transform the key
 * @returns {Object} - Grouped data
 */
const groupByProperty = (data, property, keyFn = key => key) => {
  return data.reduce((groups, item) => {
    const key = keyFn(item[property]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
};

export default useFilteredData; 