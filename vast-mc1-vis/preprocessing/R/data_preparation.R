# Data Preparation
# Transforms raw data to formats ready for analysis

# Required libraries
library(tidyverse)
library(lubridate)
library(jsonlite)

# Smart directory handling
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

# Configuration
# --- UPDATED PATHS ---
# Assuming input CSV is also moved to public/data. Adjust if it's elsewhere.
INPUT_CSV <- "public/data/mc1-reports-data.csv" 
# Output directory is now within public/data
OUTPUT_DIR <- "public/data/processed/"
# Output file paths are relative to the project root, pointing into public/data/processed
OUTPUT_CSV <- file.path(OUTPUT_DIR, "prepared_data.csv") 
LONG_FORMAT_CSV <- file.path(OUTPUT_DIR, "mc1-reports-data-long.csv")
# --- END UPDATED PATHS ---

# Create output directory if it doesn't exist
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)

# Define location IDs to match original
loc_ids <- as.character(1:19)

# Verify input file exists
if (!file.exists(INPUT_CSV)) {
  stop(paste("Error: Input file", INPUT_CSV, "not found in", getwd()))
}

# Read data
cat("Reading data from", INPUT_CSV, "\n")
cat("Working directory:", getwd(), "\n")
raw_data <- read_csv(
  INPUT_CSV,
  col_types = cols(
    buildings = col_number(),
    medical = col_number(),
    power = col_number(),
    roads_and_bridges = col_number(),
    sewer_and_water = col_number(),
    shake_intensity = col_number(),
    time = col_datetime(format = "%Y-%m-%d %H:%M:%S"),
    location = col_character()
  )
)

# Define location names (matching the original data)
loc_names <- c(
  "Palace Hills", "Northwest", "Old Town", "Safe Town", "Southwest",
  "Downtown", "Wilson Forest", "Scenic Vista", "Broadview", "Chapparal",
  "Terrapin Springs", "Pepper Mill", "Cheddarford", "Easton", "Weston",
  "Southton", "Oak Willow", "East Parton", "West Parton"
)

# SIMPLIFY: Just transform to long format like original solution
# Minimal transformation to preserve raw data characteristics
dataset_long <- raw_data %>%
  # Convert to long format - each row is one rating
  gather(
    "category",
    "rating",  # Use 'rating' as in original
    c(
      "buildings", "medical", "power",
      "roads_and_bridges", "sewer_and_water", "shake_intensity"
    )
  ) %>%
  # Keep only valid ratings
  filter(!is.na(rating)) %>%
  # Ensure location is properly formatted
  mutate(
    # Format time as string for compatibility
    time_string = format(time, "%Y-%m-%d %H:%M:%S"),
    # Ensure location is character type
    location = as.character(location)
  )

# Save long format data
write_csv(dataset_long, LONG_FORMAT_CSV)
cat("Long format data saved to", LONG_FORMAT_CSV, "\n")

# Save long format data as JSON
OUTPUT_JSON_RAW_REPORTS <- "public/data/mc1-reports-data.json" # Define the output path
jsonlite::write_json(dataset_long, OUTPUT_JSON_RAW_REPORTS, pretty = TRUE, auto_unbox = TRUE)
cat("Long format data also saved to", OUTPUT_JSON_RAW_REPORTS, "\n")

# Create simple aggregation for counting frequencies
# This preserves data distribution while creating useful summaries
aggregated_counts <- dataset_long %>%
  group_by(location, category, time) %>%
  count(rating) %>%
  ungroup()

# Save count aggregation
write_csv(aggregated_counts, file.path(OUTPUT_DIR, "mc1-reports-counts.csv"))
cat("Count aggregation saved to", file.path(OUTPUT_DIR, "mc1-reports-counts.csv"), "\n")

# Generate a version with synthetic variance if needed
# This adds tiny random noise to each rating to ensure variance
dataset_with_variance <- dataset_long %>%
  # Add small random noise to ensure variance (will be rounded later in analysis)
  mutate(
    rating_with_noise = rating + runif(n(), -0.1, 0.1),
    # Add other useful fields for visualization
    loc_name = sapply(location, function(loc) {
      loc_num <- as.numeric(loc)
      if (!is.na(loc_num) && loc_num >= 1 && loc_num <= length(loc_names)) {
        return(loc_names[loc_num])
      } else {
        return(paste("Location", loc))
      }
    })
  )

# Save enhanced data
write_csv(dataset_with_variance, OUTPUT_CSV)
cat("Dataset with variance saved to", OUTPUT_CSV, "\n")

# Create JSON data for web visualization
json_data <- list(
  metadata = list(
    description = "VAST Challenge 2019 MC1 processed data",
    categories = c("buildings", "medical", "power", 
                  "roads_and_bridges", "sewer_and_water", "shake_intensity"),
    locations = setNames(as.list(1:length(loc_names)), loc_names),
    timeRange = c(min(dataset_long$time), max(dataset_long$time))
  ),
  
  # Include frequency data by category
  frequencyData = aggregated_counts %>%
    group_by(category, rating) %>%
    summarize(count = sum(n), .groups = "drop") %>%
    group_by(category) %>%
    group_split() %>%
    setNames(unique(aggregated_counts$category))
)

# Save JSON data
write_json(json_data, file.path(OUTPUT_DIR, "mc1_processed_data.json"), pretty = TRUE, auto_unbox = TRUE)
cat("JSON data for visualization saved to", file.path(OUTPUT_DIR, "mc1_processed_data.json"), "\n")

cat("Data preparation complete\n") 