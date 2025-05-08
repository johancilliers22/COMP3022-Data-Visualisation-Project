# Implementation Guide

This document provides guidance for developers working on the VAST Challenge 2019 MC1 visualization application, focusing on how features are implemented, particularly the interaction between the R preprocessing pipeline and the React frontend.

## 1. Development Environment Setup

_(This section assumes Node.js, npm/yarn, and Git are installed)._

1.  **Clone Repository**: `git clone <repository-url>` and `cd vast-mc1-vis`.
2.  **Install Dependencies**: `npm install`.
3.  **Obtain Processed Data**: Ensure the `public/data/processed/` directory is populated with the output from the R preprocessing pipeline. See `preprocessing/README.md` for instructions on running the R scripts (`install_packages.R`, `data_preparation.R`, `analysis.R`, `process.R`). **The frontend relies heavily on these pre-processed files.**
4.  **Start Development Server**: `npm start`.

## 2. Project Structure Overview

_(Key directories relevant to implementation)_

```
vast-mc1-vis/
├── preprocessing/       # Offline R scripts for data analysis and processing
│   └── R/
│       ├── install_packages.R
│       ├── data_preparation.R
│       ├── analysis.R       # BSTS Modeling
│       └── process.R        # Aggregation, formatting for frontend
├── public/
│   ├── data/
│   │   ├── mc1-reports-data.csv # Raw input data
│   │   ├── neighborhoods_geojson.json # Map boundaries
│   │   ├── processed/       # <<< Output from R pipeline - CRITICAL
│   │   │   ├── all_summary_processed.csv
│   │   │   ├── map_data.json
│   │   │   ├── category_summary_aggregated.json
│   │   │   └── ... (other processed files)
│   │   └── specs/           # Vega/Vega-Lite JSON specifications
├── src/
│   ├── components/
│   │   ├── charts/      # ECharts, Vega components (EarthquakeMap, VegaChart, ForecastChart)
│   │   └── ui/          # UI controls (FilterPanel, TimeControls, InsightsPanel etc.)
│   ├── context/         # React Context (DataContext.js)
│   ├── hooks/           # Custom hooks (useDataLoader, useFilteredData)
│   ├── utils/           # Utility functions (dataLoader.js, dataProcessor.js, uncertaintyCalc.js)
│   └── App.jsx          # Main application component, UI Context definition
├── docs/                # Project documentation (including this file)
```

## 3. R Preprocessing Pipeline Implementation

(See `preprocessing/README.md` and `docs/data-description.md` for more details)

*   **`install_packages.R`**: Sets up the R environment by installing required packages (`tidyverse`, `bsts`, `jsonlite`, `zoo`, `future`, etc.).
*   **`data_preparation.R`**: Performs initial cleaning of `mc1-reports-data.csv`, converts to long format (`mc1-reports-data-long.csv`).
*   **`analysis.R`**: 
    *   Applies BSTS modeling to generate time series estimates of damage and uncertainty.
    *   Implements the ">= 5 reports" rule, skipping modeling for sparse location-category pairs.
    *   Outputs detailed results per model and the combined `all_bsts_results.csv`.
    *   Utilizes parallel processing (`future` package) for efficiency.
*   **`process.R`**: 
    *   Consumes `all_bsts_results.csv`.
    *   Generates a complete 5-minute interval time series for all 19x6 location-category pairs.
    *   Uses Last Observation Carried Forward (LOCF) via the `zoo` package to fill time steps between BSTS model updates.
    *   Generates placeholder data (0 damage, default uncertainty) for location-category pairs absent in `all_bsts_results.csv`.
    *   Creates aggregated files (`all_summary_aggregated.csv`, `category_summary_aggregated.json`) and frontend-optimized structures (`map_data.json`).

## 4. Frontend Implementation Details

### Data Loading and Context (`DataContext.js`, `utils/dataLoader.js`)

