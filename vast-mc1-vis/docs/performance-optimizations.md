# Performance Optimizations

This document outlines the performance optimizations implemented in the earthquake visualization project to improve loading times, reduce memory usage, and enhance overall application performance.

## 1. Offline Data Preprocessing (Primary Optimization)

### Problem
Performing complex statistical analysis, particularly Bayesian Structural Time Series (BSTS) modeling, on the raw earthquake report data is computationally intensive. Running this analysis in the browser on every application load would lead to extremely long loading times and potentially freeze the user's browser.

### Solution
The **core performance strategy** is the use of an **offline R-based preprocessing pipeline** (see `preprocessing/README.md` and `docs/data-description.md`). This pipeline runs separately before the frontend application is deployed. It handles:

*   Parsing and cleaning the raw `mc1-reports-data.csv`.
*   Performing BSTS analysis to model damage and uncertainty over time (`analysis.R`).
*   Aggregating results and generating a complete time series, including placeholders for data gaps (`process.R`).
*   Outputting structured, frontend-optimized CSV and JSON files (e.g., `all_summary_processed.csv`, `map_data.json`, `category_summary_aggregated.json`) into the `public/data/processed/` directory.

**Impact**: This is the **single most significant performance optimization**. 
*   Heavy computation is shifted offline.
*   The frontend interacts with pre-calculated, structured data.
*   Initial load times are drastically reduced as the browser doesn't perform statistical modeling.
*   Enables the use of sophisticated analysis (BSTS) that would be infeasible client-side.

## 2. Efficient Frontend Data Loading & Handling

### Problem
Some processed data files, like `all_summary_processed.csv` (containing 5-minute data for all locations/categories), are still very large and loading/parsing them can impact initial load time. Dynamically fetching data for map updates needs to be efficient.

### Solution
*   **Initial Load Strategy (`DataContext`, `dataLoader.js`)**: 
    *   Essential small files (GeoJSON, neighborhood map, category summary JSON) are fetched quickly.
    *   Large CSV files like `all_summary_processed.csv` are fetched and parsed client-side using the efficient `papaparse` library. While still a significant initial step, this parsed data is then held in memory within `DataContext` for use by components like the heatmap.
*   **Dynamic Data Slicing (`dataLoader.js` -> `loadAllBSTSData`)**: 
    *   For components needing only the data for the current time/category (primarily `EarthquakeMap.jsx`), the `loadAllBSTSData` utility fetches data from the pre-structured `map_data.json`. This file provides hourly snapshots, minimizing the data transferred for map updates.
    *   `loadAllBSTSData` includes caching to prevent re-fetching the same hourly slice repeatedly.

**Impact**: Balances initial load time (parsing the large CSV) with fast, dynamic updates for interactive components like the map.

## 3. Charting Library Optimizations

### `EarthquakeMap.jsx` (ECharts)
*   **Direct ECharts Core Usage**: Imports only necessary ECharts modules (`echarts/core`, specific charts/components) potentially reducing bundle size compared to importing everything.
*   **Animation Disabled**: Map update animations (`animation: false`) are disabled to ensure smoother transitions during time slider interaction or category changes.
*   **Debounced Resizing**: Window resize events are debounced to limit the frequency of expensive chart resize operations.
*   **Clean Redraws**: Uses `setOption(option, true)` (`notMerge = true`) to ensure the chart state is reset correctly on data changes, preventing potential visual artifacts from merging options.

### `VegaChart.jsx` (Vega-Embed)
*   **Targeted Signal Updates**: Uses Vega signals to pass dynamic application state (like `currentTime`, `selectedNeighborhood`) to the Vega/Vega-Lite specifications. This allows the Vega chart to update internally based on signals where possible, potentially avoiding full data re-parsing/rendering.
*   **Specification Loading**: Loads static spec files, avoiding client-side spec generation.

## 4. Build-time Optimizations

### Console Log Removal (Production)
*   **Problem**: Development `console.log` statements negatively impact production performance.
*   **Solution**: The standard `npm run build` process for Create React App (or similar setups) typically minifies code and optimizes it for production. If needed, specific plugins like `babel-plugin-transform-remove-console` can be added to the build configuration (`babel.config.js` or `package.json`) to explicitly strip console statements during the production build.

### Code Splitting / Lazy Loading
*   While not explicitly detailed as implemented, React's built-in code splitting (e.g., using `React.lazy` and `Suspense`) could be applied to larger components or less frequently used views if initial bundle size becomes a concern.

## 5. React Best Practices

Adherence to standard React performance practices contributes to overall efficiency:
*   **Memoization**: Using `useMemo` and `useCallback` where appropriate to prevent unnecessary re-calculations or re-creation of functions passed as props.
*   **`React.memo`**: Wrapping components that render predictably given the same props can prevent unnecessary re-renders.
*   **Efficient State Updates**: Avoiding unnecessary state updates that trigger re-renders.
*   **Correct `useEffect` Dependencies**: Ensuring dependency arrays are accurate to prevent infinite loops or stale closures.

## Summary

The primary performance gain comes from the **offline R preprocessing pipeline**. Frontend optimizations focus on **efficiently loading and slicing** this pre-processed data, optimizing **chart rendering**, and employing standard **build-time and React best practices**.

## Installation and Usage

All optimizations can be installed with:

```bash
npm run optimize
```

This will:
1. Install required dependencies (babel-plugin-transform-remove-console)
2. Create/update .babelrc configuration
3. Set up the optimization environment

To build with all optimizations:

```bash
npm run build:optimized
```

## Performance Impact

These optimizations result in:

1. **Faster Initial Load**: By simplifying the data loading process and removing unnecessary code paths
2. **Reduced Memory Usage**: By creating fewer interim objects and optimizing data structures
3. **Smoother UI Interaction**: By eliminating costly console.log statements in production
4. **Smaller Bundle Size**: By removing unused code

## Development vs. Production

It's important to note that these optimizations primarily target production builds. In development mode:

- Console logging is still available for debugging
- The data loading process is more verbose with progress information
- The full React DevTools experience is maintained

This ensures developers still have access to all the tools they need during development. 