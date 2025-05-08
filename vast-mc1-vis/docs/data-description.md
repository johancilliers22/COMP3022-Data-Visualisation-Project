# Data Description

## 1. Raw Input Data

The visualization is based on the VAST Challenge 2019 Mini-Challenge 1. The primary raw inputs are:

*   **`mc1-reports-data.csv`**: Located in `public/data/`, this CSV file contains citizen-generated damage reports over time. Each row represents a report for a specific location and includes damage ratings (0-10) for various categories (shake_intensity, buildings, medical, power, roads_and_bridges, sewer_and_water).
*   **`StHimarkNeighborishRegions.geojson` (or similar GeoJSON)**: Located in `public/data/`, this file provides the geographical boundaries for St. Himark's 19 neighborhoods, used for rendering the map.
*   **Shakemap Images**: `shakemap-1.png` and `shakemap-2.png` (in `public/data/images/`) provide context for earthquake epicenters and felt shaking, though they are not dynamically layered onto the interactive map.

### Raw Report Data Structure (`mc1-reports-data.csv`)

| Field             | Description                                       | Type     |
| ----------------- | ------------------------------------------------- | -------- |
| `time`            | Timestamp of report (YYYY-MM-DD hh:mm:ss)         | Datetime |
| `location`        | ID of neighborhood (1-19)                         | String   |
| `shake_intensity` | Reported shaking intensity (0-10)                 | Number   |
| `sewer_and_water` | Reported damage to sewer/water (0-10)             | Number   |
| `power`           | Reported damage to power (0-10)                   | Number   |
| `roads_and_bridges`| Reported damage to roads/bridges (0-10)           | Number   |
| `medical`         | Reported damage to medical facilities (0-10)        | Number   |
| `buildings`       | Reported damage to buildings (0-10)               | Number   |

*Scale: 0 (No damage) - 5 (Moderate) - 10 (Severe/Catastrophic).*

## 2. R-Based Preprocessing Pipeline

The application **critically relies on an offline R-based preprocessing pipeline** (detailed in `preprocessing/README.md`) to transform the raw data into analysis-ready formats and to perform advanced statistical modeling. This pipeline enhances performance and enables robust uncertainty quantification.

The R scripts are executed in the following sequence:

1.  **`preprocessing/R/install_packages.R`**: Installs all necessary R packages.
2.  **`preprocessing/R/data_preparation.R`**:
    *   Reads `mc1-reports-data.csv`.
    *   Performs initial cleaning and data type conversions.
    *   Transforms data into a long format.
    *   **Outputs**:
        *   `public/data/processed/mc1-reports-data-long.csv`: The primary dataset in a long format.
        *   `public/data/processed/mc1-reports-counts.csv`: Aggregated counts of ratings.
        *   `public/data/processed/prepared_data.csv`: Enhanced dataset with some added noise/variance (used by some older parts of the original reference, less critical for our current BSTS pipeline).
        *   `public/data/processed/mc1_processed_data.json`: Basic metadata and frequency data.
3.  **`preprocessing/R/analysis.R`**:
    *   Takes raw report data (or `mc1-reports-data.csv` directly).
    *   Applies Bayesian Structural Time Series (BSTS) modeling for each location-category pair.
    *   **Important**: A BSTS model is generated only if there are at least 5 raw data reports for a specific location-category combination. Combinations not meeting this threshold are skipped.
    *   **Outputs (in `public/data/processed/bsts_results/`)**:
        *   Individual JSON and CSV files for each successfully modeled location-category pair (in the `summary/` subfolder, e.g., `bsts_1_shake_intensity_[timestamp].json`).
        *   `all_bsts_results.csv`: A crucial aggregated CSV containing the time series of BSTS model outputs (mean, MAP, 95% CI lower/upper, CIR, certainty_level) for all successfully modeled location-category pairs.
4.  **`preprocessing/R/process.R`**:
    *   Consumes `all_bsts_results.csv`.
    *   Generates a complete, regular 5-minute interval time series for **all** 19 locations and 6 categories.
    *   For location-category pairs with BSTS data, it uses Last Observation Carried Forward (LOCF) to fill values between BSTS updates.
    *   For location-category pairs **skipped by `analysis.R`** (due to insufficient raw data), it generates **placeholder data** (typically damage value 0, default "medium" uncertainty, CIR 5). This ensures structural completeness for the frontend.
    *   Performs hourly aggregations.
    *   Outputs a suite of CSV and JSON files tailored for different frontend components.

## 3. Key Processed Data Files for Frontend (`public/data/processed/`)

The `process.R` script generates the primary data files consumed by the React application:

*   **`all_summary_processed.csv` (approx. 106MB)**:
    *   **Structure**: Contains a full time series at 5-minute intervals for all 19 locations and 6 damage categories spanning the entire event duration.
    *   **Content**: Includes `time`, `location`, `loc_name`, `category`, `map` (MAP estimate of damage), `mean` (mean estimate), `ci_lower_95`, `ci_upper_95`, `CIRatMaxMAP` (Credible Interval Range at the time of max MAP, effectively the uncertainty measure), and `certainty_level`.
    *   **Source**: Derived from `all_bsts_results.csv`, with LOCF and placeholder generation.
    *   **Usage**: Primary data source for the main heatmap (`VegaChart.jsx` with `chartType="fullHeatmap"`), and potentially other detailed views or calculations.

