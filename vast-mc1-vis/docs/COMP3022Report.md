# Visual Analytics for Earthquake Damage in St. Himark: A COMP3022 Report

**Group Name/Number:** `[Insert Group Name/Number]`
**Date:** 7 May 2025
**Authors:** `[Insert Author Names, e.g., Student Name 1 (ID: 123456), Student Name 2 (ID: 654321), ...]`

**GitHub Repository:** `[Insert GitHub Repository URL, e.g., https://github.com/user/repo]`
**Live Application URL:** `[Insert Live Application URL (e.g., GitHub Pages, Vercel) or N/A]`
**Key Runtime Requirements:** `Node.js (v14+ recommended), R (version 4.0+ for preprocessing), Modern Web Browser (Chrome, Firefox)`

---

**Abstract:** `[A brief (150-250 words) summary of the project, including the problem addressed, methods used, key findings, and the main contributions of your visualization tool. This should provide a concise overview of the entire report.]`

---

## Table of Contents
1.  [Introduction](#1-introduction)
2.  [Methods and Design](#2-methods-and-design)
    1.  [Problem Definition and Goals](#21-problem-definition-and-goals)
    2.  [Data Acquisition and Preprocessing](#22-data-acquisition-and-preprocessing)
    3.  [Visualisation Design Rationale](#23-visualisation-design-rationale)
    4.  [System Interface Design](#24-system-interface-design)
3.  [Tool and Implementation](#3-tool-and-implementation)
    1.  [System Architecture](#31-system-architecture)
    2.  [Visual Components and Features](#32-visual-components-and-features)
    3.  [Interactive Features](#33-interactive-features)
    4.  [Technologies, Tools, and Libraries](#34-technologies-tools-and-libraries)
4.  [Results: Answering the Analysis Tasks](#4-results-answering-the-analysis-tasks)
    1.  [Task 1: Emergency Response Prioritisation](#41-task-1-emergency-response-prioritisation)
    2.  [Task 2: Uncertainty and Reliability of Reports](#42-task-2-uncertainty-and-reliability-of-reports)
    3.  [Task 3: Changes in Conditions and Uncertainty Over Time](#43-task-3-changes-in-conditions-and-uncertainty-over-time)
5.  [Reflection and Future Work](#5-reflection-and-future-work)
    1.  [Project Reflection](#51-project-reflection)
    2.  [Limitations and Future Work](#52-limitations-and-future-work)
6.  [Conclusion](#6-conclusion)
7.  [References](#7-references)
8.  [Appendix (Optional)](#8-appendix-optional)
    1.  [Instructions to Run the Tool](#81-instructions-to-run-the-tool)
    2.  [External Libraries and Configurations](#82-external-libraries-and-configurations)
    3.  [Detailed File Structure](#83-detailed-file-structure)
    4.  [Group Member Contributions (to be submitted separately)]()

---

## 1. Introduction

This project, a term-time assessment for the COMP3022 Data Visualization module, addresses the VAST Challenge 2019 Mini-Challenge 1. The scenario involves St. Himark, a fictional city struck by a significant earthquake. Emergency responders grapple with assessing damage and allocating resources based on citizen-generated reports and seismic data. These reports, submitted via a mobile app, provide subjective damage intensity ratings (scale 0-10) for categories like Shake Intensity, Buildings, Medical Facilities, Power, Roads & Bridges, and Sewer & Water Systems. The data arrives chronologically, posing challenges related to volume, reliability (uncertainty), and identifying evolving patterns.

*   **Background:** The VAST Challenge 2019 Mini-Challenge 1 scenario: St. Himark has been hit by an earthquake. Officials initially use seismic readings but need more comprehensive information from citizen damage reports to understand the true conditions and prioritize response effectively. The city had presciently released a damage reporting mobile app, enabling citizens to provide timely updates.
    *   Cite the VAST Challenge website: [VAST Challenge 2019](https://vast-challenge.github.io/2019/)
*   **Problem Statement:** The core challenge is to develop an interactive web-based visual analytics tool. This tool must aid emergency responders in synthesizing seismic data (shake maps from April 6 and April 8) with app-based citizen damage reports and background city knowledge. The goal is to triage rescue and recovery efforts effectively by moving beyond initial shake map assessments to a more nuanced, data-driven understanding of the disaster's impact.
*   **Project Goals & Objectives:** The primary objective is to develop an interactive visualization tool that supports emergency response decision-making. This tool aims to:
    1.  **Damage Assessment (Task 1):** Enable users to quickly assess the severity and spatial distribution of damage across various infrastructure categories, thereby identifying the hardest-hit neighborhoods and prioritizing response.
    2.  **Uncertainty Visualization (Task 2):** Clearly communicate the reliability and uncertainty associated with damage assessments. This involves leveraging Bayesian statistical modeling (performed during offline R preprocessing) and applying principles like Value-Suppressing Uncertainty Palettes (VSUPs) to help users compare the reliability of reports from different neighborhoods.
    3.  **Temporal Analysis (Task 3):** Allow users to track how damage conditions and the associated uncertainty evolve over the course of the event using interactive time controls, and to describe these key changes.
    4.  **Insight Generation:** Facilitate the discovery of patterns, anomalies, and correlations within the data, such as identifying specific time periods of high uncertainty or neighborhoods with sparse reporting.
*   **Report Structure:** This report details the development and application of our visual analytics solution. Section 2 outlines the methods and design, including data preprocessing and visualization rationale. Section 3 describes the tool's implementation, architecture, and features. Section 4 presents the results, directly addressing the three analysis tasks. Section 5 reflects on the project and discusses future work. Finally, Section 6 concludes the report, followed by references and an appendix with supplementary information.

---

## 2. Methods and Design

This section details the methodologies employed for data processing, the algorithms used for analysis, and the rationale behind the design choices for the visualisation and user interface.

### 2.1 Problem Definition and Goals
*   **Recap of VAST MC1 Challenge:** St. Himark faces an earthquake disaster. Emergency services, stretched thin, rely on citizen-provided information via a new mobile app to focus recovery efforts. The challenge is to combine seismic readings, app responses, and city knowledge to help triage rescue and recovery.
*   **Specific Aims for this Project (Analysis Tasks):** Our visual analytics tool is designed to directly address the three core analysis tasks of MC1:
    *   **Task 1 (Emergency Response Prioritisation):** "Emergency responders will base their initial response on the earthquake shake map. Use visual analytics to determine how their response should change based on damage reports from citizens on the ground. How would you prioritize neighborhoods for response? Which parts of the city are hardest hit?"
    *   **Task 2 (Uncertainty and Reliability):** "Use visual analytics to show uncertainty in the data. Compare the reliability of neighborhood reports. Which neighborhoods are providing reliable reports? Provide a rationale for your response."
    *   **Task 3 (Change Over Time):** "How do conditions change over time? How does uncertainty in change over time? Describe the key changes you see."
*   **Key Analytical Questions Addressed:** Beyond the core tasks, the tool aims to help answer questions such as:
    *   Which neighborhoods consistently report the most severe damage across critical categories?
    *   How confident can we be in the damage assessment for a specific neighborhood and category at a given time?
    *   Are there specific time periods where uncertainty is particularly high or low?
    *   Which infrastructure types suffer the most widespread or severe damage?
    *   How does the situation change immediately following recorded earthquake aftershocks (if discernible from data)?
    *   Are there neighborhoods with consistently sparse reporting for certain damage types, and how is this represented?
*   **Overall Approach:** Our solution integrates multiple coordinated views built with modern web technologies (React, ECharts, Vega-Lite). It relies heavily on data pre-processed using an offline R pipeline featuring Bayesian Structural Time Series (BSTS) modeling to provide robust estimates of damage severity (Maximum A Posteriori - MAP) and quantify uncertainty (e.g., Credible Interval Range - CIR).

### 2.2 Data Acquisition and Preprocessing
*   **Data Sources:**
    *   The project utilizes the datasets provided by VAST Challenge 2019 MC1:
        *   **`mc1-reports-data.csv`**: Located in `public/data/raw/` (or source directory), this CSV file contains the raw citizen-generated damage reports. Key fields include `time` (Timestamp), `location` (Neighborhood ID 1-19), `shake_intensity`, `sewer_and_water`, `power`, `roads_and_bridges`, `medical`, `buildings` (all damage ratings 0-10, where 0=None, 5=Moderate, 10=Severe).
        *   **`StHimarkNeighborishRegions.geojson`** (or similar, e.g., `neighborhoods_geojson.json` in `public/data/`): Provides the geographical boundaries for St. Himark's 19 neighborhoods, essential for map rendering.
        *   **Shake Maps:** `shakemap-1.png` and `shakemap-2.png` (in `public/data/images/`) provide contextual seismic intensity information for April 6 and April 8, used for baseline comparison but not dynamically layered.
    *   Detailed descriptions of raw data structure and fields are available in `docs/data-description.md`.
*   **R Preprocessing Pipeline:** A critical offline R pipeline (scripts in `preprocessing/R/`) transforms raw data into analysis-ready formats suitable for efficient frontend consumption. This pipeline enhances performance and enables robust uncertainty quantification.
    *   **Rationale for Offline Preprocessing:** Performing complex statistical analysis like BSTS modeling on the fly in the browser would lead to unacceptable loading times and potentially freeze the UI. Preprocessing offers: faster load times, enables advanced analytics (BSTS), robust uncertainty quantification, and reduced client-side processing load.
    *   **Pipeline Stages (executed via `preprocessing/run_preprocessing.bat` or `.sh`, or manually):**
        1.  **Package Installation (`install_packages.R`):** Ensures R environment has necessary packages (`tidyverse`, `bsts`, `jsonlite`, `zoo`, `lubridate`, `future`, etc.).
        2.  **Initial Data Preparation (`data_preparation.R`):** Reads `mc1-reports-data.csv`, performs initial cleaning (timestamp parsing, type conversion), and transforms data into a long format (`public/data/processed/mc1-reports-data-long.csv`), suitable for time series modeling.
        3.  **BSTS Modeling (`analysis.R`):** The core analytical step. Applies Bayesian Structural Time Series modeling to each location-category pair using the `bsts` package. A key implementation detail is the **>= 5 reports rule**: BSTS models are only generated for location-category pairs with at least 5 raw reports to ensure model stability. Outputs include individual model summaries and the aggregated `public/data/processed/bsts_results/all_bsts_results.csv`, containing time series of MAP estimates, means, and 95% credible intervals (CI) for all successfully modeled pairs. Parallel processing (`future` package) is used to expedite this computationally intensive step.
        4.  **Post-Processing & Formatting (`process.R`):** Consumes `all_bsts_results.csv`. Generates a complete, regular time series (e.g., 5-minute intervals) for **all** 19 locations x 6 categories in `public/data/processed/all_summary_processed.csv`. It applies Last Observation Carried Forward (LOCF) using `zoo` for intervals between BSTS updates for modeled pairs. For pairs skipped by `analysis.R` due to insufficient data, it generates **placeholder data** (e.g., damage value 0, default uncertainty level "medium", CIR 5), explicitly handling sparsity. Finally, it creates aggregated and formatted files optimized for frontend use:
            *   `public/data/processed/all_summary_processed.csv`: Comprehensive 5-minute interval data (MAP, mean, CI, CIR, certainty_level) for all location-category pairs.
            *   `public/data/processed/all_summary_aggregated.csv`: Hourly aggregated statistics.
            *   `public/data/processed/map_data.json`: Hourly slices (latest/max state within hour) structured for efficient map rendering (`time -> category -> [location objects]`).
            *   `public/data/processed/category_summary_aggregated.json`: Overall summary statistics per category for the latest time point.
            *   Other category-specific summary files might also be generated.
    *   **Benefits:** Faster load times, robust uncertainty quantification via BSTS, consistent data structure for frontend, explicit handling of data sparsity.
*   **Key Processed Data Files & Usage (in `public/data/processed/`):**
    *   **`all_summary_processed.csv` (~106MB):** The most detailed time-series output (5-min intervals, all loc-cat pairs, MAP, mean, CI, CIR, certainty_level). Primary source for the main heatmap (`VegaChart.jsx`).
    *   **`map_data.json` (~9.6MB):** Hourly slices optimized for the `EarthquakeMap.jsx`. Contains latest/max hourly MAP (`value`), uncertainty (`CIRatMaxMAP`), CIs, etc., per location/category.
    *   **`category_summary_aggregated.json` (~1.4KB):** Aggregated stats per category (average MAP, CIR, CIs) for the latest time point. Used by the category comparison bar chart (`VegaChart.jsx`).
    *   **`all_summary_aggregated.csv` (~955KB):** Hourly aggregated statistics, potentially used for overview charts or faster views.
    *   **`neighborhood_map.json` (~1KB):** Simple mapping of neighborhood ID to name.
    *   *(Note: `frontend_data.json` and `visualization_data.json`, if present, might be older or less structured aggregates; confirm relevance against current code.)*
*   **Handling Sparsity and Uncertainty Quantification:**
    *   The R pipeline explicitly handles sparsity by generating placeholder data (0 damage, default uncertainty) for location-category pairs with < 5 reports.
    *   BSTS provides MAP estimates and CIs. These are stored in processed files (e.g., `all_summary_processed.csv`, `map_data.json`). The MAP represents the most likely value, while the CI (e.g., 95% interval) provides a range for the estimate, with the CI Range (CIR) indicating the width and thus the uncertainty.
    *   The frontend utility `src/utils/uncertaintyCalc.js` provides functions (`calculateCertaintyFromCIR`, `calculateCertaintyFromCIWidth`, `levelToCertainty`) to convert these various uncertainty metrics (CIR, CI width, predefined levels) into a consistent numeric `certainty` score (0-1), which is then used for visual encoding (e.g., map opacity).

### 2.3 Visualisation Design Rationale
*   **Guiding Principles:**
    *   The design adheres to Shneiderman's mantra: "Overview first, zoom and filter, then details-on-demand," facilitating progressive data exploration from city-wide patterns to neighborhood-specific details.
    *   Munzner's nested model for visualization design and validation guided the process of defining domain problems, abstracting tasks, designing visual encodings, and implementing algorithms.
    *   A user-centered approach targets emergency planners and responders, prioritizing clarity, intuitiveness, and actionable insights under time pressure.
    *   Inspiration was drawn from effective uncertainty visualization practices, such as Value-Suppressing Uncertainty Palettes (VSUPs) by Correll et al. (2018), to ensure that uncertainty is an integral part of the visual narrative.
*   **Choice of Visual Encodings:**
    *   **Damage Level (MAP estimate):** Encoded using color intensity on the choropleth map (e.g., sequential color schemes like Viridis or BrewerYlOrRd, where darker/more intense colors indicate higher damage) and position/height in bar charts or line charts.
    *   **Uncertainty (Credible Interval width, Certainty Score):**
        *   On the map: Encoded using opacity (higher opacity for higher certainty/narrower CI), or as part of a bivariate color scheme where color lightness might vary with uncertainty. Explicit CI ranges and derived certainty percentages are provided in tooltips.
        *   In Forecast Line Charts: Represented by shaded bands (width corresponding to CI) around the MAP estimate line.
        *   In Bar Charts/Boxplots: Error bars or the interquartile range of boxplots can indicate the spread or uncertainty of reported/modeled values.
    *   **Report Count:** Displayed in tooltips to provide context on data density for a given region/category.
    *   **Time:** Mapped to the x-axis of time series charts and interactively controlled via a timeline slider.
    *   **Categorical Data (Damage Types, Neighborhoods):** Represented using distinct color schemes (where appropriate and limited to avoid visual clutter, e.g., for different lines in a multi-series chart if not too many), spatial separation (e.g., small multiples, or distinct rows/columns in heatmaps), or as axes labels.
    *   **Map Color Palette Rationale:** `[The choice of color palette for the map aims for perceptual clarity and effectiveness. For damage severity, a sequential scheme (e.g., yellow-orange-red) is used, which is generally good for ordered data. For uncertainty, opacity is the primary visual variable: areas with higher certainty (narrower CIs, more reliable data) are more opaque, while areas with lower certainty are more transparent (value-suppressing). This ensures that users are less likely to draw strong conclusions from uncertain data. If a bivariate scheme is explored, it would combine a sequential color for damage with a lightness/saturation variation for uncertainty. Color-blind friendliness should be considered in palette selection, referring to tools like ColorBrewer.]`
*   **Rationale for Each Chart/View (and how they address analytical tasks):**
    *   **Interactive Damage Map (`EarthquakeMap.jsx`):** (Addresses Tasks 1 & 2)
        *   Provides the primary spatial overview. Choropleth encoding (color intensity) maps to damage severity, allowing rapid identification of hotspots. Uncertainty is encoded via opacity (value-suppressing). Tooltips offer detailed metrics (MAP, CI, certainty score, report count).
        *   Essential for comparing neighborhood conditions and assessing report reliability spatially.
    *   **Timeline Controls & Event Markers (`TimeControls.jsx`):** (Addresses Task 3)
        *   Enables temporal exploration. Dragging the slider or using playback controls updates all linked views, revealing how damage and uncertainty evolve.
    *   **Damage Category Comparison Chart (Bar Chart, via `VegaChart.jsx`):** (Addresses Tasks 1 & 3)
        *   Shows average damage across categories at the selected time using `category_summary_aggregated.json`. Helps identify the most impacted infrastructure types.
    *   **Neighborhoods & Categories Damage Heatmap (`VegaChart.jsx`):** (Addresses Tasks 1 & 3)
        *   Uses `all_summary_processed.csv` data. Provides a dense overview of damage (`map` value) for all location-category pairs over time. Facilitates identification of spatio-temporal patterns and correlations. Explicitly visualizes areas/times with insufficient data (shown as 0 modeled damage).
    *   **Damage Forecast Over Time Chart (`ForecastChart.jsx` or similar ECharts line chart):** (Addresses Tasks 2 & 3)
        *   Uses time-series data from `all_summary_processed.csv`. Displays historical MAP trends and crucial uncertainty information via shaded credible interval bands (CIs).
    *   **Insights Panel (`InsightsPanel.jsx`):** (Addresses Tasks 1, 2, & 3)
        *   Generates dynamic textual summaries (e.g., highest damage area, most reliable reports) based on current data state, aiding quick interpretation.
*   **Coordination and Linking:** All views are tightly coupled. Selecting a time on the timeline updates the map, bar charts, and heatmap. Clicking a neighborhood on the map filters the forecast chart and updates the statistics panel. This synchronized interaction model is crucial for integrated multi-faceted analysis, allowing users to seamlessly explore relationships between spatial, temporal, and categorical aspects of the data.

### 2.4 System Interface Design
*   **Overall Layout and Structure:** `[Describe the dashboard layout: e.g., a main map view, with temporal controls at the bottom, filter panels on a side, and supplementary charts/panels arranged logically around the map. Justify this arrangement for workflow, e.g., map as a central focus for spatial tasks, filters easily accessible, temporal context always visible.]`
    *   **Visual Justification of Layout:** `[Placeholder for Full Dashboard Screenshot/Wireframe with Annotations Explaining Layout and Navigation Flow. This visual should illustrate how a user might typically interact with the tool, moving from overview (map, timeline) to detailed views (forecast chart, stats panel) guided by filters and selections.]`
    *   Refer to `docs/component-structure.md` for a detailed breakdown of individual components if not fully covered by the visual justification.
*   **Interactivity and User Controls:** Users can interact via:
    *   **Time Navigation:** Timeline slider, play/pause/speed controls.
    *   **Category Selection:** Dropdown or radio buttons to select the primary damage category for the map and other views.
    *   **Map Interaction:** Clicking on neighborhoods to select them for detailed views (stats panel, forecast chart), zooming/panning.
    *   **Chart Interaction:** Hovering for tooltips, potentially brushing or clicking on bars/heatmap cells for cross-filtering (if implemented).
    *   **Control Panel Toggles:** Show/hide neighborhood labels, switch color schemes, open information modals.
    *   These controls empower users to tailor the views to their specific analytical questions and explore the dataset dynamically.
*   **Narrative and Storytelling (if applicable):** `[If the tool includes features for annotation, saving states, or guided tours, describe them here. Otherwise, state that the primary mode of use is exploratory data analysis driven by the user.]`

---

## 3. Tool and Implementation

This section describes the technical architecture, specific component implementations, interactive features, and the technologies used in the VAST Challenge visualization application.

### 3.1 System Architecture
*   **Overall Structure:** The application consists of two main parts: an **Offline R Preprocessing Pipeline** responsible for complex data analysis and formatting, and a **React Frontend Application** for interactive visualization.
    ```mermaid
graph TD
    A[Raw Data: mc1-reports-data.csv, GeoJSON] --> B{R Script: data_preparation.R};
    B --> C[Intermediate: mc1-reports-data-long.csv];
    C --> D{R Script: analysis.R (BSTS Modeling, >=5 rule)};
    D --> E[BSTS Models: all_bsts_results.csv];
    E --> F{R Script: process.R (LOCF, Placeholders, Aggregation)};
    F --> G[Processed Data Suite in public/data/processed/];
    
    H[React App: Initial Load via DataContext/loadAllData] --> I{Base Data Loaded in Context: GeoJSON, all_summary_processed.csv, category_summary_aggregated.json etc.};
    G --> H;
    
    J[User Interaction: Time/Category Change via UIContext] --> K{Frontend Logic: dataLoader.js (fetches map_data.json slice) or Component logic (filters all_summary_processed.csv)};
    I --> L[React Components: EarthquakeMap, VegaChart etc.];
    K --> L;
    L --> M[User Interface & Visualizations];
    J --> M;
    ```
    *   *Figure: High-Level Data Flow Diagram*
*   **Frontend Framework/Library:** Built using **React** (version `[Specify React version, e.g., 18.2.0]`), chosen for its component-based architecture, virtual DOM, and ecosystem, facilitating the creation of complex, interactive UIs.
*   **Component-Based Structure:** The UI is modularized into reusable components located in `src/components/`, categorized into `charts/` (visualizations) and `ui/` (controls, panels). `App.jsx` serves as the root component, defining the overall layout and context providers. This structure enhances maintainability and testability. See `docs/component-structure.md` for a detailed hierarchy.
*   **State Management (React Context API):**
    *   **`DataContext` (`src/context/DataContext.js`):** Manages loading, storage, and provision of primary static and pre-processed datasets (GeoJSON, parsed `all_summary_processed.csv`, `category_summary_aggregated.json`). Exposes data, loading/error states via the `useData()` hook.
    *   **`UIContext` (defined in `src/App.jsx`):** Manages UI interaction state (`currentTime`, `selectedCategory`, `selectedNeighborhood`, `colorScheme`, `activeColorSchemePalette`, `showNeighborhoodLabels`, `sidebarCollapsed`, `showInsightsPanel`, `isLoadingBsts` etc.). Exposes state and update functions via the `useUI()` hook.
    *   This separation centralizes state logic and ensures consistency across the application.
*   **Data Handling and Flow:**
    *   **Offline Preprocessing:** The R pipeline performs heavy lifting (BSTS modeling, aggregation, handling sparsity with LOCF/placeholders) and outputs optimized files to `public/data/processed/`.
    *   **Frontend Initial Load:** `DataContext` loads essential base data (GeoJSON, `category_summary_aggregated.json`) and potentially parses large files like `all_summary_processed.csv` using `papaparse` via `utils/dataLoader.js`.
    *   **Frontend Dynamic Load/Filtering:** `EarthquakeMap.jsx` dynamically fetches hourly slices from `map_data.json` via `loadAllBSTSData` (which includes caching). Other components like the heatmap (`VegaChart.jsx`) filter the in-memory `all_summary_processed.csv` data based on UI state.
    *   **Uncertainty Propagation:** Uncertainty metrics (CIs, CIR, levels) generated by R are stored in processed files and converted to visual encodings (e.g., opacity) using `utils/uncertaintyCalc.js`.
*   **Performance Optimizations:** (See also `docs/performance-optimizations.md`)
    *   **Primary Strategy: Offline Preprocessing:** As detailed in Section 2.2, shifting BSTS modeling and complex aggregation to the offline R pipeline is the most critical performance enhancement.
    *   **Efficient Frontend Data Loading:** Using `papaparse` for large CSVs, fetching optimized slices (`map_data.json`) for dynamic updates, and caching fetched data (`loadAllBSTSData`).
    *   **Charting Library Optimizations:** Disabling unnecessary animations in ECharts (`EarthquakeMap.jsx`), debouncing resize handlers, using targeted signal updates in Vega-Lite (`VegaChart.jsx`).
    *   **Build Optimizations:** Standard production build processes (minification, tree-shaking) via Create React App. Explicit removal of console logs using `babel-plugin-transform-remove-console` can further improve production performance.
    *   **React Best Practices:** Employing memoization (`React.memo`, `useMemo`, `useCallback`) where beneficial to prevent unnecessary re-renders, ensuring correct `useEffect` dependencies.
*   **Backend:** No active backend; it's a static application serving pre-built files.

### 3.2 Visual Components and Features
(Detailed implementation notes based on component-structure.md and technical-architecture.md)

*   **`App.jsx`**: Root component, sets up `DataProvider` and `UIProvider`, defines main layout (`Container`, `Row`, `Col`) rendering `FilterPanel`, `StatsPanel`, `EarthquakeMap`, `InsightsPanel`, `TimeControls`, `VegaChart`s, `ForecastChart`, `InfoButton`.
*   **Interactive Damage Map (`EarthquakeMap.jsx` in `src/components/charts/`):**
    *   **Implementation:** Uses ECharts via `echarts/core`. Initializes chart instance with GeoJSON data (from `DataContext`). `useEffect` hook fetches hourly BSTS data slices from `map_data.json` via `loadAllBSTSData` when `currentTime` or `selectedCategory` changes (managed by `UIContext`).
    *   **Data Processing:** `processNeighborhoodsData` helper function merges fetched BSTS data with GeoJSON features. It calculates `certainty` using `utils/uncertaintyCalc.js` and determines color based on damage `value` using ECharts `visualMap` and `activeColorSchemePalette` from `UIContext`.
    *   **Rendering:** Sets ECharts `option` to style features: `areaColor` maps to damage, `opacity` maps to calculated `certainty`. Handles clicks to update `selectedNeighborhood` in `UIContext`. Provides PNG export.
*   **Generic Vega/Vega-Lite Chart (`VegaChart.jsx` in `src/components/charts/`):**
    *   **Implementation:** Wrapper using `vega-embed`. Takes a `spec` object/URL and `chartType` prop.
    *   **Data Source & Logic:** For `categoryComparison`, uses `category_summary_aggregated.json` (from `DataContext`). For `fullHeatmap`, uses data derived from `all_summary_processed.csv` (from `DataContext`), potentially filtered by time/category using `useFilteredData` hook or similar. Loads specs from `public/data/specs/`. Passes UI state (`currentTime`, `selectedLocation`) as Vega signals for interactivity. Includes fallback rendering attempts.
*   **Forecast Chart (`ForecastChart.jsx` in `src/components/charts/`):**
    *   **Implementation:** ECharts line chart.
    *   **Data Source & Logic:** Uses filtered time-series data from `all_summary_processed.csv` (via `DataContext` and `UIContext` filters for neighborhood/category). Configures ECharts options to show historical MAP line and shaded CI bands.
*   **UI Controls (`src/components/ui/`):**
    *   **`FilterPanel.jsx`**: Hosts selectors (`CategorySelector.jsx`, `ColorSchemeSelector.jsx`), switches (`SwitchSlider.jsx`) updating `UIContext`.
    *   **`TimeControls.jsx`**: Manages timeline slider and playback buttons, updating `currentTime` in `UIContext`. Uses `requestAnimationFrame` for smooth animation.
    *   **`StatsPanel.jsx`**: Displays detailed metrics for the `selectedNeighborhood` (from `UIContext`), sourcing data likely by filtering `all_summary_processed.csv`.
    *   **`InsightsPanel.jsx`**: Generates textual summaries based on current data/UI state.
    *   **`InfoButton.jsx` / Modal**: Button triggering an informational modal (likely React Bootstrap).

### 3.3 Interactive Features
*   **Selection and Highlighting:** Clicking a neighborhood on the map selects it, highlighting it and updating dependent views (Stats Panel, Forecast Chart). Other interactive elements might use hover highlighting.
*   **Brushing and Linking:** All primary visual components are linked through the `UIContext` and `DataContext`. Changes in the `TimeControls.jsx` (timeline slider) update all views to reflect the selected `currentTime`. Selections in `FilterPanel.jsx` (e.g., `selectedCategory`) also propagate globally.
*   **Tooltips:** Provide rich, context-sensitive information on hover for map neighborhoods (damage, CI, certainty, report count) and potentially for elements in other charts.
*   **Filtering:** Primarily driven by the `FilterPanel.jsx` for damage category and `TimeControls.jsx` for the temporal window. These filters dynamically update the data presented in all relevant views.
*   **Zooming and Panning:** Supported by the ECharts map for spatial exploration.
*   **Animation (Time Playback):** The timeline controls allow for animated playback, enabling users to observe temporal trends dynamically across the dashboard.

### 3.4 Technologies, Tools, and Libraries
*   **Offline Data Preprocessing:**
    *   **Language:** R (version `[e.g., 4.0+]`)
    *   **Key R Packages:** `bsts` (Bayesian Structural Time Series), `tidyverse` (data manipulation suite including `dplyr`, `readr`, `lubridate`), `jsonlite` (JSON handling), `zoo` (time series utilities, LOCF), `future` ecosystem (parallel processing).
*   **Core Frontend:**
    *   **Language:** JavaScript (ES6+)
    *   **Framework/Library:** React (version `[e.g., 18.2.0]`)
    *   **State Management:** React Context API (`DataContext`, `UIContext`)
    *   **Markup/Styling:** HTML5, CSS3
*   **Visualisation Libraries:**
    *   **ECharts** (version `[e.g., ^5.4.0]`): Used for the interactive map (`EarthquakeMap.jsx`) and forecast line chart (`ForecastChart.jsx`).
    *   **Vega-Lite** (version `[e.g., ^5.5.0]`) via **Vega-Embed** (version `[e.g., ^6.20.8]`): Used for the category comparison bar chart and main data heatmap (`VegaChart.jsx`).
*   **Data Handling/Parsing (Frontend):**
    *   **PapaParse** (version `[e.g., ^5.3.2]`): For client-side CSV parsing.
    *   Native Fetch API or Axios: For loading static JSON/GeoJSON/CSV files.
*   **Styling & UI Components:**
    *   **React Bootstrap** (version `[e.g., ^2.7.0]`): For layout, modals, buttons.
    *   Custom CSS (`App.css`, potentially component-specific CSS).
*   **Development Environment & Build Tools:**
    *   Node.js (version `[e.g., v14+ or v18.x]`)
    *   npm (or yarn)
    *   Create React App (likely used as the build toolchain)
    *   Git, GitHub (Version Control)
*   **Deployment:** Static build deployable to any static hosting service.

---

## 4. Results: Answering the Analysis Tasks
(Approx. 600–800 words for the entire section. Use specific examples from your visualisations and include screenshots.)

This section presents the key findings derived from the visual analytics tool, directly addressing the three analysis tasks posed by the VAST Challenge.

### 4.1 Task 1: Emergency Response Prioritisation
*"Emergency responders will base their initial response on the earthquake shake map. Use visual analytics to determine how their response should change based on damage reports from citizens on the ground. How would you prioritize neighborhoods for response? Which parts of the city are hardest hit?"*

*   **Initial Assessment (Shake Maps):**
    *   Briefly describe what the provided shake maps (April 6, April 8) indicated in terms of affected areas.
    *   `[Optional: Placeholder for a small image of the shake map for context]`
*   **Citizen Report Insights (Post-Quake):**
    *   Using your map visualisation, identify neighborhoods that show the highest levels of reported damage across various categories.
    *   Provide specific examples: "For instance, the map view on [Date/Time after quake] clearly indicated that Neighborhood X and Neighborhood Y reported significantly higher 'Building Damage' compared to others."
    *   `[Placeholder for Screenshot: Map view showing high damage areas, with annotations pointing to key neighborhoods and damage levels.]`
*   **Discrepancies and Changes from Shake Map:**
    *   Compare the citizen-reported damage patterns with the initial shake map indications. Are there areas the shake map highlighted that received fewer citizen reports of severe damage, or vice-versa?
    *   "Our tool revealed that while the shake map suggested high impact in Area Z, citizen reports indicated more pressing issues in Area A, which had a lower shake intensity prediction. This suggests a need to re-allocate resources."
*   **Prioritization Strategy:**
    *   Based on your tool's output (e.g., map, summary tables/charts), explain how you would advise emergency planners to prioritize neighborhoods.
    *   Consider factors like severity of damage (MAP values), type of damage (e.g., medical needs, infrastructure), and potentially the volume of reports.
    *   "Neighborhoods like Safe Town and Palace Hills should be prioritized due to consistently high reported damage across multiple critical categories (e.g., medical, structural) and relatively high certainty in these reports (see Task 2)."
    *   `[Placeholder for Screenshot: Bar chart or boxplot comparing damage across neighborhoods for a key category, highlighting the worst-hit ones.]`

### 4.2 Task 2: Uncertainty and Reliability of Reports
*"Use visual analytics to show uncertainty in the data. Compare the reliability of neighborhood reports. Which neighborhoods are providing reliable reports? Provide a rationale for your response."*

*   **Visualizing Uncertainty:**
    *   Explain how your tool visually represents uncertainty (e.g., width of Confidence Intervals in line charts, saturation/opacity in VSUP-based map coloring, size of error bars in bar charts, tooltip information).
    *   "Uncertainty is visualized through 95% Credible Intervals (CIs) in the forecast line charts and as explicit certainty scores or CI ranges in map tooltips. VSUP principles may also be applied to map shading."
    *   `[Placeholder for Screenshot: Forecast line chart showing MAP and CI for a specific neighborhood/category, with annotations explaining how to interpret uncertainty.]`
    *   `[Placeholder for Screenshot: Map view with tooltips showing damage value AND uncertainty metric, or using VSUPs.]`
*   **Comparing Reliability Across Neighborhoods:**
    *   Identify neighborhoods with consistently reliable reports (narrow CIs, high certainty scores) and those with less reliable reports (wide CIs, low certainty).
    *   Provide specific examples: "Old Town, for example, consistently showed wider credible intervals and lower certainty scores for most damage categories compared to Downtown, suggesting that reports from Old Town were more varied or sparse, making assessments less reliable."
    *   Discuss potential reasons for differences in reliability (e.g., number of reports, consistency of reports, time since last report).
    *   **Comparative Table (Optional but Recommended):** Consider including a table summarizing key metrics (e.g., average damage, mean CI width, report count, derived reliability score) for 3-5 example neighborhoods to provide a concise comparison.
    *   `[Placeholder for Comparative Table of Neighborhood Reliability Metrics]`
*   **Rationale for Reliability Assessment:**
    *   Explain how users can use your tool to make these reliability judgments.
    *   "Users can compare the CI bands in the line charts side-by-side for different neighborhoods or observe the certainty encoding on the map. The boxplots also offer a visual comparison of the spread of reported values."
    *   `[Placeholder for Screenshot: Comparative view, perhaps multiple small line charts or a table/chart summarizing certainty scores across neighborhoods.]`
*   **Impact of Report Volume and Consistency:**
    *   Discuss how the volume and consistency of reports from a neighborhood affect the perceived reliability and the visualized uncertainty.

### 4.3 Task 3: Changes in Conditions and Uncertainty Over Time
*"How do conditions change over time? How does uncertainty in change over time? Describe the key changes you see."*

*   **Tracking Conditions Over Time:**
    *   Using your timeline control and time-series visualisations (line charts, heatmaps), describe how reported damage conditions evolved in St. Himark post-earthquake.
    *   Identify key periods of change (e.g., immediately after the main quake, aftershocks, periods of increased reporting).
    *   "The timeline playback feature, coupled with the forecast line chart, shows a rapid increase in reported 'Medical' needs in Downtown #6 immediately following the April 8th quake, which then stabilized after approximately 12 hours."
    *   `[Placeholder for Screenshot: Line chart showing damage trend over time for a significant category/neighborhood, with annotations on key changes.]`
*   **Tracking Uncertainty Over Time:**
    *   Describe how uncertainty (e.g., CI width) changed over time for various neighborhoods and categories.
    *   Were there periods when uncertainty was generally high or low?
    *   "Uncertainty, represented by the CI width, typically decreased shortly after spikes in reporting (e.g., post-quake) as more data became available. However, during lulls in reporting or for less frequently reported categories, uncertainty tended to increase over time." (Referencing example from Natthawut Adulyanukosol's report regarding CIs widening with fewer reports).
    *   `[Placeholder for Screenshot: Line chart showing both MAP and CI, highlighting how CI width changes over time.]`
*   **Key Temporal Patterns and Events:**
    *   Highlight any significant temporal patterns or events observed.
        *   Did certain types of damage emerge or worsen later?
        *   Were there noticeable differences in the temporal patterns between neighborhoods?
        *   How did aftershocks (if identifiable from data patterns) affect reports and uncertainty?
    *   "The heatmap view revealed a secondary wave of 'Road System' damage reports in Broadview #9 approximately 24 hours after the initial quake, possibly due to delayed assessment or effects of aftershocks."
    *   `[Placeholder for Screenshot: Heatmap showing damage categories over time for selected neighborhoods, highlighting temporal patterns.]`
*   **Relationship Between Report Volume and Uncertainty Dynamics:**
    *   Discuss the interplay between the frequency/volume of incoming reports and the observed changes in uncertainty over time.

---

## 5. Reflection and Future Work
(Approx. 400–500 words for the entire section)

### 5.1 Project Reflection
*   **What Went Well (Technical & Non-Technical):**
    *   **Technical Aspects:**
        *   Success of specific algorithms/models (e.g., "The BSTS model provided robust estimates of damage and uncertainty, aligning well with the visualisations.").
        *   Effectiveness of chosen visualisations (e.g., "The interactive map proved highly effective for spatial triage.").
        *   Performance of the application.
        *   Code modularity, reusability.
    *   **Non-Technical Aspects:**
        *   Team collaboration and communication.
        *   Project management, meeting deadlines.
        *   Problem understanding and interpretation of requirements.
        *   Learning new tools/technologies.
*   **Challenges Encountered and How They Were Addressed (Technical & Non-Technical):**
    *   **Technical Challenges:**
        *   Data integration issues (e.g., "Matching GeoJSON properties with report data locations required careful cleaning and mapping.").
        *   Complexity in implementing certain visualisations or interactions.
        *   Performance bottlenecks and how they were overcome.
        *   Aligning temporal data from different sources.
        *   "Ensuring correct time encoding and alignment across different data sources and components was a significant challenge, addressed by standardizing on UTC timestamps early in the preprocessing pipeline."
    *   **Non-Technical Challenges:**
        *   Dividing tasks among group members.
        *   Interpreting ambiguous aspects of the data or requirements.
        *   Time constraints.
*   **Key Learning Outcomes:**
    *   What were the most important things the group learned during this project regarding data visualisation, software development, and teamwork?

### 5.2 Limitations and Future Work
*   **Current Limitations of the Tool/Approach:**
    *   Identify aspects of your current visualisation or analysis that could be improved.
    *   Are there any unanswered questions or aspects of the data not fully explored?
    *   Scalability issues if data size were much larger.
    *   Usability aspects that could be refined.
*   **Proposed Future Enhancements (Visual Design & Implementation):**
    *   **New Features:**
        *   "Allow users to view individual raw reports on the map or in a linked table for drill-down analysis."
        *   "Implement multi-select functionality for neighborhoods or categories to allow for more complex comparative analysis."
        *   "Integrate map overlay layers, such as locations of critical infrastructure (hospitals, shelters) or demographic data, to provide richer context."
        *   "Add functionality for users to submit hypothetical scenarios or annotations."
    *   **Visual/Interaction Improvements:**
        *   "Enhance tooltips with more detailed statistical summaries or micro-visualisations."
        *   "Improve mobile responsiveness and accessibility (e.g., keyboard navigation, screen reader compatibility)."
        *   "Explore alternative visual encodings for uncertainty to cater to different user preferences or analytical tasks."
    *   **Analytical Enhancements:**
        *   "Incorporate more sophisticated anomaly detection algorithms."
        *   "Allow for dynamic re-calculation of models based on user-defined time windows or filters (if computationally feasible)."
    *   **Technical Improvements:**
        *   "Refactor state management for improved performance with larger datasets."
        *   "Develop a more robust backend API for data querying if the application were to scale."
*   **Justification for Proposed Enhancements:**
    *   Explain how these future additions would address current limitations or provide significant new value for emergency response planning.

---

## 6. Conclusion
(Approx. 150-250 words)

*   Summarize the project's achievements in relation to the VAST Challenge tasks.
*   Reiterate the main contributions of your visual analytics tool.
*   Briefly restate the key findings regarding damage assessment, neighborhood prioritization, and uncertainty in St. Himark.
*   Offer a final thought on the importance of visual analytics in emergency management.

---

## 7. References

*   List all academic papers, websites, tools, and other resources cited in your report. Use a consistent citation style (e.g., APA, IEEE).
*   **Examples (to be formatted consistently):**
    *   Adulyanukosol, N. (2019). *Earthquake Damage Report Interactive Dashboard using Bayesian Structural Time Series and Value-Suppressing Uncertainty Palettes*. VAST Challenge 2019 Mini-Challenge 1 Entry. Retrieved from [https://visualdata.wustl.edu/varepository/VAST%20Challenge%202019/challenges/Mini-Challenge%201/entries/Institute%20for%20the%20Promotion%20of%20Teaching%20Science%20and%20Technology/](https://visualdata.wustl.edu/varepository/VAST%20Challenge%202019/challenges/Mini-Challenge%201/entries/Institute%20for%20the%20Promotion%20of%20Teaching%20Science%20and%20Technology/)
    *   Correll, M., Moritz, D., & Heer, J. (2018). Value-Suppressing Uncertainty Palettes. *Proceedings of the 2018 CHI Conference on Human Factors in Computing Systems - CHI '18*, 1–11. doi:10.1145/3173574.3174216
    *   Naeem, U., et al. (User: na399) VAST-Challenge-2019-MC1 GitHub Repository. `[Insert actual link if available, e.g., https://github.com/na399/VAST-Challenge-2019-MC1 - Note: The README only mentions inspiration, check if you directly used/adapted code to cite specifically]`
    *   Munzner, T. (2009). A Nested Process Model for Visualization Design and Validation. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 921–928. doi:10.1109/TVCG.2009.111
    *   Munzner, T. (2014). *Visualization Analysis & Design*. CRC Press.
    *   Satyanarayan, A., Russell, R., Hoffswell, J., & Heer, J. (2016). Reactive Vega: A Streaming Dataflow Architecture for Declarative Interactive Visualization. *IEEE Transactions on Visualization and Computer Graphics*, 22(1), 659–668. doi:10.1109/TVCG.2015.2467091
    *   Scott, S. L., & Varian, H. R. (2013). Predicting the Present with Bayesian Structural Time Series. *SSRN Electronic Journal*, 1–21. doi:10.2139/ssrn.2304426
    *   Shneiderman, B. (1996). The eyes have it: a task by data type taxonomy for information visualizations. *Proceedings 1996 IEEE Symposium on Visual Languages*, 336–343. doi:10.1109/VL.1996.545307
    *   VAST Challenge 2019. (n.d.). Retrieved from [https://vast-challenge.github.io/2019/](https://vast-challenge.github.io/2019/)
    *   `[Add official documentation links for React, ECharts, Vega-Lite, R, bsts package, etc.]`

---

## 8. Appendix (Optional)

This section includes supplementary materials that are helpful for understanding, running, or evaluating the project but are too detailed for the main body of the report.

### 8.1 Instructions to Run the Tool
*   **Prerequisites:**
    *   Node.js (version as specified in `Key Runtime Requirements`, e.g., v14+ or v18.x recommended).
    *   npm (comes with Node.js) or yarn (optional alternative package manager).
    *   R (version `[e.g., 4.0+]` recommended) for executing the data preprocessing pipeline.
    *   A modern web browser (e.g., Chrome, Firefox, Edge - latest versions).
*   **Data Preprocessing (Crucial First Step - R Pipeline):**
    *   The frontend application **depends entirely** on data files generated by an offline R preprocessing pipeline. These scripts must be run before the frontend can display meaningful data.
    *   **Why R Pipeline?** It uses advanced Bayesian statistics (BSTS) for high-quality uncertainty quantification, handles data sparsity robustly, and performs heavy computations offline for better frontend performance (see `preprocessing/README.md`).
    1.  Ensure R and required R packages (see Section 8.2 or `preprocessing/README.md`, e.g., `bsts`, `tidyverse`, `jsonlite`, `zoo`, `lubridate`, `future`) are installed. The `preprocessing/R/install_packages.R` script can assist.
    2.  Navigate to the `vast-mc1-vis/preprocessing/` directory in your terminal.
    3.  Execute the main R preprocessing scripts **in order**: `data_preparation.R`, then `analysis.R` (BSTS modeling - **can take significant time**), followed by `process.R`. Use the provided batch (`run_preprocessing.bat`) or shell (`run_preprocessing.sh`) scripts for automation, or run manually via R/RStudio (e.g., `source("preprocessing/R/script_name.R")` from the project root).
    4.  Verify that the output files (e.g., `all_summary_processed.csv`, `map_data.json`, `category_summary_aggregated.json`) are successfully generated in the `vast-mc1-vis/public/data/processed/` directory.
*   **Frontend Application Installation & Setup:**
    1.  Clone the repository: `git clone [Your GitHub Repository URL]` (if not already done).
    2.  Navigate to the project's root frontend directory: `cd vast-mc1-vis`.
    3.  Install dependencies: `npm install` (or `yarn install`).
    4.  (Optional, if your project has a specific optimization script) Run performance optimizations: `npm run optimize`.
*   **Running the Development Server:**
    *   Start the development server: `npm start` (or `yarn start`).
    *   The application will typically be available at `http://localhost:3000` (or another port if specified by Create React App).
*   **Building for Production Deployment:**
    1.  Ensure R preprocessing is complete and `public/data/processed/` is populated.
    2.  Run the build command: `npm run build` (or `npm run build:optimized` if such a script exists).
    3.  This command bundles the React application and its assets into the `build/` directory. The contents of `public/` (including `public/data/processed/`) are automatically copied into the `build/` directory.
    4.  The **entire contents of the `build/` directory** should be deployed to your static hosting service (e.g., GitHub Pages, Netlify, Vercel).
*   Refer to your project's root `README.md`, `docs/deployment-guide.md`, and `preprocessing/README.md` for more comprehensive instructions and troubleshooting.

### 8.2 External Libraries and Configurations
*   **Key Frontend Libraries (and approximate versions from `package.json`):**
    *   `react`: `[e.g., ^18.2.0]`
    *   `react-dom`: `[e.g., ^18.2.0]`
    *   `echarts`: `[e.g., ^5.4.0]`
    *   `echarts-for-react`: `[e.g., ^3.0.2]` (confirm if used)
    *   `vega-embed`: `[e.g., ^6.20.8]`
    *   `vega-lite`: `[e.g., ^5.5.0]`
    *   `react-bootstrap`: `[e.g., ^2.7.0]`
    *   `papaparse`: `[e.g., ^5.3.2]`
    *   `axios`: `[e.g., ^1.0.0]` (confirm if used)
    *   `[List others: date-fns, lodash, classnames, etc.]`
*   **Key R Packages for Preprocessing (check `preprocessing/R/install_packages.R` or `sessionInfo()`):**
    *   `bsts`
    *   `tidyverse`
    *   `jsonlite`
    *   `zoo`
    *   `lubridate`
    *   `future`, `future.apply`, `doFuture` (or other parallel backend)
    *   `[List any other critical R packages]`
*   **Configuration Files:**
    *   **Frontend:** Vega-Lite JSON specifications in `public/data/specs/` (`category-comparison-spec.json`, `heatmap-all-neighborhoods-spec.json`). Build-time configurations potentially via `.env` files managed by Create React App (e.g., `PUBLIC_URL`).
    *   **R Preprocessing:** Parameters might be set within the R scripts (`analysis.R`, `process.R`) or potentially loaded from a separate config file if implemented.

### 8.3 Detailed File Structure (Condensed Overview)
*   `vast-mc1-vis/`: Root directory.
    *   `build/`: Production build output.
    *   `docs/`: Project documentation (Markdown files, images).
    *   `node_modules/`: (Not submitted) npm dependencies.
    *   `preprocessing/`: R scripts and related files for offline data processing.
        *   `R/`: Contains `.R` script files.
    *   `public/`: Static assets.
        *   `data/`: Contains raw input data, GeoJSON, processed data outputs from R (in `processed/`), and Vega specs (in `specs/`).
    *   `src/`: React application source code.
        *   `App.jsx`: Main component, layout, UI context.
        *   `components/`: Reusable chart (`charts/`) and UI (`ui/`) components.
        *   `context/`: React context providers (`DataContext.js`).
        *   `hooks/`: Custom React hooks.
        *   `utils/`: Utility functions (`dataLoader.js`, `uncertaintyCalc.js`, etc.).
        *   `index.js`, `App.css`, `index.css`: Entry point and global styles.

### 8.4 Group Member Contributions
*   **Note:** "As per module guidelines, individual contributions will be rated separately via the Moodle system. This section is a placeholder to acknowledge that requirement."
*   (Optional: A brief, high-level summary of primary responsibilities if desired by the group, but the formal rating is external).
