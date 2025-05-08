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
*   **Recap of VAST MC1 Challenge:** St. Himark faces an earthquake disaster. Emergency services, stretched thin, rely on citizen-provided information via a new mobile app to focus recovery efforts. The challenge requires combining seismic readings, app responses, and city knowledge to effectively triage rescue and recovery efforts, enhancing situational awareness beyond initial seismic assessments.
*   **Specific Aims for this Project (Analysis Tasks):** Our visual analytics tool is designed to directly address the three core analysis tasks of MC1, providing actionable insights for emergency planners:
    *   **Task 1 (Emergency Response Prioritisation):** Use visual analytics to compare initial shake map assessments with evolving citizen reports, enabling data-driven prioritization of neighborhoods for response and identification of the hardest-hit areas.
    *   **Task 2 (Uncertainty and Reliability):** Employ visual analytics to explicitly represent data uncertainty derived from statistical modeling. Compare the reliability of reports across different neighborhoods, providing a rationale based on data volume, consistency, and model outputs (e.g., Credible Interval width).
    *   **Task 3 (Change Over Time):** Visualize how damage conditions and associated uncertainty levels change over time, allowing responders to track the disaster's evolution and identify critical temporal patterns.
*   **Key Analytical Questions Addressed:** Beyond the core tasks, the tool facilitates exploration of related questions crucial for effective emergency management:
    *   Which neighborhoods consistently report the most severe damage across critical categories?
    *   How confident can we be in the damage assessment for a specific neighborhood and category at a given time?
    *   Are there specific time periods where uncertainty is particularly high or low?
    *   Which infrastructure types suffer the most widespread or severe damage?
    *   How does the situation change immediately following recorded earthquake aftershocks (if discernible from data)?
    *   Are there neighborhoods with consistently sparse reporting for certain damage types, and how is this represented?
*   **Overall Approach:** Our solution employs a unified, interactive web-based dashboard built with React, integrating multiple coordinated views (map, heatmap, time-series charts, comparison charts). A cornerstone of our methodology is the reliance on sophisticated data pre-processing conducted offline using an R pipeline. This pipeline features Bayesian Structural Time Series (BSTS) modeling to provide robust estimates of damage severity (Maximum A Posteriori - MAP) and rigorously quantify associated uncertainty (e.g., using Credible Intervals - CIs and Credible Interval Range - CIR), addressing the complexity and inherent uncertainty of citizen-reported data.

### 2.2 Data Acquisition and Preprocessing
*   **Data Sources:**
    *   The project utilizes the official datasets provided by VAST Challenge 2019 MC1:
        *   **`mc1-reports-data.csv`**: Located in `public/data/raw/` (or source directory), this CSV file contains the raw citizen-generated damage reports. Key fields include `time` (Timestamp), `location` (Neighborhood ID 1-19), `shake_intensity`, `sewer_and_water`, `power`, `roads_and_bridges`, `medical`, `buildings` (all damage ratings 0-10, where 0=None, 5=Moderate, 10=Severe).
        *   **`StHimarkNeighborishRegions.geojson`** (or similar, e.g., `neighborhoods_geojson.json` in `public/data/`): Provides the geographical boundaries for St. Himark's 19 neighborhoods, essential for map rendering.
        *   **Shake Maps:** `shakemap-1.png` and `shakemap-2.png` (in `public/data/images/`) provide contextual seismic intensity information for April 6 and April 8, used for baseline comparison but not dynamically layered.
    *   Detailed descriptions of raw data structure and fields are available in `docs/data-description.md`.