*   **`all_summary_aggregated.csv` (approx. 955KB)**:
    *   **Structure**: Hourly aggregated data. For each location, category, and hour, it provides summary statistics.
    *   **Content**: Includes `location`, `loc_name`, `category`, `dateHour`, `map` (max MAP value within that hour), `avgMAP` (average MAP in hour), `maxCIR`, `avgCIR`, `CIRatMaxMAP` (CIR corresponding to the hourly max MAP).
    *   **Usage**: Can be used for overview charts or performance-optimized views where 5-minute granularity is not needed.

*   **`map_data.json` (approx. 9.6MB)**:
    *   **Structure**: Nested JSON: `time (hourly ISO string) -> category -> array of location objects`. Each location object contains `location` (ID), `loc_name`, `value` (damage MAP), `uncertainty` (CIR), `certainty_level`, `ci_lower`, `ci_upper`.
    *   **Content**: Represents the latest state (or max value) for each location/category within each hour.
    *   **Usage**: Primarily loaded by `EarthquakeMap.jsx` (via `loadAllBSTSData` in `dataLoader.js`) to display damage values and uncertainty on the map for the selected `currentTime` (snapped to the hour).

*   **`category_summary_aggregated.json` (approx. 1.4KB)**:
    *   **Structure**: An array of objects, one for each damage category.
    *   **Content**: Each object contains `categoryName`, `averageMapValue`, `averageCIR`, `averageLowerCI95`, `averageUpperCI95`, and `contributingLocations` (count of distinct locations with data for that category). Averages are across all locations for the latest timestamp in BSTS results.
    *   **Usage**: Directly consumed by `VegaChart.jsx` for the "Category Comparison" chart.

*   **Category-Specific Summary Files**:
    *   `[category_name]_summary.json` (e.g., `buildings_summary.json`, approx. 18-31MB each): Detailed time-series data (from `all_summary_processed.csv`) but filtered for a single category and nested by location. Potentially used for deep-dive views if implemented.
    *   `[category_name]_summary_processed.csv` (e.g., `buildings_summary_processed.csv`): The per-category slice from `all_summary_processed.csv`.
    *   `[category_name]_summary_aggregated.csv` (e.g., `buildings_summary_aggregated.csv`): The per-category slice from `all_summary_aggregated.csv`.

*   **`neighborhood_map.json` (approx. 1KB)**:
    *   **Structure**: Simple array of objects mapping neighborhood `id` (1-19) to `name`.
    *   **Usage**: Used by various components to display neighborhood names.

*   **`frontend_data.json` (approx. 296MB) & `visualization_data.json` (approx. 208MB)**:
    *   These appear to be larger, possibly less granularly structured or older versions of aggregated data. Their specific current use in the frontend needs verification against `dataLoader.js` and `DataContext.js`. The application has been shifting towards using the more specific files like `all_summary_processed.csv` and `map_data.json` for key visualizations. (Report authors should confirm their current relevance).

## 4. Vega Lite Specifications (`public/data/specs/`)

These JSON files define the visual encodings and interactions for the Vega-Lite charts:

*   **`category-comparison-spec.json`**: Defines the bar chart used to compare average damage across different categories. It's designed to work with `category_summary_aggregated.json`.
*   **`heatmap-all-neighborhoods-spec.json`**: Defines the main heatmap showing damage (`map` value) over time for all locations and categories. It consumes data derived from `all_summary_processed.csv`.
*   **`map-spec.json`**: This spec appears to be for a Vega-based map implementation. However, the current primary map is an ECharts implementation (`EarthquakeMap.jsx`). (Report authors should clarify if this spec is actively used or a remnant).

## 5. Data Loading and Usage in the Frontend

*   **`DataContext.js`**: Orchestrates the initial loading of essential datasets (GeoJSON, neighborhood map, and potentially a base set of processed data like `all_summary_processed.csv`).
*   **`utils/dataLoader.js`**: Contains functions like `loadAllData` (for initial load) and `loadAllBSTSData`. `loadAllBSTSData` is key for `EarthquakeMap.jsx`, fetching time and category-specific data primarily from `map_data.json`. It includes caching mechanisms.
*   **Component Data Consumption**:
    *   `EarthquakeMap.jsx`: Uses data from `map_data.json` (via `bstsData` state) to color neighborhoods and show tooltips. Fallback logic to raw reports exists but is secondary.
    *   `VegaChart.jsx` (type `categoryComparison`): Uses `category_summary_aggregated.json`.
    *   `VegaChart.jsx` (type `fullHeatmap`): Derives its data from `all_summary_processed.csv`, often filtered by time and potentially aggregated within the component or a hook like `useFilteredData.js`.
    *   `ForecastChart.jsx`: Uses processed time-series data to display forecasted trends.

This detailed data description should provide a clear understanding of the data lifecycle, from raw inputs through preprocessing to frontend consumption. 