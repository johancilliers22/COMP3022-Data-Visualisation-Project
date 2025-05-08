/**
 * Data processing utilities for earthquake damage visualization
 * 
 * OPTIMIZATION: Removed unnecessary console.log statements and simplified
 * for better performance
 */

import Papa from 'papaparse';
import logger from './logger';
import { loadAllBSTSData } from './dataLoader';
import { getUncertaintyColor } from './vsupColors';
// Import uncertainty calculation utilities
import {
    levelToCertainty,
    certaintyToLevel, // May need this if we convert numeric back to level strings
    calculateCI,
    calculateCIFromValueAndCIR,
    calculateCertaintyFromCIR,
    calculateCertaintyFromSD,
    calculateCertaintyFromCIWidth
} from './uncertaintyCalc';

// Maximum number of rows to load initially for faster loading
const SAMPLE_SIZE = 1000;
const USE_SAMPLE = false; // Use full dataset by default

/**
 * Load CSV data from the given URL and parse it
 * @param {string} url - URL of the CSV file
 * @returns {Promise<Object>} - Processed data object
 */
export const loadData = async (url) => {
  logger.debug(`Starting to load data from ${url}`);
  const startTime = performance.now();
  
  try {
    logger.debug('Fetching data...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    logger.debug(`Fetch completed in ${(performance.now() - startTime).toFixed(2)}ms`);
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      logger.debug('Starting CSV parsing with Papa Parse...');
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          logger.debug(`Parsing completed, rows: ${results.data.length}`);
          
          // Log errors if any
          if (results.errors && results.errors.length > 0) {
            logger.error('Papa Parse errors:', results.errors);
          }
          
          // Using sample or full data
          let dataToProcess = results.data;
          if (USE_SAMPLE && results.data.length > SAMPLE_SIZE) {
            logger.debug(`Using a sample of ${SAMPLE_SIZE} rows`);
            dataToProcess = results.data.slice(0, SAMPLE_SIZE);
          }
          
          try {
            const processedData = transformData(dataToProcess);
            logger.debug(`Data transformation completed`);
            
            logger.debug(`Total data loading time: ${(performance.now() - startTime / 1000).toFixed(2)} seconds`);
            resolve(processedData);
          } catch (error) {
            logger.error('Error during data transformation:', error);
            // Return minimal valid data structure
            resolve({
              reports: [],
              neighborhoodGroups: {},
              timeSeriesData: {},
              locations: []
            });
          }
        },
        error: (error) => {
          logger.error('Papa Parse error:', error);
          // Return minimal valid data structure
          resolve({
            reports: [],
            neighborhoodGroups: {},
            timeSeriesData: {},
            locations: []
          });
        }
      });
    });
  } catch (error) {
    logger.error('Error loading data:', error);
    // Return minimal valid data structure
    return {
      reports: [],
      neighborhoodGroups: {},
      timeSeriesData: {},
      locations: []
    };
  }
};

/**
 * Transform raw CSV data into structured format for visualizations
 * @param {Array} rawData - Raw parsed CSV data
 * @returns {Object} - Transformed data structure
 */
