import React, { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import vegaEmbed from 'vega-embed';
import { Spinner } from 'react-bootstrap';
import { useData } from '../../context/DataContext';
import { useUI } from '../../App';
import logger from '../../utils/logger';
import { calculateCIFromValueAndCIR } from '../../utils/uncertaintyCalc';
import './ForecastChart.css';

const ForecastChart = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const { data } = useData(); 
  const bstsTimeAggregated = data ? data.bstsTimeAggregated : []; // Default to empty array if data or bstsTimeAggregated is null/undefined
  const {
    selectedNeighborhood,
    selectedCategory,
    currentTime,
    activeColorSchemePalette 
  } = useUI();

  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(true); // For initial data processing of bstsTimeAggregated
  const [error, setError] = useState(null);
  const [currentChartSpec, setCurrentChartSpec] = useState(null);
  const [isChartRendering, setIsChartRendering] = useState(false); // New state for Vega rendering lifecycle

  // Debug ID for logging clarity
  const chartId = useMemo(() => `ForecastChart-${selectedNeighborhood}-${selectedCategory}-${Date.now().toString().slice(-5)}`, [selectedNeighborhood, selectedCategory]);

  // Debounce resize handling
  useEffect(() => {
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartInstanceRef.current && chartRef.current) {
          chartInstanceRef.current.width(chartRef.current.clientWidth).runAsync();
        }
      }, 250);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Effect for data processing and spec generation
  useEffect(() => {
    // Ensure bstsTimeAggregated is not just present, but also an array (even if empty at first)
    if (!bstsTimeAggregated || !Array.isArray(bstsTimeAggregated) || !selectedNeighborhood || !selectedCategory) {
      setProcessedData([]);
      if (selectedNeighborhood && selectedCategory) {
        setLoading(false);
      }
      setCurrentChartSpec(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filtered = bstsTimeAggregated.filter(
        item =>
          item && item.location != null &&
          item.location.toString() === selectedNeighborhood.toString() &&
          item.category === selectedCategory
      );

      const time_parsed_data = filtered.map(item => {
        const currentMapValue = (item.map !== undefined && item.map !== null) ? Number(item.map) : 0;
        const currentCIR = (item.CIRatMaxMAP !== undefined && item.CIRatMaxMAP !== null) ? Number(item.CIRatMaxMAP) : 0; // Assuming CIRatMaxMAP is the full width of the interval
        
        // Use the new utility function to calculate CI bounds
        const { lower: lowerCI, upper: upperCI } = calculateCIFromValueAndCIR(currentMapValue, currentCIR, 0, 10);

        return {
          ...item,
          time: new Date(item.dateHour), // Parse date string to Date object
          meanMAP: currentMapValue,
          CIlowerMAP: lowerCI, // Use the calculated lowerCI
          CIupperMAP: upperCI, // Use the calculated upperCI
        };
      })
      .filter(item => item.time instanceof Date && !isNaN(item.time.valueOf()))
      .sort((a, b) => a.time - b.time);
      
      // Log min/max of meanMAP
      if (time_parsed_data.length > 0) {
        const meanMAPs = time_parsed_data.map(d => d.meanMAP).filter(val => typeof val === 'number' && !isNaN(val));
        if (meanMAPs.length > 0) {
          const minMeanMAP = Math.min(...meanMAPs);
          const maxMeanMAP = Math.max(...meanMAPs);
        }
      }

      setProcessedData(time_parsed_data);
      setLoading(false);

    } catch (e) {
      setError('Failed to process data for the forecast chart.');
      setProcessedData([]);
      setLoading(false);
    }
  }, [bstsTimeAggregated, selectedNeighborhood, selectedCategory, chartId]);

  // Effect for defining and updating chart specification
  useEffect(() => {
    if (!selectedNeighborhood || !selectedCategory) {
        setCurrentChartSpec(null);
        return;
    }

    // --- Calculate Time Domain Explicitly ---
    let timeDomain = null;
    if (processedData && processedData.length > 0) {
      const validTimes = processedData
        .map(d => d.time?.getTime()) // Get timestamp, handle potential null/undefined time
        .filter(ts => ts !== undefined && !isNaN(ts)); // Filter out invalid timestamps

      if (validTimes.length > 0) {
        const minTime = Math.min(...validTimes);
        const maxTime = Math.max(...validTimes);
        // Ensure min and max are different, provide padding if they are identical
        if (minTime === maxTime) {
           // Add +/- 1 hour padding if only one timestamp exists
          timeDomain = [minTime - 3600000, maxTime + 3600000]; 
        } else {
          // Optional: Add slight padding to the domain
          const padding = (maxTime - minTime) * 0.05; // 5% padding
          timeDomain = [minTime - padding, maxTime + padding];
        }
      } 
    }
    
    // Fallback domain if no valid data points or calculation failed
    if (!timeDomain) {
        const currentTimestamp = new Date(currentTime).getTime();
        // Default to a 6-hour window around the current time
        timeDomain = [currentTimestamp - 3 * 3600000, currentTimestamp + 3 * 3600000]; 
    }
    // --- End Calculate Time Domain ---

    // Determine a color for the CI area - use a color from the current palette or a default
    const ciColor = activeColorSchemePalette.length > 1 ? activeColorSchemePalette[1].color : '#4682b4'; // Example: second color or default
    const lineStrokeColor = activeColorSchemePalette.length > 3 ? activeColorSchemePalette[3].color : '#d95f02';

    const spec = {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "description": `Damage Forecast for ${selectedCategory} in Neighborhood ${selectedNeighborhood}`,
      "width": 800,
      "height": 250,
      "padding": {"left": 50, "top": 10, "right": 10, "bottom": 40},
      "autosize": "none",
      "data": [
        {
          "name": "forecastData", // This name must match the name used when updating data
          // Add a transform to filter data based on the xBrush signal
          "transform": [
            {
              "type": "filter",
              // Filter by time if xBrush is active, otherwise pass all data
              "expr": "xBrush ? (datum.time >= xBrush[0] && datum.time <= xBrush[1]) : true"
            }
          ]
        }
      ],
      "signals": [
        {
          "name": "appCurrentTimeValue",
          "value": new Date(currentTime).getTime(), // Initial value from UI context
        },
        {
          "name": "xBrush",
          "value": null, // Initial value for the brush, null means no brush
          "on": [
            {
              "events": "@plot:mousedown", 
              // On mousedown, start the brush by inverting the x-coordinate to a time value
              "update": "[invert('xScale', x()), invert('xScale', x())]"
            },
            {
              "events": "[@plot:mousedown, window:mouseup] > window:mousemove!",
              // On drag, update the end of the brush by inverting the current x-coordinate
              "update": "[xBrush[0], invert('xScale', clamp(x(), 0, width))]"
            },
            {
              "events": {"type": "dblclick"},
              "update": "null" // Clear brush on double click
            }
          ]
        }
      ],
      "scales": [
        {
          "name": "xScale",
          "type": "time",
          "domain": timeDomain, // xScale domain now uses the full timeDomain
          "range": "width",
          "nice": true
        },
        {
          "name": "yScale",
          "type": "linear",
          "domain": [0, 10], // Fixed domain for damage values
          "range": "height",
          "nice": true,
          "zero": true
        }
      ],
      "axes": [
        {
          "orient": "bottom",
          "scale": "xScale",
          "title": "Time",
          "labelAngle": -45,
          "labelOverlap": "parity",
          "format": "%b %d %H:%M" // e.g., Apr 06 14:00
        },
        {
          "orient": "left",
          "scale": "yScale",
          "title": "Damage Level (MAP)"
        }
      ],
      "marks": [
        {
          "name": "plot", // Name the main group for event listening
          "type": "group",
          "encode": {
            "enter": {
              "width": {"signal": "width"},
              "height": {"signal": "height"},
              "clip": {"value": true} // Clip marks to this group
            }
          },
          "marks": [
            {
              "type": "area",
              "from": {"data": "forecastData"},
              "encode": {
                "enter": {
                  "x": {"scale": "xScale", "field": "time"},
                  "y": {"scale": "yScale", "field": "CIlowerMAP"},
                  "y2": {"scale": "yScale", "field": "CIupperMAP"},
                  "fill": {"value": ciColor || '#a6bddb'}, // Added fallback for ciColor
                  "fillOpacity": {"value": 0.3}
                },
                "update": {
                    "tooltip": {"signal": "{'Time': timeFormat(datum.time, '%b %d, %H:%M'), 'Category': '" + selectedCategory + "', 'Location': '" + selectedNeighborhood + "', 'Mean MAP': format(datum.meanMAP, '.1f'), 'CI Lower': format(datum.CIlowerMAP, '.1f'), 'CI Upper': format(datum.CIupperMAP, '.1f')}"}
                }
              }
            },
            {
              "type": "line",
              "from": {"data": "forecastData"},
              "encode": {
                "enter": {
                  "x": {"scale": "xScale", "field": "time"},
                  "y": {"scale": "yScale", "field": "meanMAP"},
                  "stroke": {"value": lineStrokeColor || '#d95f02'}, // Ensured fallback
                  "strokeWidth": {"value": 2},
                  "strokeOpacity": {"value": 1} // Ensure line is visible
                },
                 "update": {
                    "tooltip": {"signal": "{'Time': timeFormat(datum.time, '%b %d, %H:%M'), 'Category': '" + selectedCategory + "', 'Location': '" + selectedNeighborhood + "', 'Mean MAP': format(datum.meanMAP, '.1f'), 'CI Lower': format(datum.CIlowerMAP, '.1f'), 'CI Upper': format(datum.CIupperMAP, '.1f')}"}
                }
              }
            }
          ]
        },
        {
          "type": "rule",
          "encode": {
            "enter": {
              "stroke": {"value": "firebrick"},
              "strokeWidth": {"value": 1.5},
              "strokeDash": {"value": [4, 2]},
              "y": {"value": 0},
              "y2": {"signal": "height"}
            },
            "update": {
              "x": {"scale": "xScale", "signal": "appCurrentTimeValue"}
            }
          }
        }
      ]
    };
    setCurrentChartSpec(spec);
  }, [selectedNeighborhood, selectedCategory, currentTime, activeColorSchemePalette, processedData, chartId]);

  // Effect for rendering/updating the chart
  useEffect(() => {
    // If there's no valid specification or no data (unless the spec has inline data),
    // then clean up any existing chart and stop.
    if (!currentChartSpec || (processedData.length === 0 && !(currentChartSpec.data && currentChartSpec.data.values))) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.finalize();
        chartInstanceRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.innerHTML = ''; // Clear previous renderings
      }
      setIsChartRendering(false); // Not attempting to render
      return;
    }

    // If the chartRef (the DOM element for the chart) is not yet available,
    // wait for the next render cycle. React will re-run this effect once the ref is set.
    if (!chartRef.current) {
      return;
    }

    // At this point, we have a spec, data (or inline data in spec), and the DOM element is ready.
    setIsChartRendering(true); // Indicate Vega embedding is STARTING

    vegaEmbed(chartRef.current, currentChartSpec, {renderer: 'canvas', actions: false})
      .then(result => {
        chartInstanceRef.current = result.view;
        
        // For the TEMPORARY test spec, we don't need to push data as it's inline.
        // This part would be re-enabled for the actual forecast spec.
        
        if (processedData.length > 0 && currentChartSpec.data && currentChartSpec.data[0]?.name === 'forecastData') {
          const dataSampleForVega = processedData.slice(0,Math.min(5, processedData.length));
          chartInstanceRef.current.data('forecastData', processedData).runAsync();
        }
        
        setIsChartRendering(false); // Embedding FINISHED
      })
      .catch(err => {
        setError('Could not render the forecast chart.');
        setIsChartRendering(false); // Embedding FINISHED (with error)
      });

    // Cleanup function for when the component unmounts or dependencies change
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.finalize();
        chartInstanceRef.current = null;
      }
      // Avoid calling setIsChartRendering in cleanup if component might be unmounting
    };
  }, [currentChartSpec, processedData, chartId]); // Dependencies for this effect

  // Conditional rendering based on state
  if (!selectedNeighborhood || !selectedCategory) {
    return (
      <div className="forecast-chart-container forecast-chart-no-data">
        <p>Select a neighborhood and a category to view its forecast.</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="forecast-chart-container forecast-chart-error">
        <p>{error}</p>
      </div>
    );
  }
  
  // Determine spinner states
  const showInitialDataLoadingSpinner = loading && processedData.length === 0;
  const showVegaRenderingSpinner = isChartRendering && !showInitialDataLoadingSpinner;

  // Determine if a "no data" message should be shown
  const hasInlineDataInSpec = currentChartSpec && currentChartSpec.data && currentChartSpec.data.values;
  const showNoDataMessage = !loading && 
                          !isChartRendering && 
                          processedData.length === 0 && 
                          !hasInlineDataInSpec && // Only show if not a spec with its own inline data
                          selectedNeighborhood && 
                          selectedCategory;

  // Determine if a "test chart failed" message should be shown
  const showTestChartFailureMessage = hasInlineDataInSpec && 
                                    !isChartRendering && 
                                    !loading && 
                                    !error && // Only if no other error is active
                                    !chartInstanceRef.current && // And no chart instance was successfully created
                                    chartRef.current; // But the div for it exists

  return (
    <div className="forecast-chart-container">
      {(showInitialDataLoadingSpinner || showVegaRenderingSpinner) && (
        <div className="forecast-chart-loading">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">
              {showInitialDataLoadingSpinner ? 'Loading initial forecast data...' : 'Preparing forecast chart...'}
            </span>
          </Spinner>
          <p>
            {showInitialDataLoadingSpinner ? 'Loading initial forecast data...' : 'Preparing forecast chart...'}
          </p>
        </div>
      )}
      
      {/* The chart area is always rendered to ensure ref is available. Its content or visibility is managed. */}
      <div 
        ref={chartRef} 
        className="forecast-chart-area" 
        // Hide the div via style if a spinner or a specific message (like noData) is active and meant to replace its content visually.
        // This ensures the div itself is in the DOM for the ref, but not necessarily visible if overlaid.
        style={{ 
          visibility: (showInitialDataLoadingSpinner || showVegaRenderingSpinner || showNoDataMessage || showTestChartFailureMessage) ? 'hidden' : 'visible' 
        }} 
      />

      {showNoDataMessage && (
        <div className="forecast-chart-no-data">
          <p>No forecast data available for the selected combination.</p>
        </div>
      )}
      
      {showTestChartFailureMessage && (
         <div className="forecast-chart-no-data"> {/* Re-use no-data style for this message */}
            <p>Test chart was expected but an issue occurred. Check console.</p>
         </div>
      )}
    </div>
  );
};

// No PropTypes defined here as it doesn't take direct props affecting its core logic
// (consumes from context instead)

export default ForecastChart; 