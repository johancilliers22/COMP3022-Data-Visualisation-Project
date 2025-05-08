# Component Structure

This document provides a detailed breakdown of the React components that make up the VAST Challenge visualization application.

## 1. Component Organization

Components are primarily located in `src/components/` and organized into:

*   **`charts/`**: Components responsible for rendering data visualizations (e.g., map, heatmap, bar chart, forecast chart).
*   **`ui/`**: Components that provide user interface controls, filters, and informational displays.

## 2. Core Application Structure (`src/App.jsx`)

*   **`App.jsx`**: The root component.
    *   Sets up the `DataProvider` (`DataContext.js`) and `UIProvider` (`UIContext` defined within `App.jsx`).
    *   Defines the overall page layout using React Bootstrap components (`Container`, `Row`, `Col`, `Card`).
    *   Renders the main sections: Header, Sidebar (`FilterPanel`, `StatsPanel`), Main Content Area (`EarthquakeMap`, `InsightsPanel`, `TimeControls`, `VegaChart`s, `ForecastChart`), Footer, and `InfoButton`.
    *   Manages the state for the `UIContext`.

## 3. Context Providers

### `DataContext.js` (`src/context/`)
*   **Purpose**: Loads, processes, and provides access to the main datasets required by the application.
*   **Data Managed**: 
    *   Raw reports (potentially loaded initially, usage might be secondary now).
    *   GeoJSON boundaries.
    *   Neighborhood ID-to-name map (`neighborhood_map.json`).
    *   Key processed datasets loaded via `utils/dataLoader.js`:
        *   `category_summary_aggregated.json` (for category comparison chart).
        *   `all_summary_processed.csv` (parsed into memory, serves as base for heatmap).
        *   Potentially other processed files.
*   **State Exposed via `useData()`**: 
    *   `data`: Object containing the loaded datasets.
    *   `loading`, `error`: Status of the initial data load.
*   **Key Logic**: Uses `utils/dataLoader.js` (`loadAllData`) for initial fetching and parsing (including large CSVs via `papaparse`).

### `UIContext` (defined in `src/App.jsx`)
*   **Purpose**: Manages global UI state reflecting user interactions and controlling visualization parameters.
*   **State Exposed via `useUI()`**: 
    *   `currentTime`: Timestamp controlled by `TimeControls.jsx`.
    *   `selectedCategory`: Damage category selected via `FilterPanel.jsx`.
    *   `selectedNeighborhood`: ID of the neighborhood clicked on the map (`EarthquakeMap.jsx`).
    *   `colorScheme`, `activeColorSchemePalette`: Selected color scheme and corresponding palette array.
    *   `showNeighborhoodLabels`: Toggle for labels on the map.
    *   `sidebarCollapsed`, `showInsightsPanel`: UI layout state.
    *   `isLoadingBsts`: Specific loading state used by `EarthquakeMap.jsx` during dynamic data fetches.

## 4. Chart Components (`src/components/charts/`)

### `EarthquakeMap.jsx`
*   **Purpose**: Renders the main interactive choropleth map of St. Himark.
*   **Technology**: ECharts.
*   **Data Source**: 
    *   GeoJSON boundaries (from `DataContext`).
    *   Dynamically fetched hourly BSTS data (`map_data.json` slices via `loadAllBSTSData`) based on `currentTime` and `selectedCategory` from `UIContext`. Stored in local `bstsData` state.
*   **Key State**: `bstsData`, `isLoadingBsts`, `error`.
*   **Key Logic**:
    *   `useEffect` hook triggers `loadAllBSTSData` on time/category change.
    *   `useEffect` hook guards against rendering if `isLoadingBsts` is true or if `bstsData` is inconsistent with `selectedCategory`.
    *   `processNeighborhoodsData` function combines GeoJSON info with fetched `bstsData` for all 19 neighborhoods, calculates damage `value` and `certainty` (using `utils/uncertaintyCalc.js`), determines CIs, and formats data for ECharts.
    *   Renders map using ECharts `setOption`, binding data to map features.
    *   Styles map features: `areaColor` based on damage `value` via `visualMap`, `opacity` based on calculated `certainty`.
    *   Handles clicks on neighborhoods to update `selectedNeighborhood` in `UIContext`.
    *   Provides an export-to-PNG feature.

### `VegaChart.jsx`
*   **Purpose**: A wrapper component to render charts defined by Vega/Vega-Lite specifications.
*   **Technology**: Vega-Embed.
*   **Props**: `spec` (Vega/VL spec object), `chartType` (e.g., "categoryComparison", "fullHeatmap"), `useSignals`.
*   **Data Source**: 
    *   For `categoryComparison`: Uses `category_summary_aggregated.json` (loaded by `DataContext`).
    *   For `fullHeatmap`: Uses `all_summary_processed.csv` (loaded by `DataContext`), likely filtered/processed further using `useFilteredData.js` or similar logic based on UI state before being passed to Vega.
    *   Specs are loaded from `public/data/specs/`.