*   **R Preprocessing Pipeline:** A critical offline R pipeline (scripts located in `preprocessing/R/`) is implemented to transform raw, often noisy, time-stamped report data into an analysis-ready format optimized for efficient frontend consumption. This approach is fundamental to the project's success, enhancing performance and enabling sophisticated uncertainty quantification.
    *   **Rationale for Offline Preprocessing:** Performing complex statistical modeling like BSTS analysis within the browser during user interaction is computationally infeasible, leading to unacceptable latency. Our offline approach provides significant advantages:
        *   **Performance:** Shifts heavy computations (BSTS modeling, large-scale aggregation) offline, resulting in a responsive frontend experience.
        *   **Sophistication:** Enables the use of advanced time-series models (BSTS) capable of handling potential structural breaks (earthquake events) and quantifying uncertainty in a principled Bayesian manner.
        *   **Robustness:** Generates a consistent, complete data structure for the frontend, explicitly handling data sparsity and ensuring all location-category pairs are represented.
        *   **Uncertainty Quantification:** Allows for rigorous calculation of credible intervals, providing a more reliable measure of uncertainty than simple variance calculations on potentially sparse raw data.
    *   **Pipeline Stages (executed via `preprocessing/run_preprocessing.bat` or `.sh`, or manually):**
        1.  **Package Installation (`install_packages.R`):** Ensures R environment has necessary packages (`tidyverse`, `bsts`, `jsonlite`, `zoo`, `lubridate`, `future`, etc.).
        2.  **Initial Data Preparation (`data_preparation.R`):** Reads `mc1-reports-data.csv`, performs initial cleaning (timestamp parsing, type conversion), and transforms data into a long format (`public/data/processed/mc1-reports-data-long.csv`), suitable for time series modeling.
        3.  **BSTS Modeling (`analysis.R`):** The core analytical step, demonstrating sophistication in handling time-series uncertainty. Applies BSTS modeling using the `bsts` R package to estimate latent damage states and quantify uncertainty for each location-category pair. Implements a **>= 5 reports rule** for model stability: pairs with fewer reports are deliberately excluded from *direct* modeling, addressing data sparsity robustly. Outputs include detailed model summaries and the aggregated `public/data/processed/bsts_results/all_bsts_results.csv`, containing MAP estimates, means, and 95% CIs.
        4.  **Post-Processing & Formatting (`process.R`):** Consumes `all_bsts_results.csv`. Generates a complete, regular time series (5-minute intervals) for **all** location-category pairs in `public/data/processed/all_summary_processed.csv`. Applies **Last Observation Carried Forward (LOCF)** using `zoo` for intervals between BSTS updates, propagating the last known *modeled* state. For pairs skipped by `analysis.R`, it generates explicit **placeholder data** (0 damage, default uncertainty), ensuring structural completeness and preventing misinterpretation of missing data. Creates aggregated and formatted files optimized for specific frontend components (e.g., `map_data.json`, `category_summary_aggregated.json`).
    *   **Benefits Summary:** Enhanced performance, sophisticated analysis via BSTS, robust uncertainty quantification, and explicit handling of data sparsity.
*   **Key Processed Data Files & Usage (in `public/data/processed/`):**
    *   **`all_summary_processed.csv` (~106MB):** The most detailed time-series output (5-min intervals, all loc-cat pairs, MAP, mean, CI, CIR, certainty_level). Primary source for the main heatmap (`VegaChart.jsx`).
    *   **`map_data.json` (~9.6MB):** Hourly slices optimized for the `EarthquakeMap.jsx`. Contains latest/max hourly MAP (`value`), uncertainty (`CIRatMaxMAP`), CIs, etc., per location/category.
    *   **`category_summary_aggregated.json` (~1.4KB):** Aggregated stats per category (average MAP, CIR, CIs) for the latest time point. Used by the category comparison bar chart (`VegaChart.jsx`).
    *   **`all_summary_aggregated.csv` (~955KB):** Hourly aggregated statistics, potentially used for overview charts or faster views.
    *   **`neighborhood_map.json` (~1KB):** Simple mapping of neighborhood ID to name.
    *   *(Note: `frontend_data.json` and `visualization_data.json`, if present, might be older or less structured aggregates; confirm relevance against current code.)*
*   **Handling Sparsity and Uncertainty Quantification:**
    *   The R pipeline's explicit handling of sparsity (< 5 reports results in placeholder data with 0 damage and default uncertainty) ensures the frontend receives a complete dataset, preventing errors and clearly distinguishing between low damage and lack of reliable data.
    *   BSTS modeling provides principled uncertainty estimates (MAP, CIs, CIR). These metrics are stored in the processed files.
    *   The frontend utility `src/utils/uncertaintyCalc.js` standardizes these various metrics into a consistent numeric `certainty` score (0-1) for effective visual encoding, particularly for map opacity, directly supporting **Task 2**.

### 2.3 Visualisation Design Rationale
*   **Guiding Principles:**
    *   Adherence to Shneiderman's mantra ("Overview first, zoom and filter, then details-on-demand") supports a multi-scale analytical workflow appropriate for situational awareness tasks.
    *   Application of Munzner's nested model ensures a systematic approach, linking domain problems (emergency response) to data/task abstractions, visual encodings, and algorithms (R preprocessing, frontend rendering).
    *   A user-centered approach targets emergency planners, prioritizing clarity, intuitiveness, and the ability to derive actionable insights quickly.
    *   Incorporation of uncertainty visualization best practices (inspired by VSUPs, Correll et al., 2018) makes uncertainty a primary visual element, not an afterthought, crucial for reliable decision-making (**Task 2**).
