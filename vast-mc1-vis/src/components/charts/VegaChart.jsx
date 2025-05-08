import React, { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import vegaEmbed from 'vega-embed';
import { useData } from '../../context/DataContext';
import { useUI } from '../../App';
import logger from '../../utils/logger';
import { loadAllBSTSData } from '../../utils/dataLoader';
// Import uncertainty calculation utilities
import {
  levelToCertainty,
  calculateCertaintyFromCIR,
  calculateCertaintyFromSD
  // calculateCertaintyFromCIWidth could be added if raw reports with only CIs were primary here
} from '../../utils/uncertaintyCalc';
import './VegaChart.css';

// Helper function to calculate descriptive statistics for box plots
const calculateStats = (arr) => {
  if (!arr || arr.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, count: 0 };
  }
  const sortedArr = [...arr].sort((a, b) => a - b);
  const count = sortedArr.length;
  
  const min = sortedArr[0];
  const max = sortedArr[count - 1];
  
  const percentile = (p) => {
    const pos = (count - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
      return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
    } else {
      return sortedArr[base];
    }
  };
  
  const q1 = percentile(0.25);
  const median = percentile(0.5);
  const q3 = percentile(0.75);
  
  return { min, q1, median, q3, max, count };
};

// Helper function to get color based on value and scheme
const getColorForValue = (value, palette) => {
  if (value === undefined || value === null || palette.length === 0) {
    return '#cccccc'; // Default color for no data or no palette
  }

  for (const item of palette) {
    const rangeParts = item.range.split('-');
    const minRange = parseFloat(rangeParts[0]);
    const maxRange = parseFloat(rangeParts[1]);

    // Ensure parsing was successful
    if (isNaN(minRange) || isNaN(maxRange)) {
      continue; 
    }

    // Check if value falls within the range (inclusive for both ends for this logic)
    if (value >= minRange && value <= maxRange) {
      return item.color;
    }
  }
  // If value is below the first range, use the first color
  if (palette.length > 0 && value < parseFloat(palette[0].range.split('-')[0])){
      return palette[0].color;
  }
  // If value is above the last range, use the last color
  if (palette.length > 0 && value > parseFloat(palette[palette.length - 1].range.split('-')[1])){
      return palette[palette.length - 1].color;
  }
  
  return '#cccccc'; // Default fallback if no range matches explicitly
};

/**
 * VegaChart component for rendering Vega/Vega-Lite visualizations
 * 
 * This component uses a similar approach to EarthquakeMap.jsx to prevent 
 * DOM conflicts between React and Vega.
 */
