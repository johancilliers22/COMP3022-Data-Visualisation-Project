import React, { useMemo } from 'react';
import { Badge, ProgressBar } from 'react-bootstrap';
import { useData } from '../../context/DataContext';
import { useUI } from '../../App';
// Import uncertainty calculation utilities
import {
  levelToCertainty,
  calculateCIFromValueAndCIR,
  calculateCertaintyFromCIR,
  calculateCertaintyFromSD,
  getDamageDescription, // Using this for consistency with other components
  calculateCertaintyFromCIWidth // Added for cases where only CI is available
} from '../../utils/uncertaintyCalc';
import './StatsPanel.css';

const DAMAGE_CATEGORIES = [
  { id: 'shake_intensity', label: 'Shake Intensity' },
  { id: 'buildings', label: 'Buildings' },
  { id: 'power', label: 'Power' },
  { id: 'roads_and_bridges', label: 'Roads & Bridges' },
  { id: 'medical', label: 'Medical' },
  { id: 'sewer_and_water', label: 'Sewer & Water' }
];

// Color mapping for different damage levels
const DAMAGE_COLORS = {
  'none': '#d4f1f9',
  'minor': '#a9dfbf',
  'moderate': '#f9e79f',
  'severe': '#f5b041',
  'very_severe': '#ec7063',
  'catastrophic': '#cb4335'
};

/**
 * StatsPanel component for displaying neighborhood statistics
 */