const transformData = (rawData) => {
  logger.debug(`Transform data started with ${rawData.length} rows`);

  // Identify the format of the CSV
  const hasCategoryColumn = rawData.length > 0 && 'category' in rawData[0];
  const categoryColumns = ['shake_intensity', 'sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
  
  // Normalize data to have a consistent structure
  let reports = [];
  
  try {
    if (hasCategoryColumn) {
      // If data already has category and reportValue columns, just filter invalid rows
      reports = rawData.filter(row => 
        row.time && row.location && 
        row.category && (row.reportValue !== undefined || row.map !== undefined)
      ).map(row => {
        const timeObj = new Date(row.time);
        const validTime = !isNaN(timeObj.getTime()) ? timeObj : null;
        if (!validTime) return null; // Skip if time is invalid

        const reportValue = Number(row.reportValue || row.map || 0);
        let certainty = 0.5; // Default numeric certainty
        let ciLower, ciUpper;

        if (row.certainty_level) {
          certainty = levelToCertainty(row.certainty_level);
        } else if (typeof row.certainty === 'number') { // If a numeric certainty is provided directly
          certainty = Math.max(0, Math.min(1, row.certainty)); // Clamp to 0-1
        }
        // If only CIR is available, it doesn't directly give certainty without a value, skip for now.
        // Certainty might be refined later if BSTS data is merged.

        if (row.ci_lower !== undefined && row.ci_upper !== undefined && !isNaN(Number(row.ci_lower)) && !isNaN(Number(row.ci_upper))) {
          ciLower = Number(row.ci_lower);
          ciUpper = Number(row.ci_upper);
        } else if (row.ci_lower_95 !== undefined && row.ci_upper_95 !== undefined && !isNaN(Number(row.ci_lower_95)) && !isNaN(Number(row.ci_upper_95))) {
          ciLower = Number(row.ci_lower_95);
          ciUpper = Number(row.ci_upper_95);
        } else if (row.cir !== undefined && !isNaN(Number(row.cir))) {
          const calculatedCI = calculateCIFromValueAndCIR(reportValue, Number(row.cir));
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
           // Optionally, re-calculate certainty based on this CIR if no other source was better
           if (!row.certainty_level && typeof row.certainty !== 'number') {
             certainty = calculateCertaintyFromCIR(Number(row.cir));
           }
        } else {
          // Fallback: calculate CI from default/derived certainty
          const calculatedCI = calculateCI(reportValue, certainty);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        }
        
        return {
          time: validTime,
          location: row.location,
          locationName: row.loc_name || row.locationName || `Location ${row.location}`,
          category: row.category,
          reportValue: reportValue,
          certainty: certainty, // Store numeric certainty
          // certainty_level: certaintyToLevel(certainty), // Optionally keep level string
          ci_lower: ciLower,
          ci_upper: ciUpper,
          // cir: row.cir, // Keep original CIR if present, or it could be derived from ci_lower/ci_upper if needed
        };
      }).filter(row => row !== null); // Filter out rows with invalid dates that became null
    } else {
      // Define location names mapping
      const locationNames = {
        '1': 'Palace Hills',
        '2': 'Northwest',
        '3': 'Old Town',
        '4': 'Safe Town',
        '5': 'Southwest',
        '6': 'Downtown',
        '7': 'Wilson Forest',
        '8': 'Scenic Vista',
        '9': 'Broadview',
        '10': 'Chapparal',
        '11': 'Terrapin',
        '12': 'Pepper Mill',
        '13': 'Cheddarford',
        '14': 'Easton',
        '15': 'Weston',
        '16': 'Southton',
        '17': 'Oak Willow',
        '18': 'East Parton',
        '19': 'West Parton'
      };
      
      const processedReports = [];
      const rowCount = rawData.length;
      
      for (let i = 0; i < rowCount; i++) {
        const row = rawData[i];
        if (!row || !row.time || !row.location) continue;
        const timeObj = new Date(row.time);
        if (isNaN(timeObj.getTime())) continue;

        categoryColumns.forEach(category => {
          if (row[category] === undefined || row[category] === null) return;
          
          const reportValue = Number(row[category]);
          const locationName = locationNames[row.location] || `Location ${row.location}`;
          let certainty = 0.5; // Default numeric certainty
          let ciLower, ciUpper;

          // Check for category-specific certainty/CI fields first
          const certLevelField = row[`${category}_certainty_level`];
          const certNumericField = row[`${category}_certainty`];
          const cirField = row[`${category}_cir`];
          const ciLowerField = row[`${category}_ci_lower`];
          const ciUpperField = row[`${category}_ci_upper`];

          if (certLevelField) {
            certainty = levelToCertainty(certLevelField);
          } else if (typeof certNumericField === 'number') {
            certainty = Math.max(0, Math.min(1, certNumericField));
          } else if (row.certainty_level) { // Fallback to generic row certainty_level
            certainty = levelToCertainty(row.certainty_level);
          } else if (typeof row.certainty === 'number') { // Fallback to generic row numeric certainty
            certainty = Math.max(0, Math.min(1, row.certainty));
          }

          if (ciLowerField !== undefined && ciUpperField !== undefined && !isNaN(Number(ciLowerField)) && !isNaN(Number(ciUpperField))) {
            ciLower = Number(ciLowerField);
            ciUpper = Number(ciUpperField);
          } else if (cirField !== undefined && !isNaN(Number(cirField))) {
            const calculatedCI = calculateCIFromValueAndCIR(reportValue, Number(cirField));
            ciLower = calculatedCI.lower;
            ciUpper = calculatedCI.upper;
            if (!certLevelField && typeof certNumericField !== 'number' && !row.certainty_level && typeof row.certainty !== 'number') {
              certainty = calculateCertaintyFromCIR(Number(cirField)); // Update certainty if derived from CIR
            }
          } else {
            const calculatedCI = calculateCI(reportValue, certainty);
            ciLower = calculatedCI.lower;
            ciUpper = calculatedCI.upper;
          }
          
          processedReports.push({
            time: timeObj,
            location: row.location,
            locationName: locationName,
            category: category,
            reportValue: reportValue,
            certainty: certainty, // Store numeric certainty
            // certainty_level: certaintyToLevel(certainty), // Optionally store level string
            ci_lower: ciLower,
            ci_upper: ciUpper,
            // cir: cirField || row.cir, // Keep original CIR if present
          });
        });
      }
      reports = processedReports;
    }
    
    logger.debug(`Normalized ${reports.length} reports`);
    
    // Group reports by neighborhood
    const neighborhoodGroups = {};
    reports.forEach(report => {
      const neighborhoodId = report.location;
      if (!neighborhoodGroups[neighborhoodId]) {
        neighborhoodGroups[neighborhoodId] = [];
      }
      neighborhoodGroups[neighborhoodId].push(report);
    });
    
    // Generate location info
    const locations = generateLocationInfo(reports, neighborhoodGroups);
    
    // Generate time series data
    const timeSeriesData = generateTimeSeriesData(reports);
    
    logger.debug(`Data transformation complete`);
    
    return {
      reports,
      neighborhoodGroups,
      timeSeriesData,
      locations
    };
  } catch (error) {
    logger.error('Error in data transformation:', error);
    throw error;
  }
};

/**
 * Process time series data for damage over time visualization
 * @param {Array} data - Reports data
 * @param {Object} filters - Optional filters to apply
 * @returns {Object} - Processed time series data
 */
export const processDamageTimeSeries = (data, filters = {}) => {
  // Check if we have valid data
  if (!data || !Array.isArray(data.reports) || data.reports.length === 0) {
    return {};
  }
  
  // Apply filters if needed
  let filteredReports = data.reports;
  
  // Filter by category if specified
  if (filters.category) {
    filteredReports = filteredReports.filter(r => r.category === filters.category);
  }
  
  // Filter by location if specified
  if (filters.location) {
    filteredReports = filteredReports.filter(r => r.location === filters.location);
  }
  
  // Group by category and time
  const timeSeriesData = {};
  
  // For each category, create a time series
  const categories = [...new Set(filteredReports.map(r => r.category))];
  
  categories.forEach(category => {
    const categoryReports = filteredReports.filter(r => r.category === category);
    
    // Group by timestamp
    const timeGroups = {};
    categoryReports.forEach(report => {
      const time = report.time.getTime();
      
      if (!timeGroups[time]) {
        timeGroups[time] = [];
      }
      
      timeGroups[time].push(report);
    });
    
    // Convert to array of [time, value] pairs
    timeSeriesData[category] = Object.entries(timeGroups).map(([time, reports]) => {
      // Calculate average value for this time point
      const avg = reports.reduce((sum, r) => sum + r.reportValue, 0) / reports.length;
      
      return [new Date(parseInt(time)), avg];
    }).sort((a, b) => a[0] - b[0]); // Sort by time
  });
  
  return timeSeriesData;
};

/**
 * Generate location information from reports data
 * @param {Array} reports - Reports data
 * @param {Object} neighborhoodGroups - Reports grouped by neighborhood
 * @returns {Array} - Location information
 */
export const generateLocationInfo = (reports, neighborhoodGroups) => {
  // Extract unique locations
  const locationIds = new Set(reports.map(r => r.location));
  
  // Create location info objects
  return Array.from(locationIds).map(id => {
    const neighborhoodReports = neighborhoodGroups[id] || [];
    
    // Get the location name from the first report
    const locationName = neighborhoodReports.length > 0 
      ? neighborhoodReports[0].locationName 
      : `Location ${id}`;
    
    // Calculate damage statistics
    const damageValues = neighborhoodReports
      .filter(r => typeof r.reportValue === 'number')
      .map(r => r.reportValue);
    
    const avgDamage = damageValues.length > 0
      ? damageValues.reduce((sum, val) => sum + val, 0) / damageValues.length
      : 0;
    
    const maxDamage = damageValues.length > 0
      ? Math.max(...damageValues)
      : 0;
    
    // Get the most recent report timestamp
    const timestamps = neighborhoodReports
      .map(r => r.time.getTime())
      .filter(t => !isNaN(t));
    
    const lastUpdate = timestamps.length > 0
      ? new Date(Math.max(...timestamps))
      : new Date();
    
    // Calculate uncertainty metrics
    const uncertaintyValues = neighborhoodReports
      .filter(r => typeof r.cir === 'number')
      .map(r => r.cir);
    
    const avgUncertainty = uncertaintyValues.length > 0
      ? uncertaintyValues.reduce((sum, val) => sum + val, 0) / uncertaintyValues.length
      : 1.0;
    
    return {
      id: id.toString(),
      name: locationName,
      avg_damage: avgDamage,
      max_damage: maxDamage,
      avg_uncertainty: avgUncertainty,
      last_update: lastUpdate
    };
  });
};

/**
 * Group reports by neighborhood
 * @param {Array} data - Reports data
 * @returns {Object} - Reports grouped by neighborhood
 */
export const groupByNeighborhood = (data) => {
  const neighborhoodGroups = {};
  
  // Group reports by neighborhood ID
  data.forEach(report => {
    const neighborhoodId = report.location;
    
    if (!neighborhoodGroups[neighborhoodId]) {
      neighborhoodGroups[neighborhoodId] = [];
    }
    
    neighborhoodGroups[neighborhoodId].push(report);
  });
  
  return neighborhoodGroups;
};

/**
 * Generate time series data for visualization
 * @param {Array} data - Reports data
 * @returns {Object} - Time series data by category
 */
export const generateTimeSeriesData = (data) => {
  // Group by category
  const categories = {};
  
  // Extract unique categories
  const uniqueCategories = [...new Set(data.map(r => r.category))];
  
  // Initialize categories
  uniqueCategories.forEach(category => {
    categories[category] = [];
  });
  
  // Group reports by category and time
  uniqueCategories.forEach(category => {
    const categoryReports = data.filter(r => r.category === category);
    
    // Group by timestamp (1-hour buckets for smoothing)
    const timeGroups = {};
    
    categoryReports.forEach(report => {
      // Round to nearest hour to reduce noise
      const date = new Date(report.time);
      date.setMinutes(0, 0, 0);
      const timeKey = date.getTime();
      
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      
      timeGroups[timeKey].push(report);
    });
    
    // Convert to array of [time, value] pairs
    categories[category] = Object.entries(timeGroups).map(([time, reports]) => {
      // Calculate average, max, min values for this time point
      const values = reports.map(r => r.reportValue);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      // Calculate uncertainty metrics
      const ciRanges = reports.map(r => r.ci_upper - r.ci_lower);
      const avgCI = ciRanges.reduce((sum, val) => sum + val, 0) / ciRanges.length;
      
      return [
        new Date(parseInt(time)), // time
        avg,                      // average value
        min,                      // min value
        max,                      // max value
        avgCI                     // uncertainty
      ];
    }).sort((a, b) => a[0] - b[0]); // Sort by time
  });
  
  return categories;
};

/**
 * Process data specifically for the map visualization component
 * @param {Object} rawData - Raw data from the data loader
 * @param {string} selectedCategory - Selected damage category 
 * @param {Date} currentTime - Current selected time
 * @returns {Object} Processed data for the map
 */
export const processMapData = async (rawData, selectedCategory, currentTime) => {
  if (!rawData || !selectedCategory || !currentTime) {
    logger.warn('Missing inputs for processMapData');
    return null;
  }
  
  try {
    logger.debug(`Processing map data for ${selectedCategory} at ${new Date(currentTime).toISOString()}`);
    
    // First, load the BSTS data which contains uncertainty information
    const bstsData = await loadAllBSTSData(selectedCategory, currentTime);
    
    // If no BSTS data, fall back to raw reports
    if (!bstsData || Object.keys(bstsData).length === 0) {
      logger.warn(`No BSTS data found for ${selectedCategory}, falling back to raw reports`);
      return processRawReportsForMap(rawData, selectedCategory, currentTime);
    }
    
    // Get the GeoJSON features to ensure all neighborhoods are represented
    // Even those without data
    const neighborhoods = rawData.geoJSON?.features?.map(feature => ({
      id: feature.properties.loc.toString(),
      name: feature.properties.locName || `Neighborhood ${feature.properties.loc}`,
      coordinates: calculateCentroid(feature),
      geojson: feature
    })) || [];
    
    // Process each neighborhood
    const processedData = neighborhoods.map(neighborhood => {
      const bstsRecord = bstsData[neighborhood.id];
      
      let value = 0;
      let certainty = 0.2; // Default to low certainty if no other info
      let ciLower = 0;
      let ciUpper = 0;
      let damageDescription; // Declare once here
      
      if (bstsRecord) {
        value = bstsRecord.map ?? bstsRecord.mean ?? 0;
        value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value)); // Clamp value

        // Determine certainty from BSTS record (Priority: level, cir, sd, then CI width)
        if (bstsRecord.certainty_level) {
          certainty = levelToCertainty(bstsRecord.certainty_level);
        } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
          certainty = calculateCertaintyFromCIR(bstsRecord.cir);
        } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
          certainty = calculateCertaintyFromSD(bstsRecord.sd);
        } else if (bstsRecord.ci_lower_95 !== undefined && bstsRecord.ci_upper_95 !== undefined) {
          // If only explicit CIs are available, derive certainty from their width
          certainty = calculateCertaintyFromCIWidth(bstsRecord.ci_lower_95, bstsRecord.ci_upper_95, value);
        } // else certainty remains the default (0.2 for BSTS with no other info)
        
        // Determine CI bounds from BSTS record
        if (bstsRecord.ci_lower_95 !== undefined && bstsRecord.ci_upper_95 !== undefined) {
          ciLower = bstsRecord.ci_lower_95;
          ciUpper = bstsRecord.ci_upper_95;
        } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
          const calculatedCI = calculateCIFromValueAndCIR(value, bstsRecord.cir);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
          // Estimate CI from SD: value +/- 1.96 * SD for 95% CI
          const halfWidth = 1.96 * bstsRecord.sd;
          const calculatedCI = calculateCIFromValueAndCIR(value, halfWidth * 2); // CIR is full width
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        } else {
          // Fallback: derive CI from the determined certainty
          const calculatedCI = calculateCI(value, certainty);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        }
      } else {
        // No BSTS data, use raw reports (logic now moved to processRawReportsForMap)
        // but we need to call it here to get the values for this neighborhood.
        // This is a bit redundant as processRawReportsForMap iterates all neighborhoods.
        // For a cleaner approach, processRawReportsForMap could return a map by ID.
        // For now, let's assume processRawReportsForMap is called if bstsData is empty overall,
        // and here we handle the case of a specific neighborhood missing in bstsData.
        
        // Simplified fallback for a neighborhood missing in BSTS data but raw reports might exist:
        const reports = rawData.neighborhoodGroups?.[neighborhood.id] || [];
        const categoryReports = reports.filter(report => {
          if (report.category === selectedCategory) return true;
          // Add other category checks if necessary from your data structure
          return false;
        });

        const validReports = categoryReports
            .filter(report => report.time && new Date(report.time) <= new Date(currentTime))
            .sort((a, b) => new Date(b.time) - new Date(a.time));

        if (validReports.length > 0) {
            const latestReport = validReports[0];
            value = latestReport.reportValue ?? latestReport[selectedCategory] ?? latestReport.value ?? 0;
            value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value)); // Clamp value

            if (latestReport.certainty_level) {
                certainty = levelToCertainty(latestReport.certainty_level);
            } else if (typeof latestReport.certainty === 'number') {
                certainty = Math.max(0.1, Math.min(0.9, latestReport.certainty)); // Clamp direct numeric certainty
            } // else certainty remains the default (0.2)

            if (latestReport.ci_lower !== undefined && latestReport.ci_upper !== undefined) {
                ciLower = latestReport.ci_lower;
                ciUpper = latestReport.ci_upper;
            } else if (latestReport.cir !== undefined && !isNaN(Number(latestReport.cir))) {
                const calculatedCI = calculateCIFromValueAndCIR(value, Number(latestReport.cir));
                ciLower = calculatedCI.lower;
                ciUpper = calculatedCI.upper;
            } else {
                const calculatedCI = calculateCI(value, certainty);
                ciLower = calculatedCI.lower;
                ciUpper = calculatedCI.upper;
            }
        } // Else, if no valid raw reports, values remain 0, certainty 0.2, CIs (0,0) via calculateCI(0,0.2)
          else {
             const calculatedCI = calculateCI(value, certainty); // value is 0, certainty is 0.2
             ciLower = calculatedCI.lower;
             ciUpper = calculatedCI.upper;
          }
      }
      
      // Final clamping for CIs to be within [0, 10] and ensure ciLower <= ciUpper
      // This is now handled robustly by calculateCI and calculateCIFromValueAndCIR, but an extra check won't hurt.
      ciLower = Math.max(0, Math.min(10, Number(ciLower) || 0));
      ciUpper = Math.max(0, Math.min(10, Number(ciUpper) || 0));
      if (ciLower > ciUpper) { 
          const mid = (ciLower + ciUpper) / 2; // Or just use value
          ciLower = Math.min(value, mid);
          ciUpper = Math.max(value, mid);
          if (ciLower > ciUpper) { ciLower = value; ciUpper = value; }
      }

      damageDescription = "None";
      if (value < 0.5) damageDescription = "None";
      else if (value <= 2) damageDescription = "Minor";
      else if (value <= 4) damageDescription = "Moderate";
      else if (value <= 6) damageDescription = "Severe";
      else if (value <= 8) damageDescription = "Very severe";
      else damageDescription = "Catastrophic";
      
      // Get report count
      const reports = rawData.neighborhoodGroups[neighborhood.id] || [];
      const categoryReports = reports.filter(report => {
        if (report.category === selectedCategory) return true;
        if (report[selectedCategory] !== undefined) return true;
        if (report.damage_type === selectedCategory) return true;
        return false;
      });
      
      return {
        name: neighborhood.name,
        id: neighborhood.id,
        value: value,
        coordinates: neighborhood.coordinates,
        certainty: certainty,
        damageDescription: damageDescription,
        reportCount: categoryReports.length,
        ciLower: ciLower,
        ciUpper: ciUpper,
        vsupColor: getUncertaintyColor(value, certainty)
      };
    });
    
    return processedData;
  } catch (error) {
    logger.error(`Error processing map data: ${error.message}`);
    return null;
  }
};

