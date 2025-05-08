# VAST Challenge 2019 - Data Visualization Project Documentation

Welcome to the documentation for the VAST Challenge 2019 Mini-Challenge 1 data visualization application. This documentation provides a comprehensive guide to understanding the project's architecture, data processing, implementation, and deployment.

## Documentation Contents

This `docs` directory contains detailed information about the project:

*   **[Project Overview](./project-overview.md)**: Introduction, goals, and high-level summary of the application.
*   **[Data Description](./data-description.md)**: Detailed information about the raw input data, the R preprocessing pipeline, the structure and purpose of the generated processed data files (CSVs and JSONs), and how data is loaded/used by the frontend.
*   **[Technical Architecture](./technical-architecture.md)**: Description of the overall architecture (Offline R Pipeline + React Frontend), data flow, state management (React Context), and key technologies used.
*   **[Component Structure](./component-structure.md)**: Detailed breakdown of the React components (Context Providers, Charts, UI Controls, Hooks, Utilities) and their responsibilities.
*   **[Implementation Guide](./implementation-guide.md)**: Guidelines and details on how key features (preprocessing steps, data loading, uncertainty handling, specific components) are implemented.
*   **[Performance Optimizations](./performance-optimizations.md)**: Discussion of performance considerations, primarily focusing on the benefits of offline preprocessing.
*   **[Deployment Guide](./deployment-guide.md)**: Instructions for building the React application and deploying it as a static website.
*   **[Preprocessing README](../preprocessing/README.md)**: Specific instructions for setting up and running the R data preprocessing pipeline.

## Project Overview

This application provides an interactive dashboard for visualizing earthquake damage reports from the VAST Challenge 2019 MC1 dataset (fictional city of St. Himark). It leverages Bayesian statistical modeling (performed offline using R) to provide robust estimates of damage severity and uncertainty over time.

The primary goal is to help users (like emergency responders) understand evolving damage patterns across different neighborhoods and categories, identify areas needing attention, and assess the reliability of the information presented.

Key visualizations include:
*   An interactive choropleth map showing damage levels and uncertainty (via opacity).
*   A filterable heatmap displaying damage across all locations and categories over time.
*   A category comparison chart.
*   A damage forecast chart.
*   Interactive time controls and filtering options.

## Technology Stack

*   **Data Preprocessing (Offline)**: R (using packages like `tidyverse`, `bsts`, `jsonlite`, `lubridate`, `zoo`, `future`). Responsible for cleaning data, performing BSTS analysis, handling data sparsity, and generating optimized data files for the frontend.
*   **Frontend Framework**: React (v17+), using functional components, hooks, and Context API.
*   **Visualization Libraries**: ECharts (for the main map and forecast chart), Vega-Lite (via Vega-Embed, for the heatmap and category comparison chart).
*   **UI Components**: React Bootstrap.
*   **Styling**: Custom CSS (component-specific and global).
*   **Frontend Data Handling**: `axios` / `fetch` for loading, `papaparse` for CSV parsing, custom utilities in `src/utils/` (e.g., `dataLoader.js`, `uncertaintyCalc.js`).

## Quick Start (Development)

1.  **Prerequisites**: Node.js (v14+), npm/yarn, Git, R (v4.0+), RStudio (recommended).
2.  **Clone Repository**: `git clone <repository-url>` and `cd vast-mc1-vis`.
3.  **Install Frontend Dependencies**: `npm install`.
4.  **Run R Preprocessing**: Execute the R scripts in `preprocessing/R/` in the correct order (`install_packages.R` -> `data_preparation.R` -> `analysis.R` -> `process.R`) to generate the necessary files in `public/data/processed/`. See `preprocessing/README.md` for details.
5.  **Run Development Server**: `npm start`.

## Repository Structure

(See `docs/technical-architecture.md` and `docs/component-structure.md` for more details)

```
vast-mc1-vis/
├── docs/                # Project documentation (Markdown files)
├── preprocessing/       # Offline R scripts for data preprocessing
│   └── R/
├── public/
│   ├── data/            # Datasets (raw CSV, GeoJSON, specs, processed output)
│   │   └── processed/   # <<< Output from R pipeline
│   └── ...              # index.html, icons, etc.
├── src/                 # React application source code
│   ├── components/      # UI and Chart components
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   └── ...              # App.jsx, index.js, etc.
├── .gitignore
├── package.json         # Frontend dependencies and scripts
└── README.md            # Main project README
```

## Contact

This project was developed as part of the COMP3022 Data Visualization module at the University of Nottingham. 