import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { useData } from '../../context/DataContext';
import { useUI } from '../../App';
import { loadAllBSTSData } from '../../utils/dataLoader';
import logger from '../../utils/logger';
// Import specific functions from uncertaintyCalc
import {
    levelToCertainty,
    calculateCertaintyFromCIR,
    calculateCertaintyFromSD
    // calculateCertaintyFromCIWidth is not directly needed here as InsightsPanel
    // primarily consumes BSTS records which should have CIR/SD/level or explicit CIs.
    // If it were to process raw reports with only CIs, then it might be needed.
} from '../../utils/uncertaintyCalc';
import './InsightsPanel.css';

// Define key events for the Insights Panel, mirroring TimeControls for consistency
const PANEL_KEY_EVENTS = [
  { time: new Date('2020-04-06 14:40:00').getTime(), label: '📋 First Reports' },
  { time: new Date('2020-04-08 08:35:00').getTime(), label: '💥 First Quake' },
  { time: new Date('2020-04-08 18:00:00').getTime(), label: '💡 Power Outages' },
  { time: new Date('2020-04-09 15:00:00').getTime(), label: '💥 Second Quake' },
  { time: new Date('2020-04-10 06:00:00').getTime(), label: '🛠️ Recovery Starts' },
];

const InsightsPanel = () => {
  const { data } = useData(); // For location names
  const { currentTime, selectedCategory } = useUI();
  const [insights, setInsights] = useState({
    worstHitNeighborhood: 'N/A',
    mostAffectedInfrastructure: 'N/A',
    mostAffectedValue: 0,
    averageCertainty: 0,
    certaintyBreakdown: { low: 0, medium: 0, high: 0 },
    mostReliableForCategory: [],
    leastReliableForCategory: [],
    selectedCategoryForReliability: 'N/A'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsightsData = async () => {
      if (!currentTime) return;
      setLoading(true);
      setError(null);

      try {
        // Fetch BSTS data for all categories at the current time
        // The loadAllBSTSData function returns an object where keys are location IDs
        // and values are objects containing data for that location at that time,
        // including a 'category' field and 'map' (damage value), 'cir', 'sd'.
        const allBstsDataForTimestamp = await loadAllBSTSData(null, currentTime);
        logger.debug('InsightsPanel: Fetched all BSTS data for timestamp:', currentTime, allBstsDataForTimestamp);

        if (Object.keys(allBstsDataForTimestamp).length === 0) {
          setInsights({
            worstHitNeighborhood: 'No data',
            mostAffectedInfrastructure: 'No data',
            mostAffectedValue: 0,
            averageCertainty: 0,
            certaintyBreakdown: { low: 0, medium: 0, high: 0 },
            mostReliableForCategory: [],
            leastReliableForCategory: [],
            selectedCategoryForReliability: 'N/A'
          });
          setLoading(false);
          return;
        }

        let worstNeighborhoodName = 'N/A';
        let maxDamage = -1; // Renaming this to avoid confusion
        let overallMaxDamage = -1; // Track the absolute highest peak
        let overallMaxCategory = 'N/A';
        let overallMaxLocationId = null;

        const neighborhoodDamages = {}; // Still useful for finding overall worst hit area if needed, but peak logic changes

        let categoryTotals = {};
        let categoryCounts = {};
        let totalCertaintyScore = 0;
        let validCertaintyCount = 0;
        
        // For Certainty Breakdown
        const certaintyCounts = { low: 0, medium: 0, high: 0 };
        const CERTAINTY_THRESHOLDS = {
          LOW_MAX: 0.399, // Certainty < 0.4
          MEDIUM_MAX: 0.799, // Certainty 0.4 to < 0.8
          // HIGH is >= 0.8
        };

        // Store certainty for the selected category per neighborhood
        const categorySpecificCertainties = {};

        // Process data for each location/category in the new structure
        Object.values(allBstsDataForTimestamp).forEach(locationData => {
          // locationData is now an object like { buildings: {...}, power: {...}, ... }
          Object.values(locationData).forEach(locCatData => {
            // locCatData is the actual record for a specific category at this location
            if (!locCatData || typeof locCatData.map !== 'number' || !locCatData.category) {
              return;
            }
            const damageValue = locCatData.map;
            const neighborhoodId = locCatData.location.toString();

            // --- Track Overall Max Damage --- 
            if (damageValue > overallMaxDamage) {
              overallMaxDamage = damageValue;
              overallMaxCategory = locCatData.category;
              overallMaxLocationId = neighborhoodId;
            }
            // --- End Track Overall Max Damage ---

            // Keep track of max damage per neighborhood (optional, could replace with overallMaxLocationId later)
            if (damageValue > (neighborhoodDamages[neighborhoodId] || -1)) {
              neighborhoodDamages[neighborhoodId] = damageValue;
            }

            // Most affected infrastructure (category with highest average damage)
            categoryTotals[locCatData.category] = (categoryTotals[locCatData.category] || 0) + damageValue;
            categoryCounts[locCatData.category] = (categoryCounts[locCatData.category] || 0) + 1;

            // --- Corrected Certainty Calculation --- (Now using uncertaintyCalc.js)
            let currentCertainty = 0.5; // Default if no other info found
            let hasCertainty = false;

            if (locCatData.certainty_level) {
                currentCertainty = levelToCertainty(locCatData.certainty_level.toLowerCase());
                hasCertainty = true;
            } else if (typeof locCatData.cir === 'number' && isFinite(locCatData.cir)) {
              currentCertainty = calculateCertaintyFromCIR(locCatData.cir);
              hasCertainty = true;
            } else if (typeof locCatData.sd === 'number' && isFinite(locCatData.sd)) {
              currentCertainty = calculateCertaintyFromSD(locCatData.sd);
              hasCertainty = true;
            }
            // Note: If a BSTS record has explicit ci_lower_95/ci_upper_95 but NO certainty_level, cir, or sd,
            // EarthquakeMap.jsx now derives certainty using calculateCertaintyFromCIWidth.
            // InsightsPanel currently doesn't have this fallback because it iterates through
            // processed BSTS records which ideally should have one of the primary certainty indicators.
            // If BSTS records fed to InsightsPanel *could* lack all three (level, cir, sd) but have CIs,
            // then calculateCertaintyFromCIWidth would be needed here too.
            // For now, assuming bsts records for insights will have level, cir, or sd if certainty is to be derived.
            // If not, currentCertainty remains the default 0.5 which is reasonable for missing data.
            // --- End Corrected Certainty Calculation ---
            
            if(hasCertainty){ // Only include in average if certainty was actively determined
              totalCertaintyScore += currentCertainty;
              validCertaintyCount++;
            }
            
            // Categorize for breakdown (using the calculated currentCertainty)
            if (currentCertainty < CERTAINTY_THRESHOLDS.LOW_MAX) {
              certaintyCounts.low++;
            } else if (currentCertainty < CERTAINTY_THRESHOLDS.MEDIUM_MAX) {
              certaintyCounts.medium++;
            } else {
              certaintyCounts.high++;
            }

            // If this data point is for the currently selected category, store its certainty
            if (locCatData.category === selectedCategory) {
              const locInfo = data && data.locations ? data.locations.find(l => l.id.toString() === neighborhoodId) : null;
              const locName = locInfo ? locInfo.name : `Neighborhood ${neighborhoodId}`;
              categorySpecificCertainties[neighborhoodId] = {
                name: locName,
                certainty: currentCertainty
              };
            }
          });
        });

        // Determine worst-hit neighborhood NAME based on the location of the overall max damage
        if (overallMaxLocationId && data && data.locations) {
          const locDetail = data.locations.find(l => l.id.toString() === overallMaxLocationId);
          worstNeighborhoodName = locDetail ? locDetail.name : `Neighborhood ${overallMaxLocationId}`;
        } else if (overallMaxLocationId) {
          worstNeighborhoodName = `Neighborhood ${overallMaxLocationId}`;
        } else {
          // Fallback if no damage found at all
          worstNeighborhoodName = 'N/A'; 
        }

        // Determine most affected infrastructure NAME based on the category of the overall max damage
        const categoryNameMap = {
          'shake_intensity': 'Shake Intensity',
          'buildings': 'Buildings',
          'power': 'Power',
          'medical': 'Medical',
          'sewer_and_water': 'Sewer & Water',
          'roads_and_bridges': 'Roads & Bridges'
        };
        const readableMostAffectedCat = categoryNameMap[overallMaxCategory] || overallMaxCategory.replace(/_/g, ' ');
        const readableSelectedCat = categoryNameMap[selectedCategory] || selectedCategory.replace(/_/g, ' ');

        const finalAverageCertainty = validCertaintyCount > 0 ? (totalCertaintyScore / validCertaintyCount) * 100 : 0;

        // Generate reliability lists for the selected category
        const mostReliableForCategory = Object.values(categorySpecificCertainties)
          .filter(item => item.certainty > 0.85) // Keep this filter for "most reliable" to mean objectively high
          .sort((a, b) => b.certainty - a.certainty) // Sort descending by certainty
          .slice(0, 5) // Take top 5
          .map(item => `${item.name} (${(item.certainty * 100).toFixed(0)}%)`);
        
        // MODIFIED: Take the absolute bottom 5 lowest certainty items, regardless of their value
        const leastReliableForCategory = Object.values(categorySpecificCertainties)
          // REMOVED: .filter(item => item.certainty < 0.399)
          .sort((a, b) => a.certainty - b.certainty) // Sort ascending by certainty (lowest first)
          .slice(0, 5) // Take the bottom 5 overall
          .map(item => `${item.name} (${(item.certainty * 100).toFixed(0)}%)`);

        setInsights({
          worstHitNeighborhood: worstNeighborhoodName, // Area where the peak occurred
          mostAffectedInfrastructure: readableMostAffectedCat, // Category of the peak
          mostAffectedValue: overallMaxDamage, // The actual peak value
          averageCertainty: finalAverageCertainty,
          certaintyBreakdown: certaintyCounts, // Store the calculated counts
          mostReliableForCategory,
          leastReliableForCategory,
          selectedCategoryForReliability: readableSelectedCat // Store for display
        });

      } catch (err) {
        logger.error('InsightsPanel: Error fetching or processing data:', err);
        setError('Failed to load insights. ' + err.message);
        setInsights({
            worstHitNeighborhood: 'Error',
            mostAffectedInfrastructure: 'Error',
            mostAffectedValue: 0,
            averageCertainty: 0,
            certaintyBreakdown: { low: 0, medium: 0, high: 0 },
            mostReliableForCategory: [],
            leastReliableForCategory: [],
            selectedCategoryForReliability: selectedCategory.replace(/_/g, ' ')
          });
      } finally {
        setLoading(false);
      }
    };

    fetchInsightsData();
  }, [currentTime, data]); // Added data dependency for location names

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Key Event Definitions for Insights Panel (specific quakes)
  // This is now replaced by PANEL_KEY_EVENTS for better consistency
  /*
  const INSIGHTS_SPECIFIC_EVENTS = {
    FIRST_QUAKE: { time: new Date('2020-04-08T08:35:00').getTime(), label: '💥 First Quake' },
    SECOND_QUAKE: { time: new Date('2020-04-09T15:00:00').getTime(), label: '💥 Second Quake' },
  };
  */

  const EVENT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hour window around the event (increased for broader matching)

  const getActiveEventFlags = (currentMs) => {
    const activeEvents = [];
    // Check panel-specific key events
    for (const event of PANEL_KEY_EVENTS) {
      if (Math.abs(currentMs - event.time) <= EVENT_WINDOW_MS / 2) {
        activeEvents.push(event.label);
      }
    }
    return activeEvents;
  };

  if (loading) {
    return (
      <Card className="insights-panel-card loading-insights">
        <Card.Body>
          <Spinner animation="border" size="sm" /> Loading Insights...
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="insights-panel-card error-insights">
        <Card.Body>
          <p>Error loading insights: {error}</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="insights-panel-card">
      <Card.Header>
        <h4>Current Situation Highlights</h4>
      </Card.Header>
      <Card.Body>
        <ul className="insights-list">
          <li>
            <span role="img" aria-label="Time">🕒</span> Current Time: {formatTime(currentTime)}
            {getActiveEventFlags(currentTime).map(flag => (
              <span key={flag} className="event-flag">{flag}</span>
            ))}
          </li>
          <li>
            <span role="img" aria-label="Location">📍</span> Most Affected Area: <strong>{insights.worstHitNeighborhood}</strong>
          </li>
          <li>
            <span role="img" aria-label="Infrastructure">🏗️</span> Top Damage Category: <strong>{insights.mostAffectedInfrastructure}</strong> (Peak: {insights.mostAffectedValue.toFixed(1)})
          </li>
          <li>
            <span role="img" aria-label="Certainty">🧮</span> Avg. Data Certainty: <strong>{insights.averageCertainty.toFixed(0)}%</strong>
          </li>
          {/* Certainty Breakdown Display */}
          <li>
            <span role="img" aria-label="Chart">📊</span> Certainty Dist: 
            <span className="certainty-breakdown">
              <span className="cert-high" title="High Certainty (>=80%)"> H: {insights.certaintyBreakdown.high}</span>
              <span className="cert-medium" title="Medium Certainty (40-79%)"> M: {insights.certaintyBreakdown.medium}</span>
              <span className="cert-low" title="Low Certainty (<40%)"> L: {insights.certaintyBreakdown.low}</span>
            </span>
          </li>
          {/* Reliability Highlights Section */}
          {(insights.mostReliableForCategory.length > 0 || insights.leastReliableForCategory.length > 0) && (
            <li className="reliability-highlight-section">
              <div className="reliability-header">
                <span role="img" aria-label="Shield">🛡️</span> 
                Reliability for <strong>{insights.selectedCategoryForReliability}</strong>:
              </div>
              {insights.mostReliableForCategory.length > 0 && (
                <div className="reliable-list most-reliable">
                  <span className="reliability-label">Most Reliable:</span> 
                  <span className="reliability-values">{insights.mostReliableForCategory.join(', ') || 'None'}</span>
                </div>
              )}
              {insights.leastReliableForCategory.length > 0 && (
                <div className="reliable-list least-reliable">
                  <span className="reliability-label">Least Reliable:</span> 
                  <span className="reliability-values">{insights.leastReliableForCategory.join(', ') || 'None'}</span>
                </div>
              )}
            </li>
          )}
        </ul>
      </Card.Body>
    </Card>
  );
};

export default InsightsPanel; 