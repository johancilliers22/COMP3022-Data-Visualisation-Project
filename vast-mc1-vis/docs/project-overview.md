# Project Overview

## 1. Introduction

This project is a term-time assessment for the COMP3022 Data Visualization module at the University of Nottingham. It involves creating an interactive web-based application to visualize and analyze earthquake damage data from the VAST Challenge 2019 Mini-Challenge 1.

## 2. Challenge Background

St. Himark, a fictional city, has experienced a significant earthquake event. Emergency responders receive damage reports from citizens over time. These reports contain subjective damage intensity ratings (scale 0-10, where 10 is most severe) for various infrastructure categories:

*   Shake Intensity
*   Buildings
*   Medical Facilities
*   Power Infrastructure
*   Roads & Bridges
*   Sewer & Water Systems

The data arrives chronologically, presenting challenges related to data volume, reliability (uncertainty), and identifying evolving patterns.

## 3. Project Goals

The primary objective is to develop an interactive visualization tool that supports emergency response decision-making. Key goals include:

1.  **Damage Assessment**: Enable users to quickly assess the severity and location of damage across different categories.
2.  **Uncertainty Visualization**: Clearly communicate the reliability and uncertainty associated with the damage assessments, leveraging Bayesian statistical modeling performed during offline preprocessing.
3.  **Temporal Analysis**: Allow users to track how damage conditions and uncertainty evolve over the course of the event using time controls.
4.  **Prioritization Support**: Help users identify neighborhoods and infrastructure types that require the most urgent attention, considering both damage severity and data certainty.
5.  **Insight Generation**: Facilitate the discovery of patterns, anomalies, and correlations within the data.

## 4. Key Analytical Questions

The visualization aims to help users answer questions such as:

*   Which neighborhoods are consistently reporting the most severe damage across critical categories?
*   How confident can we be in the damage assessment for a specific neighborhood and category at a given time?
*   Are there specific time periods where uncertainty is particularly high or low?
*   Which infrastructure types suffer the most widespread or severe damage?
*   How does the situation change immediately following the recorded earthquake aftershocks?
*   Are there neighborhoods with consistently sparse reporting for certain damage types, and how is this represented?

## 5. Visualization Approach

Our solution integrates multiple coordinated views built with modern web technologies:

*   **Core Technologies**: React frontend, ECharts and Vega-Lite for visualizations.
*   **Data Foundation**: Relies heavily on data pre-processed using an offline **R pipeline** featuring **Bayesian Structural Time Series (BSTS)** modeling. This pipeline generates estimates of damage severity (MAP - Maximum A Posteriori probability) and quantifies uncertainty (e.g., Credible Interval Range - CIR).
*   **Key Visualizations**:
    *   **Interactive Map (`EarthquakeMap.jsx`)**: An ECharts-based choropleth map displaying damage severity using color and uncertainty using opacity. Tooltips provide detailed metrics including damage value and confidence intervals.
    *   **Heatmap (`VegaChart.jsx`)**: A Vega-Lite heatmap showing damage values over time for all neighborhoods and categories, providing a comprehensive overview. Areas with insufficient data for BSTS modeling are shown with zero damage.
    *   **Category Comparison (`VegaChart.jsx`)**: A Vega-Lite bar chart comparing average damage levels across different categories.
    *   **Forecast Chart (`ForecastChart.jsx`)**: An ECharts line chart showing historical trends and forecasted damage for selected areas/categories, including confidence bands.
*   **Interactivity**: Includes time controls (slider, playback), category and color scheme selectors, map click-to-select neighborhood functionality, and linked highlighting/filtering between views.
*   **Handling Sparsity**: The preprocessing pipeline and visualizations explicitly handle cases where raw data is insufficient for BSTS modeling by representing these instances as having zero modeled damage.

## 6. Learning Objectives

Through this project, we aim to:

*   Apply data visualization principles to complex, uncertain time-series data.
*   Implement effective visual encodings for multi-attribute data (value and uncertainty).
*   Develop an interactive application using React, ECharts, and Vega-Lite.
*   Address challenges of data preprocessing, large dataset handling, and uncertainty communication.
*   Create a tool supporting analytical reasoning in a simulated emergency response scenario.

## 7. Deliverables

*   Interactive React web application.
*   Written report detailing design, implementation, and findings.
*   Source code repository with documentation.
*   Recorded presentation/demonstration. 