*   **Key Logic**: 
    *   Fetches the spec JSON if not provided directly.
    *   Uses `vegaEmbed` to render the chart.
    *   Passes application state (like `currentTime`, `selectedNeighborhood`) as Vega signals if `useSignals` is true, enabling interactivity.
    *   Includes fallback rendering attempts.

### `ForecastChart.jsx`
*   **Purpose**: Displays historical damage trends and future forecasts.
*   **Technology**: Appears to use ECharts.
*   **Data Source**: Likely uses time-series data derived from `all_summary_processed.csv` (potentially filtered by selected category/neighborhood) loaded via `DataContext`.
*   **Key Logic**: 
    *   Processes the time-series data to separate historical points from forecast points.
    *   Configures an ECharts option with lines for actual data, forecasted data, and shaded areas for confidence intervals.
    *   Updates dynamically based on `selectedCategory` and `selectedNeighborhood` from `UIContext`.

## 5. UI Components (`src/components/ui/`)

*   **`FilterPanel.jsx`**: Contains controls like `CategorySelector`, `ColorSchemeSelector`, `SwitchSlider` (e.g., for toggling map labels). Updates relevant states in `UIContext`.
*   **`TimeControls.jsx`**: Implements the timeline slider, play/pause/speed controls, and event markers. Updates `currentTime` in `UIContext`. Uses `requestAnimationFrame` for smooth playback.
*   **`CategorySelector.jsx`**: Dropdown to select the damage category. Updates `selectedCategory` in `UIContext`.
*   **`ColorSchemeSelector.jsx`**: Dropdown to select the color scheme. Updates `colorScheme` in `UIContext`.
*   **`StatsPanel.jsx`**: Displays statistics for the `selectedNeighborhood` (from `UIContext`). Fetches relevant data slices (likely from `all_summary_processed.csv` via `DataContext`) to show current damage, uncertainty, etc.
*   **`InsightsPanel.jsx`**: Displays textual summaries, potential anomalies, or other insights derived from the current data state (e.g., comparing neighborhoods, finding highest damage areas based on data from `DataContext`).
*   **`InfoButton.jsx`**: Renders a button that likely triggers a modal displaying help or metadata.
*   **`SwitchSlider.jsx`**: A reusable switch component.

## 6. Hooks (`src/hooks/`)

*   **`useDataLoader.js`**: (Although potentially merged into `dataLoader.js` utils) - Logic associated with the initial data loading process managed by `DataContext`.
*   **`useFilteredData.js`**: Likely contains logic to filter the large `all_summary_processed.csv` dataset based on criteria from `UIContext` (e.g., time range, possibly category/location) for use in components like the heatmap `VegaChart`.

## 7. Utilities (`src/utils/`)

*   **`dataLoader.js`**: Crucial functions `loadAllData` (for initial load, parsing CSVs) and `loadAllBSTSData` (for fetching/caching dynamic hourly data from `map_data.json` for the map).
*   **`dataProcessor.js`**: May contain additional functions for transforming or aggregating data specifically for frontend views, complementing the main R preprocessing.
*   **`uncertaintyCalc.js`**: Functions for calculating and converting uncertainty metrics (CIR, SD, Levels, CI Width -> Certainty).
*   **`logger.js`**: Simple console logging utility.
*   **`vsupColors.js`**: Defines color palettes (though `App.jsx` now seems to define the main palettes used).

## Simplified Component Overview (Illustrative)

```
App
├── DataProvider (Context via useData hook)
│   └── AppContent (Main layout within App.jsx)
│       ├── Header (Conceptual)
│       ├── ControlsArea
│       │   ├── FilterPanel.jsx
│       │   ├── TimeControls.jsx
│       │   ├── CategorySelector.jsx
│       │   ├── ColorSchemeSelector.jsx
│       │   └── StatsPanel.jsx 
│       ├── VisualizationsArea
│       │   ├── EarthquakeMap.jsx
│       │   └── VegaChart.jsx (used for various chart types like category comparison)
│       └── Footer (Conceptual)
```
*Note: This hierarchy is a simplified representation. Actual nesting and layout are managed within `App.jsx` and its child components.*

## Core Components

### App Components

#### `App.jsx`
The main application component that sets up context providers and renders the overall UI structure.

