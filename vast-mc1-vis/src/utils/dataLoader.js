/**
 * Utility functions for loading data processed by the R analysis
 * 
 * OPTIMIZATION: Removes CSV fallback code path and unncessary console.log statements
 * for improved performance in production
 */

import { groupByNeighborhood, generateLocationInfo, generateTimeSeriesData } from './dataProcessor';
import logger from './logger';
import Papa from 'papaparse'; // Import PapaParse

// Import static data assets directly
import geojsonData from '../data/neighborhoods.geojson';
import neighborhoodMapData from '../data/processed/neighborhood_map.json';
import frontendDataData from '../data/processed/frontend_data.json';
import allBstsResultsData from '../data/processed/bsts_results/all_bsts_results.json';
// Import additional JSON files that were previously fetched
import visualizationDataData from '../data/processed/visualization_data.json';
import mapDataData from '../data/processed/map_data.json';
import categoryComparisonSpecData from '../data/specs/category-comparison-spec.json';

// Import NEW JSON data files
import rawReportsDataJson from '../data/mc1-reports-data.json';
import aggregatedSummaryDataJson from '../data/processed/all_summary_aggregated.json';

/**
 * Data loader for earthquake visualization
 * Handles loading, caching and transformation of data from R-generated files
 */

// Data cache to avoid reloading the same data
const dataCache = {
  // Cache by category and timestamp
  bsts: {},
  // General data cache
  general: {}
};

/**
 * Load neighborhood GeoJSON data
 * @returns {Promise<Object>} GeoJSON data
 */
export const loadGeoJSON = async () => {
  // Check cache first
  if (dataCache.general.geoJSON) {
    logger.debug('Using cached GeoJSON data');
    return dataCache.general.geoJSON;
  }
  
  try {
    // Data is imported directly now
    dataCache.general.geoJSON = geojsonData;
    logger.debug('GeoJSON data loaded from import');
    return geojsonData;
  } catch (error) {
    logger.error('Error accessing imported GeoJSON data:', error);
    throw error;
  }
};

/**
 * Load the neighborhood mapping (ID to name)
 * @returns {Promise<Object>} Map of neighborhood IDs to names
 */
export const loadNeighborhoodMap = async () => {
  // Check cache first
  if (dataCache.general.neighborhoodMap) {
    logger.debug('Using cached neighborhood map');
    return dataCache.general.neighborhoodMap;
  }
  
  try {
    // Data is imported directly now
    dataCache.general.neighborhoodMap = neighborhoodMapData;
    logger.debug('Neighborhood map loaded from import');
    return neighborhoodMapData;
  } catch (error) {
    logger.error('Error accessing imported neighborhood map:', error);
    // Fallback logic might need adjustment if import fails, 
    // but import failure is unlikely if file exists.
    logger.warn('Falling back to hardcoded neighborhood map due to import error.');
    const fallbackMap = {
      1: "Palace Hills",
      2: "Northwest",
      3: "Old Town",
      4: "Safe Town",
      5: "Southwest",
      6: "Downtown",
      7: "Wilson Forest",
      8: "Scenic Vista",
      9: "Broadview",
      10: "Chapparal",
      11: "Terrapin",
      12: "Pepper Mill",
      13: "Cheddarford",
      14: "Easton",
      15: "Weston",
      16: "Southton",
      17: "Oak Willow",
      18: "East Parton",
      19: "West Parton"
    };
    
    dataCache.general.neighborhoodMap = fallbackMap;
    return fallbackMap;
  }
};

/**
 * Load the main visualization data from improved R output
 * @returns {Promise<Object>} Processed visualization data
 */
export const loadVisualizationData = async () => {
  // Check cache first
  if (dataCache.general.visualizationData) {
    logger.debug('Using cached visualization data');
    return dataCache.general.visualizationData;
  }
  
  try {
    logger.debug('Loading visualization data...');
    // const response = await fetch(`${process.env.PUBLIC_URL}/data/processed/visualization_data.json`);
    
    // if (!response.ok) {
    //   throw new Error(`Failed to load visualization data: ${response.status} ${response.statusText}`);
    // }
    
    // const data = await response.json();
    const data = visualizationDataData; // Use imported data
    
    // Store in cache
    dataCache.general.visualizationData = data;
    logger.debug('Visualization data loaded successfully');
    
    return data;
  } catch (error) {
    logger.error('Error loading visualization data:', error);
    throw error;
  }
};

