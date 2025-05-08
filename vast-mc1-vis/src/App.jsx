import React, { useState, createContext, useContext, useEffect } from 'react';
import { Container, Row, Col, Spinner, Card } from 'react-bootstrap';
import { DataProvider, useData } from './context/DataContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Import components
import FilterPanel from './components/ui/FilterPanel';
import TimeControls from './components/ui/TimeControls';
import VegaChart from './components/charts/VegaChart';
import EarthquakeMap from './components/charts/EarthquakeMap';
import InfoButton from './components/ui/InfoButton';
import StatsPanel from './components/ui/StatsPanel';
import InsightsPanel from './components/ui/InsightsPanel';
import ForecastChart from './components/charts/ForecastChart';

// Import JSON specification files directly
import categoryComparisonSpecData from './data/specs/category-comparison-spec.json';
import fullHeatmapSpecData from './data/specs/heatmap-all-neighborhoods-spec.json';

// Create UI context for sharing state between components
export const UIContext = createContext();

// Define color schemes centrally
const COLOR_SCHEMES_AVAILABLE = [
  { id: 'VSUP', name: 'VSUP Standard' },
  { id: 'VSUP_', name: 'VSUP Extended' },
  { id: 'Normal', name: 'Normal' }
];

const COLOR_PALETTES = {
  VSUP: [
    { level: 'none', range: '0-0.5', color: '#d6eaf8' },
    { level: 'minor', range: '0.5-2', color: '#acd1f2' },
    { level: 'moderate', range: '2-4', color: '#f5b041' },
    { level: 'severe', range: '4-6', color: '#ec7063' },
    { level: 'very-severe', range: '6-8', color: '#cb4335' },
    { level: 'catastrophic', range: '8-10', color: '#641e16' }
  ],
  VSUP_: [
    { level: 'Subtle',       range: '0-1.25',   color: 'hsl(193, 100%, 75%)' },
    { level: 'Noticeable',   range: '1.25-2.5', color: 'hsl(45, 86%, 79%)' },
    { level: 'Clear',        range: '2.5-3.75', color: 'hsl(31, 100%, 70%)' },
    { level: 'Distinct',     range: '3.75-5',   color: 'hsl(21, 100%, 62%)' },
    { level: 'Significant',  range: '5-6.25',   color: 'hsl(11, 100%, 53%)' },
    { level: 'Major',        range: '6.25-7.5', color: 'hsl(2, 91%, 40%)' },
    { level: 'Critical',     range: '7.5-8.75', color: 'hsl(1, 84%, 24%)' },
    { level: 'Overwhelming', range: '8.75-10',  color: 'hsl(7, 96%, 9%)' }
  ],
  Normal: [
    { level: 'none', range: '0-0.5', color: '#d4f1f9' },
    { level: 'minor', range: '0.5-2', color: '#a9dfbf' },
    { level: 'moderate', range: '2-4', color: '#f9e79f' },
    { level: 'severe', range: '4-6', color: '#f5b041' },
    { level: 'very-severe', range: '6-8', color: '#ec7063' },
    { level: 'catastrophic', range: '8-10', color: '#cb4335' }
  ]
};

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date('2020-04-06').getTime());
  const [showRawReports, setShowRawReports] = useState(false);
  const [colorScheme, setColorScheme] = useState('VSUP');
  const [selectedCategory, setSelectedCategory] = useState('shake_intensity');
  const [showNeighborhoodLabels, setShowNeighborhoodLabels] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(true);

  const activeColorSchemePalette = COLOR_PALETTES[colorScheme] || COLOR_PALETTES.VSUP;

  return (
    <UIContext.Provider value={{
      selectedNeighborhood,
      setSelectedNeighborhood,
      currentTime,
      setCurrentTime,
      showRawReports,
      setShowRawReports,
      colorScheme,
      setColorScheme,
      availableColorSchemes: COLOR_SCHEMES_AVAILABLE,
      activeColorSchemePalette,
      selectedCategory,
      setSelectedCategory,
      showNeighborhoodLabels,
      setShowNeighborhoodLabels,
      sidebarCollapsed,
      setSidebarCollapsed,
      showInsightsPanel,
      setShowInsightsPanel
    }}>
      {children}
    </UIContext.Provider>
  );
};

/**
 * Main content component that uses the data context
 */
