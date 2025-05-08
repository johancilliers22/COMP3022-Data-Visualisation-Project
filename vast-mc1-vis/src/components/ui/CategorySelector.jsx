import React from 'react';
import { Form } from 'react-bootstrap';
import { useUI } from '../../App';
import './CategorySelector.css';

/**
 * CategorySelector component to select damage categories
 * Converted from Vue's SelectCategory.vue
 */
const CategorySelector = () => {
  const { selectedCategory, setSelectedCategory } = useUI();

  const categories = [
    { value: 'shake_intensity', label: 'Shake Intensity' },
    { value: 'medical', label: 'Medical' },
    { value: 'power', label: 'Power' },
    { value: 'buildings', label: 'Buildings' },
    { value: 'sewer_and_water', label: 'Sewer & Water' },
    { value: 'roads_and_bridges', label: 'Roads & Bridges' }
  ];

  const handleChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  return (
    <div className="category-selector">
      <Form.Group>
        <Form.Label>Damage Category</Form.Label>
        <div className="category-radio-group">
          {categories.map((category) => (
            <Form.Check
              key={category.value}
              type="radio"
              id={`category-${category.value}`}
              label={category.label}
              value={category.value}
              checked={selectedCategory === category.value}
              onChange={handleChange}
              className="category-radio"
            />
          ))}
        </div>
      </Form.Group>
    </div>
  );
};

export default CategorySelector; 