import React from 'react';
import { Form } from 'react-bootstrap';
import { useUI } from '../../App';
import './ColorSchemeSelector.css';

// REMOVE direct image imports
// import vsupImage from '../../data/images/VSUP.png';
// import vsupExtImage from '../../data/images/VSUP_.png';

// Construct image paths relative to the public directory
const imageMap = {
  'VSUP': `${process.env.PUBLIC_URL}/data/images/VSUP.png`,
  'VSUP_': `${process.env.PUBLIC_URL}/data/images/VSUP_.png`,
  'Normal': `${process.env.PUBLIC_URL}/data/images/Normal.png`, // Assuming Normal.png exists or will be added
};

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
          src={imageMap[colorScheme] || `${process.env.PUBLIC_URL}/data/images/VSUP.png`} // Fallback to VSUP.png
          alt={`${colorScheme} color legend`} 
          className="legend-image-small" 
        />
      </div>
    </div>
  );
};

export default ColorSchemeSelector; 