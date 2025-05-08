import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { MapChart, ScatterChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
  GeoComponent,
  GridComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useData } from '../../context/DataContext';
import { useUI } from '../../App';
import logger from '../../utils/logger';
import { loadAllBSTSData } from '../../utils/dataLoader';
// Import specific functions from uncertaintyCalc
import {
    levelToCertainty,
    calculateCertaintyFromCIR,
    calculateCertaintyFromSD,
    calculateCertaintyFromCIWidth
} from '../../utils/uncertaintyCalc';
import './EarthquakeMap.css';

// Register the required ECharts components
echarts.use([
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
  GeoComponent,
  GridComponent,
  MapChart,
  ScatterChart,
  CanvasRenderer
]);

const EarthquakeMap = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { data } = useData();
  const { 
    selectedCategory, 
    colorScheme, // This is the ID, e.g., 'VSUP'
    activeColorSchemePalette, // This is the array of {level, range, color} for the selected scheme
    currentTime,
    showNeighborhoodLabels,
    setSelectedNeighborhood,
    selectedNeighborhood
  } = useUI();
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [bstsData, setBstsData] = useState({});
  const [isLoadingBsts, setIsLoadingBsts] = useState(false);
  
  // Helper function to prepare and deduplicate the list of neighborhoods
  const prepareNeighborhoodList = (initialLocations, geoJSON) => {
    let neighborhoods = initialLocations || [];
    let fixedNeighborhoodCount = null;

    // Deduplicate neighborhoods if we have too many (e.g., > 100, expecting around 19)
    if (neighborhoods.length > 100) {
      logger.debug(`Deduplicating neighborhoods - found ${neighborhoods.length} items`);
      
      if (geoJSON && geoJSON.features) {
        // Use GeoJSON as the source of truth for neighborhoods
        neighborhoods = geoJSON.features.map(feature => {
          return {
            id: feature.properties.loc,
            name: feature.properties.locName,
            // Calculate centroid coordinates for polygons
            coordinates: (() => {
              let coords = [0, 0]; // Default coordinates
              if (feature.geometry && feature.geometry.type === "Polygon" && feature.geometry.coordinates) {
                const points = feature.geometry.coordinates[0]; // Assuming first ring of polygon
                if (points && points.length) {
                  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
                  coords = [sum[0] / points.length, sum[1] / points.length];
                }
              }
              return coords;
            })()
          };
        });
        fixedNeighborhoodCount = neighborhoods.length;
        logger.debug(`Fixed neighborhood count using GeoJSON: ${neighborhoods.length}`);
      } else {
        // If no GeoJSON, deduplicate by ID from the initial list
        const uniqueNeighborhoods = {};
        (initialLocations || []).forEach(n => {
          if (n && n.id && !uniqueNeighborhoods[n.id]) {
            uniqueNeighborhoods[n.id] = n;
          }
        });
        neighborhoods = Object.values(uniqueNeighborhoods);
        fixedNeighborhoodCount = neighborhoods.length;
        logger.debug(`Deduplicated to ${neighborhoods.length} neighborhoods by ID`);
      }
    }
    return { processedNeighborhoods: neighborhoods, fixedCount: fixedNeighborhoodCount };
  };
  
  // Helper function to generate fallback data if reports are missing
  const generateFallbackDataIfNeeded = (neighborhoods, currentReports, currentNeighborhoodGroups, selectedCategory, componentCurrentTime) => {
    let newReports = Array.isArray(currentReports) ? [...currentReports] : [];
    let newNeighborhoodGroups = currentNeighborhoodGroups ? { ...currentNeighborhoodGroups } : {};

    if (neighborhoods.length > 0 && newReports.length === 0) {
      logger.debug('No reports found, creating default values for neighborhoods');
      
      // Create minimal reports for each neighborhood
      neighborhoods.forEach(neighborhood => {
        const neighborhoodId = neighborhood.id.toString();

        // Skip if this neighborhood already has data in newNeighborhoodGroups (e.g., if it was partially populated)
        if (newNeighborhoodGroups[neighborhoodId] && newNeighborhoodGroups[neighborhoodId].length > 0) {
          return;
        }

        const categories = ['buildings', 'medical', 'power', 'roads_and_bridges', 'sewer_and_water', 'shake_intensity'];
        const generatedReportsForNeighborhood = categories.map(category => {
          const report = {
            id: `default-${neighborhoodId}-${category}-${Date.now()}`,
            time: new Date(componentCurrentTime).toISOString(), // Use component's currentTime
            location: neighborhoodId,
            category: category,
            reportValue: category === selectedCategory ? 5 : 0, // Default value, show 5 for selected category
            certainty_level: 'medium',
            ci_lower: 0,
            ci_upper: 10
          };
          newReports.push(report); // Add to the new reports array
          return report;
        });
        newNeighborhoodGroups[neighborhoodId] = generatedReportsForNeighborhood;
      });
      logger.debug(`Created ${newReports.length - (currentReports?.length || 0)} new default reports for ${Object.keys(newNeighborhoodGroups).length} neighborhoods`);
    }
    return { reports: newReports, neighborhoodGroups: newNeighborhoodGroups };
  };
  
  // Helper function to process data for all neighborhoods
  const processNeighborhoodsData = ( neighborhoods, augmentedNeighborhoodGroups, bstsData, selectedCategory, idToNameMap, componentCurrentTime, debugDataRef) => {
    // bstsData is now expected to be { locationId: { category: record, ... }, ... }
    return neighborhoods.map(neighborhood => {
      const neighborhoodId = neighborhood.id.toString();
      const allNeighborhoodReports = augmentedNeighborhoodGroups[neighborhoodId] || []; // Raw reports for this neighborhood

      // --- Find BSTS data for this specific neighborhood and category ---
      const bstsLocationData = bstsData[neighborhoodId]; 
      const bstsRecord = bstsLocationData ? bstsLocationData[selectedCategory] : null; 
      // --- End Find BSTS data ---

      // Filter raw reports by selected category (used as fallback or if showRawReports is enabled later)
      const categoryReports = allNeighborhoodReports.filter(report => {
        if (report.category === selectedCategory) return true;
        if (report[selectedCategory] !== undefined) {
          report.category = selectedCategory; // Normalize structure
          if (typeof report[selectedCategory] === 'number') {
            report.reportValue = report[selectedCategory];
          }
          return true;
        }
        return report.damage_type === selectedCategory;
      });

      if (neighborhoodId === "1" && debugDataRef.current) {
        logger.debug(`Neighborhood 1: Found ${categoryReports.length} reports for category ${selectedCategory}`);
        if (categoryReports.length > 0) logger.debug("First report in category data:", categoryReports[0]);
        debugDataRef.current.sampleNeighborhoodData = {
          allDataLength: allNeighborhoodReports.length,
          categoryDataLength: categoryReports.length,
          categoryDataSample: categoryReports.slice(0, 3)
        };
      }

      let value = 0;
      let certainty = 0.5; // Initial default, will be overridden by specific logic
      let ciLower = 0;
      let ciUpper = 0;
      let damageDescription = "None";

      // Detailed logging for a specific neighborhood (e.g., Palace Hills, assuming ID '5')

      if (bstsRecord) {
        value = bstsRecord.map ?? bstsRecord.mean ?? 0;
        value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value));

        // Priority 1: Explicit ci_lower_95 and ci_upper_95 from bstsRecord
        if (typeof bstsRecord.ci_lower_95 === 'number' && isFinite(bstsRecord.ci_lower_95) &&
            typeof bstsRecord.ci_upper_95 === 'number' && isFinite(bstsRecord.ci_upper_95)) {
          ciLower = bstsRecord.ci_lower_95;
          ciUpper = bstsRecord.ci_upper_95;
          // Derive certainty
            if (bstsRecord.certainty_level) {
                 certainty = levelToCertainty(bstsRecord.certainty_level.toLowerCase());
            } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
                certainty = calculateCertaintyFromCIR(bstsRecord.cir);
            } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
                certainty = calculateCertaintyFromSD(bstsRecord.sd);
            } else {
                // Fallback within Priority 1: Derive certainty from CI width
                certainty = calculateCertaintyFromCIWidth(ciLower, ciUpper, value);
            }
        // Priority 2: Calculate from bstsRecord.cir (when no explicit CI bounds)
        } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
          certainty = calculateCertaintyFromCIR(bstsRecord.cir);
          const halfCir = bstsRecord.cir / 2.0;
          ciLower = Math.max(0, value - halfCir);
          ciUpper = Math.min(10, value + halfCir);
          if (bstsRecord.certainty_level) { // Prefer certainty_level if also present
            certainty = levelToCertainty(bstsRecord.certainty_level.toLowerCase()) || certainty;
          }
        
        // Priority 3: Calculate from bstsRecord.sd (when no explicit CI bounds or CIR)
        } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
          certainty = calculateCertaintyFromSD(bstsRecord.sd);
          const halfWidthFromSd = 1.96 * bstsRecord.sd; // 95% CI half-width
          ciLower = Math.max(0, value - halfWidthFromSd);
          ciUpper = Math.min(10, value + halfWidthFromSd);
          if (bstsRecord.certainty_level) { // Prefer certainty_level if also present
            certainty = levelToCertainty(bstsRecord.certainty_level.toLowerCase()) || certainty;
          }

        // Priority 4: Estimate from certainty_level if present (no explicit CI, CIR, or SD)
        } else if (bstsRecord.certainty_level) {
          certainty = levelToCertainty(bstsRecord.certainty_level.toLowerCase());
          const rangeEstimate = (1 - certainty) * 5.0; // Heuristic half-width
          ciLower = Math.max(0, value - rangeEstimate);
          ciUpper = Math.min(10, value + rangeEstimate);
        
        // Priority 5: Most generic fallback for bstsRecord (value is known, but no CI/certainty metrics)
        } else {
          certainty = 0.2; // Low certainty if only value is known from BSTS
          const rangeEstimate = (1 - certainty) * 7.0; // Wider heuristic range due to low certainty
          ciLower = Math.max(0, value - rangeEstimate);
          ciUpper = Math.min(10, value + rangeEstimate);
        }

      } else { // Fallback: No BSTS record, use latest raw report
        const latestReport = categoryReports.length > 0 ? categoryReports.sort((a, b) => new Date(b.time) - new Date(a.time))[0] : null;
        if (latestReport) {
          value = latestReport.reportValue ?? latestReport.map ?? latestReport.value ?? 0;
          value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value));

          // Log path for NID 5 if it uses raw reports

          if (typeof latestReport.certainty === 'number' && !isNaN(latestReport.certainty)) {
            certainty = Math.max(0.1, Math.min(0.9, latestReport.certainty)); // Clamp raw certainty
          } else if (latestReport.certainty_level) {
            certainty = levelToCertainty(latestReport.certainty_level.toLowerCase());
          } else {
            certainty = 0.2; // Low certainty for raw report if no explicit certainty info
          }
          
          // CI for raw reports: use explicit if available, else estimate from (now potentially low) certainty
          if (typeof latestReport.ci_lower === 'number' && isFinite(latestReport.ci_lower) &&
              typeof latestReport.ci_upper === 'number' && isFinite(latestReport.ci_upper)) {
            ciLower = latestReport.ci_lower;
            ciUpper = latestReport.ci_upper;
          } else {
            const rangeEstimate = (1 - certainty) * 7.0; // Wider heuristic range if certainty is low
            ciLower = Math.max(0, value - rangeEstimate);
            ciUpper = Math.min(10, value + rangeEstimate);
          }
        } else { // No BSTS record AND no raw reports
          // Log path for NID 5 if it has no data
          value = 0;
          certainty = 0; // No data, so certainty is 0
          ciLower = 0;
          ciUpper = 0;
        }
      }
      
      // Final clamping for CIs to be within [0, 10] and ensure ciLower <= ciUpper
      ciLower = Math.max(0, Math.min(10, ciLower));
      ciUpper = Math.max(0, Math.min(10, ciUpper));
      if (ciLower > ciUpper) {
          // If somehow inverted (e.g. due to extreme calculated values before clamping), set to a point or swap.
          // For simplicity, let's make it a point interval at `value` if they are inverted.
          // Or, more robustly, take the average if they are just slightly crossed.
          const mid = (ciLower + ciUpper) / 2;
          ciLower = Math.min(value, mid);
          ciUpper = Math.max(value, mid);
          // If still inverted or problematic, could default to value +/- small range or just value
          if (ciLower > ciUpper) { ciLower = value; ciUpper = value; }
      }

      if (value < 0.5) damageDescription = "None";
      else if (value <= 2) damageDescription = "Minor";
      else if (value <= 4) damageDescription = "Moderate";
      else if (value <= 6) damageDescription = "Severe";
      else if (value <= 8) damageDescription = "Very severe";
      else damageDescription = "Catastrophic";

      if (parseInt(neighborhoodId) <= 3 && debugDataRef.current) {
        debugDataRef.current[`neighborhood_${neighborhoodId}`] = { value, certainty, extractedValue: value, extractedCertainty: certainty };
      }

      // Final detailed logging for NID 5 before returning

      return {
        name: idToNameMap[neighborhoodId] || neighborhood.name || `Neighborhood ${neighborhoodId}`,
        id: neighborhoodId,
        value: parseFloat(value.toFixed(1)), // Ensure value is number for ECharts
        coordinates: neighborhood.coordinates || [0, 0],
        certainty: parseFloat(certainty.toFixed(2)), // Ensure certainty is number
        damageDescription: damageDescription,
        reportCount: categoryReports.length,
        ciLower: parseFloat(ciLower.toFixed(1)), // Ensure CI bounds are numbers
        ciUpper: parseFloat(ciUpper.toFixed(1))  // Ensure CI bounds are numbers
      };
    });
  };
  
  // Load BSTS data when time or category changes
  useEffect(() => {
    if (!data || !currentTime || !selectedCategory) return;
    
    const fetchBstsData = async () => {
      setIsLoadingBsts(true);
      try {
        // Ensure currentTime is a valid timestamp for the call
        const validCurrentTime = new Date(currentTime).getTime();
        if (isNaN(validCurrentTime)) {
          logger.error('EarthquakeMap BSTS Fetch: Invalid currentTime for BSTS call', currentTime);
          setBstsData({});
          setIsLoadingBsts(false);
          return;
        }

        const bsts = await loadAllBSTSData(selectedCategory, validCurrentTime);
        // ADDED LOGGING HERE
        logger.debug(`EarthquakeMap BSTS Fetch: For time ${new Date(validCurrentTime).toISOString()} and category ${selectedCategory}, received bstsData keys: ${Object.keys(bsts || {}).length > 0 ? Object.keys(bsts) : 'NO BSTS DATA'}`);
        if (Object.keys(bsts || {}).length > 0 && bsts[Object.keys(bsts)[0]]) {
            logger.debug('EarthquakeMap BSTS Fetch: Sample BSTS data for first key:', bsts[Object.keys(bsts)[0]]);
        } else if (Object.keys(bsts || {}).length > 0) {
            logger.debug('EarthquakeMap BSTS Fetch: BSTS data present but first key is undefined/null.');
        }

        setBstsData(bsts);
        logger.debug(`Loaded BSTS data for ${selectedCategory} at ${new Date(validCurrentTime).toLocaleString()}`);
        logger.debug(`BSTS data contains ${Object.keys(bsts).length} locations`);
      } catch (err) {
        logger.error('Error loading BSTS data:', err);
      } finally {
        setIsLoadingBsts(false);
      }
    };
    
    fetchBstsData();
  }, [currentTime, selectedCategory, data]);
  
  // Create the chart instance once
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clean up any existing chart first
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }
    
    // Initialize new chart with explicit width/height to avoid resize issues
    chartInstance.current = echarts.init(chartRef.current, null, {
      renderer: 'canvas',
      useDirtyRect: false // Disable dirty rectangle optimization for smoother updates
    });
    
    // Add click event listener for the map
    chartInstance.current.on('click', function (params) {
      // Check if the click is on a series and specifically the map series
      if (params.componentType === 'series' && params.seriesType === 'map') {
        if (params.data && params.data.id) {
          const clickedId = params.data.id.toString();
          logger.debug(`Map clicked. Neighborhood ID: ${clickedId}, Name: ${params.data.name}`);
          setSelectedNeighborhood(clickedId); // Always select, never deselect
        }
      }
    });
    
    // Handle window resize with debounce for better performance
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        chartInstance.current?.resize();
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      clearTimeout(resizeTimeout);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [setSelectedNeighborhood]);
  
  // Update chart when data or selections change
  useEffect(() => {
    if (!chartInstance.current || !data) return;
    
    // REFINED LOGGING HERE
    logger.debug(`EarthquakeMap MainEffect: START. isLoadingBsts: ${isLoadingBsts}, selectedCategory: ${selectedCategory}, bstsData keys: ${Object.keys(bstsData || {}).join(',') || 'EMPTY'}`);
    
    // Guard against processing if BSTS data is currently loading for the selected category.
    if (isLoadingBsts) {
      logger.debug(`EarthquakeMap MainEffect: BSTS data is actively loading for category '${selectedCategory}'. Waiting for completion.`);
      chartInstance.current?.showLoading('default', { text: 'Loading category data...' }); 
      return; // Exit early, will re-run when isLoadingBsts changes or bstsData updates.
    }

    // At this point, isLoadingBsts is false.
    // Further guard: Check if the available bstsData actually contains entries for the currently selectedCategory.
    if (Object.keys(bstsData || {}).length > 0) {
      const firstLocationId = Object.keys(bstsData)[0];
      const dataForFirstLocation = bstsData[firstLocationId];
      
      // If dataForFirstLocation exists but doesn't have selectedCategory key, it's stale for current view.
      if (dataForFirstLocation && dataForFirstLocation[selectedCategory] === undefined) {
        logger.warn(`EarthquakeMap MainEffect: isLoadingBsts is FALSE. However, current bstsData (sample for loc '${firstLocationId}') does NOT contain data for selectedCategory '${selectedCategory}'. Data is stale. Waiting for relevant BSTS data to be set.`);
        chartInstance.current?.showLoading('default', { text: 'Updating data for category...' }); 
        return; // Exit early, data structure likely doesn't match current category.
      }
      // Log if data is consistent
      if (dataForFirstLocation && dataForFirstLocation[selectedCategory]) {
        logger.debug(`EarthquakeMap MainEffect: isLoadingBsts is FALSE. bstsData for loc '${firstLocationId}' IS consistent with selectedCategory '${selectedCategory}'. Proceeding.`);
      }
    } else {
      logger.debug(`EarthquakeMap MainEffect: isLoadingBsts is FALSE. bstsData is empty. Processing will rely on fallbacks.`);
    }

    // If we've passed all guards, hide loading indicator before processing and setting options
    chartInstance.current?.hideLoading();

    // Log a sample specific to the selected category if possible
    if (bstsData && Object.keys(bstsData).length > 0) {
        const firstKey = Object.keys(bstsData)[0];
        if (bstsData[firstKey] && bstsData[firstKey][selectedCategory]) {
            logger.debug(`EarthquakeMap MainEffect: >> Sample bstsData[${firstKey}][${selectedCategory}]:`, bstsData[firstKey][selectedCategory]);
        } else {
             logger.debug(`EarthquakeMap MainEffect: >> bstsData exists, but no data for key ${firstKey} and category ${selectedCategory}`);
        }
    }

    // Removed older logs from here to avoid clutter
    // logger.debug('EarthquakeMap MainEffect: data.reports count:', data?.reports?.length || 0);
    // logger.debug('EarthquakeMap MainEffect: bstsData keys count:', Object.keys(bstsData || {}).length);
    // logger.debug("Data available for chart:", 
    //   Object.keys(data).join(", "), 
    //   "neighborhoodGroups has keys:", 
    //   Object.keys(data.neighborhoodGroups || {}).length);
    
    try {
      let debugData = {
        hasData: true,
        dataKeys: Object.keys(data),
        selectedCategory,
        reportCount: data.reports?.length || 0,
        timestamp: new Date().toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        hasBstsData: Object.keys(bstsData).length > 0
      };
      
      // Check if we have GeoJSON data
      if (!data.geoJSON) {
        setError('No GeoJSON data found for the map. Falling back to scatter plot.');
        debugData.hasGeoJSON = false;
      } else {
        debugData.hasGeoJSON = true;
        debugData.geoJSONType = data.geoJSON.type;
        debugData.geoJSONFeatures = data.geoJSON.features?.length;
      }
      
      // Check if we have neighborhood data
      let neighborhoods = data.locations || [];
      debugData.neighborhoodCount = neighborhoods.length;
      
      // Debug data for diagnostic purposes
      debugData.hasNeighborhoodGroups = !!data.neighborhoodGroups;
      debugData.neighborhoodGroupsKeys = Object.keys(data.neighborhoodGroups || {});
      
      // CRITICAL FIX: Deduplicate neighborhoods if we have too many
      // Call the helper function to get the processed list of neighborhoods
      const { processedNeighborhoods: processedList, fixedCount: fixedNeighborhoodsCount } = prepareNeighborhoodList(data.locations, data.geoJSON);
      neighborhoods = processedList; // Use the processed list

      if (fixedNeighborhoodsCount !== null) {
        debugData.fixedNeighborhoodCount = fixedNeighborhoodsCount;
      }
      
      // FALLBACK: If we have neighborhoods but no reports, create default data values
      // This ensures the map has something to display even without reports
      // Use the new helper function to get potentially augmented report data
      const { reports: augmentedReports, neighborhoodGroups: augmentedNeighborhoodGroups } = 
        generateFallbackDataIfNeeded(neighborhoods, data.reports, data.neighborhoodGroups, selectedCategory, currentTime);

      // Ensure debugData reflects the data being used for processing
      debugData.reportCount = augmentedReports?.length || 0;
      debugData.neighborhoodGroupsKeys = Object.keys(augmentedNeighborhoodGroups || {});

      // Create a mapping of neighborhood IDs to names from GeoJSON
      const idToNameMap = data.geoJSON ? 
        Object.fromEntries(
          data.geoJSON.features.map(f => [f.properties.loc, f.properties.locName])
        ) : {};
      
      // Prepare neighborhood data by calling the new helper function
      // Pass a ref to debugData for modification within the helper if necessary
      const debugDataForProcessing = {}; // Or pass parts of the main debugData if preferred
      const neighborhoodData = processNeighborhoodsData(
        neighborhoods, 
        augmentedNeighborhoodGroups, 
        bstsData, 
        selectedCategory, 
        idToNameMap, 
        currentTime,
        { current: debugData } // Pass debugData as a ref-like object
      );
      // REFINED LOGGING HERE
      logger.debug(`EarthquakeMap MainEffect: FINISHED processing. Processed neighborhoodData sample (first 2):`, neighborhoodData.slice(0, 2));

      // Update debugData with overall processing results
      debugData.processedNeighborhoods = neighborhoodData.length;
      debugData.hasSomeValues = neighborhoodData.some(n => n.value > 0);
      debugData.neighborhoodValuesSummary = neighborhoodData.slice(0, 5).map(n => ({
        id: n.id, 
        name: n.name, 
        value: n.value,
        reports: n.reportCount,
        certainty: n.certainty
      }));
      
      // Calculate max value for dynamic scaling, defaulting to 10 if all values are low
      const maxValue = Math.max(
        ...neighborhoodData.map(n => n.value), 
        10 // Set a minimum max value of 10 to avoid too narrow scale
      );
      
      // Color ranges based on selected scheme from UIContext
      // REMOVED: Local colorRanges definition
      // const colorRanges = {
      //   VSUP: ['#d6eaf8', '#f5b041', '#e74c3c', '#641e16'],
      //   Normal: ['#d4f1f9', '#a9dfbf', '#f9e79f', '#f5b041', '#ec7063']
      // };
      
      // const selectedColors = colorRanges[colorScheme] || colorRanges.VSUP;

      // Extract just the color values from the activeColorSchemePalette
      const selectedColors = activeColorSchemePalette.map(item => item.color);
      
      // Clear any previous instance data to fix animation issues
      chartInstance.current.clear();
      
      // Create the base option
      const option = {
        // Disable animations for better performance
        animation: false,
        title: {
          text: `St. Himark Earthquake Damage: ${selectedCategory.replace(/_/g, ' ')}`,
          left: 'center',
          subtext: `Time: ${new Date(currentTime).toLocaleString()}`,
          subtextStyle: {
            fontSize: 12
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            const data = params.data || {};
            const value = data.value !== undefined ? 
                         (Array.isArray(data.value) ? data.value[2] : data.value) : 0;
            
            const certaintyText = data.certainty ? 
                                 `${(data.certainty * 100).toFixed(0)}%` : 
                                 'Unknown';
                                 
            // Include confidence interval if available
            const ciText = data.ciLower !== undefined && data.ciUpper !== undefined && isFinite(data.ciLower) && isFinite(data.ciUpper) ?
                         `${data.ciLower.toFixed(1)} – ${data.ciUpper.toFixed(1)}` : // en-dash for range
                         'N/A';
                                 
            return `
              <div style="font-weight:bold;">${data.name || 'Unknown'}</div>
              <div>ID: ${data.id || 'Unknown'}</div>
              <div>Damage Level: ${value.toFixed(1)} - ${data.damageDescription || 'Unknown'}</div>
              <div>Confidence Interval: ${ciText}</div>
              <div>Certainty: ${certaintyText}</div>
              <div>Reports: ${data.reportCount || 0}</div>
            `;
          }
        },
        visualMap: {
          min: 0,
          max: maxValue,
          text: ['Severe', 'None'],
          realtime: false,
          calculable: true,
          inRange: {
            color: selectedColors
          },
          right: 10,
          top: 'middle'
        }
      };
      
      // If we have GeoJSON data, register it and use map series
      if (data.geoJSON) {
        try {
          // Register the map once
          echarts.registerMap('st-himark', data.geoJSON);
          debugData.mapRegistered = true;
          
          // Log the GeoJSON feature properties for debugging
          console.log("GeoJSON properties sample:", 
            data.geoJSON.features.slice(0, 3).map(f => f.properties));
          
          // Map needs properties.name to match with data
          data.geoJSON.features.forEach(feature => {
            if (feature.properties && feature.properties.locName) {
              feature.properties.name = feature.properties.locName;
            }
          });
          
          option.series = [
            {
              name: 'Neighborhoods',
              type: 'map',
              map: 'st-himark',
              roam: true,
              label: {
                show: showNeighborhoodLabels,
                formatter: '{b}',
                color: '#333',
                fontSize: 10,
                textBorderColor: '#fff',
                textBorderWidth: 2
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 12,
                  fontWeight: 'bold'
                },
                itemStyle: {
                  areaColor: '#f3f3f3'
                }
              },
              data: neighborhoodData,
              // Add itemStyle for certainty encoding via opacity
              itemStyle: {
                borderColor: 'rgba(0,0,0,0.3)',
                borderWidth: 1,
                opacity: function(params) {
                  const certainty = params.data?.certainty ?? 0.5; // Default to 0.5 if undefined
                  // If certainty is low (e.g., < 0.4), make it more transparent
                  if (certainty < 0.4) {
                    return 0.35; // More transparent for low certainty
                  }
                  // For higher certainty, scale opacity from a higher base up to 1.0
                  // e.g., certainty 0.4 -> 0.6 + (0.4 * 0.4) = 0.76
                  //       certainty 1.0 -> 0.6 + (1.0 * 0.4) = 1.0
                  return 0.6 + (certainty * 0.4);
                }
              }
            }
          ];
          
          // Log the processed names for comparison
          console.log("Chart data names:", option.series[0].data.map(d => d.name));
        } catch (e) {
          setError(`Error registering map: ${e.message}`);
          debugData.mapError = e.message;
          
          // Fall back to scatter plot
          option.geo = {
            map: '',
            roam: true
          };
          
          option.series = [{
            type: 'scatter',
            coordinateSystem: 'geo',
            symbolSize: 20,
            data: neighborhoodData.map(item => ({
              name: item.name,
              value: [0, 0, item.value], // Default coordinates as fallback
              id: item.id,
              certainty: item.certainty,
              damageDescription: item.damageDescription,
              reportCount: item.reportCount
            }))
          }];
        }
      } else {
        // Fallback to basic chart with labels if no GeoJSON
        option.grid = {
          left: 10,
          right: 10,
          top: 60,
          bottom: 60,
          containLabel: true
        };
        
        option.xAxis = {
          type: 'category',
          data: neighborhoodData.map(item => item.name),
          axisLabel: {
            interval: 0,
            rotate: 45
          }
        };
        
        option.yAxis = {
          type: 'value',
          name: 'Damage Level'
        };
        
        option.series = [{
          type: 'bar',
          data: neighborhoodData,
          itemStyle: {
            color: function(params) {
              const value = params.value;
              const normalizedValue = value / maxValue;
              
              // Create color gradient based on value
              const idx = Math.floor(normalizedValue * (selectedColors.length - 1));
              return selectedColors[idx] || selectedColors[0];
            },
            opacity: function(params) {
              const certainty = params.data?.certainty ?? 0.5;
              return 0.7 + (certainty * 0.3);
            }
          }
        }];
      }
      
      // Set options and render chart - use notMerge: true to force complete redraw
      chartInstance.current.setOption(option, true);
      debugData.chartOptionSet = true;
      
      // Update debug info
      setDebugInfo(debugData);
      setError(null);
    } catch (err) {
      console.error("Error rendering earthquake map:", err);
      setError(`Error rendering map: ${err.message}`);
    }
  }, [chartInstance, data, selectedCategory, colorScheme, currentTime, bstsData, showNeighborhoodLabels, setSelectedNeighborhood]);
  
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  const exportMapAsPNG = () => {
    if (chartInstance.current) {
      try {
        const dataURL = chartInstance.current.getDataURL({
          type: 'png',
          pixelRatio: 2, // For better resolution
          backgroundColor: '#fff' // Ensure background is not transparent
        });
        const link = document.createElement('a');
        link.download = `st-himark-map-${selectedCategory}-${new Date(currentTime).toISOString().split('T')[0]}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logger.info('Map exported as PNG');
      } catch (err) {
        logger.error('Error exporting map as PNG:', err);
        setError('Could not export map as PNG. Please try again.'); 
      }
    }
  };
  
  return (
    <div className="earthquake-map-container">
      {error && (
        <div className="map-error-message alert alert-danger">
          <p>{error}</p>
        </div>
      )}
      
      {isLoadingBsts && (
        <div className="bsts-loading-indicator">
          Loading time-specific data...
        </div>
      )}
      
      {/* Export Button */}
      <button 
        className="btn btn-sm btn-outline-secondary export-map-btn"
        onClick={exportMapAsPNG}
        title="Export map as PNG"
        disabled={!chartInstance.current} // Disable if chart not ready
      >
        <i className="bi bi-download me-1"></i> Export Map
      </button>
      
      {/* REMOVED: Debug toggle button and panel */}
      {/* 
      <button 
        className="debug-toggle-btn" 
        onClick={toggleDebug}
        title="Toggle debug panel"
      >
        <i className="bi bi-bug"></i>
      </button>
      
      {showDebug && (
        <div className="debug-info-panel">
          <div className="debug-header" onClick={toggleDebug}>
            Debug Info <span className="close-btn">×</span>
          </div>
          <div className="debug-content">
            <pre>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
      */}
      
      <div ref={chartRef} className="earthquake-map" />
    </div>
  );
};

export default EarthquakeMap; 