/**
 * Calculate centroid of a GeoJSON feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Array} Centroid coordinates [lon, lat]
 */
const calculateCentroid = (feature) => {
  try {
    if (feature.geometry && feature.geometry.type === "Polygon" && feature.geometry.coordinates) {
      // Simple centroid calculation for first polygon ring
      const points = feature.geometry.coordinates[0];
      if (points && points.length) {
        const sum = points.reduce((acc, point) => {
          return [acc[0] + point[0], acc[1] + point[1]];
        }, [0, 0]);
        return [sum[0] / points.length, sum[1] / points.length];
      }
    }
  } catch (error) {
    logger.error(`Error calculating centroid: ${error.message}`);
  }
  
  // Default to center of St. Himark if calculation fails
  return [0, 0];
};

/**
 * Process raw reports when BSTS data is not available
 * @param {Object} rawData - Raw data from the data loader
 * @param {string} selectedCategory - Selected damage category 
 * @param {Date} currentTime - Current selected time
 * @returns {Array} Processed neighborhood data for the map
 */
const processRawReportsForMap = (rawData, selectedCategory, currentTime) => {
  logger.debug(`Processing raw reports for map for ${selectedCategory}`);
  
  // Get unique neighborhoods from rawData
  let neighborhoods = [];
  
  // Try to get from GeoJSON first
  if (rawData.geoJSON && rawData.geoJSON.features) {
    neighborhoods = rawData.geoJSON.features.map(feature => ({
      id: feature.properties.loc.toString(),
      name: feature.properties.locName || `Neighborhood ${feature.properties.loc}`,
      coordinates: calculateCentroid(feature)
    }));
  } 
  // If no GeoJSON, use locations
  else if (rawData.locations && rawData.locations.length > 0) {
    neighborhoods = rawData.locations;
  }
  // If still no neighborhoods, extract from reports
  else if (rawData.reports && rawData.reports.length > 0) {
    const locationIds = [...new Set(rawData.reports.map(r => r.location))].filter(Boolean);
    neighborhoods = locationIds.map(id => ({
      id: id.toString(),
      name: rawData.neighborhoodMap?.[id] || `Neighborhood ${id}`,
      coordinates: [0, 0] // Default coordinates
    }));
  }
  
  // Process each neighborhood
  return neighborhoods.map(neighborhood => {
    const reports = rawData.neighborhoodGroups?.[neighborhood.id] || []; // Use optional chaining
    
    const categoryReports = reports
      .filter(report => {
        // Multiple ways the category might be stored
        if (report.category === selectedCategory) return true;
        if (report[selectedCategory] !== undefined) return true;
        if (report.damage_type === selectedCategory) return true;
        return false;
      })
      .filter(report => new Date(report.time) <= new Date(currentTime));
      
    // Sort by time to get the most recent
    const validReports = categoryReports.sort((a, b) => 
      new Date(b.time) - new Date(a.time)
    );
    
    let value = 0;
    let certainty = 0.2; // Default to low certainty for raw reports
    let ciLower = 0;
    let ciUpper = 0;
    let damageDescription; // Declare once here
    
    if (validReports.length > 0) {
      const latestReport = validReports[0];
      
      value = latestReport.reportValue ?? latestReport[selectedCategory] ?? latestReport.value ?? 0;
      value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value)); // Clamp value
      
      if (latestReport.certainty_level) {
        certainty = levelToCertainty(latestReport.certainty_level);
      } else if (typeof latestReport.certainty === 'number') {
        certainty = Math.max(0.1, Math.min(0.9, latestReport.certainty)); // Clamp direct numeric certainty
      } // else certainty remains the default (0.2)
      
      if (latestReport.ci_lower !== undefined && latestReport.ci_upper !== undefined) {
        ciLower = latestReport.ci_lower;
        ciUpper = latestReport.ci_upper;
      } else if (latestReport.cir !== undefined && !isNaN(Number(latestReport.cir))) {
        const calculatedCI = calculateCIFromValueAndCIR(value, Number(latestReport.cir));
        ciLower = calculatedCI.lower;
        ciUpper = calculatedCI.upper;
      } else {
        // Fallback: derive CI from the determined certainty
        const calculatedCI = calculateCI(value, certainty);
        ciLower = calculatedCI.lower;
        ciUpper = calculatedCI.upper;
      }
    } else {
      // No valid reports for this neighborhood, use defaults (value=0, certainty=0.2)
      const calculatedCI = calculateCI(value, certainty); // value is 0, certainty is 0.2
      ciLower = calculatedCI.lower;
      ciUpper = calculatedCI.upper;
    }
    
    // Final clamping for CIs (mostly handled by helper functions now)
    ciLower = Math.max(0, Math.min(10, Number(ciLower) || 0));
    ciUpper = Math.max(0, Math.min(10, Number(ciUpper) || 0));
    if (ciLower > ciUpper) { 
        const mid = (ciLower + ciUpper) / 2; // Or just use value
        ciLower = Math.min(value, mid);
        ciUpper = Math.max(value, mid);
        if (ciLower > ciUpper) { ciLower = value; ciUpper = value; }
    }

    damageDescription = "None";
    if (value < 0.5) damageDescription = "None";
    else if (value <= 2) damageDescription = "Minor";
    else if (value <= 4) damageDescription = "Moderate";
    else if (value <= 6) damageDescription = "Severe";
    else if (value <= 8) damageDescription = "Very severe";
    else damageDescription = "Catastrophic";
    
    return {
      name: neighborhood.name,
      id: neighborhood.id,
      value: value,
      coordinates: neighborhood.coordinates,
      certainty: certainty,
      damageDescription: damageDescription,
      reportCount: categoryReports.length,
      ciLower: ciLower,
      ciUpper: ciUpper,
      vsupColor: getUncertaintyColor(value, certainty)
    };
  });
};

