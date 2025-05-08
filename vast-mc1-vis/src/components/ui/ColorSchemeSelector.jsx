import React from 'react';
import { Form } from 'react-bootstrap';
import { useUI } from '../../App';
import './ColorSchemeSelector.css';

/**
 * ColorSchemeSelector component for selecting map visualization color schemes
 */
const ColorSchemeSelector = () => {
  const { 
    colorScheme, 
    setColorScheme,
    availableColorSchemes // Fetched from UIContext
  } = useUI();

  return (
    <div className="color-scheme-selector">
      <Form.Group>
        <Form.Label>Color Scheme</Form.Label>
        <Form.Select 
          value={colorScheme} 
          onChange={(e) => setColorScheme(e.target.value)}
          className="form-select"
        >
          {availableColorSchemes.map(scheme => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label || scheme.name} {/* Use scheme.name as fallback from context */}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      
      <div className="color-preview">
        <img 
          src={`${process.env.PUBLIC_URL}/data/images/${colorScheme}.png`} 
          alt={`${colorScheme} color legend`} 
          className="legend-image-small" 
          onError={(e) => {
            console.warn(`Failed to load image: ${e.target.src}`);
            e.target.src = `${process.env.PUBLIC_URL}/data/images/VSUP.png`;
          }}
        />
      </div>
    </div>
  );
};

export default ColorSchemeSelector; 