*   **Initial Load (`loadAllData` in `dataLoader.js` called by `DataContext`)**: 
    *   Fetches essential static files: GeoJSON, `neighborhood_map.json`.
    *   Loads and parses key processed data files using `axios` and `papaparse`:
        *   `category_summary_aggregated.json` (for category comparison chart).
        *   `all_summary_processed.csv` (large file, parsed into memory for heatmap and potentially other detailed views). 
    *   Stores this data within the `DataContext` state.
*   **Dynamic BSTS Loading (`loadAllBSTSData` in `dataLoader.js`)**: 
    *   Used primarily by `EarthquakeMap.jsx`.
    *   Takes `selectedCategory` and `currentTime` (snapped to the hour) as input.
    *   Constructs a key or URL to fetch the relevant hourly slice from `map_data.json` (or potentially loads the whole file and slices it, depending on implementation detail - check `dataLoader.js`). 
    *   Implements caching to avoid redundant fetches for the same time/category.
*   **`DataContext.js`**: Provides the loaded static data, loading state, error state, and potentially functions for accessing filtered data via the `useData` hook. Manages the potentially large in-memory representation of `all_summary_processed.csv`.
*   **`UIContext` (`App.jsx`)**: Manages interactive state (`currentTime`, `selectedCategory`, `selectedNeighborhood`, etc.) needed to drive data loading and filtering, provided via the `useUI` hook.

### Uncertainty Handling (`utils/uncertaintyCalc.js`)

*   Provides functions to convert between different uncertainty representations used in the data or needed for display:
    *   `levelToCertainty`: Converts levels ("low", "medium", "high") to numeric certainty (0-1).
    *   `calculateCertaintyFromCIR`, `calculateCertaintyFromSD`, `calculateCertaintyFromCIWidth`: Derives numeric certainty (0-1) based on Credible Interval Range, Standard Deviation, or CI bounds. Used in `EarthquakeMap.jsx` to handle different metrics present in BSTS or raw report data.
    *   `getDamageDescription`: Maps numeric damage values to qualitative labels.
*   These utilities allow components like `EarthquakeMap.jsx` to consistently derive a `certainty` value (used for opacity) and display relevant info (like CIs) in tooltips, regardless of the exact metrics available in the source data for a given point.

### Key Component Implementations

*   **`EarthquakeMap.jsx` (`components/charts/`)**:
    *   **Data Source**: Primarily uses the `bstsData` state, which is populated by calls to `loadAllBSTSData` triggered by changes in `currentTime` or `selectedCategory`.
    *   **Processing**: The `processNeighborhoodsData` function is central. It iterates through all 19 neighborhoods. For each:
        *   It attempts to find the corresponding BSTS record in `bstsData` for the `selectedCategory`.
        *   If found, it extracts the damage `value` (MAP or mean) and calculates `certainty` based on available metrics (CI bounds, CIR, SD, certainty_level) using functions from `uncertaintyCalc.js`.
        *   If BSTS data is *not* found (either missing from `map_data.json` or due to placeholders), it *may* have fallback logic to check raw reports (`augmentedNeighborhoodGroups`), although the primary reliance is now on the complete data generated by `process.R` (where missing BSTS implies value=0).
        *   Calculates `ciLower`, `ciUpper` based on available data or heuristics.
    *   **Rendering**: Uses ECharts to render the GeoJSON map. Neighborhood styles (`itemStyle`) are set based on the processed data:
        *   `areaColor` is determined by the damage `value` using the `visualMap` component and the selected `activeColorSchemePalette`.
        *   `opacity` is dynamically calculated based on the derived `certainty` value.
    *   **State/Interaction**: Uses `useRef` for the chart instance, `useState` for `bstsData` and `isLoadingBsts`, and gets `currentTime`, `selectedCategory`, etc., from `useUI`. Includes effect guards (`useEffect`) to prevent rendering with stale/inconsistent data during loading.