/**
 * Process data for time series visualization
 * @param {Object} rawData - Raw data from the data loader 
 * @param {string} selectedCategory - Selected category
 * @returns {Array} Processed data for time series
 */
export const processTimeSeriesData = (rawData, selectedCategory) => {
  try {
    logger.debug(`Processing time series data for ${selectedCategory}`);
    
    // Check if we have timeSeriesData in the frontend data
    if (rawData.frontendData && 
        rawData.frontendData.timeSeriesData && 
        rawData.frontendData.timeSeriesData[selectedCategory]) {
      return rawData.frontendData.timeSeriesData[selectedCategory].map(point => ({
        time: new Date(point.time),
        value: point.max_map,
        uncertainty: point.max_cir
      }));
    }
    
    // Fallback to generating time series from raw reports
    if (!rawData.reports || !Array.isArray(rawData.reports)) {
      logger.warn('No reports available for generating time series');
      return [];
    }
    
    // Filter reports by category
    const categoryReports = rawData.reports.filter(report => {
      if (report.category === selectedCategory) return true;
      if (report[selectedCategory] !== undefined) return true;
      if (report.damage_type === selectedCategory) return true;
      return false;
    });
    
    // Group by hour
    const hourlyData = {};
    
    categoryReports.forEach(report => {
      const time = new Date(report.time);
      // Round to hour
      time.setMinutes(0, 0, 0);
      
      const timeKey = time.toISOString();
      
      if (!hourlyData[timeKey]) {
        hourlyData[timeKey] = {
          values: [],
          time: time
        };
      }
      
      // Extract value
      let value = null;
      if (typeof report.reportValue === 'number') {
        value = report.reportValue;
      } else if (typeof report[selectedCategory] === 'number') {
        value = report[selectedCategory];
      } else if (typeof report.value === 'number') {
        value = report.value;
      }
      
      if (value !== null) {
        hourlyData[timeKey].values.push(value);
      }
    });
    
    // Calculate max and average for each hour
    return Object.values(hourlyData)
      .sort((a, b) => a.time - b.time)
      .map(hourData => {
        const values = hourData.values;
        return {
          time: hourData.time,
          value: values.length > 0 ? Math.max(...values) : 0,
          avg: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
          uncertainty: 0.5 // Default uncertainty
        };
      });
  } catch (error) {
    logger.error(`Error processing time series data: ${error.message}`);
    return [];
  }
};