*   **Choice of Visual Encodings:** (Justification links encoding to data characteristics and tasks)
    *   **Damage Level (MAP estimate):** Encoded using **color intensity** (sequential scheme) on the map and **position/height** on charts. These are standard and effective encodings for quantitative data, allowing easy comparison of severity (**Task 1**).
    *   **Uncertainty (Derived Certainty Score):** Encoded primarily using **opacity** on the map (higher opacity = higher certainty). This follows the value-suppressing principle, de-emphasizing areas with less reliable data. Shaded **area width** (CI bands) in time-series charts provides a direct visual representation of the uncertainty range over time (**Task 2**, **Task 3**). Numerical details (CI range, certainty %) are available in tooltips for precision.
    *   **Report Count:** Displayed in tooltips to provide context on data density for a given region/category.
    *   **Time:** Mapped to the x-axis of time series charts and interactively controlled via a timeline slider.
    *   **Categorical Data (Damage Types, Neighborhoods):** Represented using distinct color schemes (where appropriate and limited to avoid visual clutter, e.g., for different lines in a multi-series chart if not too many), spatial separation (e.g., small multiples, or distinct rows/columns in heatmaps), or as axes labels.
    *   **Map Color Palette Rationale:** `[The choice of color palette for the map aims for perceptual clarity and effectiveness. For damage severity, a sequential scheme (e.g., yellow-orange-red) is used, which is generally good for ordered data. For uncertainty, opacity is the primary visual variable: areas with higher certainty (narrower CIs, more reliable data) are more opaque, while areas with lower certainty are more transparent (value-suppressing). This ensures that users are less likely to draw strong conclusions from uncertain data. If a bivariate scheme is explored, it would combine a sequential color for damage with a lightness/saturation variation for uncertainty. Color-blind friendliness should be considered in palette selection, referring to tools like ColorBrewer.]`
*   **Rationale for Each Chart/View (Justification links view to specific analysis tasks and data characteristics):**
    *   **Interactive Damage Map (`EarthquakeMap.jsx`):** Addresses **Task 1** (spatial overview, hotspots) & **Task 2** (spatial reliability comparison). The choropleth design is standard for geo-spatial aggregation. Coupling color intensity (damage) with opacity (certainty) allows simultaneous assessment of severity and reliability.
    *   **Timeline Controls & Event Markers (`TimeControls.jsx`):** Essential for **Task 3** (temporal analysis). Allows direct manipulation and animation to observe dynamic changes across all linked views.
    *   **Damage Category Comparison Chart (Bar Chart, via `VegaChart.jsx`):** Addresses **Task 1** (identifying critical infrastructure types) & **Task 3** (tracking profile changes). Bar charts are effective for comparing discrete categories.
    *   **Neighborhoods & Categories Damage Heatmap (`VegaChart.jsx`):** Addresses **Task 1** & **Task 3**. Provides a dense, comprehensive overview suitable for identifying complex spatio-temporal patterns and correlations across all neighborhoods and categories simultaneously. Explicitly shows gaps where data was insufficient for modeling.
    *   **Damage Forecast Over Time Chart (`ForecastChart.jsx`):** Addresses **Task 2** (understanding uncertainty magnitude) & **Task 3** (tracking temporal trends of damage and uncertainty). Line charts are standard for time-series data; shaded CI bands directly visualize uncertainty magnitude over time.
    *   **Insights Panel (`InsightsPanel.jsx`):** Addresses **Tasks 1, 2, & 3**. Provides high-level textual summaries synthesizing information from multiple views, aiding rapid situational assessment.
*   **Coordination and Linking:** Linked interactions (time slider updates all views, map click filters details) are crucial for exploring the multi-dimensional dataset effectively. This allows users to investigate relationships (e.g., how does high damage in one category on the map relate to temporal trends or other categories in that area?).

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

This section describes the technical architecture, specific component implementations, interactive features, and the technologies used in the VAST Challenge visualization application, highlighting aspects relevant to implementation complexity, robustness, and responsiveness.

### 3.1 System Architecture
*   **Overall Structure:** The application follows a two-part architecture: a sophisticated **Offline R Preprocessing Pipeline** and an interactive **React Frontend Application**. This separation is key to the system's robustness and performance, handling complex analysis offline.
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
    *   *Figure: High-Level Data Flow Diagram illustrating the separation of offline R processing and frontend data consumption.*