/**
 * Load front-end optimized data
 * @returns {Promise<Object>} Combined frontend data
 */
export const loadFrontendData = async () => {
  // Check cache first
  if (dataCache.general.frontendData) {
    logger.debug('Using cached frontend data');
    return dataCache.general.frontendData;
  }
  
  try {
    // Data is imported directly now
    dataCache.general.frontendData = frontendDataData;
    logger.debug('Frontend data loaded from import');
    return frontendDataData;
  } catch (error) {
    logger.error('Error accessing imported frontend data:', error);
    throw error;
  }
};

/**
 * Load map data for a specific timestamp
 * @param {Date|number} timestamp - Timestamp to find the closest hour data
 * @returns {Promise<Object>} Map data for the closest timestamp
 */
export const loadMapData = async (timestamp) => {
  // Convert timestamp to Date if it's not already
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  // Round to nearest hour to match R-generated data timestamps
  const roundedTime = new Date(date);
  roundedTime.setMinutes(0, 0, 0);
  
  // Cache key based on hour timestamp
  const cacheKey = roundedTime.getTime();
  
  // Check cache first
  if (dataCache.general.mapData && dataCache.general.mapData[cacheKey]) {
    logger.debug(`Using cached map data for ${roundedTime.toISOString()}`);
    return dataCache.general.mapData[cacheKey];
  }
  
  try {
    // First, load the entire map data if not already loaded
    if (!dataCache.general.allMapData) {
      logger.debug('Loading map data from import...');
      // const response = await fetch(`${process.env.PUBLIC_URL}/data/processed/map_data.json`);
      
      // if (!response.ok) {
      //   throw new Error(`Failed to load map data: ${response.status} ${response.statusText}`);
      // }
      
      // dataCache.general.allMapData = await response.json();
      dataCache.general.allMapData = mapDataData; // Use imported data
      logger.debug('Map data loaded successfully from import');
      
      // Initialize mapData cache object if needed
      if (!dataCache.general.mapData) {
        dataCache.general.mapData = {};
      }
    }
    
    // Find the closest time in the data
    const allTimes = dataCache.general.allMapData.map(item => new Date(item.time).getTime());
    
    // If there's no data, return empty result
    if (allTimes.length === 0) {
      logger.warn('No map data available');
      return { time: roundedTime.toISOString(), cat_data: [] };
    }
    
    // Find closest time
    const targetTime = roundedTime.getTime();
    const closestTime = allTimes.reduce((prev, curr) => 
      Math.abs(curr - targetTime) < Math.abs(prev - targetTime) ? curr : prev
    );
    
    // Get the data for the closest time
    const closestData = dataCache.general.allMapData.find(
      item => new Date(item.time).getTime() === closestTime
    );
    
    // Store in time-specific cache
    dataCache.general.mapData[cacheKey] = closestData;
    
    return closestData;
  } catch (error) {
    logger.error('Error loading map data:', error);
    throw error;
  }
};

/**
 * Load BSTS results for a specific category
 * @param {string} category - Category name (e.g. 'shake_intensity')
 * @returns {Promise<Object>} BSTS data for the category
 */
export const loadBSTSData = async (category) => {
  // Normalize category name
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
  
  // Check cache first
  if (dataCache.bsts[normalizedCategory]) {
    logger.debug(`Using cached BSTS data for ${normalizedCategory}`);
    return dataCache.bsts[normalizedCategory];
  }
  
  try {
    logger.debug(`Attempting to load BSTS data for ${normalizedCategory} from combined data...`);
    // Primarily rely on loadAllBSTSData which uses an import.
    // The individual fetch for `${normalizedCategory}_summary.json` is removed
    // as dynamic imports from a variable path are complex and these files
    // would need to be in the public folder or handled by specific server routing if fetched.
    const allData = await loadAllBSTSData(normalizedCategory); // Pass category to filter

    // loadAllBSTSData returns data structured by location, then category.
    // We need to ensure the structure matches what the original loadBSTSData might have expected,
    // or that callers are adapted. Assuming callers adapt or the structure from loadAllBSTSData is sufficient.
    
    dataCache.bsts[normalizedCategory] = allData; // Cache the filtered data under the specific category key
    logger.debug(`BSTS data for ${normalizedCategory} processed successfully from combined data`);
    
    return allData;
  } catch (error) {
    logger.error(`Error loading BSTS data for ${normalizedCategory}:`, error);
    throw error;
  }
};