/**
 * Process data for category comparison visualization
 * @param {Object} rawData - Raw data from the data loader
 * @param {Date} currentTime - Current selected time
 * @returns {Object} Processed data for category comparison
 */
export const processCategoryComparisonData = async (rawData, currentTime) => {
  try {
    logger.debug(`Processing category comparison data for ${new Date(currentTime).toISOString()}`);
    
    const categories = [
      'buildings',
      'medical',
      'power',
      'roads_and_bridges',
      'sewer_and_water',
      'shake_intensity'
    ];
    
    // Get BSTS data for all categories at the current time
    const categoryData = await Promise.all(
      categories.map(async category => {
        const bstsData = await loadAllBSTSData(category, currentTime);
        return { category, bstsData };
      })
    );
    
    // Get all neighborhood IDs
    const allNeighborhoodIds = [...new Set(
      Object.values(categoryData)
        .flatMap(cat => Object.keys(cat.bstsData))
    )];
    
    // Process data for each neighborhood and category
    const processedData = allNeighborhoodIds.map(neighborhoodId => {
      // Get neighborhood name
      const name = rawData.neighborhoodMap?.[neighborhoodId] || `Neighborhood ${neighborhoodId}`;
      
      // Get data for each category
      const categoryValues = categories.map(category => {
        const { bstsData } = categoryData.find(cat => cat.category === category);
        const record = bstsData[neighborhoodId];
        
        if (record) {
          return {
            category,
            value: record.map || record.mean || 0,
            certainty: record.certainty_level ? 
              record.certainty_level : 
              record.cir ? 
                calculateCertaintyFromCIR(record.cir) : 
                'medium'
          };
        } else {
          // No data for this category
          return {
            category,
            value: 0,
            certainty: 'very_low'
          };
        }
      });
      
      return {
        id: neighborhoodId,
        name,
        categories: categoryValues,
        // Calculate average damage across all categories
        avgDamage: categoryValues.reduce((sum, cat) => sum + cat.value, 0) / categories.length
      };
    });
    
    return processedData.sort((a, b) => b.avgDamage - a.avgDamage);
  } catch (error) {
    logger.error(`Error processing category comparison data: ${error.message}`);
    return [];
  }
};