*   **Frontend Framework/Library:** Built using **React** (version `[Specify React version, e.g., 18.2.0]`). Its component-based model facilitates modular design, essential for managing the complexity of a multi-view dashboard. The virtual DOM contributes to interaction responsiveness.
*   **Component-Based Structure:** The UI is modularized into reusable components (located in `src/components/`, categorized into `charts/` and `ui/`), promoting maintainability, testability, and separation of concerns. `App.jsx` serves as the root, defining layout and context providers. (Detailed hierarchy in `docs/component-structure.md`). This structure supports manageable implementation complexity.
*   **State Management (React Context API):**
    *   Utilizes React Context API for global state management, minimizing prop drilling.
    *   **`DataContext` (`src/context/DataContext.js`):** Manages the loading and provision of large, pre-processed datasets, crucial for application robustness against data loading issues. Exposes data and loading states via `useData()`.
    *   **`UIContext` (defined in `src/App.jsx`):** Manages interactive UI state variables (`currentTime`, `selectedCategory`, etc.), enabling coordinated updates across views. Exposed via `useUI()`.
*   **Data Handling and Flow:** Demonstrates a robust strategy for handling large, complex data:
    *   **Offline Preprocessing:** As detailed in Section 2.2, this is the foundation for performance and analytical sophistication.
    *   **Frontend Initial Load:** Efficient loading of essential base data and parsing of large CSVs (`all_summary_processed.csv`) using `papaparse`.
    *   **Frontend Dynamic Load/Filtering:** Optimized data fetching for the map (`loadAllBSTSData` using `map_data.json` slices with caching) ensures map responsiveness during time navigation. Other views filter the larger in-memory dataset.
    *   **Uncertainty Propagation:** Metrics generated by R are consistently processed by `utils/uncertaintyCalc.js` for reliable visual encoding.
*   **Performance Optimizations:** (Details in `docs/performance-optimizations.md`)
    *   **Primary Strategy:** Offline R preprocessing is key for responsiveness and allows sophisticated analysis (BSTS).
    *   **Frontend Strategies:** Efficient data loading/slicing/caching (`dataLoader.js`), optimized chart rendering (ECharts/Vega-Embed settings), build optimizations (minification, console removal), and standard React performance practices (memoization).
*   **Backend:** No active backend required post-preprocessing, simplifying deployment and enhancing robustness (fewer points of failure). Application serves static files.

### 3.2 Visual Components and Features
(Detailed implementation notes highlighting complexity, features, and novelty where applicable.)

*   **`App.jsx`**: Orchestrates the main application layout using React Bootstrap (`Container`, `Row`, `Col`), providing a responsive structure. Defines and provides the crucial `UIContext`.
*   **Interactive Damage Map (`EarthquakeMap.jsx` in `src/components/charts/`):**
    *   **Implementation:** Sophisticated use of ECharts library, requiring registration of GeoJSON and dynamic updates based on multiple state variables (`currentTime`, `selectedCategory`, `activeColorSchemePalette`).
    *   **Data Processing:** Involves non-trivial frontend logic (`processNeighborhoodsData`) to merge dynamic BSTS data slices with static GeoJSON features and apply uncertainty calculations (`utils/uncertaintyCalc.js`) before rendering. Includes error handling and guards against rendering with stale data.
    *   **Novelty/Sophistication:** Dynamically encodes both damage (color) and uncertainty (opacity) on the map, providing a nuanced view aligned with VSUP principles. Handles dynamic data loading and caching for responsiveness.
*   **Generic Vega/Vega-Lite Chart (`VegaChart.jsx` in `src/components/charts/`):**
    *   **Implementation:** Acts as a flexible wrapper for `vega-embed`, loading external Vega-Lite specifications (`.json` files from `public/data/specs/`).
    *   **Complexity:** Manages passing React state (e.g., `currentTime`) as Vega signals for interactivity and includes fallback rendering logic for robustness.
    *   **Usage:** Renders the Category Comparison bar chart (using `category_summary_aggregated.json`) and the comprehensive Heatmap (using data derived from `all_summary_processed.csv`).
*   **Forecast Chart (`ForecastChart.jsx` in `src/components/charts/`):**
    *   **Implementation:** ECharts line chart specifically configured to display time-series trends with uncertainty.
    *   **Complexity:** Requires processing time-series data to display historical MAP estimates alongside shaded credible interval bands, directly visualizing model outputs.