/**
 * Load all BSTS data from the combined file and filter by category
 * @param {string} category - Optional category to filter by
 * @returns {Promise<Object>} All BSTS data or filtered by category
 */
export const loadAllBSTSData = async (category = null, timestamp = null) => {
  // Cache key contains category and timestamp if provided
  const cacheKey = `all_${category || 'all'}_${timestamp || 'all'}`;
  
  // Check cache first
  if (dataCache.bsts[cacheKey]) {
    logger.debug(`Using cached all BSTS data with key ${cacheKey}`);
    return dataCache.bsts[cacheKey];
  }
  
  try {
    // Load all BSTS data if not already loaded
    if (!dataCache.bsts.allBSTSData) {
      logger.debug('Loading all BSTS data from import...');
      // Data is imported directly now
      dataCache.bsts.allBSTSData = allBstsResultsData;
      logger.debug('All BSTS data loaded successfully from import');
    }
    
    // If no category or timestamp specified, return all data
    if (!category && !timestamp) {
      // Convert array to object by location and category for consistency
      const dataByLocationCategory = {};
      dataCache.bsts.allBSTSData.forEach(item => {
        if (!dataByLocationCategory[item.location]) {
          dataByLocationCategory[item.location] = {};
        }
        dataByLocationCategory[item.location][item.category] = item;
      });
      dataCache.bsts[cacheKey] = dataByLocationCategory;
      return dataByLocationCategory;
    }
    
    // --- Start Revised Filtering Logic ---
    let timeFilteredData = dataCache.bsts.allBSTSData;
    
    if (timestamp) {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      const latestDataByLocationCategory = {}; // Key: location_category, Value: latest record

      timeFilteredData.forEach(item => {
        const itemTime = new Date(item.time);
        if (itemTime <= date) {
          const key = `${item.location}_${item.category}`;
          if (!latestDataByLocationCategory[key] || new Date(latestDataByLocationCategory[key].time) < itemTime) {
            latestDataByLocationCategory[key] = item;
          }
        }
      });
      // Use the filtered latest records
      timeFilteredData = Object.values(latestDataByLocationCategory);
    }

    // Now filter by category if specified (after timestamp filter)
    if (category) {
      const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
      timeFilteredData = timeFilteredData.filter(item => item.category === normalizedCategory);
    }

    // Structure the result: { locationId: { categoryName: record, ... }, ... }
    const finalResult = {};
    timeFilteredData.forEach(item => {
      const locationId = item.location;
      const categoryName = item.category;
      if (!finalResult[locationId]) {
        finalResult[locationId] = {};
      }
      finalResult[locationId][categoryName] = item;
    });
    // --- End Revised Filtering Logic ---

    // Store filtered data in cache
    dataCache.bsts[cacheKey] = finalResult;
    logger.debug(`Filtered BSTS data for key ${cacheKey}:`, finalResult);
    
    return finalResult;
  } catch (error) {
    logger.error('Error loading all BSTS data:', error);
    throw error;
  }
};

/**
 * Load raw reports data
 * @returns {Promise<Array>} Raw reports data
 */
export const loadRawReportsData = async () => {
  // Check cache first
  if (dataCache.general.rawReports) {
    logger.debug('Using cached raw reports data');
    return dataCache.general.rawReports;
  }
  
  try {
    logger.debug('Processing imported raw reports JSON data...');
    
    // Data is now directly from imported JSON
    const reports = rawReportsDataJson.map(row => {
        const newRow = { ...row };
        // The R script saves time as time_string: format(time, "%Y-%m-%d %H:%M:%S")
        // It also ensures location is character.
        // Rating should be a number.
        if (newRow.time_string) {
            newRow.time = new Date(newRow.time_string);
            if (isNaN(newRow.time.getTime())) {
                logger.warn("Invalid date encountered in raw reports JSON:", newRow.time_string);
                newRow.time = null; 
            }
        } else {
            newRow.time = null; // If time_string is missing
        }
        // Ensure location is string (R script should handle this, but double check)
        if (newRow.location !== undefined && newRow.location !== null) {
            newRow.location = String(newRow.location);
        }
        // Ensure rating is a number (R script should handle this)
        if (typeof newRow.rating !== 'number') {
            newRow.rating = parseFloat(newRow.rating);
            if (isNaN(newRow.rating)) newRow.rating = null; // Or some default
        }
        return newRow;
    }).filter(row => row.time !== null); // Filter out rows where date parsing failed or time_string was missing

    // Store in cache
    dataCache.general.rawReports = reports;
    logger.debug(`Raw reports data processed successfully (${reports.length} reports)`);
    
    return reports;
  } catch (error) {
    logger.error('Error processing raw reports JSON data:', error);
    throw error;
  }
};

