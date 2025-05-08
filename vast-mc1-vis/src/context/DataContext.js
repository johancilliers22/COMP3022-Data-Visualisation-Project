import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadProcessedData } from '../utils/dataLoader';
import logger from '../utils/logger';

// Create the context
const DataContext = createContext();

/**
 * Hook to use the data context
 * @returns {Object} - Data context value
 */
export const useData = () => useContext(DataContext);

/**
 * Data context provider component
 * 
 * OPTIMIZATION: Simplified progress tracking and removed
 * console.log interception for better performance
 * 
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Provider component
 */
export const DataProvider = ({ children }) => {
  // Data state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('Initializing...');
  const [error, setError] = useState(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    categories: ['buildings', 'medical', 'power', 'roads_and_bridges', 'sewer_and_water', 'shake_intensity'],
    neighborhood: null,
    timeRange: null,
    certaintyLevel: null,
    minReportCount: 0
  });
  
  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      logger.debug('DataContext: Starting to fetch data...');
      const dataStartTime = performance.now();
      
      try {
        setLoading(true);
        setLoadingProgress('Fetching data...');
        
        // Define a progress handler function for the data loader
        const handleProgress = (progressData) => {
          if (progressData && progressData.message) {
            setLoadingProgress(progressData.message);
          }
        };
        
        // Load the processed data with progress updates
        logger.debug('DataContext: Loading processed data...');
        const result = await loadProcessedData(handleProgress);
        
        // Validate the loaded data
        if (!result) {
          throw new Error("No data returned from loadProcessedData");
        }
        
        // Check if reports array exists and has items
        if (!Array.isArray(result.reports)) {
          logger.warn('DataContext: Reports data is not an array', result.reports);
          result.reports = [];
        }
        
        // Check if neighborhoodGroups exists
        if (!result.neighborhoodGroups || typeof result.neighborhoodGroups !== 'object') {
          logger.warn('DataContext: neighborhoodGroups is not an object', result.neighborhoodGroups);
          result.neighborhoodGroups = {};
        }
        
        logger.debug('DataContext: Data loaded successfully, setting state...');
        logger.debug(`DataContext: Loaded ${result.reports.length} reports and ${Object.keys(result.neighborhoodGroups).length} neighborhood groups`);
        
        // Set the data state
        setData(result);
        setError(null);

        // Define the possible data URLs based on dataLoader.js
        const possibleDataUrls = [
          '/data/processed/frontend_data.json',
          '/data/processed/visualization_data.json',
          '/data/frontend_data.json'
        ];
        logger.debug("Loading report data from:", possibleDataUrls[0]);
        
        // Check if data was loaded successfully
        logger.debug("Reports data structure:", 
          result && result.reports ? `Array with ${result.reports.length} items` : 
          result && result.reports ? typeof result.reports : 'No data loaded');

        // After processing the data
        logger.debug("Neighborhood groups after processing:", 
          result && result.neighborhoodGroups ? Object.keys(result.neighborhoodGroups).length : 0, 
          "neighborhoods with data");
      } catch (err) {
        logger.error('DataContext: Error loading data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
        logger.debug(`DataContext: Total data loading process completed in ${((performance.now() - dataStartTime) / 1000).toFixed(2)} seconds`);
      }
    };
    
    fetchData();
  }, []);
  
  /**
   * Update filters for data visualization
   * @param {Object} newFilters - New filter values
   */
  const updateFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };
  
  /**
   * Get filtered data based on current filters
   * @returns {Object} - Filtered data
   */
  const getFilteredData = () => {
    if (!data) return null;
    
    // Make a copy of original data
    const filteredData = { ...data };
    
    // Filter reports by time range
    if (filters.timeRange && (filters.timeRange.start || filters.timeRange.end)) {
      const { start, end } = filters.timeRange;
      
      // Validate and convert time range values
      const startTime = start ? new Date(start) : null;
      const endTime = end ? new Date(end) : null;
      
      // Only use valid dates for filtering
      const validStartTime = startTime && !isNaN(startTime.getTime()) ? startTime.getTime() : 0;
      const validEndTime = endTime && !isNaN(endTime.getTime()) ? endTime.getTime() : Infinity;
      
      filteredData.reports = data.reports.filter(report => {
        // Check for time field or timestamp field (handle different property names)
        const timeField = report.time;
        if (!timeField) return false;
        
        // Try to parse the time
        const reportDate = timeField instanceof Date ? timeField : new Date(timeField);
        if (isNaN(reportDate.getTime())) return false;
        
        const reportTime = reportDate.getTime();
        return reportTime >= validStartTime && reportTime <= validEndTime;
      });
      
      // Update neighborhood groups based on filtered reports
      filteredData.neighborhoodGroups = {};
      filteredData.reports.forEach(report => {
        const neighborhood = report.location;
        if (!filteredData.neighborhoodGroups[neighborhood]) {
          filteredData.neighborhoodGroups[neighborhood] = [];
        }
        filteredData.neighborhoodGroups[neighborhood].push(report);
      });
      
      // Update time series data
      if (data.timeSeriesData) {
        filteredData.timeSeriesData = {};
        
        // Filter time series data by time range
        Object.keys(data.timeSeriesData).forEach(category => {
          filteredData.timeSeriesData[category] = data.timeSeriesData[category].filter(point => {
            if (!point[0]) return false;
            
            // Try to parse the timestamp (already a Date object or need conversion)
            const pointDate = point[0] instanceof Date ? point[0] : new Date(point[0]);
            if (isNaN(pointDate.getTime())) return false;
            
            const pointTime = pointDate.getTime();
            return pointTime >= validStartTime && pointTime <= validEndTime;
          });
        });
      }
    }
    
    // Filter by selected categories
    if (filters.categories && filters.categories.length > 0) {
      // Convert to set for faster lookups
      const categorySet = new Set(filters.categories);
      
      // Filter reports by selected categories
      filteredData.reports = filteredData.reports.filter(
        report => categorySet.has(report.category)
      );
      
      // Filter neighborhood groups by selected categories
      Object.keys(filteredData.neighborhoodGroups).forEach(neighborhood => {
        filteredData.neighborhoodGroups[neighborhood] = filteredData.neighborhoodGroups[neighborhood].filter(
          report => categorySet.has(report.category)
        );
      });
      
      // Filter time series data by selected categories
      if (filteredData.timeSeriesData) {
        Object.keys(filteredData.timeSeriesData).forEach(category => {
          if (!categorySet.has(category)) {
            delete filteredData.timeSeriesData[category];
          }
        });
      }
    }
    
    // Filter by neighborhood if specified
    if (filters.neighborhood) {
      // Only keep reports from the selected neighborhood
      filteredData.reports = filteredData.reports.filter(
        report => report.location === filters.neighborhood
      );
      
      // Only keep the selected neighborhood group
      const selectedNeighborhood = filteredData.neighborhoodGroups[filters.neighborhood];
      filteredData.neighborhoodGroups = selectedNeighborhood 
        ? { [filters.neighborhood]: selectedNeighborhood } 
        : {};
    }
    
    // Filter by certainty level if specified
    if (filters.certaintyLevel && filters.certaintyLevel !== 'any') { // 'any' means no filtering
      // Define numeric thresholds consistent with useFilteredData hook
      const THRESHOLDS = {
        VERY_LOW_MAX: 0.199,  // Certainty < 0.2
        LOW_MAX: 0.399,       // Certainty 0.2 to < 0.4
        MEDIUM_MAX: 0.799,    // Certainty 0.4 to < 0.8
        HIGH_MIN: 0.8         // Certainty >= 0.8
      };
      
      // Filter reports by numeric certainty
      filteredData.reports = filteredData.reports.filter(report => {
        const numericCertainty = report.certainty; // Assumes report.certainty is numeric (0-1)
        if (numericCertainty === undefined || numericCertainty === null) return true; // Keep if no certainty

        switch (filters.certaintyLevel) {
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
      
      // Update neighborhood groups based on filtered reports
      // (Need to re-filter the groups based on the new numeric certainty)
      Object.keys(filteredData.neighborhoodGroups).forEach(neighborhood => {
        filteredData.neighborhoodGroups[neighborhood] = filteredData.neighborhoodGroups[neighborhood].filter(report => {
          const numericCertainty = report.certainty;
          if (numericCertainty === undefined || numericCertainty === null) return true; // Keep if no certainty

          switch (filters.certaintyLevel) {
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
    }
    
    // Filter by minimum report count if specified
    if (filters.minReportCount > 0) {
      // Keep only neighborhoods with enough reports
      const neighborhoodsToKeep = Object.entries(filteredData.neighborhoodGroups)
        .filter(([_, reports]) => reports.length >= filters.minReportCount)
        .map(([id]) => id);
      
      // Filter to only include these neighborhoods
      filteredData.reports = filteredData.reports.filter(
        report => neighborhoodsToKeep.includes(report.location)
      );
      
      // Update neighborhood groups
      const filteredGroups = {};
      neighborhoodsToKeep.forEach(id => {
        filteredGroups[id] = filteredData.neighborhoodGroups[id];
      });
      filteredData.neighborhoodGroups = filteredGroups;
    }
    
    return filteredData;
  };
  
  return (
    <DataContext.Provider
      value={{
        // Data and loading state
        data,
        loading,
        loadingProgress,
        error,
        
        // Filters
        filters,
        updateFilters,
        
        // Filtered data access
        getFilteredData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext; 