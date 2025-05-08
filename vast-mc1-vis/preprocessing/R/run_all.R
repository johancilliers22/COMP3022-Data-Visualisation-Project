# Run All R Scripts
# Master script to run all data processing steps in sequence

# First, source the package installation script
source("preprocessing/R/install_packages.R")

# Load required libraries (should already be installed)
library(tidyverse)
library(readr)
library(jsonlite)

# Define the root directory
set_correct_directory <- function() {
  current_dir <- getwd()
  
  # Check if we're in vast-mc1-vis
  if (basename(current_dir) == "vast-mc1-vis") {
    return(TRUE)
  }
  
  # Check if we're in the root and vast-mc1-vis exists
  if (dir.exists("vast-mc1-vis")) {
    setwd("vast-mc1-vis")
    return(TRUE)
  }
  
  # Check if we're in preprocessing/R and need to go up two levels
  if (basename(current_dir) == "R" && basename(dirname(current_dir)) == "preprocessing") {
    setwd("../..")
    return(TRUE)
  }
  
  return(FALSE)
}

# Try to set the correct directory
if (!set_correct_directory()) {
  stop("Error: Could not find vast-mc1-vis directory. Please run this script from the project root or vast-mc1-vis directory.")
}

# Output intro message
cat("=======================================================\n")
cat("VAST Challenge 2019 MC1 Data Processing Pipeline\n")
cat("Based on award-winning solution approach\n")
cat("Working directory:", getwd(), "\n")
cat("=======================================================\n\n")

# Helper function to run a script and capture its output
run_script <- function(script_path, script_name) {
  cat(paste("Running", script_name, "...\n"))
  
  # Construct full path
  full_path <- file.path("preprocessing/R", script_path)
  
  # Check if the script exists
  if (!file.exists(full_path)) {
    stop(paste("Script not found:", full_path))
  }
  
  # Run the script (source will execute it in the current environment)
  cat(paste("Executing", full_path, "\n"))
  start_time <- Sys.time()
  
  # Create a new environment for the script to run in
  # This helps prevent variable name conflicts
  script_env <- new.env()
  
  tryCatch({
    source(full_path, local = script_env)
    end_time <- Sys.time()
    elapsed <- end_time - start_time
    cat(paste("Completed", script_name, "in", round(elapsed, 2), "seconds\n\n"))
    return(TRUE)
  }, error = function(e) {
    cat(paste("Error in", script_name, "-", e$message, "\n"))
    return(FALSE)
  })
}

# Create output directories if they don't exist
output_dirs <- c(
  "public/data/processed",
  "public/data/processed/bsts_results",
  "public/data/processed/bsts_results/summary"
)

for (dir in output_dirs) {
  if (!dir.exists(dir)) {
    dir.create(dir, recursive = TRUE, showWarnings = FALSE)
    cat(paste("Created directory:", dir, "\n"))
  }
}

# Check for input data
if (!file.exists("public/data/mc1-reports-data.csv")) {
  stop("Input data file not found. Please place mc1-reports-data.csv in the public/data directory.")
}

# Run scripts in sequence
cat("Starting data processing pipeline...\n\n")

# Step 1: Data preparation
data_prep_success <- run_script("data_preparation.R", "Data Preparation")

if (!data_prep_success) {
  stop("Data preparation failed. Stopping pipeline.")
}

# Step 2: Run analysis (BSTS)
analysis_success <- run_script("analysis.R", "BSTS Analysis")

if (!analysis_success) {
  warning("BSTS analysis had errors. Pipeline will continue but results may be incomplete.")
}

# Step 3: Any additional processing
# process_success <- run_script("process.R", "Additional Processing")

# Verify outputs exist
expected_outputs <- c(
  "public/data/processed/prepared_data.csv",
  "public/data/processed/mc1-reports-data-long.csv",
  "public/data/processed/mc1_processed_data.json"
)

missing_outputs <- c()
for (output in expected_outputs) {
  if (!file.exists(output)) {
    missing_outputs <- c(missing_outputs, output)
  }
}

if (length(missing_outputs) > 0) {
  warning(paste("Some expected outputs are missing:", 
                paste(missing_outputs, collapse = ", ")))
} else {
  cat("All expected outputs have been created successfully.\n")
}

# Final status report
cat("\nData processing pipeline complete!\n")
cat("Files are available in public/data/processed/\n")
cat("Visualization data is ready to be used by the web application.\n")

# Step 4: Post-processing
cat("STEP 4: Post-processing results...\n")
source("preprocessing/R/process.R")
cat("Post-processing complete.\n\n")

# Step 5: Verify output files
cat("STEP 5: Verifying output files...\n")
expected_files <- c(
  "public/data/processed/frontend_data.json",
  "public/data/processed/map_data.json",
  "public/data/processed/visualization_data.json",
  "public/data/processed/bsts_results/all_bsts_results.json",
  "public/data/processed/neighborhood_map.json"
)

missing_files <- expected_files[!file.exists(expected_files)]

if (length(missing_files) > 0) {
  cat("WARNING: The following expected output files are missing:\n")
  cat(paste("  -", missing_files), sep = "\n")
  cat("\n")
} else {
  cat("All expected output files have been created successfully.\n\n")
}

# Completion message
cat("=======================================================\n")
cat("Processing pipeline complete!\n")
cat("Results are available in public/data/processed/\n")
cat("=======================================================\n")
cat("The following files are ready for visualization:\n")
cat("- frontend_data.json: Combined data for the web application\n")
cat("- map_data.json: Optimized data for the map visualization\n")
cat("- visualization_data.json: Summary data for maps and dashboards\n")
cat("- neighborhood_map.json: Mapping of neighborhood IDs to names\n")
cat("- shake_intensity_summary.json, buildings_summary.json, etc: Category-specific data\n\n")

# Get file sizes to report
file_sizes <- sapply(expected_files, function(f) {
  if (file.exists(f)) {
    size <- file.info(f)$size / 1024 / 1024  # Convert to MB
    return(sprintf("%.2f MB", size))
  } else {
    return("MISSING")
  }
})

cat("File sizes:\n")
for (i in 1:length(expected_files)) {
  cat(sprintf("- %s: %s\n", basename(expected_files[i]), file_sizes[i]))
}
cat("\n")

cat("To visualize the data, run the web application using:\n")
cat("  npm start\n")
cat("=======================================================\n") 