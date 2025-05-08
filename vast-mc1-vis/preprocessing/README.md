# VAST Challenge 2019 - Data Preprocessing

This directory contains scripts for preprocessing the VAST Challenge 2019 MC1 data. The preprocessing transforms the raw CSV data into optimized JSON files for the visualization.

## Why Preprocess the Data?

Preprocessing the data has several benefits:
1. **Faster load times**: The web app loads much faster since it doesn't need to parse and process the large CSV file
2. **Advanced analytics**: We can perform complex statistical analyses like Bayesian structural time series modeling
3. **Uncertainty quantification**: Proper calculation of credible intervals and uncertainty metrics
4. **Reduced client-side processing**: The heavy computation is done once, not on every client load

## Preprocessing Options

There are two preprocessing pipelines available:

1. **R-based pipeline (Advanced)**: Uses Bayesian statistics for high-quality uncertainty quantification
2. **JavaScript pipeline (Simple)**: Uses basic statistics, easier to run but with less sophisticated uncertainty metrics

Choose the option that works best for your setup.

## Option 1: R-based Preprocessing (Advanced)

This pipeline uses Bayesian Structural Time Series (BSTS) modeling for robust uncertainty quantification and detailed data aggregation. It is the recommended approach for the most comprehensive analysis.

### Prerequisites

