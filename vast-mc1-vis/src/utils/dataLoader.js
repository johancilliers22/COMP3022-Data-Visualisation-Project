/**
 * Utility functions for loading data processed by the R analysis
 * 
 * OPTIMIZATION: Removes CSV fallback code path and unncessary console.log statements
 * for improved performance in production
 */

import { groupByNeighborhood, generateLocationInfo, generateTimeSeriesData } from './dataProcessor';
import logger from './logger';
import Papa from 'papaparse'; // Import PapaParse

// REMOVE Direct imports for data files - these will be fetched
// import geojsonData from '../data/neighborhoods.geojson';
// import neighborhoodMapData from '../data/processed/neighborhood_map.json';
// import frontendDataData from '../data/processed/frontend_data.json';
// import allBstsResultsData from '../data/processed/bsts_results/all_bsts_results.json'; // Corrected path based on R script
// import visualizationDataData from '../data/processed/visualization_data.json';
// import mapDataData from '../data/processed/map_data.json';
// import categoryComparisonSpecData from '../data/specs/category-comparison-spec.json';
// import rawReportsDataJson from '../data/mc1-reports-data.json';
// import aggregatedSummaryDataJson from '../data/processed/all_summary_aggregated.json';


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
 * Helper function to fetch JSON data
 * @param {string} path - Path to the JSON file relative to PUBLIC_URL/data/
 * @returns {Promise<Object>} JSON data
 */
