import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';
import './InfoButton.css';

/**
 * InfoButton component that shows project information
 */
const InfoButton = () => {
  const [showModal, setShowModal] = useState(false);
  
  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);
  
  return (
    <>
      <button 
        className="info-button" 
        onClick={handleShow}
        aria-label="Show information"
        title="About this visualization"
      >
        <InfoCircle />
      </button>
      
      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>About This Visualization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Earthquake Damage Visualization</h5>
          <p>
            This visualization shows earthquake damage data for St. Himark City from the VAST Challenge 2019.
            It displays damage levels across different categories and allows for time-based analysis of the effects.
          </p>
          
          <h5>Data Source</h5>
          <p>
            The data is from the VAST Challenge 2019 Mini-Challenge 1, which provides earthquake damage reports
            across different categories including building damage, power outages, medical services, roads and bridges,
            and more.
          </p>
          
          <h5>How to Use</h5>
          <ul>
            <li>Use the timeline controls to navigate through the earthquake timeline</li>
            <li>Select different damage categories from the filter panel</li>
            <li>Click on neighborhoods in the map to see detailed statistics</li>
            <li>The color intensity shows damage severity, with brighter colors indicating more severe damage</li>
          </ul>
          
          <h5>Interpreting Uncertainty</h5>
          <p>
            The visualization uses opacity and confidence intervals to represent uncertainty in the data:
          </p>
          <ul>
            <li><strong>Map Colors:</strong> Lighter fills (more transparent areas) on the map indicate greater uncertainty in the assessed damage level for that neighborhood and category.</li>
            <li><strong>Tooltips:</strong> Wider confidence interval ranges (e.g., &ldquo;0.1 – 5.5&rdquo; vs &ldquo;2.0 – 2.8&rdquo;) in the tooltips also signify greater uncertainty about the precise damage estimate.</li>
          </ul>
          
          <h5>About the Project</h5>
          <p>
            This visualization was developed as part of COMP3022 Data Visualization Project.
            It uses React, Bootstrap, ECharts, and Vega for interactive data visualization.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default InfoButton; 