To run the R-based preprocessing pipeline, you need:
1. [R](https://www.r-project.org/) (version 4.0+ recommended)
2. RStudio (recommended, but not strictly required if running from command line)

### How to Run

The R scripts are designed to be run in a specific order. Ensure your R environment is set up and your working directory is the root of the `vast-mc1-vis` project.

**Automated Scripts:**

*   **On Windows**: Navigate to the `vast-mc1-vis` project root in File Explorer and double-click `preprocessing/run_preprocessing.bat`.
*   **On macOS/Linux**: Open Terminal, navigate to the `vast-mc1-vis` project root, and execute `bash preprocessing/run_preprocessing.sh`.

These scripts will attempt to run all necessary R scripts in sequence.

**Manual Execution (Recommended for understanding or troubleshooting):**

If you prefer to run the scripts manually or if the batch/shell scripts encounter issues, execute them from within R/RStudio in the following order. Ensure the R console's working directory is set to the `vast-mc1-vis` project root.

1.  **`preprocessing/R/install_packages.R`**: This script installs all required R packages. Run this first to ensure all dependencies are met.
    ```R
    # In R console, assuming working directory is 'vast-mc1-vis'
    source("preprocessing/R/install_packages.R")
    ```
2.  **`preprocessing/R/data_preparation.R`**: This script reads the raw `mc1-reports-data.csv`, performs initial cleaning, converts it to a long format (`mc1-reports-data-long.csv`), and creates some basic aggregations (`mc1-reports-counts.csv`).
    ```R
    # In R console
    source("preprocessing/R/data_preparation.R")
    ```
3.  **`preprocessing/R/analysis.R`**: This is the most computationally intensive script. It takes the raw data and applies Bayesian Structural Time Series (BSTS) modeling to each relevant location-category pair. 
    *   **Note**: This script requires at least 5 data points for a given location-category to generate a BSTS model. If fewer than 5 points exist, that specific combination will be skipped, and no direct BSTS output will be generated for it. This is an intentional step to ensure model stability.
    *   The script outputs individual JSON and CSV files for each processed combination into `public/data/processed/bsts_results/summary/` and also a combined `all_bsts_results.csv` in `public/data/processed/bsts_results/`.
    *   This script can take a significant amount of time to run, especially on machines with fewer cores, even with parallel processing enabled.
    ```R
    # In R console
    source("preprocessing/R/analysis.R")
    ```
4.  **`preprocessing/R/process.R`**: This script takes the `all_bsts_results.csv` (output from `analysis.R`) and further processes it to create the final aggregated CSV and JSON files used by the frontend visualization. 
    *   It creates time-series data, fills in any gaps for location-category pairs that were skipped by `analysis.R` (due to insufficient data) with placeholder values (typically 0 damage, medium uncertainty), ensuring a complete dataset structure.
    *   It generates key files like `all_summary_processed.csv`, `all_summary_aggregated.csv`, `map_data.json`, and individual category summary files in `public/data/processed/`.
    ```R
    # In R console
    source("preprocessing/R/process.R")
    ```

### Output of R Pipeline

After successful completion, the R pipeline generates various processed files primarily in `public/data/processed/` and `public/data/processed/bsts_results/`. Key files for the frontend include:

*   `public/data/processed/all_summary_processed.csv`: Comprehensive time-series data for all location-category pairs, with 5-minute intervals, including placeholders for unmodeled combinations.
*   `public/data/processed/all_summary_aggregated.csv`: Hourly aggregated summary data.
*   `public/data/processed/map_data.json`: Data structured specifically for the ECharts map component, usually representing the latest hourly data.
*   `public/data/processed/category_summary_aggregated.json`: Aggregated data per category, used for the category comparison chart.
*   Various other JSON files per category (e.g., `buildings_summary.json`) and the detailed BSTS outputs.

## Option 2: JavaScript Preprocessing (Simple)

### Prerequisites

To run the JavaScript preprocessing pipeline, you need:
1. [Node.js](https://nodejs.org/) (version 14+ recommended)

### How to Run

#### On Windows

1. Navigate to this directory
2. Double-click the `run_js_preprocessing.bat` file
3. Wait for the preprocessing to complete

#### On macOS/Linux

Node.js preprocessing on macOS/Linux can be run directly:

```bash
# Install required packages
npm install csv-parse

# Run the script
node preprocess.js
```

## Output

Both preprocessing pipelines generate JSON files in the `public/data/processed` directory:

- `processed_data.json`: The main file containing all processed data

The R pipeline generates additional files with more detailed data:

- `neighborhoods_summary.json`: Summary data for all neighborhoods
- `neighborhood_*.json`: Detailed data for each neighborhood
- `timeseries_*.json`: Time series data for each damage category
- `uncertainty_data.json`: Uncertainty metrics based on Bayesian analysis

## Technical Details

### R Pipeline

The R preprocessing pipeline performs the following steps:

1.  **Package Installation (`install_packages.R`)**: Ensures all necessary R packages are installed.
2.  **Data Cleaning and Initial Transformation (`data_preparation.R`)**: Handles missing values, converts date formats, and converts raw data to a long format. Generates `mc1-reports-data-long.csv` and `mc1-reports-counts.csv`.
3.  **Bayesian Analysis (`analysis.R`)**: Applies Bayesian structural time series (BSTS) modeling to quantify uncertainty for location-category pairs with sufficient data (typically >= 5 reports). Outputs detailed BSTS results and a combined `all_bsts_results.csv`.
4.  **Aggregation and Final Output Generation (`process.R`)**: Aggregates BSTS results, creates regular time series, generates placeholder data for unmodeled location-category pairs (due to sparse initial data), and produces the final JSON and CSV files (e.g., `all_summary_processed.csv`, `map_data.json`) optimized for the web visualization.

### JavaScript Pipeline

The JavaScript preprocessing pipeline performs similar but simpler steps:

1. **Data cleaning**: Handles missing values and basic validation
2. **Data transformation**: Converts columnar data to row format if needed
3. **Aggregation**: Groups data by neighborhood, category, and time
4. **Basic statistics**: Calculates averages and standard deviations
5. **Output generation**: Creates a single optimized JSON file

## Bayesian Uncertainty Quantification (R Pipeline Only)

The R pipeline uses Bayesian structural time series (BSTS) with a local level state to model the reported ratings. The model yields:

- **MAP (Maximum A Posteriori)**: The most likely value of the actual mean
- **CI (Credible Interval)**: The subjective probability of the most likely interval of the mean
- **CIR (Credible Interval Range)**: The width of the credible interval, representing uncertainty

We calculate uncertainty by the 95% credible intervals range. The smaller the range, the more certain the estimate.

## References

This approach is based on the award-winning solution for the VAST Challenge 2019 MC1:
- [VAST Challenge 2019 MC1 Repository](https://github.com/na399/VAST-Challenge-2019-MC1)
- Scott S L, Varian H R (2013), "Predicting the Present with Bayesian Structural Time Series"
- Correll M, Moritz D, Heer J (2018), "Value-Suppressing Uncertainty Palettes" 