/**
 * Load aggregated summary data (bstsTimeAggregated) from all_summary_aggregated.json
 * @returns {Promise<Array>} Aggregated summary data
 */
export const loadAggregatedSummaryData = async () => {
  // Check cache first
  if (dataCache.general.bstsTimeAggregated) {
    logger.debug('Using cached aggregated summary data (bstsTimeAggregated)');
    return dataCache.general.bstsTimeAggregated;
  }

  try {
    logger.debug('Processing imported aggregated summary JSON (all_summary_aggregated.json)...');
    
    // Data is now directly from imported JSON
    const data = aggregatedSummaryDataJson.map(row => {
        const newRow = { ...row };
        // Ensure location is string (R script should handle this, but double check)
        if (newRow.location !== undefined && newRow.location !== null) {
            newRow.location = String(newRow.location);
        }
        // Other numeric fields (map, avgMAP, etc.) should be numbers from R output.
        // dateHour is a string like "%Y-%m-%d %H:00:00"
        return newRow;
    });

    dataCache.general.bstsTimeAggregated = data;
    logger.debug(`Aggregated summary data (bstsTimeAggregated) processed successfully (${data.length} records)`);
    return data;
  } catch (error) {
    logger.error('Error processing aggregated summary JSON data:', error);
    dataCache.general.bstsTimeAggregated = []; // Cache empty array on error to prevent re-fetches
    throw error;
  }
};

/**
 * Main function to load all required data for the application
 * @returns {Promise<Object>} All data needed for the application
 */
export const loadAllData = async () => {
  logger.debug('Loading all data for application...');
  
  try {
    // Load data in parallel for better performance
    const [
      geoJSON,
      neighborhoodMap,
      frontendData,
      rawReports,
      bstsTimeAggregated
    ] = await Promise.all([
      loadGeoJSON(),
      loadNeighborhoodMap(),
      loadFrontendData(),
      loadRawReportsData(),
      loadAggregatedSummaryData()
    ]);
    
    // Process raw reports to create lookup by neighborhood
    const neighborhoodGroups = {};
    rawReports.forEach(report => {
      const location = report.location;
      if (!location) return;
      
      if (!neighborhoodGroups[location]) {
        neighborhoodGroups[location] = [];
      }
      
      neighborhoodGroups[location].push(report);
    });
    
    // Combine all data into a single structure
    const combinedData = {
      geoJSON,
      neighborhoodMap,
      frontendData,
      reports: rawReports,
      neighborhoodGroups,
      bstsTimeAggregated,
      // Extract locations from neighborhoodMap
      locations: Object.keys(neighborhoodMap).map(id => ({
        id,
        name: neighborhoodMap[id]
      }))
    };
    
    logger.debug('All data loaded successfully');
    return combinedData;
  } catch (error) {
    logger.error('Error loading all data:', error);
    throw error;
  }
};

export const loadProcessedData = loadAllData;

export const loadCategoryComparisonSpec = async () => {
  try {
    // Use imported data
    // const response = await fetch(`/src/data/specs/category-comparison-spec.json`); // Adjusted path prefix - needs verification
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // const spec = await response.json();
    const spec = categoryComparisonSpecData;
    logger.debug('Category comparison spec loaded successfully from import');
    return spec;
  } catch (error) {
    logger.error('Error loading category comparison spec:', error);
    throw error; // Re-throw to allow caller to handle
  }
};

export default {
  loadGeoJSON,
  loadNeighborhoodMap,
  loadVisualizationData,
  loadFrontendData,
  loadMapData,
  loadBSTSData,
  loadAllBSTSData,
  loadRawReportsData,
  loadAggregatedSummaryData,
  loadAllData,
  loadCategoryComparisonSpec
}; 