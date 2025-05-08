import React, { useState, useEffect } from 'react';
import { Switch } from 'antd';
import { useData } from '../../context/DataContext';
import { useUI } from '../../App';
import './SwitchSlider.css';

/**
 * SwitchSlider component - a toggle switch with labels
 */
const SwitchSlider = ({
  param = 'FillMap',
  values = {
    activeVal: true,
    inactiveVal: false,
    activeText: 'Fill neighborhoods with colors',
    inactiveText: ''
  }
}) => {
  const [value, setValue] = useState(values.activeVal);
  const [valueBeforeDisabled, setValueBeforeDisabled] = useState(null);
  const [disabled, setDisabled] = useState(false);
  
  const { filters, updateFilters } = useData();
  const { selectedCategory } = useUI();
  
  // Handle initialization based on current state
  useEffect(() => {
    // Check for existing value in filters
    if (filters && filters[param] !== undefined) {
      setValue(filters[param]);
    }
  }, [filters, param]);
  
  // Watch for ShowCategory changes
  useEffect(() => {
    if (param === 'FillMap' && selectedCategory === 'All') {
      setValueBeforeDisabled(value);
      setValue(false);
      setDisabled(true);
    } else if (param === 'FillMap' && selectedCategory !== 'All' && disabled) {
      setValue(valueBeforeDisabled || values.activeVal);
      setDisabled(false);
    }
  }, [selectedCategory, param, value, valueBeforeDisabled, disabled, values.activeVal]);
  
  // Handle change
  const handleChange = (checked) => {
    const newValue = checked ? values.activeVal : values.inactiveVal;
    setValue(newValue);
    
    // Update filters based on the parameter name
    if (updateFilters) {
      updateFilters({ [param]: newValue });
    }
  };
  
  return (
    <div className="switch-slider">
      <Switch
        checked={value === values.activeVal}
        onChange={handleChange}
        disabled={disabled}
      />
      <span className="switch-text">
        {value === values.activeVal ? values.activeText : values.inactiveText}
      </span>
    </div>
  );
};

export default SwitchSlider; 