*   **UI Controls (`src/components/ui/`):**
    *   Standard controls (`FilterPanel.jsx`, `TimeControls.jsx`, `StatsPanel.jsx`, `InsightsPanel.jsx`, `InfoButton.jsx`/Modal) implemented using React functional components and hooks, interacting with the `UIContext` to provide a cohesive user experience. `TimeControls.jsx` uses `requestAnimationFrame` for smooth animation, contributing to interaction responsiveness.

### 3.3 Interactive Features
(Highlighting features contributing to usability and analytical power)
*   **Selection and Highlighting:** Map click selects a neighborhood, updating Stats Panel and potentially Forecast Chart (Details-on-demand).
*   **Brushing and Linking:** All views are coordinated via shared context. Time slider updates are globally reflected, enabling seamless temporal exploration (**Responsiveness**).
*   **Tooltips:** Provide rich metrics on hover (map, potentially other charts), minimizing visual clutter while offering detail.
*   **Filtering:** Category selection (`FilterPanel.jsx`) and time selection (`TimeControls.jsx`) allow users to focus the analysis effectively.
*   **Zooming and Panning:** ECharts map supports standard zoom/pan for spatial detail exploration.
*   **Animation (Time Playback):** Facilitates observing temporal patterns across all linked views simultaneously.
*   **Map Export:** Allows users to save the current map view as a PNG.

### 3.4 Technologies, Tools, and Libraries
(Justification emphasizes suitability for the task)
*   **Offline Data Preprocessing:**
    *   **Language:** R (version `[e.g., 4.0+]`) - Chosen for its strong statistical capabilities, particularly packages for time series analysis.
    *   **Key R Packages:** `bsts` (Sophisticated Bayesian time series modeling), `tidyverse` (Efficient data manipulation), `jsonlite` (Output formatting), `zoo` (Time series utilities like LOCF), `future` ecosystem (Performance via parallel processing).
*   **Core Frontend:**
    *   **Language:** JavaScript (ES6+)
    *   **Framework/Library:** React (version `[e.g., 18.2.0]`) - Component model ideal for complex dashboards, large ecosystem, performance features.
    *   **State Management:** React Context API - Suitable for managing global state in medium-sized applications without external libraries.
    *   **Markup/Styling:** HTML5, CSS3
*   **Visualisation Libraries:**
    *   **ECharts** (version `[e.g., ^5.4.0]`): Selected for its excellent GeoJSON map support, feature richness (tooltips, export, `visualMap`), and performance. Used for the core map and forecast chart.
    *   **Vega-Lite** (version `[e.g., ^5.5.0]`) via **Vega-Embed** (version `[e.g., ^6.20.8]`): Chosen for its declarative grammar, allowing rapid specification of standard statistical charts (heatmap, bar chart) via JSON specs.
*   **Data Handling/Parsing (Frontend):**
    *   **PapaParse** (version `[e.g., ^5.3.2]`): Efficient client-side CSV parser.
    *   Native Fetch API or Axios: Standard for asynchronous data loading.
*   **Styling & UI Components:**
    *   **React Bootstrap** (version `[e.g., ^2.7.0]`): Provides layout and common UI components, accelerating development and ensuring responsiveness.
    *   Custom CSS (`App.css`, etc.): For specific styling needs.
*   **Development Environment & Build Tools:**
    *   Node.js (version `[e.g., v14+ or v18.x]`)
    *   npm (or yarn)
    *   Create React App (Provides a robust build toolchain: Babel, Webpack, Jest).
    *   Git, GitHub (Version Control).
*   **Deployment:** Static build output deployable to any standard static host, ensuring simplicity and robustness.

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
(Ensuring clarity and completeness for reproducibility)
*   **Prerequisites:**
    *   Node.js (version as specified in `Key Runtime Requirements`, e.g., v14+ or v18.x recommended).
    *   npm (comes with Node.js) or yarn (optional alternative package manager).
    *   R (version `[e.g., 4.0+]` recommended) and required R packages (see Section 8.2).
    *   A modern web browser (e.g., Chrome, Firefox, Edge).