/**
 * Process data for a specific neighborhood
 * @param {Object} rawData - Raw data from the data loader
 * @param {string} neighborhoodId - Neighborhood ID
 * @param {Date} currentTime - Current selected time
 * @returns {Object} Processed neighborhood data
 */
export const processNeighborhoodData = async (rawData, neighborhoodId, currentTime) => {
  try {
    logger.debug(`Processing data for neighborhood ${neighborhoodId}`);
    
    if (!neighborhoodId || !rawData) return null;
    
    // Get neighborhood name
    const name = rawData.neighborhoodMap?.[neighborhoodId] || 
                 rawData.locations?.find(loc => loc.id === neighborhoodId)?.name || 
                 `Neighborhood ${neighborhoodId}`;
    
    // Get all reports for this neighborhood
    const reports = rawData.neighborhoodGroups[neighborhoodId] || [];
    
    // Categories to analyze
    const categories = [
      'buildings',
      'medical',
      'power',
      'roads_and_bridges',
      'sewer_and_water',
      'shake_intensity'
    ];
    
    // Get BSTS data for all categories
    const categoryData = await Promise.all(
      categories.map(async category => {
        const bstsData = await loadAllBSTSData(category, currentTime);
        const record = bstsData[neighborhoodId];
        
        // Get reports for this category
        const categoryReports = reports.filter(report => {
          if (report.category === category) return true;
          if (report[category] !== undefined) return true;
          if (report.damage_type === category) return true;
          return false;
        });
        
        return {
          category,
          bstsRecord: record,
          reports: categoryReports.sort((a, b) => new Date(b.time) - new Date(a.time))
        };
      })
    );
    
    // Process category data
    const processedCategories = categoryData.map(({ category, bstsRecord, reports }) => {
      let value = 0;
      let certainty = 0.2; // Default numeric certainty (low)
      let ciLower = 0;
      let ciUpper = 0;
      let damageDescription; // Declare once here
      
      if (bstsRecord) {
        value = bstsRecord.map ?? bstsRecord.mean ?? 0;
        value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value)); // Clamp value

        // Determine certainty from BSTS record
        if (bstsRecord.certainty_level) {
          certainty = levelToCertainty(bstsRecord.certainty_level);
        } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
          certainty = calculateCertaintyFromCIR(bstsRecord.cir);
        } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
          certainty = calculateCertaintyFromSD(bstsRecord.sd);
        } else if (bstsRecord.ci_lower_95 !== undefined && bstsRecord.ci_upper_95 !== undefined) {
          certainty = calculateCertaintyFromCIWidth(bstsRecord.ci_lower_95, bstsRecord.ci_upper_95, value);
        } // else certainty remains 0.2

        // Determine CI bounds from BSTS record
        if (bstsRecord.ci_lower_95 !== undefined && bstsRecord.ci_upper_95 !== undefined) {
          ciLower = bstsRecord.ci_lower_95;
          ciUpper = bstsRecord.ci_upper_95;
        } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
          const calculatedCI = calculateCIFromValueAndCIR(value, bstsRecord.cir);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
          const halfWidth = 1.96 * bstsRecord.sd;
          const calculatedCI = calculateCIFromValueAndCIR(value, halfWidth * 2);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        } else {
          const calculatedCI = calculateCI(value, certainty);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        }
      } else if (reports.length > 0) {
        const latestReport = reports[0]; // Already sorted by time desc
        
        value = latestReport.reportValue ?? latestReport[category] ?? latestReport.value ?? 0;
        value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value)); // Clamp value
        
        if (latestReport.certainty_level) {
          certainty = levelToCertainty(latestReport.certainty_level);
        } else if (typeof latestReport.certainty === 'number') {
          certainty = Math.max(0.1, Math.min(0.9, latestReport.certainty)); // Clamp direct numeric certainty
        } // else certainty remains 0.2
        
        if (latestReport.ci_lower !== undefined && latestReport.ci_upper !== undefined) {
          ciLower = latestReport.ci_lower;
          ciUpper = latestReport.ci_upper;
        } else if (latestReport.cir !== undefined && !isNaN(Number(latestReport.cir))) {
          const calculatedCI = calculateCIFromValueAndCIR(value, Number(latestReport.cir));
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        } else {
          const calculatedCI = calculateCI(value, certainty);
          ciLower = calculatedCI.lower;
          ciUpper = calculatedCI.upper;
        }
      } else {
        // No BSTS, no raw reports for this category in this neighborhood
        // value remains 0, certainty 0.2. Calculate CIs for this.
        const calculatedCI = calculateCI(value, certainty);
        ciLower = calculatedCI.lower;
        ciUpper = calculatedCI.upper;
      }
      
      // Final clamping of CIs (though utility functions are robust)
      ciLower = Math.max(0, Math.min(10, Number(ciLower) || 0));
      ciUpper = Math.max(0, Math.min(10, Number(ciUpper) || 0));
      if (ciLower > ciUpper) { 
          const mid = (ciLower + ciUpper) / 2; 
          ciLower = Math.min(value, mid);
          ciUpper = Math.max(value, mid);
          if (ciLower > ciUpper) { ciLower = value; ciUpper = value; }
      }

      damageDescription = "None";
      if (value < 0.5) damageDescription = "None";
      else if (value <= 2) damageDescription = "Minor";
      else if (value <= 4) damageDescription = "Moderate";
      else if (value <= 6) damageDescription = "Severe";
      else if (value <= 8) damageDescription = "Very severe";
      else damageDescription = "Catastrophic";
      
      return {
        category,
        value,
        certainty,
        ciLower,
        ciUpper,
        damageDescription,
        reportCount: reports.length,
        latestReportTime: reports.length > 0 ? reports[0].time : null,
        vsupColor: getUncertaintyColor(value, 
          typeof certainty === 'number' ? certainty : 
          certainty === 'very_high' ? 0.9 :
          certainty === 'high' ? 0.8 :
          certainty === 'medium' ? 0.5 :
          certainty === 'low' ? 0.3 : 0.1 // Default to 0.1 if certainty is an unknown string
        )
      };
    });
    
    // Calculate overall damage level
    const avgDamage = processedCategories.reduce((sum, cat) => sum + cat.value, 0) / categories.length;
    
    let overallStatus = "No impact";
    if (avgDamage < 0.5) overallStatus = "No impact";
    else if (avgDamage <= 2) overallStatus = "Minor impact";
    else if (avgDamage <= 4) overallStatus = "Moderate impact";
    else if (avgDamage <= 6) overallStatus = "Severe impact";
    else if (avgDamage <= 8) overallStatus = "Very severe impact";
    else overallStatus = "Catastrophic impact";
    
    return {
      id: neighborhoodId,
      name,
      avgDamage,
      overallStatus,
      categories: processedCategories,
      reportCount: reports.length,
      latestReportTime: reports.length > 0 ? 
        new Date(Math.max(...reports.map(r => new Date(r.time).getTime()))) : 
        null
    };
  } catch (error) {
    logger.error(`Error processing neighborhood data: ${error.message}`);
    return null;
  }
};

export default {
  processMapData,
  processTimeSeriesData,
  processCategoryComparisonData,
  processNeighborhoodData
}; 