import React from 'react';
import { Form } from 'react-bootstrap';
import { useUI } from '../../App';
import './ColorSchemeSelector.css';

// Import images directly
import vsupImage from '../../data/images/VSUP.png';
import vsupExtImage from '../../data/images/VSUP_.png';
// Normal.png is not present in src/data/images, so it will fallback if selected

const imageMap = {
  'VSUP': vsupImage,
  'VSUP_': vsupExtImage,
  // 'Normal': normalImage, // Would add if Normal.png existed and was imported
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
          src={imageMap[colorScheme] || vsupImage} // Fallback to VSUP.png if scheme's image not in map
          alt={`${colorScheme} color legend`} 
          className="legend-image-small" 
          // onError logic can be simplified or removed if direct imports cover all cases
          // or if a specific fallback image is always desired for missing ones.
          // For now, direct import fallback handles missing Normal.png by using vsupImage.
        />
      </div>
    </div>
  );
};

export default ColorSchemeSelector; 