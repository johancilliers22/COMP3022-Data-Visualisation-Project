import { useState, useEffect } from 'react';
import { loadProcessedData } from '../utils/dataLoader';
import logger from '../utils/logger';

/**
 * Custom hook for loading and processing data from R analysis
 * 
 * OPTIMIZATION: Streamlined to use simplified dataLoader 
 * and improved progress handling
 * 
 * @param {Object} options - Optional configuration
 * @returns {Object} - Loading state, data, error, and progress
 */
const useDataLoader = (options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('Initializing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Create a progress callback for the dataLoader
        const handleProgress = (progressData) => {
          if (progressData?.message) {
            setProgress(progressData.message);
          }
        };
        
        // Load data from processed JSON files
        logger.debug('useDataLoader: Starting data loading process');
        const result = await loadProcessedData(handleProgress);
        
        setData(result);
        setError(null);
        logger.debug('useDataLoader: Data loaded successfully');
      } catch (err) {
        logger.error('Error loading data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // No cleanup needed as we're not using event listeners
  }, [options]);

  return { data, loading, progress, error };
};

export default useDataLoader; 