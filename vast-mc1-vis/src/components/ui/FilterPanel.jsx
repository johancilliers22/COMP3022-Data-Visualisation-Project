import React from 'react';
import { Form, Button, ButtonGroup, ToggleButton, Accordion } from 'react-bootstrap';
import { useUI } from '../../App';
import './FilterPanel.css';
import { useData } from '../../context/DataContext';
import CategorySelector from './CategorySelector';
import ColorSchemeSelector from './ColorSchemeSelector';

const DAMAGE_CATEGORIES = [
  { id: 'shake_intensity', name: 'Shake Intensity', icon: 'bi-lightning' },
  { id: 'buildings', name: 'Buildings', icon: 'bi-building' },
  { id: 'power', name: 'Power', icon: 'bi-lightning-charge' },
  { id: 'roads_and_bridges', name: 'Roads & Bridges', icon: 'bi-signpost-split' },
  { id: 'medical', name: 'Medical', icon: 'bi-hospital' },
  { id: 'sewer_and_water', name: 'Sewer & Water', icon: 'bi-droplet' }
];

/**
 * FilterPanel component for controlling visualization settings
 */
const FilterPanel = () => {
  const { filters, setFilters, resetFilters, locations } = useData();
  const { 
    selectedCategory, 
    setSelectedCategory,
    colorScheme,
    setColorScheme,
    availableColorSchemes,
    activeColorSchemePalette,
    showRawReports,
    setShowRawReports,
    showNeighborhoodLabels,
    setShowNeighborhoodLabels,
    showInsightsPanel,
    setShowInsightsPanel,
    selectedNeighborhood,
    setSelectedNeighborhood
  } = useUI();
  
  // Handle category selection
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };
  
  // Handle color scheme change
  const handleColorSchemeChange = (e) => {
    setColorScheme(e.target.value);
  };
  
  // Toggle raw reports display
  const toggleRawReports = () => {
    setShowRawReports(!showRawReports);
  };
  
  // Toggle neighborhood labels
  const toggleNeighborhoodLabels = () => {
    setShowNeighborhoodLabels(!showNeighborhoodLabels);
  };
  
  // Handle clearing neighborhood selection
  const handleClearNeighborhood = () => {
    setSelectedNeighborhood(null);
  };
  
  // Get the current color scheme map
  const currentColorSchemeMap = activeColorSchemePalette;
  
  return (
    <div className="filter-panel">
      <div className="filter-section">
        <h5>Damage Category</h5>
        <div className="category-buttons">
          {DAMAGE_CATEGORIES.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'primary' : 'outline-secondary'}
              className="category-button"
              onClick={() => handleCategoryChange(category.id)}
              aria-label={category.name}
            >
              <i className={`bi ${category.icon}`}></i>
              <span>{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
      
      <div className="filter-section">
        <h5>Visualization Settings</h5>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Color Scheme</Form.Label>
            <Form.Select 
              value={colorScheme} 
              onChange={handleColorSchemeChange}
              aria-label="Color scheme selection"
            >
              {availableColorSchemes.map(scheme => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </Form.Select>
            
            <div className="color-scheme-preview">
              {colorScheme === 'VSUP' ? (
                <div className="vsup-preview">
                  <span className="vsup-color vsup-blue"></span>
                  <span className="vsup-color vsup-yellow"></span>
                  <span className="vsup-color vsup-orange"></span>
                  <span className="vsup-color vsup-red"></span>
                </div>
              ) : colorScheme === 'VSUP_' ? (
                <div className="vsup-extended-preview">
                  <span className="vsup-ext-color" style={{ backgroundColor: 'hsl(193, 100%, 75%)' }}></span>
                  <span className="vsup-ext-color" style={{ backgroundColor: 'hsl(45, 86%, 79%)' }}></span>
                  <span className="vsup-ext-color" style={{ backgroundColor: 'hsl(31, 100%, 70%)' }}></span>
                  <span className="vsup-ext-color" style={{ backgroundColor: 'hsl(21, 100%, 62%)' }}></span>
                  <span className="vsup-ext-color" style={{ backgroundColor: 'hsl(11, 100%, 53%)' }}></span>
                  <span className="vsup-ext-color" style={{ backgroundColor: 'hsl(2, 91%, 40%)' }}></span>
                </div>
              ) : (
                <div className="normal-preview">
                  <span className="normal-color color-1"></span>
                  <span className="normal-color color-2"></span>
                  <span className="normal-color color-3"></span>
                  <span className="normal-color color-4"></span>
                  <span className="normal-color color-5"></span>
                </div>
              )}
            </div>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Check 
              type="switch"
              id="show-reports-switch"
              label="Show individual reports"
              checked={showRawReports}
              onChange={toggleRawReports}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Check 
              type="switch"
              id="show-labels-switch"
              label="Show neighborhood names"
              checked={showNeighborhoodLabels}
              onChange={toggleNeighborhoodLabels}
            />
          </Form.Group>

          <Form.Group controlId="showInsightsToggle" className="mb-3">
            <Form.Check
              type="switch"
              id="insights-panel-switch"
              label="Show Insights Panel"
              checked={showInsightsPanel}
              onChange={(e) => setShowInsightsPanel(e.target.checked)}
            />
          </Form.Group>
        </Form>
      </div>
      
      <div className="filter-section">
        <h5>Map Controls</h5>
        <Button 
          variant="outline-danger" 
          size="sm" 
          onClick={handleClearNeighborhood}
          disabled={!selectedNeighborhood}
          className="w-100 mb-2"
        >
          <i className="bi bi-x-circle me-2"></i>Clear Selected Neighborhood
        </Button>
      </div>
      
      <div className="filter-section">
        <h5>Map Legend</h5>
        <div className="legend">
          {currentColorSchemeMap.map((item, index) => (
            <div key={index} className="legend-item">
              <span 
                className="legend-color" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="legend-label">
                {item.level.charAt(0).toUpperCase() + item.level.slice(1)} ({item.range})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel; 