const fetchJsonData = async (path) => {
  const response = await fetch(`${process.env.PUBLIC_URL}/data/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

/**
 * Helper function to fetch CSV data and parse it
 * @param {string} path - Path to the CSV file relative to PUBLIC_URL/data/
 * @returns {Promise<Array>} Parsed CSV data
 */
const fetchCsvData = async (path) => {
  const response = await fetch(`${process.env.PUBLIC_URL}/data/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  const csvText = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
};


/**
 * Load neighborhood GeoJSON data
 * @returns {Promise<Object>} GeoJSON data
 */
export const loadGeoJSON = async () => {
  if (dataCache.general.geoJSON) {
    logger.debug('Using cached GeoJSON data');
    return dataCache.general.geoJSON;
  }
  try {
    logger.debug('Fetching GeoJSON data...');
    const data = await fetchJsonData('neighborhoods.geojson');
    dataCache.general.geoJSON = data;
    logger.debug('GeoJSON data loaded and cached');
    return data;
  } catch (error) {
    logger.error('Error fetching GeoJSON data:', error);
    throw error;
  }
};

/**
 * Load the neighborhood mapping (ID to name)
 * @returns {Promise<Object>} Map of neighborhood IDs to names
 */
export const loadNeighborhoodMap = async () => {
  if (dataCache.general.neighborhoodMap) {
    logger.debug('Using cached neighborhood map');
    return dataCache.general.neighborhoodMap;
  }
  try {
    logger.debug('Fetching neighborhood map...');
    const data = await fetchJsonData('processed/neighborhood_map.json');
    dataCache.general.neighborhoodMap = data;
    logger.debug('Neighborhood map loaded and cached');
    return data;
  } catch (error) {
    logger.error('Error fetching neighborhood map:', error);
    // Fallback logic might need adjustment
    logger.warn('Falling back to hardcoded neighborhood map due to fetch error.');
    const fallbackMap = {
      1: "Palace Hills", 2: "Northwest", 3: "Old Town", 4: "Safe Town", 5: "Southwest",
      6: "Downtown", 7: "Wilson Forest", 8: "Scenic Vista", 9: "Broadview", 10: "Chapparal",
      11: "Terrapin", 12: "Pepper Mill", 13: "Cheddarford", 14: "Easton", 15: "Weston",
      16: "Southton", 17: "Oak Willow", 18: "East Parton", 19: "West Parton"
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
  if (dataCache.general.visualizationData) {
    logger.debug('Using cached visualization data');
    return dataCache.general.visualizationData;
  }
  try {
    logger.debug('Fetching visualization data...');
    const data = await fetchJsonData('processed/visualization_data.json');
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
  if (dataCache.general.frontendData) {
    logger.debug('Using cached frontend data');
    return dataCache.general.frontendData;
  }
  try {
    logger.debug('Fetching frontend data...');
    const data = await fetchJsonData('processed/frontend_data.json');
    dataCache.general.frontendData = data;
    logger.debug('Frontend data loaded successfully');
    return data;
  } catch (error) {
    logger.error('Error loading frontend data:', error);
    throw error;
  }
};

/**
 * Load map data for a specific timestamp
 * @param {Date|number} timestamp - Timestamp to find the closest hour data
 * @returns {Promise<Object>} Map data for the closest timestamp
 */
export const loadMapData = async (timestamp) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const roundedTime = new Date(date);
  roundedTime.setMinutes(0, 0, 0);
  const cacheKey = roundedTime.getTime();

  if (dataCache.general.mapData && dataCache.general.mapData[cacheKey]) {
    logger.debug(`Using cached map data for ${roundedTime.toISOString()}`);
    return dataCache.general.mapData[cacheKey];
  }

  try {
    if (!dataCache.general.allMapData) {
      logger.debug('Fetching all map data...');
      const allData = await fetchJsonData('processed/map_data.json');
      dataCache.general.allMapData = allData;
      logger.debug('All map data loaded successfully');
      if (!dataCache.general.mapData) {
        dataCache.general.mapData = {};
      }
    }

    const allTimes = dataCache.general.allMapData.map(item => new Date(item.time).getTime());
    if (allTimes.length === 0) {
      logger.warn('No map data available');
      return { time: roundedTime.toISOString(), cat_data: [] };
    }

    const targetTime = roundedTime.getTime();
    const closestTime = allTimes.reduce((prev, curr) => 
      Math.abs(curr - targetTime) < Math.abs(prev - targetTime) ? curr : prev
    );
    const closestData = dataCache.general.allMapData.find(
      item => new Date(item.time).getTime() === closestTime
    );
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
  const normalizedCategory = category.toLowerCase().replace(/\\s+/g, '_');
  if (dataCache.bsts[normalizedCategory]) {
    logger.debug(`Using cached BSTS data for ${normalizedCategory}`);
    return dataCache.bsts[normalizedCategory];
  }
  try {
    logger.debug(`Attempting to load BSTS data for ${normalizedCategory} by fetching ${normalizedCategory}_summary.json...`);
    // The R script process.R saves files like 'shake_intensity_summary.json' in OUTPUT_DIR which is 'public/data/processed/'
    // So, the path will be 'processed/<category_name>_summary.json'
    // However, the `all_bsts_results.json` contains all categories.
    // It's more efficient to load `all_bsts_results.json` once and filter.
    // The original logic tried to fetch individual files, then fell back to `loadAllBSTSData`.
    // We'll stick to `loadAllBSTSData` for now as it's simpler and uses a single main BSTS results file.
    const allDataForCategory = await loadAllBSTSData(normalizedCategory); // This will filter from the main BSTS file

    dataCache.bsts[normalizedCategory] = allDataForCategory;
    logger.debug(`BSTS data for ${normalizedCategory} processed successfully from combined data`);
    return allDataForCategory;
  } catch (error) {
    logger.error(`Error loading BSTS data for ${normalizedCategory}:`, error);
    throw error;
  }
};

/**
 * Load all BSTS data from the combined file and filter by category
 * @param {string} category - Optional category to filter by
 * @param {Date|number} timestamp - Optional timestamp to filter by
 * @returns {Promise<Object>} All BSTS data or filtered by category
 */
export const loadAllBSTSData = async (category = null, timestamp = null) => {
  const cacheKey = `all_${category || 'all'}_${timestamp || 'all'}`;
  if (dataCache.bsts[cacheKey]) {
    logger.debug(`Using cached all BSTS data with key ${cacheKey}`);
    return dataCache.bsts[cacheKey];
  }
  try {
    if (!dataCache.bsts.allBSTSDataMaster) { // Changed cache key to avoid conflict if 'allBSTSData' was used differently
      logger.debug('Fetching all BSTS results data...');
      // R script analysis.R saves all_bsts_results.json in public/data/processed/bsts_results/
      const data = await fetchJsonData('processed/bsts_results/all_bsts_results.json');
      dataCache.bsts.allBSTSDataMaster = data;
      logger.debug('All BSTS results data loaded successfully');
    }

    let processedData = dataCache.bsts.allBSTSDataMaster;

    if (timestamp) {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      const latestDataByLocationCategory = {};
      processedData.forEach(item => {
        const itemTime = new Date(item.time);
        if (itemTime <= date) {
          const itemKey = `${item.location}_${item.category}`;
          if (!latestDataByLocationCategory[itemKey] || new Date(latestDataByLocationCategory[itemKey].time) < itemTime) {
            latestDataByLocationCategory[itemKey] = item;
          }
        }
      });
      processedData = Object.values(latestDataByLocationCategory);
    }

    if (category) {
      const normalizedCategory = category.toLowerCase().replace(/\\s+/g, '_');
      processedData = processedData.filter(item => item.category === normalizedCategory);
    }

    const finalResult = {};
    processedData.forEach(item => {
      const locationId = item.location;
      const catName = item.category;
      if (!finalResult[locationId]) {
        finalResult[locationId] = {};
      }
      finalResult[locationId][catName] = item;
    });
    
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
  if (dataCache.general.rawReports) {
    logger.debug('Using cached raw reports data');
    return dataCache.general.rawReports;
  }
  try {
    logger.debug('Fetching raw reports data (mc1-reports-data.json)...');
    // R script data_preparation.R saves 'mc1-reports-data.json' in 'public/data/'
    const jsonData = await fetchJsonData('mc1-reports-data.json');
    
    const reports = jsonData.map(row => {
        const newRow = { ...row };
        if (newRow.time_string) { // R script saves time as time_string
            newRow.time = new Date(newRow.time_string);
            if (isNaN(newRow.time.getTime())) {
                logger.warn("Invalid date encountered in raw reports JSON:", newRow.time_string);
                newRow.time = null; 
            }
        } else if (newRow.time && !(newRow.time instanceof Date)) { // Fallback if time_string isn't present but time is
            newRow.time = new Date(newRow.time);
             if (isNaN(newRow.time.getTime())) newRow.time = null;
        } else if (!newRow.time) {
             newRow.time = null;
        }

        if (newRow.location !== undefined && newRow.location !== null) {
            newRow.location = String(newRow.location);
        }
        if (typeof newRow.rating !== 'number') {
            newRow.rating = parseFloat(newRow.rating);
            if (isNaN(newRow.rating)) newRow.rating = null;
        }
        return newRow;
    }).filter(row => row.time !== null); // Filter out rows where date parsing failed

    dataCache.general.rawReports = reports;
    logger.debug(`Raw reports data loaded successfully (${reports.length} reports)`);
    return reports;
  } catch (error) {
    logger.error('Error loading raw reports JSON data:', error);
    throw error;
  }
};

/**
 * Load aggregated summary data (bstsTimeAggregated) from all_summary_aggregated.json
 * @returns {Promise<Array>} Aggregated summary data
 */
export const loadAggregatedSummaryData = async () => {
  if (dataCache.general.bstsTimeAggregated) {
    logger.debug('Using cached aggregated summary data (bstsTimeAggregated)');
    return dataCache.general.bstsTimeAggregated;
  }
  try {
    logger.debug('Fetching aggregated summary JSON (all_summary_aggregated.json)...');
    // R script process.R saves 'all_summary_aggregated.json' in 'public/data/processed/'
    const jsonData = await fetchJsonData('processed/all_summary_aggregated.json');
    
    // Assuming R script outputs numbers correctly. If not, add parsing.
    // location should be string, dateHour is string.
    const data = jsonData.map(row => {
        const newRow = { ...row };
        if (newRow.location !== undefined && newRow.location !== null) {
            newRow.location = String(newRow.location);
        }
        // Ensure numeric fields are numbers
        ['map', 'avgMAP', 'maxCIR', 'avgCIR', 'CIRatMaxMAP'].forEach(field => {
            if (typeof newRow[field] !== 'number') {
                newRow[field] = parseFloat(newRow[field]);
                if(isNaN(newRow[field])) newRow[field] = 0; // Default to 0 if parsing fails
            }
        });
        return newRow;
    });

    dataCache.general.bstsTimeAggregated = data;
    logger.debug(`Aggregated summary data (bstsTimeAggregated) loaded successfully (${data.length} records)`);
    return data;
  } catch (error) {
    logger.error('Error loading aggregated summary JSON data:', error);
    dataCache.general.bstsTimeAggregated = [];
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
    const [
      geoJSON,
      neighborhoodMap,
      frontendData,
      rawReports,
      bstsTimeAggregated 
      // visualizationData and mapData are loaded on demand by components or derived
    ] = await Promise.all([
      loadGeoJSON(),
      loadNeighborhoodMap(),
      loadFrontendData(),
      loadRawReportsData(),
      loadAggregatedSummaryData()
    ]);
    
    const neighborhoodGroups = {};
    rawReports.forEach(report => {
      const location = report.location;
      if (!location) return;
      if (!neighborhoodGroups[location]) {
        neighborhoodGroups[location] = [];
      }
      neighborhoodGroups[location].push(report);
    });
    
    const combinedData = {
      geoJSON,
      neighborhoodMap,
      frontendData,
      reports: rawReports,
      neighborhoodGroups,
      bstsTimeAggregated,
      locations: Object.keys(neighborhoodMap).map(id => ({
        id,
        name: neighborhoodMap[id]
      }))
    };
    
    logger.debug('All essential data loaded successfully');
    return combinedData;
  } catch (error) {
    logger.error('Error loading all data:', error);
    throw error;
  }
};

export const loadProcessedData = loadAllData;

export const loadCategoryComparisonSpec = async () => {
  if (dataCache.general.categoryComparisonSpec) {
    logger.debug('Using cached category comparison spec');
    return dataCache.general.categoryComparisonSpec;
  }
  try {
    logger.debug('Fetching category comparison spec...');
    // R scripts do not explicitly mention creating this spec. Assuming it's manually placed in public/data/specs/
    const spec = await fetchJsonData('specs/category-comparison-spec.json');
    dataCache.general.categoryComparisonSpec = spec;
    logger.debug('Category comparison spec loaded successfully');
    return spec;
  } catch (error) {
    logger.error('Error loading category comparison spec:', error);
    throw error;
  }
};

export const loadHeatmapSpec = async () => {
  if (dataCache.general.heatmapSpec) {
    logger.debug('Using cached heatmap spec');
    return dataCache.general.heatmapSpec;
  }
  try {
    logger.debug('Fetching heatmap spec...');
    const spec = await fetchJsonData('specs/heatmap-all-neighborhoods-spec.json');
    dataCache.general.heatmapSpec = spec;
    logger.debug('Heatmap spec loaded successfully');
    return spec;
  } catch (error) {
    logger.error('Error loading heatmap spec:', error);
    throw error;
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
  loadCategoryComparisonSpec,
  loadHeatmapSpec
}; 