const VegaChart = ({ spec, useSignals = false, chartType, title = null, managesOwnData = false }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const chartIdRef = useRef(`vega-chart-${Math.random().toString(36).substr(2, 9)}`);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  
  // Get data and UI contexts
  const { data, getFilteredData, filters } = useData();
  const { 
    currentTime, 
    selectedNeighborhood, 
    selectedCategory, 
    colorScheme,
    activeColorSchemePalette,
    showRawReports,
    setSelectedNeighborhood
  } = useUI();

  // Debug info
  const debugInfo = useMemo(() => ({
    time: currentTime ? new Date(currentTime).toISOString() : 'none',
    category: selectedCategory || 'none',
    neighborhood: selectedNeighborhood || 'none',
    chartType,
    chartId: chartIdRef.current
  }), [currentTime, selectedCategory, selectedNeighborhood, chartType]);

  // Cleanup function to properly dispose of chart
  const cleanupChart = () => {
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.finalize();
        logger.debug(`Cleaned up chart instance ${chartIdRef.current}`);
      } catch (err) {
        logger.warn(`Error cleaning up chart: ${err.message}`);
      }
      chartInstanceRef.current = null;
    }
  };

  // Initialize Vega visualization
  const initializeVega = async (vegaSpec, chartData) => {
    try {
      // Make sure we have a reference to the chart container
      if (!chartRef.current) {
        setError('Chart container not found');
        return;
      }
      
      // Clean up existing chart instance if any
      cleanupChart();
      
      // Clear the container's contents
      while (chartRef.current.firstChild) {
        chartRef.current.removeChild(chartRef.current.firstChild);
      }
      
      logger.debug(`Initializing chart ${chartIdRef.current} for ${chartType}`, { 
        containerWidth: chartRef.current.clientWidth,
        containerHeight: chartRef.current.clientHeight 
      });
      
      // Deep clone the spec to avoid mutation issues
      const specCopy = JSON.parse(JSON.stringify(vegaSpec));
      
      // Set the title if provided
      if (title !== null) {
        specCopy.title = title;
      }
            
      // Fix URL paths in the spec to ensure correct data loading
      if (chartType === 'fullHeatmap' || chartType === 'categoryComparison') {
        // Ensure correct path prefix for all URLs in the spec
        if (specCopy.data) {
          specCopy.data.forEach(dataItem => {
            if (dataItem.url && !dataItem.url.startsWith('http')) {
              // Remove any leading slash and add PUBLIC_URL prefix
              dataItem.url = `${process.env.PUBLIC_URL}/${dataItem.url.replace(/^\//, '')}`;
              logger.debug(`Updated data URL: ${dataItem.url}`);
            }
          });
        }
        
        // Special handling for category comparison chart to fix undefined labels AND INJECT DYNAMIC DATA
        if (chartType === 'categoryComparison') {
          logger.debug('Setting up category comparison chart with proper labels and dynamic data');

          // Inject dynamic data if chartData is available
          if (chartData) {
            const sourceDataObj = specCopy.data?.find(d => d.name === 'sourceData');
            if (sourceDataObj) {
              delete sourceDataObj.url; // Remove static URL
              sourceDataObj.values = chartData; // Use dynamically processed data
              // CRITICAL: Clear existing transforms on sourceData as chartData is already processed
              if (sourceDataObj.transform) {
                sourceDataObj.transform = []; 
                logger.debug('Cleared transforms on sourceData for categoryComparison spec.');
              }
              logger.debug('Injected dynamic chartData into categoryComparison spec for sourceData:', chartData);
            } else {
              logger.warn('CategoryComparison: Could not find sourceData to inject dynamic data.');
            }
          }
          
          // Dynamically set the color scale range based on the current colorScheme
          const colorScale = specCopy.scales?.find(s => s.name === 'color');
          if (colorScale) {
            const palettes = {
              VSUP: ['#d6eaf8', '#acd1f2', '#f5b041', '#ec7063', '#cb4335', '#641e16'],
              VSUP_: ['hsl(193, 100%, 75%)', 'hsl(45, 86%, 79%)', 'hsl(31, 100%, 70%)', 'hsl(21, 100%, 62%)', 'hsl(11, 100%, 53%)', 'hsl(2, 91%, 40%)'],
              Normal: ['#d4f1f9', '#a9dfbf', '#f9e79f', '#f5b041', '#ec7063', '#cb4335'],
              // Default fallback just in case
              default: ['#3498db', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f']
            };
            // The colorScheme variable is available from useUI()
            colorScale.range = palettes[colorScheme] || palettes.default;
            logger.debug(`CategoryComparison: Dynamically set color scale range for ${colorScheme}:`, colorScale.range);
            // Remove the signal from the range if it was there, as we are now setting it directly.
            if (colorScale.range && typeof colorScale.range.signal === 'string') {
              delete colorScale.range.signal;
            }
          } else {
            logger.warn('CategoryComparison: Could not find color scale to update.');
          }

          // Add fallback category names if needed
          if (specCopy.data) {
            for (const dataItem of specCopy.data) {
              if (dataItem.name === 'emptyFallback' && dataItem.values) {
                // Make sure fallback data has proper category labels
                dataItem.values.forEach(item => {
                  if (!item.categoryLabel && item.category) {
                    const lookupMap = {
                      'shake_intensity': 'Shake Intensity',
                      'buildings': 'Buildings',
                      'power': 'Power',
                      'medical': 'Medical',
                      'sewer_and_water': 'Sewer & Water',
                      'roads_and_bridges': 'Roads & Bridges'
                    };
                    item.categoryLabel = lookupMap[item.category] || item.category;
                  }
                });
              }
            }
          }
        }
        
        // Special handling for fullHeatmap to ensure proper rendering
        if (chartType === 'fullHeatmap') {
          logger.debug('Setting up fullHeatmap with proper configuration');
          
          // Dynamically set the color scale range for fullHeatmap based on the current colorScheme
          const heatmapColorScale = specCopy.scales?.find(s => s.name === 'colorScale');
          if (heatmapColorScale) {
            const palettes = {
              VSUP: ['#d6eaf8', '#acd1f2', '#f5b041', '#ec7063', '#cb4335', '#641e16'],
              VSUP_: ['hsl(193, 100%, 75%)', 'hsl(45, 86%, 79%)', 'hsl(31, 100%, 70%)', 'hsl(21, 100%, 62%)', 'hsl(11, 100%, 53%)', 'hsl(2, 91%, 40%)'],
              Normal: ['#d4f1f9', '#a9dfbf', '#f9e79f', '#f5b041', '#ec7063', '#cb4335'],
              default: ['#d4e6f1', '#f8c471', '#ec7063', '#922b21', '#5a0f0a', '#3B0B08']
            };
            heatmapColorScale.range = palettes[colorScheme] || palettes.default;
            logger.debug(`FullHeatmap: Dynamically set colorScale range for ${colorScheme}:`, heatmapColorScale.range);
            if (heatmapColorScale.range && typeof heatmapColorScale.range.signal === 'string') {
              delete heatmapColorScale.range.signal;
            }
          } else {
            logger.warn('FullHeatmap: Could not find colorScale to update.');
          }
          
          // Ensure signals are properly set for the heatmap
          specCopy.signals = specCopy.signals || [];
          
          // Add container sizing signal if not present
          if (!specCopy.signals.find(s => s.name === 'width')) {
            specCopy.signals.push({
              name: 'width',
              value: chartRef.current.clientWidth
            });
          }
          
          // Make sure we're not duplicating any marks
          if (specCopy.marks && specCopy.marks.length > 0) {
            logger.debug(`Found ${specCopy.marks.length} top-level mark groups`);
          }
          
          // Update the indexTime signal to sync with app's currentTime
          const indexTimeSignal = specCopy.signals.find(s => s.name === 'indexTime');
          if (indexTimeSignal) {
            indexTimeSignal.update = `time('${new Date(currentTime).toISOString()}')`;
            logger.debug(`Updated indexTime signal to match app currentTime: ${new Date(currentTime).toISOString()}`);
          }
          
          // Update the timeSpan signal if it exists
          const timeSpanSignal = specCopy.signals.find(s => s.name === 'timeSpan');
          if (timeSpanSignal) {
            const minDate = new Date('Apr 6 2020').getTime();
            timeSpanSignal.update = `[time('${new Date(minDate).toISOString()}'), time('${new Date(currentTime).toISOString()}')]`;
            logger.debug(`Updated timeSpan signal for heatmap`);
          }
          
          // Ensure the spec's height is respected for fullHeatmap, rather than recalculating it here
          // The spec should define its own appropriate height based on its content (e.g., number of locations * rangeStep)
          logger.debug(`FullHeatmap using height from spec: ${specCopy.height}px`);
          
          // Debug data references in the specification
          if (specCopy.data) {
            logger.debug(`Heatmap has ${specCopy.data.length} data sources:`, 
              specCopy.data.map(d => d.name).join(', '));
            
            // Check for the categories data source explicitly
            const categoriesData = specCopy.data.find(d => d.name === 'categories');
            if (categoriesData) {
              logger.debug('Found categories data:', categoriesData);
            } else {
              logger.warn('Missing categories data in the heatmap spec - adding it now');
              
              // Add the categories data source if missing
              specCopy.data.push({
                name: 'categories',
                values: [
                  {category: 'shake_intensity'},
                  {category: 'medical'},
                  {category: 'power'},
                  {category: 'buildings'},
                  {category: 'sewer_and_water'},
                  {category: 'roads_and_bridges'}
                ]
              });
            }
          }
          
          // Check for correct scale references
          if (specCopy.scales) {
            const yCatScale = specCopy.scales.find(s => s.name === 'yCat');
            if (yCatScale && yCatScale.domain) {
              logger.debug('yCat scale domain:', yCatScale.domain);
              
              // Make sure the yCat scale refers to the categories data source
              if (!yCatScale.domain.data || yCatScale.domain.data !== 'categories') {
                logger.warn('Fixing yCat scale domain reference to use categories data');
                yCatScale.domain = { data: 'categories', field: 'category' };
              }
            }
          }
        }
        
        // Fix image URLs in marks if they exist - recursively check all marks
        const fixMarkURLs = (marks) => {
          if (!marks) return;
          
          marks.forEach(mark => {
            // Fix image URLs
            if (mark.type === 'image' && mark.encode && mark.encode.update && mark.encode.update.url) {
              if (Array.isArray(mark.encode.update.url)) {
                // Handle array of test/value entries
                mark.encode.update.url.forEach(item => {
                  if (item.value && typeof item.value === 'string' && !item.value.startsWith('http')) {
                    item.value = `${process.env.PUBLIC_URL}/${item.value.replace(/^\//, '')}`;
                    logger.debug(`Updated image URL: ${item.value}`);
                  }
                });
              } else if (typeof mark.encode.update.url === 'string' && !mark.encode.update.url.startsWith('http')) {
                mark.encode.update.url = `${process.env.PUBLIC_URL}/${mark.encode.update.url.replace(/^\//, '')}`;
                logger.debug(`Updated image URL: ${mark.encode.update.url}`);
              }
            }
            
            // Look for nested marks
            if (mark.marks) fixMarkURLs(mark.marks);
            
            // Look inside groups
            if (mark.type === 'group' && mark.marks) fixMarkURLs(mark.marks);
          });
        };
        
        // Apply URL fixes to all marks in the specification
        if (specCopy.marks) {
          fixMarkURLs(specCopy.marks);
        }
      }
      
      // Configure chart size
      if (vegaSpec.autosize) {
        specCopy.autosize = JSON.parse(JSON.stringify(vegaSpec.autosize));
      }

      // Always set width based on container, unless autosize type is 'none' or 'pad' and width is already set
      if (!(specCopy.autosize && (specCopy.autosize.type === 'none' || specCopy.autosize.type === 'pad')) || !specCopy.width) {
        specCopy.width = chartRef.current.clientWidth;
      }
      
      // For height:
      if (chartType === 'fullHeatmap') {
        // For fullHeatmap, respect the spec's height value
        // Don't override it as the spec already has a suitable fixed height
        logger.debug(`FullHeatmap: Using spec's height: ${specCopy.height}px`);
      } else if (managesOwnData && !(specCopy.autosize && (specCopy.autosize.type === 'fit' || specCopy.autosize.type === 'fit-y'))) {
        // If specCopy.height is not already set by the original spec, Vega will determine it.
        // We don't want to clobber it if it was intentionally set in the spec.
        if (vegaSpec.height === undefined) delete specCopy.height;
      } else {
        // For other chart types, calculate height based on container
        specCopy.height = chartRef.current.clientHeight > 40 ? chartRef.current.clientHeight - 40 : chartRef.current.clientHeight;
      }
      
      // If no autosize was in original spec and we haven't set a specific one, default to "fit-x" or "pad"
      // to allow height to be controlled by spec or content, while width fits container.
      if (!specCopy.autosize) {
        specCopy.autosize = { type: "pad", contains: "padding" }; // 'pad' is often a good default. 'fit-x' could also work.
      }
      
      // Apply additional configuration
      specCopy.config = specCopy.config || {};
      specCopy.config.view = specCopy.config.view || {};
      
      // Ensure required signals exist and are updated
      if (!specCopy.signals) {
        specCopy.signals = [];
      }
      
      // Calculate the time span for the heatmap based on MIN_DATE and currentTime
      const minDate = new Date('Apr 6 2020').getTime();
      
      const signalsToPass = {
        'appCurrentTime': new Date(currentTime).toISOString(),
        'selectedLocation': selectedNeighborhood === null ? null : String(selectedNeighborhood),
        'appSelectedCategory': selectedCategory,
        'appColorScheme': colorScheme,
        'Colour': colorScheme,
        'indexTime': new Date(currentTime).getTime(),
        'MIN_DATE': minDate,
        'MAX_DATE': new Date('Apr 11 2020').getTime()
      };
      
      logger.debug(`Chart ${chartIdRef.current}: Passing signals`, signalsToPass);
            
      try {
        // Attempt to render with canvas renderer first
        const result = await vegaEmbed(chartRef.current, specCopy, {
          renderer: 'canvas', // Canvas is better for large heatmaps
          actions: false,
          logLevel: 3,
          signals: signalsToPass,
          baseURL: `${process.env.PUBLIC_URL}/`,
          defaultStyle: true
        });
        
        chartInstanceRef.current = result.view;
        
        // Set up signal listeners if enabled
        if (useSignals && result.view) {
          try {
            // Only attempt to listen to selectedLocation if it exists in the spec
            if (specCopy.signals && specCopy.signals.some(signal => signal.name === 'selectedLocation')) {
              result.view.addSignalListener('selectedLocation', (name, value) => {
                // Update global UI state
                if (value !== selectedNeighborhood) {
                  setSelectedNeighborhood(parseInt(value));
                }
              });
              logger.debug(`Added signal listener for 'selectedLocation' in ${chartIdRef.current}`);
            }
          } catch (err) {
            logger.warn(`Error setting up signal listener: ${err.message}`);
          }
        }
        
        setLoading(false);
      } catch (canvasErr) {
        // If canvas renderer fails, try SVG renderer
        logger.warn(`Canvas renderer failed: ${canvasErr.message}. Trying SVG renderer...`);
        try {
          const result = await vegaEmbed(chartRef.current, specCopy, {
            renderer: 'svg',
            actions: false,
            logLevel: 3,
            signals: signalsToPass,
            baseURL: `${process.env.PUBLIC_URL}/`,
            defaultStyle: true
          });
          
          chartInstanceRef.current = result.view;
          
          if (useSignals && result.view) {
            try {
              if (specCopy.signals && specCopy.signals.some(signal => signal.name === 'selectedLocation')) {
                result.view.addSignalListener('selectedLocation', (name, value) => {
                  if (value !== selectedNeighborhood) {
                    setSelectedNeighborhood(parseInt(value));
                  }
                });
                logger.debug(`Added signal listener for 'selectedLocation' in ${chartIdRef.current} (SVG fallback)`);
              }
            } catch (err) {
              logger.warn(`Error setting up signal listener (SVG fallback): ${err.message}`);
            }
          }
          
          setLoading(false);
        } catch (svgErr) {
          throw new Error(`Both renderers failed. Canvas error: ${canvasErr.message}. SVG error: ${svgErr.message}`);
        }
      }
    } catch (err) {
      logger.error(`Error initializing chart (${chartType}):`, err);
      
      // Try rendering with a simplified version of the original spec instead of a completely different fallback
      try {
        await initializeSimplifiedOriginalChart(vegaSpec, chartType);
      } catch (fallbackErr) {
        setError(`Chart initialization failed: ${err.message}. Fallback also failed: ${fallbackErr.message}`);
        setLoading(false);
      }
    }
  };

  // Initialize a simplified version of the original chart rather than a completely different one
  const initializeSimplifiedOriginalChart = async (originalSpec, type) => {
    if (!chartRef.current) return;
    
    // Clean up existing chart
    cleanupChart();
    
    // Clear container
    while (chartRef.current.firstChild) {
      chartRef.current.removeChild(chartRef.current.firstChild);
    }
    
    // Create a simplified version of the original spec
    const simplifiedSpec = JSON.parse(JSON.stringify(originalSpec));
    
    // Fix paths for all data URLs and images
    if (simplifiedSpec.data) {
      simplifiedSpec.data.forEach(dataItem => {
        if (dataItem.url && !dataItem.url.startsWith('http')) {
          dataItem.url = `${process.env.PUBLIC_URL}/${dataItem.url.replace(/^\//, '')}`;
        }
      });
    }
    
    // Simplify the spec but keep its original structure
    if (type === 'categoryComparison') {
      // Keep the original bar chart structure
      logger.debug('Creating simplified bar chart for category comparison');
    }
    
    try {
      logger.debug(`Trying to render simplified version of original chart for ${type}`);
      
      // Configure chart size
      simplifiedSpec.width = chartRef.current.clientWidth;
      simplifiedSpec.height = chartRef.current.clientHeight - 40;
      
      // Calculate the time span for the heatmap based on MIN_DATE and currentTime
      const minDate = new Date('Apr 6 2020').getTime();
      
      const signalsToPass = {
        'appCurrentTime': new Date(currentTime).toISOString(),
        'selectedLocation': selectedNeighborhood === null ? null : String(selectedNeighborhood),
        'appSelectedCategory': selectedCategory,
        'appColorScheme': colorScheme,
        'Colour': colorScheme,
        'indexTime': new Date(currentTime).getTime(),
        'MIN_DATE': minDate,
        'MAX_DATE': new Date('Apr 11 2020').getTime()
      };
      
      const result = await vegaEmbed(chartRef.current, simplifiedSpec, {
        renderer: 'svg', // Try SVG for better compatibility
        actions: false,
        logLevel: 3, 
        signals: signalsToPass,
        baseURL: `${process.env.PUBLIC_URL}/`,
        defaultStyle: true
      });
      
      chartInstanceRef.current = result.view;
      setLoading(false);
      setError(null);
      
      logger.debug(`Rendered simplified ${type} chart`);
    } catch (err) {
      logger.error(`Failed to render simplified chart: ${err.message}`, err);
      throw new Error(`Failed to render simplified chart: ${err.message}`);
    }
  };

  // We'll keep this function for extreme fallback cases
  const initializeFallbackChart = async (type) => {
    if (!chartRef.current) return;
    
    cleanupChart();
    
    while (chartRef.current.firstChild) {
      chartRef.current.removeChild(chartRef.current.firstChild);
    }
    
    let fallbackSpec;
    
    if (type === 'categoryComparison') {
      // Create a proper bar chart for categories
      logger.debug('Creating bar chart fallback for category comparison');
      
      fallbackSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": chartRef.current.clientWidth,
        "height": chartRef.current.clientHeight - 40,
        "data": {
          "url": `${process.env.PUBLIC_URL}/data/processed/category_summary_aggregated.json`,
          "format": {"type": "json"}
        },
        "mark": {"type": "bar", "tooltip": true},
        "encoding": {
          "x": {
            "field": "categoryName",
            "type": "nominal",
            "title": "Damage Category",
            "axis": {"labelAngle": -45}
          },
          "y": {
            "field": "averageMapValue", 
            "type": "quantitative", 
            "title": "Average Damage Level",
            "scale": {"domain": [0, 10]}
          },
          "color": {
            "field": "categoryName",
            "type": "nominal",
            "legend": null
          },
          "tooltip": [
            {"field": "categoryName", "type": "nominal", "title": "Category"},
            {"field": "averageMapValue", "type": "quantitative", "title": "Average Value", "format": ".1f"},
            {"field": "averageCIR", "type": "quantitative", "title": "Average CIR", "format": ".2f"}
          ]
        }
      };
    } else {
      // Generic chart fallback
      fallbackSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": chartRef.current.clientWidth,
        "height": chartRef.current.clientHeight - 40,
        "data": {
          "values": createPlaceholderData(type)
        },
        "mark": type === 'categoryComparison' ? 'bar' : 'line',
        "encoding": type === 'categoryComparison' 
          ? {
              "x": {"field": "category", "type": "nominal", "title": "Category"},
              "y": {"field": "value", "type": "quantitative", "title": "Value"},
              "tooltip": [
                {"field": "category", "type": "nominal", "title": "Category"},
                {"field": "value", "type": "quantitative", "title": "Value"}
              ]
            }
          : {
              "x": {"field": "time", "type": "temporal", "title": "Time"},
              "y": {"field": "value", "type": "quantitative", "title": "Value"},
              "tooltip": [
                {"field": "time", "type": "temporal", "title": "Time"},
                {"field": "value", "type": "quantitative", "title": "Value"}
              ]
            }
      };
    }
    
    try {
      logger.debug(`Trying to render fallback chart for ${type}`);
      
      const result = await vegaEmbed(chartRef.current, fallbackSpec, {
        renderer: 'svg', // Try SVG for fallback
        actions: false,
        defaultStyle: true,
        logLevel: 3,
        baseURL: `${process.env.PUBLIC_URL}/`
      });
      
      chartInstanceRef.current = result.view;
      setLoading(false);
      setError(null);
      
      logger.debug(`Rendered fallback ${type} chart`);
    } catch (err) {
      logger.error(`Failed to render fallback chart: ${err.message}`, err);
      throw new Error(`Failed to render fallback chart: ${err.message}`);
    }
  };

  // Create placeholder data based on chart type
  const createPlaceholderData = (type) => {
    if (type === 'categoryComparison') {
      return [
        {"category": "shake_intensity", "categoryName": "Shake Intensity", "value": 0},
        {"category": "buildings", "categoryName": "Buildings", "value": 0},
        {"category": "power", "categoryName": "Power", "value": 0},
        {"category": "medical", "categoryName": "Medical", "value": 0},
        {"category": "sewer_and_water", "categoryName": "Sewer & Water", "value": 0},
        {"category": "roads_and_bridges", "categoryName": "Roads & Bridges", "value": 0}
      ];
    } else {
      // Generic placeholder data for fallback charts
      return [{ "value": 0 }]; // Basic data point for generic fallback
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current && chartRef.current) {
        const width = chartRef.current.clientWidth;
        const height = chartRef.current.clientHeight - 40;
        
        try {
          chartInstanceRef.current
            .width(width)
            .height(height)
            .run();
        } catch (err) {
          logger.warn(`Error resizing chart: ${err.message}`);
          // If resizing fails, reinitialize the chart
          if (processedData && spec) {
            initializeVega(spec, processedData);
          }
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [spec, processedData]);

  // Cleanup on unmount
  useEffect(() => {
    // Initial check for chartRef.current for the main effect
    if (!chartRef.current && spec) {
      logger.warn(`VegaChart (${chartType}, ID: ${chartIdRef.current}): Initial mount/spec update, chartRef still not available. This might indicate a layout timing issue.`);
    }
    return () => {
      cleanupChart();
    };
  }, [spec, chartType]); // Added spec and chartType to ensure this log runs if they exist but ref is missing on initial relevant renders

  // Load and process data based on chart type
  useEffect(() => {
    // Guard: Only proceed if the spec is available and the chart container DOM element is ready.
    if (!spec || !chartRef.current) {
      if (spec && !chartRef.current) {
        // This situation (spec ready, but DOM not) is specifically what we want to prevent leading to an error.
        logger.warn(`VegaChart (${chartType}, ID: ${chartIdRef.current}): Spec is ready, but chartRef DOM element is not. Postponing initialization attempt.`);
      } else if (!spec && chartRef.current) {
        logger.debug(`VegaChart (${chartType}, ID: ${chartIdRef.current}): chartRef DOM element is ready, but spec is not. Waiting for spec.`);
      } else {
        // Neither spec nor chartRef is ready, or spec is missing.
        logger.debug(`VegaChart (${chartType}, ID: ${chartIdRef.current}): Spec or chartRef DOM element not ready. Waiting.`);
      }
      return; // Exit the effect if prerequisites are not met.
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (managesOwnData) {
          // If the spec manages its own data (e.g., via URL in spec),
          // we don't need to process or pass chartData from React.
          // We still pass null for chartData to initializeVega for consistency.
          logger.debug(`VegaChart (${chartType}, ID: ${chartIdRef.current}): Spec manages its own data. Skipping React-side data processing.`);
          setProcessedData(null); // Ensure no stale processed data is used
          
          await initializeVega(spec, null);
          return;
        }

        if (!data) { 
          throw new Error('Data not available');
        }
        
        // Get filtered data based on current filters
        const filteredData = getFilteredData();
        
        if (chartType === 'categoryComparison') {
          await processCategoryComparisonData(filteredData);
        } else {
          // Generic chart rendering for other chart types
          const processedGenericData = filteredData; // Renamed to avoid confusion
          setProcessedData(processedGenericData);
          await initializeVega(spec, processedGenericData);
        }
      } catch (err) {
        logger.error(`Error loading data for ${chartType} chart:`, err);
        setError(`Failed to load chart data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, [
    data, 
    spec, 
    chartType, 
    currentTime, 
    selectedCategory, 
    selectedNeighborhood,
    colorScheme,
    showRawReports,
    filters,
    managesOwnData
  ]);

  // Process category comparison data
  const processCategoryComparisonData = async (filteredData) => {
    try {
      logger.debug(`Processing category comparison data at time: ${new Date(currentTime).toISOString()}, Selected Neighborhood: ${selectedNeighborhood || 'All'}`);
      
      const categories = [
        'shake_intensity',
        'buildings',
        'power',
        'medical',
        'sewer_and_water',
        'roads_and_bridges'
      ];
      
      const categoryNameMap = {
        'shake_intensity': 'Shake Intensity',
        'buildings': 'Buildings',
        'power': 'Power',
        'medical': 'Medical',
        'sewer_and_water': 'Sewer & Water',
        'roads_and_bridges': 'Roads & Bridges'
      };
      
      let comparisonData = [];
      
      if (showRawReports) {
        // Use raw reports data
        const timeWindow = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        const currentTimeMs = currentTime;
        
        const relevantReports = filteredData.filter(d => {
          const reportTime = new Date(d.time).getTime();
          const timeDiff = Math.abs(reportTime - currentTimeMs);
          
          return timeDiff <= timeWindow && 
                 (!selectedNeighborhood || d.location.toString() === selectedNeighborhood.toString());
        });
        
        categories.forEach(category => {
          const categoryReports = relevantReports.filter(d => d.category === category);
          
          if (categoryReports.length > 0) {
            const values = categoryReports.map(d => d.reportValue).filter(v => v !== undefined && isFinite(v));
            
            if (values.length > 0) {
              const stats = calculateStats(values);
              
              // Calculate average confidence for raw reports
              let totalReportConfidence = 0;
              let validReportConfidenceCount = 0;
              categoryReports.forEach(report => {
                let individualConfidence = 0.5; // Default
                let hasSpecificConfidence = false;
                if (typeof report.certainty === 'number' && isFinite(report.certainty)) {
                  // Assuming report.certainty is 0-1, if it's 0-10 or other, needs scaling
                  individualConfidence = Math.max(0.1, Math.min(0.9, report.certainty)); 
                  hasSpecificConfidence = true;
                } else if (report.certainty_level) {
                  // Use imported levelToCertainty for consistency
                  individualConfidence = levelToCertainty(report.certainty_level.toLowerCase());
                  hasSpecificConfidence = true;
                }
                if (hasSpecificConfidence) {
                  totalReportConfidence += individualConfidence;
                  validReportConfidenceCount++;
                }
              });
              const averageReportConfidence = validReportConfidenceCount > 0 ? totalReportConfidence / validReportConfidenceCount : 0;
              const plotColor = getColorForValue(stats.median, activeColorSchemePalette);

              comparisonData.push({
                category,
                categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
                minValue: stats.min,
                q1Value: stats.q1,
                medianValue: stats.median,
                q3Value: stats.q3,
                maxValue: stats.max,
                count: stats.count, 
                confidence: averageReportConfidence,
                plotColor
              });
            } else {
              comparisonData.push({
                category,
                categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
                minValue: 0,
                q1Value: 0,
                medianValue: 0,
                q3Value: 0,
                maxValue: 0,
                count: 0,
                confidence: 0,
                plotColor: getColorForValue(0, activeColorSchemePalette)
              });
            }
          } else {
            comparisonData.push({
              category,
              categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
              minValue: 0,
              q1Value: 0,
              medianValue: 0,
              q3Value: 0,
              maxValue: 0,
              count: 0,
              confidence: 0,
              plotColor: getColorForValue(0, activeColorSchemePalette)
            });
          }
        });
      } else {
        // OPTIMIZED: Load all BSTS data for the current time once
        const allBstsDataForTimestamp = await loadAllBSTSData(null, currentTime); // Pass null for category
        logger.debug('VegaChart - processCategoryComparisonData: allBstsDataForTimestamp received:', JSON.parse(JSON.stringify(allBstsDataForTimestamp)));

        categories.forEach(category => {
          try {
            // Filter this pre-loaded data for the current category
            let categorySpecificBstsData = {};
            let countForCategory = 0;
            // Iterate through locations provided in the new data structure
            Object.keys(allBstsDataForTimestamp).forEach(locationId => {
              const locationData = allBstsDataForTimestamp[locationId];
              // Check if this location has data for the current category
              if (locationData && locationData[category]) {
                countForCategory++;
                const record = locationData[category];
                if (selectedNeighborhood) {
                  // If a neighborhood is selected, only consider data for that neighborhood
                  if (record.location.toString() === selectedNeighborhood.toString()) {
                    categorySpecificBstsData[record.location] = record;
                  }
                } else {
                  // If no neighborhood is selected, consider all locations for this category
                  categorySpecificBstsData[record.location] = record;
                }
              }
            });
            logger.debug(`VegaChart - Category: ${category}, Found ${countForCategory} initial records in allBstsDataForTimestamp. After neighborhood filter, ${Object.keys(categorySpecificBstsData).length} records.`);
            
            if (Object.keys(categorySpecificBstsData).length > 0) {
              const values = Object.values(categorySpecificBstsData)
                .filter(d => d && typeof d.map === 'number' && isFinite(d.map))
                .map(d => d.map);
              
              if (values.length > 0) {
                const stats = calculateStats(values);
                
                // Calculate average confidence for BSTS data using uncertaintyCalc utilities
                let totalBstsConfidence = 0;
                let validBstsConfidenceCount = 0;
                // REMOVED: const MAX_CREDIBLE_CIR = 4.0;
                // REMOVED: const MAX_EXPECTED_SD = 2.5;

                Object.values(categorySpecificBstsData).forEach(bstsRecord => {
                  if (!bstsRecord) return; // Skip if bstsRecord is null or undefined
                  let individualConfidence = 0.5; // Default
                  let hasSpecificConfidence = false;

                  // Use imported utility functions
                  if (bstsRecord.certainty_level) {
                    individualConfidence = levelToCertainty(bstsRecord.certainty_level.toLowerCase());
                    hasSpecificConfidence = true;
                  } else if (typeof bstsRecord.cir === 'number' && isFinite(bstsRecord.cir)) {
                    individualConfidence = calculateCertaintyFromCIR(bstsRecord.cir);
                    hasSpecificConfidence = true;
                  } else if (typeof bstsRecord.sd === 'number' && isFinite(bstsRecord.sd)) {
                    individualConfidence = calculateCertaintyFromSD(bstsRecord.sd);
                    hasSpecificConfidence = true;
                  }
                  // Note: Does not currently use calculateCertaintyFromCIWidth as a fallback here,
                  // assuming primary BSTS records for this chart will have level, cir, or sd.
                  
                  // Only include if we derived a confidence other than pure default from no info
                  if (hasSpecificConfidence) {
                       totalBstsConfidence += individualConfidence;
                       validBstsConfidenceCount++;
                  }
                });
                const averageBstsConfidence = validBstsConfidenceCount > 0 ? totalBstsConfidence / validBstsConfidenceCount : (stats.count > 0 ? 0.5 : 0) ;
                const plotColor = getColorForValue(stats.median, activeColorSchemePalette);

                comparisonData.push({
                  category,
                  categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
                  minValue: stats.min,
                  q1Value: stats.q1,
                  medianValue: stats.median,
                  q3Value: stats.q3,
                  maxValue: stats.max,
                  count: stats.count, 
                  confidence: averageBstsConfidence,
                  plotColor
                });
              } else {
                // Add placeholder if no valid numeric values found after filtering
                comparisonData.push({
                  category,
                  categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
                  minValue: 0,
                  q1Value: 0,
                  medianValue: 0,
                  q3Value: 0,
                  maxValue: 0,
                  count: 0,
                  confidence: 0,
                  plotColor: getColorForValue(0, activeColorSchemePalette)
                });
              }
            } else {
              // Add placeholder if no BSTS data for this category/neighborhood combination
              comparisonData.push({
                category,
                categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
                minValue: 0,
                q1Value: 0,
                medianValue: 0,
                q3Value: 0,
                maxValue: 0,
                count: 0,
                confidence: 0,
                plotColor: getColorForValue(0, activeColorSchemePalette)
              });
            }
          } catch (err) {
            logger.warn(`Error processing BSTS data for ${category} in VegaChart:`, err);
            comparisonData.push({
              category,
              categoryLabel: categoryNameMap[category] || category.replace(/_/g, ' '),
              minValue: 0,
              q1Value: 0,
              medianValue: 0,
              q3Value: 0,
              maxValue: 0,
              count: 0,
              confidence: 0,
              plotColor: getColorForValue(0, activeColorSchemePalette)
            });
          }
        });
      }
      
      setProcessedData(comparisonData);
      await initializeVega(spec, comparisonData);
    } catch (err) {
      logger.error('Error processing category comparison data:', err);
      setError(`Failed to process category comparison data: ${err.message}`);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="chart-error">
        <p>Error loading {chartType} chart:</p>
        <p className="error-message">{error}</p>
        <div className="error-actions">
          <button 
            className="btn btn-sm btn-outline-primary me-2" 
            onClick={() => {
              setError(null);
              setLoading(true);
              // Try to re-initialize the chart with a slight delay
              setTimeout(() => {
                if (processedData && spec) {
                  initializeVega(spec, processedData);
                }
              }, 500);
            }}
          >
            Retry Chart
          </button>
          <button 
            className="btn btn-sm btn-danger" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="debug-details">
            <summary>Debug Information</summary>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="vega-chart-container">
      {loading && (
        <div className="chart-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading data...</span>
          </div>
          <p>Loading {chartType} chart...</p>
        </div>
      )}
      <div 
        id={chartIdRef.current}
        className="chart-area" 
        ref={chartRef} 
        style={{ width: '100%', height: chartType === 'fullHeatmap' ? 'auto' : '100%' }}
      />
    </div>
  );
};

VegaChart.propTypes = {
  spec: PropTypes.object.isRequired,
  useSignals: PropTypes.bool,
  chartType: PropTypes.oneOf(['categoryComparison', 'generic', 'fullHeatmap']),
  title: PropTypes.string,
  managesOwnData: PropTypes.bool
};

export default VegaChart; 