*   **`VegaChart.jsx` (`components/charts/`)**:
    *   Acts as a wrapper for `vega-embed`.
    *   Loads a base Vega/Vega-Lite specification JSON from `public/data/specs/` based on the `chartType` prop (`category-comparison-spec.json`, `heatmap-all-neighborhoods-spec.json`).
    *   **Data Binding**: 
        *   For `categoryComparison`: The spec likely references `category_summary_aggregated.json` directly or the component passes this data (from `DataContext`) to the Vega view.
        *   For `fullHeatmap`: The spec likely expects data derived from `all_summary_processed.csv`. The component might preprocess/filter this large dataset (using `useFilteredData.js` or similar logic based on `currentTime`) before passing it to the Vega view, or the spec itself might handle filtering if signals are passed correctly.
    *   **Interactivity**: Uses Vega signals (passed via `vegaEmbed` options) to link the chart to application state like `currentTime`, `selectedNeighborhood`, allowing interactions like brushing or time selection within the Vega chart.

*   **`ForecastChart.jsx` (`components/charts/`)**:
    *   Likely uses processed time-series data (e.g., from `all_summary_processed.csv` or a dedicated forecast output if generated by preprocessing).
    *   Implements its own chart logic (possibly using a library like ECharts or Nivo) to display historical trends and forecasted values, often including confidence bands for the forecast.

*   **UI Components (`components/ui/`)**: 
    *   `FilterPanel.jsx`: Renders selectors (using `CategorySelector`, `ColorSchemeSelector`, `SwitchSlider`) that update the `UIContext` state (`selectedCategory`, `colorScheme`, `showNeighborhoodLabels`).
    *   `TimeControls.jsx`: Manages the time slider and playback, updating `currentTime` in `UIContext`.
    *   `StatsPanel.jsx`/`InsightsPanel.jsx`: Display information based on the selected neighborhood or overall data state, likely accessing data from `DataContext` or `UIContext`.

## 5. Testing and Validation

*   **Preprocessing**: Verify the output files in `public/data/processed/` after running the R pipeline. Check for completeness (all loc-cat pairs present in `all_summary_processed.csv`), correct structure, and reasonable values. Specifically check Wilson Forest (ID 7) for placeholder data in relevant categories.
*   **Frontend**: 
    *   Test map rendering across different times and categories. Verify tooltips show correct values, CIs, and certainty.
    *   Check heatmap rendering and ensure it reflects data from `all_summary_processed.csv`, including the 0-value cells for unmodeled data.
    *   Test category comparison chart against `category_summary_aggregated.json`.
    *   Verify forecast chart behavior.
    *   Test all UI interactions (filtering, time controls, selection).

## 6. Performance Considerations

*   The primary optimization is the offline R preprocessing, which avoids heavy client-side computation.
*   Frontend loading performance depends on efficiently loading and parsing `all_summary_processed.csv` (large file) and caching dynamic data fetches (`map_data.json` slices via `loadAllBSTSData`).
*   Client-side filtering or aggregation of the large `all_summary_processed.csv` for the heatmap needs to be efficient (e.g., using memoization via `useMemo` or optimized data structures if necessary).

## Development Workflow

### Feature Implementation Process

1. **Plan**: Define the requirements and design of the feature
2. **Create Components**: Implement the necessary React components
3. **Connect to Data**: Integrate with the data context
4. **Style**: Apply appropriate styling
5. **Test**: Verify functionality and appearance
6. **Document**: Update documentation as needed

### Coding Guidelines

#### General Principles

- Write clean, readable, and modular code
- Follow React best practices
- Use functional components and hooks
- Minimize side effects
- Keep components focused on a single responsibility

#### Naming Conventions

- **Components**: PascalCase (e.g., `EarthquakeMap.jsx`, `FilterPanel.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useData.js` if it were a custom hook file, or as used from context)
- **Utilities**: camelCase (e.g., `dataLoader.js`)
- **CSS classes**: kebab-case (e.g., `map-container`)

#### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Use JSDoc comments for functions and components
- Format code consistently (using Prettier or similar)
- Use destructuring for props and state

### Component Implementation Guide

#### Creating a New Component

1. Create a new file in the appropriate directory under `src/components/`
2. Use the following template:

```jsx
import React, { useState, useEffect, useContext } from 'react';
import { useData } from '../../context/DataContext';
import './ComponentName.css'; // If needed

/**
 * ComponentName - Description of what this component does
 * 
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const ComponentName = ({ prop1, prop2 }) => {
  // Access data context
  const { data, filters, updateFilters } = useData();
  
  // Local state
  const [localState, setLocalState] = useState(initialValue);
  
  // Effects
  useEffect(() => {
    // Side effects here
    
    return () => {
      // Cleanup function
    };
  }, [dependencies]);
  
  // Event handlers
  const handleEvent = (event) => {
    // Handle event
  };
  
  // Render content
  return (
    <div className="component-name">
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

#### Connecting to Data

Components access data through the DataContext (typically via the `useData()` hook):

```jsx
const { data, loading, error, filters, updateFilters, getFilteredData } = useData();
```

Use this context to access:
- The main dataset (which includes references to raw reports, GeoJSON, etc.).
- Loading and error states for initial data.
- Current filter settings.
- Methods to update filters and get filtered report data.
- Note: For specific, time-sensitive pre-processed data like BSTS results, components often use utilities like `loadAllBSTSData` from `src/utils/dataLoader.js`.

#### Implementing Visualizations

For visualization components:

1. Access the required base data (like GeoJSON) from context if needed.
2. Fetch dynamic, pre-processed data (e.g., BSTS results for a specific time/category) using utilities like `loadAllBSTSData`.
3. Process/transform this data into the format required by the chosen visualization library.
4. Set up the visualization library (e.g., ECharts for maps, Vega-Embed for Vega/Vega-Lite charts).
5. Handle user interactions and update the view.
6. Implement appropriate legends and tooltips.

Example structure for an ECharts component (like `EarthquakeMap.jsx`):

```jsx
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
// Import necessary ECharts components (charts, renderers, features)
import { useData } from '../../context/DataContext';
import { useUI } from '../../App'; // Or your UI context hook
import { loadAllBSTSData } from '../../utils/dataLoader';

const MyEChartComponent = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { data } = useData(); // For base data like GeoJSON
  const { currentTime, selectedCategory } = useUI(); // For dynamic parameters
  const [processedVizData, setProcessedVizData] = useState([]);

  useEffect(() => {
    // Initialize chartInstance with chartRef.current
    // ... (see EarthquakeMap.jsx for full setup)
    return () => chartInstance.current?.dispose();
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !data || !currentTime || !selectedCategory) return;

    const fetchDataAndRender = async () => {
      try {
        const bstsResults = await loadAllBSTSData(selectedCategory, currentTime);
        // ... process bstsResults and data.geoJSON into ECharts option structure ...
        const option = { /* ... ECharts option object ... */ };
        chartInstance.current.setOption(option, true);
      } catch (error) {
        console.error("Error rendering chart:", error);
      }
    };

    fetchDataAndRender();
  }, [data, currentTime, selectedCategory /*, other dependencies */]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default MyEChartComponent;
```

Example for a VegaChart component:
```jsx
import React, { useEffect, useRef, useState } from 'react';
import vegaEmbed from 'vega-embed';
import { useUI } from '../../App'; // Or your UI context hook
import { loadAllBSTSData } from '../../utils/dataLoader'; // If fetching data outside spec