const StatsPanel = ({ neighborhoodId }) => {
  const { data } = useData();
  const { currentTime } = useUI();
  
  // Get neighborhood information and data
  const neighborhoodInfo = useMemo(() => {
    if (!data || !neighborhoodId) return null;
    
    // Find neighborhood details
    const neighborhood = data.locations?.find(loc => 
      loc.id.toString() === neighborhoodId.toString()
    );
    
    if (!neighborhood) return null;
    
    const name = neighborhood.name || `Neighborhood ${neighborhoodId}`;
    
    // Get reports for this neighborhood
    // For StatsPanel, we are primarily interested in the LATEST raw reports
    // as BSTS data is handled more comprehensively by EarthquakeMap and InsightsPanel.
    // We will derive certainty from the raw report data if possible.
    const reports = (data.reports || []).filter(report => 
      report.location?.toString() === neighborhoodId.toString() &&
      new Date(report.time).getTime() <= currentTime
    );
    
    // Get the most recent report for each category and process its uncertainty
    const latestReportsData = {};
    
    DAMAGE_CATEGORIES.forEach(category => {
      const categoryReports = reports.filter(r => r.category === category.id || r.damage_type === category.id);
      
      if (categoryReports.length > 0) {
        // Sort by time and get the most recent one
        const sortedReports = categoryReports.sort((a, b) => 
          new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        
        const latestReport = sortedReports[0];
        
        // Process value and uncertainty from the latest report
        let value = latestReport.reportValue ?? latestReport.map ?? latestReport.value ?? 0;
        value = isNaN(value) ? 0 : Math.max(0, Math.min(10, value));

        let certainty = 0.5; // Default certainty
        let ciLower = 0;
        let ciUpper = 0;

        // Attempt to extract/calculate certainty and CI from the report
        // This logic mirrors part of what's in EarthquakeMap for raw reports
        if (typeof latestReport.certainty === 'number' && !isNaN(latestReport.certainty)) {
          certainty = Math.max(0.1, Math.min(0.9, latestReport.certainty)); // Clamp raw certainty
        } else if (latestReport.certainty_level) {
          certainty = levelToCertainty(latestReport.certainty_level.toLowerCase());
        } else {
          certainty = 0.2; // Low certainty for raw report if no explicit certainty info
        }
        
        // CI for raw reports: use explicit if available, else estimate
        if (typeof latestReport.ci_lower === 'number' && isFinite(latestReport.ci_lower) &&
            typeof latestReport.ci_upper === 'number' && isFinite(latestReport.ci_upper)) {
          ciLower = latestReport.ci_lower;
          ciUpper = latestReport.ci_upper;
          // Optionally, if only CIs are present, re-calculate certainty from CI width for consistency
          // certainty = calculateCertaintyFromCIWidth(ciLower, ciUpper, value);
        } else if (typeof latestReport.cir === 'number' && isFinite(latestReport.cir)) {
          // If CIR is provided directly in a raw report (less common, but possible)
          const halfCir = latestReport.cir / 2.0;
          ciLower = Math.max(0, value - halfCir);
          ciUpper = Math.min(10, value + halfCir);
          certainty = calculateCertaintyFromCIR(latestReport.cir); // Recalculate certainty from CIR
        } else {
          // Estimate CI from derived/default certainty
          const rangeEstimate = (1 - certainty) * 7.0; // Wider heuristic range if certainty is low or default
          ciLower = Math.max(0, value - rangeEstimate);
          ciUpper = Math.min(10, value + rangeEstimate);
        }

        // Final clamping for CIs
        ciLower = Math.max(0, Math.min(10, ciLower));
        ciUpper = Math.max(0, Math.min(10, ciUpper));
        if (ciLower > ciUpper) {
          const mid = (ciLower + ciUpper) / 2;
          ciLower = Math.min(value, mid);
          ciUpper = Math.max(value, mid);
          if (ciLower > ciUpper) { ciLower = value; ciUpper = value; }
        }
        
        latestReportsData[category.id] = {
          ...latestReport, // Keep original report data if needed
          processedValue: value,
          processedCertainty: certainty,
          ciLower,
          ciUpper,
          damageDescription: getDamageDescription(value) // Use utility for description
        };
      }
    });
    
    return {
      id: neighborhoodId,
      name,
      reportCount: reports.length,
      latestReportsData // Use the new processed data
    };
  }, [data, neighborhoodId, currentTime]);
  
  if (!neighborhoodInfo) {
    return (
      <div className="stats-panel-empty">
        <p>No data available for the selected neighborhood.</p>
      </div>
    );
  }
  
  const { name, reportCount, latestReportsData } = neighborhoodInfo;
  
  return (
    <div className="stats-container">
      <div className="stats-header">
        <h4>{name}</h4>
        <Badge bg="info">{reportCount} Reports</Badge>
      </div>
      
      <div className="stats-body">
        {DAMAGE_CATEGORIES.map(category => {
          const reportData = latestReportsData[category.id];
          const value = reportData ? reportData.processedValue : 0;
          const certainty = reportData ? reportData.processedCertainty : 0;
          const ciLower = reportData ? reportData.ciLower : 0;
          const ciUpper = reportData ? reportData.ciUpper : 0;
          const damageDescriptionText = reportData ? reportData.damageDescription : getDamageDescription(0);
          
          // Get color for the damage indicator based on value
          const damageLevelColor = DAMAGE_COLORS[damageDescriptionText.toLowerCase().replace(' ', '_')] || '#ccc';

          return (
            <div key={category.id} className="stat-item">
              <div className="stat-label">{category.label}</div>
              <div className="damage-bar">
                <ProgressBar 
                  now={value * 10} // Scale to percentage (0-100)
                  // Variant can be simplified or made more dynamic based on value/certainty
                  variant={value > 7 ? 'danger' : value > 4 ? 'warning' : value > 1 ? 'info' : 'success'}
                />
              </div>
              <div className="damage-details">
                <div className="damage-value-ci">
                  <div 
                    className="damage-indicator" 
                    style={{ backgroundColor: damageLevelColor }}
                  ></div>
                  <span>{value.toFixed(1)} ({damageDescriptionText})</span>
                  <span className="ci-text">(CI: {ciLower.toFixed(1)} - {ciUpper.toFixed(1)})</span>
                </div>
                <div className="certainty-text">
                  Cert: {(certainty * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsPanel; 