*   **Data Preprocessing (Crucial First Step - R Pipeline):**
    *   **Mandatory:** The React frontend application **cannot function without the data files generated by this offline pipeline**. The sophisticated analysis (BSTS) and data structuring happen here.
    *   **Steps (MUST be run sequentially):**
        1.  **Install R Packages (Run Once):** Navigate to `vast-mc1-vis/preprocessing/` in your R environment/console. Run `source("R/install_packages.R")` to ensure `bsts`, `tidyverse`, `jsonlite`, `zoo`, `lubridate`, `future`, etc., are installed.
        2.  **Execute Pipeline Scripts:** From the `vast-mc1-vis/` project root directory (or ensuring paths within scripts are correct relative to execution location), run the R scripts **in the following specific order**: 
            *   **1st:** `Rscript preprocessing/R/data_preparation.R`
            *   **2nd:** `Rscript preprocessing/R/analysis.R` (Note: This performs BSTS modeling and can take considerable time, potentially hours depending on system resources, even with parallel processing.)
            *   **3rd:** `Rscript preprocessing/R/process.R`
        *Alternatively, use the provided automation scripts which attempt to run these in order:* `preprocessing/run_preprocessing.bat` (Windows) or `bash preprocessing/run_preprocessing.sh` (macOS/Linux) from the project root.
        3.  **Verify Output:** Check that files like `all_summary_processed.csv`, `map_data.json`, `category_summary_aggregated.json` exist in `vast-mc1-vis/public/data/processed/`. If these files are missing or incomplete, the frontend application will not load data correctly.
*   **Frontend Application Installation & Setup:**
    1.  Navigate to the project's root frontend directory: `cd vast-mc1-vis`.
    2.  Install JavaScript dependencies: `npm install` (or `yarn install`).
*   **Running the Development Server:**
    *   Ensure R preprocessing is complete and output files exist.
    *   From the `vast-mc1-vis` directory, run: `npm start` (or `yarn start`).
    *   Open the application in your browser, typically at `http://localhost:3000`.
*   **Building for Production Deployment:**
    1.  Ensure R preprocessing is complete and `public/data/processed/` is populated.
    2.  From the `vast-mc1-vis` directory, run: `npm run build`.
    3.  This creates the `build/` directory containing all necessary static files (HTML, CSS, JS, and the crucial `data/processed/` contents).
    4.  Deploy the **entire contents of the `build/` directory** to a static web hosting service.
*   Refer also to `docs/deployment-guide.md` and `preprocessing/README.md` for troubleshooting.

### 8.2 External Libraries and Configurations
*   **Key Frontend Libraries (check `package.json` for exact versions used):**
    *   `react`, `react-dom`: `[e.g., ^18.2.0]`
    *   `echarts`: `[e.g., ^5.4.0]`
    *   `echarts-for-react`: `[e.g., ^3.0.2]` (confirm if used)
    *   `vega-embed`: `[e.g., ^6.20.8]`
    *   `vega-lite`: `[e.g., ^5.5.0]`
    *   `react-bootstrap`: `[e.g., ^2.7.0]`
    *   `papaparse`: `[e.g., ^5.3.2]`
    *   `[List others: axios, date-fns, lodash, classnames, etc., with versions]`
*   **Key R Packages for Preprocessing (check `preprocessing/R/install_packages.R` or `sessionInfo()` for versions):**
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
(Provides context for code repository structure)
*   `vast-mc1-vis/`: Root directory.
    *   `build/`: Production build output (Generated by `npm run build`).
    *   `docs/`: Project documentation (Markdown files, images).
    *   `node_modules/`: (Not submitted) npm dependencies.
    *   `preprocessing/`: R scripts (`R/`), automation scripts (`.bat`, `.sh`), and README for the offline data processing pipeline.
    *   `public/`: Static assets served directly.
        *   `data/`: Contains raw input data (`raw/` subdir recommended), GeoJSON, processed data outputs from R (in `processed/` - **essential for app function**), and Vega specs (in `specs/`).
        *   `index.html`, icons, manifest, etc.
    *   `src/`: React application source code.
        *   `App.jsx`: Main component, layout, UI context provider.
        *   `components/`: Reusable React components (`charts/`, `ui/`).
        *   `context/`: `DataContext.js`.
        *   `hooks/`: Custom React hooks (if any, e.g., `useFilteredData`).
        *   `utils/`: JS utility functions (`dataLoader.js`, `uncertaintyCalc.js`, etc.).
        *   `index.js`: Application entry point.
        *   `*.css`: Stylesheets.
    *   `package.json`, `package-lock.json`: Frontend dependencies and scripts.
    *   `.gitignore`, `.babelrc`, `.eslintrc.js`: Configuration files.

### 8.4 Group Member Contributions
*   **Note:** "As per module guidelines, individual contributions will be rated separately via the Moodle system. This section is a placeholder to acknowledge that requirement."
*   (Optional: A brief, high-level summary of primary responsibilities if desired by the group, but the formal rating is external).