const AppContent = () => {
  const { loading, loadingProgress, error } = useData();
  const { 
    selectedCategory, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    selectedNeighborhood,
    showInsightsPanel
  } = useUI();
  const [categoryComparisonSpec, setCategoryComparisonSpec] = useState(null);
  const [fullHeatmapSpec, setFullHeatmapSpec] = useState(null);

  // Load Vega specs for visualizations
  useEffect(() => {
    // Set specs from imported data
    setCategoryComparisonSpec(categoryComparisonSpecData);
    setFullHeatmapSpec(fullHeatmapSpecData);
  }, []);
  
  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading earthquake data...</span>
        </Spinner>
        <p>{loadingProgress || 'Loading earthquake data...'}</p>
        <small>This may take a few moments for the full dataset</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>Earthquake Damage Visualization</h1>
          <p>St. Himark City - VAST Challenge 2019</p>
        </div>
        <div className="header-controls">
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`bi bi-layout-sidebar${sidebarCollapsed ? '' : '-reverse'}`}></i>
          </button>
        </div>
      </header>
      
      {/* Main content area */}
      <div className="dashboard-main">
        {/* Sidebar with filters */}
        <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-content">
            <Card className="filter-card">
              <Card.Header>
                <h3>Filters & Controls</h3>
              </Card.Header>
              <Card.Body className="p-2">
                <FilterPanel />
              </Card.Body>
            </Card>
            
            {selectedNeighborhood && (
              <Card className="neighborhood-card">
                <Card.Header>
                  <h3>Selected Area</h3>
                </Card.Header>
                <Card.Body className="p-2">
                  <StatsPanel neighborhoodId={selectedNeighborhood} />
                </Card.Body>
              </Card>
            )}
          </div>
        </aside>
        
        {/* Main visualization area */}
        <main className="dashboard-content">
          {/* Combined Map and Insights Row - Should be first */}
          <div className="content-row map-and-insights-row"> 
            {/* Main Map Column*/}
            <div className={`content-column map-column ${!showInsightsPanel ? 'full-width' : ''}`}>
              <Card className="map-card">
                <Card.Header>
                  <h3>Damage Map: {selectedCategory.replace(/_/g, ' ')}</h3>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="map-container">
                    <EarthquakeMap />
                  </div>
                </Card.Body>
              </Card>
            </div>

            {/* Insights Panel Column - Apply .collapsed class when showInsightsPanel is false */}
            <div className={`content-column insights-column ${!showInsightsPanel ? 'collapsed' : ''}`}>
              <InsightsPanel />
            </div>
          </div>

          {/* Timeline controls - Should be second, below map/insights */}
          <div className="content-row controls-row">
            <Card className="timeline-card">
              <Card.Body className="p-2">
                <TimeControls />
              </Card.Body>
            </Card>
          </div>

          {/* Charts section - Should be third, below timeline controls */}
          <div className="content-row charts-row">
            <div className="content-column">
              {/* Category Comparison Chart (Left) */}
              <Card className="chart-card category-comparison-chart-card">
                <Card.Header>
                  <h3>Damage Category Comparison</h3>
                </Card.Header>
                <Card.Body className="p-1">
                  <div className="chart-container">
                    {categoryComparisonSpec ? (
                      <VegaChart 
                        spec={categoryComparisonSpec}
                        useSignals={true}
                        chartType="categoryComparison"
                        title={null}
                      />
                    ) : (
                      <div className="loading-placeholder">Loading category visualization...</div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </div>
            <div className="content-column">
              {/* Full Heatmap Chart (Right) */}
              <Card className="chart-card full-heatmap-card">
                <Card.Header>
                  <h3>Neighborhoods & Categories Damage Heatmap</h3>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="chart-container full-heatmap">
                    {fullHeatmapSpec ? (
                      <VegaChart 
                        spec={fullHeatmapSpec}
                        useSignals={true}
                        chartType="fullHeatmap"
                        title={null}
                        managesOwnData={true}
                      />
                    ) : (
                      <div className="loading-placeholder">Loading full heatmap visualization...</div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* New Row for Forecast Chart - Should be last */}
          <div className="content-row forecast-chart-row">
            <div className="content-column full-width">
              <Card className="chart-card forecast-card">
                <Card.Header>
                  <h3>Damage Forecast Over Time</h3>
                </Card.Header>
                <Card.Body className="p-1">
                  <ForecastChart />
                </Card.Body>
              </Card>
            </div>
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="app-footer">
        <p>COMP3022 Data Visualization Project - VAST Challenge 2019</p>
      </footer>
      
      {/* Add the InfoButton component */}
      <InfoButton />
    </div>
  );
};

/**
 * Main App component with data provider
 */
function App() {
  return (
    <DataProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </DataProvider>
  );
}

export default App; 