**Props**: None
**State**: Manages global UI state like `currentTime`, `selectedNeighborhood`, `selectedCategory`, `colorScheme`, `showRawReports` (often via `useUI` hook).
**Description**: Entry point for the application. It orchestrates the main layout, including control panels and visualization areas. It likely initializes and provides the UI state context.

### Context Components

#### `DataContext.js` (and `useData` hook)
Provides processed data, filter state, and data-related actions to components throughout the application.

**State (exposed via `useData` hook)**:
- `data`: The main dataset, including reports, GeoJSON, location info, etc.
- `loading`: Indicates if the initial data is loading.
- `error`: Stores any data loading error.
- `filters`: Current filter settings applied to the data.
- `getFilteredData()`: Method to retrieve data based on current filters.
- `loadAllBSTSData()`: Utility likely used by context or components to fetch time-specific BSTS results.
*(Specifics might vary based on actual `DataContext` implementation)*

### Chart Components

#### `EarthquakeMap.jsx`
Renders the main interactive map of St. Himark, displaying neighborhood damage levels and other geographical information.

**Technology**: Uses ECharts for rendering.
**Data**: Consumes GeoJSON for neighborhood boundaries and processed report data (including BSTS results) to color-encode damage severity and certainty.
**Features**: 
- Displays neighborhood polygons.
- Color-codes damage based on selected category and time.
- Uses opacity to indicate data certainty (derived from BSTS CIR or report confidence).
- Interactive tooltips with detailed neighborhood information.
- Handles data aggregation and fallback for missing data.
- Debounced resizing for performance.
**Refactoring**: Recently refactored to improve readability by extracting data processing logic into helper functions (`prepareNeighborhoodList`, `generateFallbackDataIfNeeded`, `processNeighborhoodsData`).

#### `VegaChart.jsx`
A versatile component for rendering various types of charts using Vega-Lite specifications.

**Technology**: Uses Vega-Embed to render Vega/Vega-Lite charts.
**Data**: Can accept a Vega/Vega-Lite `spec` object and `chartData`. For `categoryComparison` chart type, it processes data to compare damage categories.
**Features**:
- Renders charts based on a provided Vega specification.
- Supports `categoryComparison` type to show aggregated damage by category.
- Handles data URL fixing within specs (prefixing with `PUBLIC_URL`).
- Manages signals for interactivity between Vega charts and the React app (e.g., `selectedLocation`).
- Implements a fallback rendering mechanism (Canvas -> SVG -> Simplified Spec -> Basic Fallback Chart).
- Handles window resizing.
**Refactoring**: Recently refactored to remove unused `sanitizeData` function and clarify logic around generic/time-series chart capabilities.

### UI Control Components

*This section describes key UI components found in `src/components/ui/`.*

#### `FilterPanel.jsx`
Provides UI controls for users to filter the data being visualized. This likely includes selectors for region, damage type, and potentially other parameters.

#### `TimeControls.jsx`
Manages time-based interactions, such as a timeline slider to select the current time for visualization and playback controls.

#### `CategorySelector.jsx`
Allows users to select the specific damage category (e.g., Buildings, Power, Medical) to be visualized on the map and charts.

#### `ColorSchemeSelector.jsx`
Enables users to choose different color schemes for the visualizations (e.g., VSUP, Normal).

#### `StatsPanel.jsx`
Displays summary statistics or key information derived from the current data view.

#### `InfoButton.jsx`
A button component that likely displays informational popovers or modals.

#### `SwitchSlider.jsx`
A custom switch or slider component, possibly used for binary toggles (e.g., show raw reports).


## Adding New Components

To add a new component to the application:

1.  Create a new `.jsx` file (and optionally a `.css` file) in the appropriate directory under `src/components/` (e.g., `ui` or `charts`).
2.  Import necessary dependencies (React, hooks, context).
3.  Define the component function.
4.  Export the component.
5.  Import and use the component in its parent component (often `App.jsx` or one of its main layout children).

Example:
```jsx
import React from 'react';
import { useUI } // Assuming a UI context hook
// import { useData } // Assuming a Data context hook
import './NewComponent.css'; // Optional: component-specific styles

const NewComponent = ({ prop1, prop2 }) => {
  // const { uiState, setUiState } = useUI();
  // const { data } = useData();
  
  // Component logic here
  
  return (
    <div className="new-component">
      {/* Component rendering here */}
    </div>
  );
};

export default NewComponent;
```

## Component Styling

Components are styled using:
- Component-specific CSS files (e.g., `EarthquakeMap.css`, `FilterPanel.css`).
- Global styles in `App.css` and `index.css`.
- Bootstrap classes are available if React Bootstrap components are used directly.

The application aims for a consistent visual style. 