const MyVegaChartComponent = ({ specUrl, chartType }) => {
  const chartRef = useRef(null);
  const { currentTime, selectedNeighborhood } = useUI();
  const [chartSpec, setChartSpec] = useState(null);

  useEffect(() => {
    // Fetch and set chartSpec from specUrl if needed
    // Example: fetch(specUrl).then(res => res.json()).then(setChartSpec);
  }, [specUrl]);

  useEffect(() => {
    if (chartRef.current && chartSpec) {
      const signals = {
        appCurrentTime: new Date(currentTime).toISOString(),
        selectedLocation: selectedNeighborhood,
        // ... other signals
      };
      vegaEmbed(chartRef.current, chartSpec, { signals /* renderer, actions, etc. */ })
        .then(result => { /* handle view if needed */ })
        .catch(console.error);
    }
  }, [chartSpec, currentTime, selectedNeighborhood /*, other dependencies */]);

  return <div ref={chartRef} />;
};

export default MyVegaChartComponent;
```

### Data Processing Utilities

When implementing data processing utilities in `src/utils/`:

1.  Make them pure functions when possible.
2.  Handle edge cases (null data, empty arrays, etc.) gracefully.
3.  Note that for complex statistical modeling (like BSTS), the primary processing is handled by **offline scripts** (e.g., in the `/preprocessing` directory using R). Frontend utilities related to this data (like `loadAllBSTSData`) are primarily for fetching and selecting from this pre-processed output.
4.  Client-side utilities might be for:
    *   Transforming pre-processed data into specific formats for visualization libraries.
    *   Filtering arrays of reports (e.g., `data.reports` from context).
    *   Simple aggregations if needed for specific UI elements.
5.  Add comprehensive JSDoc comments.

Example (simple frontend utility):

```js
/**
 * Calculate average damage value for a neighborhood
 * 
 * @param {Array} reports - Array of damage reports
 * @param {string} category - Damage category
 * @returns {number} - Average damage value
 */
export const calculateAverageDamage = (reports, category) => {
  if (!reports || reports.length === 0) return 0;
  
  const relevantReports = reports.filter(r => r.category === category);
  
  if (relevantReports.length === 0) return 0;
  
  const sum = relevantReports.reduce((acc, report) => acc + report.reportValue, 0);
  return sum / relevantReports.length;
};
```

## Adding New Features

### Implementing a New Visualization

1. Plan the visualization type and design
2. Create a new component in the appropriate directory
3. Connect to data context
4. Implement the visualization using the appropriate library
5. Add necessary controls and interactions
6. Style the visualization
7. Add the component to the main application layout

### Adding Filters and Controls

1. Define the filter state in the DataContext
2. Create UI components for the filter controls
3. Connect the controls to the filter state
4. Implement the filtering logic
5. Update visualizations to respond to filter changes

### Adding New Data Processing

1. Identify the data processing requirements
2. Implement functions in the appropriate utility file
3. Add tests if applicable
4. Document the functions with JSDoc comments
5. Use the functions in components as needed

## Testing and Validation

### Manual Testing

Test the application with different:
- Data subsets
- Filter combinations
- Window sizes (for responsive design)
- Interaction sequences

### Validation Criteria

Ensure that:
- Visualizations accurately represent the data
- Filters and controls work as expected
- Data processing is correct
- The UI is responsive and usable
- Error states are handled appropriately

## Performance Considerations

### Optimization Techniques

- Use `useMemo` for expensive calculations
- Implement virtualization for large lists
- Optimize data processing for large datasets
- Use appropriate data structures for efficient lookups
- Implement lazy loading for components when appropriate

### Memory Management

- Clean up side effects in useEffect cleanup functions
- Avoid memory leaks from event listeners
- Be mindful of large datasets in memory

## Debugging Tips

- Use React Developer Tools for component inspection
- Use browser developer tools for network and performance debugging
- Add conditional console logs for development
- Implement error boundaries for component-level error handling

## Documentation

When adding or modifying features:

1. Update component documentation
2. Document any new utility functions
3. Update the implementation guide as needed
4. Add usage examples for complex features 