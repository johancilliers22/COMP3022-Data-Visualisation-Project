# Post-processing of BSTS Results
# Aggregates and transforms BSTS results for visualization

# Required libraries
library(tidyverse)
library(jsonlite)
library(lubridate)
library(zoo) # For na.locf (Last Observation Carried Forward)

# Smart directory handling - same as in analysis.R
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
INPUT_FILE <- "src/data/processed/bsts_results/all_bsts_results.csv"
OUTPUT_DIR <- "src/data/processed/"
# TIMELINE_JSON path was defined but unused, keeping it commented/removed or update if needed
# TIMELINE_JSON <- "src/data/processed/timeline_data.json"

# Create output directory if it doesn't exist
# Note: This script writes several files into OUTPUT_DIR and its subdirectory bsts_results
# The paths constructed using file.path(OUTPUT_DIR, ...) will now correctly point into src/data/processed/
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)

# Define location names (from original process.R)
loc_names <- c(
  "Palace Hills",
  "Northwest",
  "Old Town",
  "Safe Town",
  "Southwest",
  "Downtown",
  "Wilson Forest",
  "Scenic Vista",
  "Broadview",
  "Chapparal",
  "Terrapin Springs",
  "Pepper Mill",
  "Cheddarford",
  "Easton",
  "Weston",
  "Southton",
  "Oak Willow",
  "East Parton",
  "West Parton"
)

# Load BSTS results
cat("Loading BSTS results...\n")
if (!file.exists(INPUT_FILE)) {
  stop(paste("Error: Input file", INPUT_FILE, "not found. Run analysis.R first."))
}

# Fix: Explicitly specify column types and read time directly as ISO 8601 datetime
data <- read_csv(INPUT_FILE, 
               col_types = cols(
                 time = col_datetime(format = "%Y-%m-%dT%H:%M:%SZ"), # Use ISO 8601 format
                 location = col_character(),
                 category = col_character(),
                 mean = col_double(),
                 map = col_double(),
                 ci_lower_95 = col_double(),
                 ci_upper_95 = col_double(),
                 # ci_lower_90 = col_double(), # Assuming these are present, if not add guess() or remove
                 # ci_upper_90 = col_double(),
                 # ci_lower_80 = col_double(),
                 # ci_upper_80 = col_double(),
                 # ci_lower_50 = col_double(),
                 # ci_upper_50 = col_double(),
                 CIRatMaxMAP = col_double(), # Expect this column instead of cir
                 certainty_level = col_character()
                 # Add '.default = col_guess()' if other columns might exist and need guessing
                 # Or explicitly list all expected columns if known and fixed
               ),
               # Handle potential parsing issues by setting NA for problematic fields
               na = c("", "NA", "NULL")) # Define strings to interpret as NA

# Modify the check for valid times - now check directly after reading
if (all(is.na(data$time))) {
  # Add a check for parsing problems
  problems_df <- problems(data)
  if (nrow(problems_df) > 0) {
    cat("Parsing problems encountered:\n")
    print(problems_df)
  }
  cat("Warning: No valid time data found after parsing in the BSTS results CSV. Check analysis.R output format or the CSV file itself.\n")
  cat("Creating synthetic time data for visualization purposes...\n")
  
  # Create synthetic time data based on the St. Himark disaster timeline
  start_time <- as.POSIXct("2020-04-06 00:00:00", tz="UTC")
  data <- data %>%
    mutate(time = start_time) # Set all rows to same starting time
} else {
  cat("Valid time data found in BSTS results.\n")
}

# Process by category
categories <- unique(data$category)
cat("Processing", length(categories), "categories...\n")

# Storage for aggregated data
all_summary <- tibble()
all_aggregated <- tibble()

# Default time range for the St. Himark disaster
default_time_min <- as.POSIXct("2020-04-06 00:00:00", tz="UTC")
default_time_max <- as.POSIXct("2020-04-10 23:59:59", tz="UTC")

process_category <- function(category_name) {
  cat("Processing category:", category_name, "\n")
  
  # Filter data for this category
  cat_data <- data %>%
    filter(category == category_name)
  
  # Process each location for this category
  # locations <- unique(cat_data$location) # OLD: Iterate only over locations present in BSTS results for this category

  # Create time sequence
  # Fix: Better handling of time range
  if (nrow(cat_data) == 0 || all(is.na(cat_data$time))) {
    cat("Warning: No valid data for category", category_name, ". Using default time range.\n")
    time_min <- default_time_min
    time_max <- default_time_max
  } else {
    # Try to get actual time range, with fallbacks
    time_range <- tryCatch({
      range(cat_data$time, na.rm = TRUE)
    }, error = function(e) {
      cat("Warning: Error calculating time range:", e$message, "\n")
      c(default_time_min, default_time_max)
    })
    
    # Validate time range values
    if (length(time_range) != 2 || any(is.na(time_range)) || 
        is.infinite(time_range[1]) || is.infinite(time_range[2]) ||
        time_range[1] > time_range[2]) {
      cat("Warning: Invalid time range for category", category_name, ". Using default time range.\n")
      time_min <- default_time_min
      time_max <- default_time_max
    } else {
      time_min <- floor_date(time_range[1], "day")
      time_max <- ceiling_date(time_range[2], "day")
    }
  }
  
  # Create sequence of times at 5-minute intervals
  time_seq <- seq(
    from = time_min,
    to = time_max,
    by = "5 min"
  )
  
  # Define all expected location IDs as characters
  all_expected_loc_ids <- as.character(1:19)

  # Process each location
  # location_results <- lapply(locations, function(loc) { # OLD LOOP
  location_results <- lapply(all_expected_loc_ids, function(current_loc_id_char) { # NEW LOOP: Iterate over all defined location IDs
    
    # loc_data <- cat_data %>% # OLD: Based on loc from the filtered list
    #   filter(location == loc) %>%
    #   arrange(time)
    loc_data_for_current_id <- cat_data %>%
      filter(location == current_loc_id_char) %>% # Filter cat_data for the current_loc_id_char
      arrange(time)
    
    # Fix: Handle empty location data
    # if (nrow(loc_data) == 0) { # OLD check
    if (nrow(loc_data_for_current_id) == 0) { # NEW check
      cat("Info: No BSTS data for location ID", current_loc_id_char, "in category", category_name, ". Creating placeholder data.\n") # Modified log message
      
      # Create placeholder data with default values
      return(tibble(
        time = time_seq,
        location = current_loc_id_char, # Use character ID
        category = category_name,
        map = rep(0, length(time_seq)),
        mean = rep(0, length(time_seq)),
        ci_lower_95 = rep(0, length(time_seq)),
        ci_upper_95 = rep(0, length(time_seq)),
        CIRatMaxMAP = rep(5, length(time_seq)), 
        certainty_level = rep("medium", length(time_seq)),
        latest_update = time_min, # Use time_min from the broader category context
        time_diff = as.numeric(difftime(time_seq, time_min, units = "secs")),
        in15min = rep(0, length(time_seq)), 
        in60min = rep(0, length(time_seq)),
        over60min = rep(1, length(time_seq)), 
        loc_name = loc_names[as.numeric(current_loc_id_char)] # Ensure using the current ID for lookup
      ))
    }
    
    # Create complete time sequence for this location
    # Use loc_data_for_current_id from now on instead of loc_data
    complete_data <- tibble(
      time = time_seq,
      location = current_loc_id_char, # Use character ID
      category = category_name
    ) %>%
      left_join(loc_data_for_current_id, by = c("time", "location", "category")) # Join on character location
    
    # Fix: Get latest update time with proper error handling
    latest_update_time <- tryCatch({
      max(loc_data_for_current_id$time, na.rm = TRUE) # Use loc_data_for_current_id
    }, error = function(e) {
      time_min # Fallback to time_min if error
    })
    
    # If latest update time is not valid, use time_min as fallback
    if (is.na(latest_update_time) || is.infinite(latest_update_time)) {
      latest_update_time <- time_min
    }
    
    # Fill missing values using Last Observation Carried Forward
    filled_data <- complete_data %>%
      mutate(
        # For numeric columns, use LOCF
        map = ifelse(is.na(map), 0, map),  # Replace NA with 0 first
        map = na.locf(map, na.rm = FALSE),
        mean = ifelse(is.na(mean), 0, mean),
        mean = na.locf(mean, na.rm = FALSE),
        ci_lower_95 = ifelse(is.na(ci_lower_95), 0, ci_lower_95),
        ci_lower_95 = na.locf(ci_lower_95, na.rm = FALSE),
        ci_upper_95 = ifelse(is.na(ci_upper_95), 0, ci_upper_95),
        ci_upper_95 = na.locf(ci_upper_95, na.rm = FALSE),
        CIRatMaxMAP = ifelse(is.na(CIRatMaxMAP), 5, CIRatMaxMAP),  # Use CIRatMaxMAP, Default CIR = 5
        CIRatMaxMAP = na.locf(CIRatMaxMAP, na.rm = FALSE),
        certainty_level = ifelse(is.na(certainty_level), "medium", certainty_level),
        certainty_level = na.locf(certainty_level, na.rm = FALSE),
        
        # Add time calculations as in original process.R
        latest_update = latest_update_time,
        time_diff = as.numeric(difftime(time, latest_update_time, units = "secs")),
        
        # Add time interval flags
        in15min = ifelse(time_diff <= 15 * 60, 1, 0),
        in60min = ifelse((15 * 60 < time_diff) & (time_diff <= 60 * 60), 1, 0),
        over60min = ifelse(60 * 60 < time_diff, 1, 0),
        
        # Add location name
        loc_name = loc_names[as.numeric(current_loc_id_char)] # Ensure using the current ID for lookup
      )
    
    # Round numeric columns to 2 decimal places to reduce file size
    filled_data <- filled_data %>%
      mutate(across(c(map, mean, ci_lower_95, ci_upper_95, CIRatMaxMAP), round, 2)) # Use CIRatMaxMAP
    
    return(filled_data)
  })
  
  # Combine all locations for this category
  combined_cat_data <- bind_rows(location_results)
  
  # Save category data
  output_file <- file.path(
    OUTPUT_DIR, 
    paste0(gsub(" ", "_", tolower(category_name)), "_summary_processed.csv")
  )
  
  # Write CSV
  write_csv(combined_cat_data, output_file)
  
  # Add to overall summary
  all_summary <<- bind_rows(all_summary, combined_cat_data)
  
  # Fix: Handle potential aggregation errors
  tryCatch({
    # Create hourly aggregated data (from original process.R)
    aggregated_data <- combined_cat_data %>%
      # Group by hour for time series visualization
      mutate(dateHour = format(time, "%Y-%m-%d %H:00:00")) %>%
      group_by(location, loc_name, category, dateHour) %>%
      summarize(
        map = max(map, na.rm = TRUE),
        avgMAP = mean(map, na.rm = TRUE),
        maxCIR = max(CIRatMaxMAP, na.rm = TRUE),
        avgCIR = mean(CIRatMaxMAP, na.rm = TRUE),
        CIRatMaxMAP = first(CIRatMaxMAP[which(map == max(map, na.rm = TRUE))]),
        .groups = "drop"
      )
    
    # Add to overall aggregated data
    all_aggregated <<- bind_rows(all_aggregated, aggregated_data)
    
    # Save aggregated data
    agg_output_file <- file.path(
      OUTPUT_DIR, 
      paste0(gsub(" ", "_", tolower(category_name)), "_summary_aggregated.csv")
    )
    
    # Write CSV
    write_csv(aggregated_data, agg_output_file)
    
    # Also save all_aggregated as JSON
    OUTPUT_JSON_AGG_SUMMARY <- file.path(OUTPUT_DIR, "all_summary_aggregated.json") # Define the output path
    jsonlite::write_json(all_aggregated, OUTPUT_JSON_AGG_SUMMARY, pretty = TRUE, auto_unbox = TRUE)
    cat("Aggregated summary data also saved to", OUTPUT_JSON_AGG_SUMMARY, "\n")
  }, error = function(e) {
    cat("Warning: Error creating aggregated data for category", category_name, ":", e$message, "\n")
  })
  
  # Create JSON version for web visualization with optimized structure for the frontend
  json_output_file <- file.path(
    OUTPUT_DIR, 
    paste0(gsub(" ", "_", tolower(category_name)), "_summary.json")
  )
  
  # Create optimized JSON structure - group by location for faster lookups
  location_grouped_data <- combined_cat_data %>%
    select(
      time, location, loc_name, map, mean, ci_lower_95, ci_upper_95, 
      cir = CIRatMaxMAP, # Rename CIRatMaxMAP to cir for consistency in this specific output if needed by frontend
      certainty_level, time_diff, in15min, in60min, over60min
    ) %>%
    nest(data = c(-location, -loc_name)) %>%
    mutate(
      # Add summary stats per location
      stats = map(data, function(d) {
        list(
          maxValue = max(d$map, na.rm = TRUE),
          avgValue = mean(d$map, na.rm = TRUE),
          minValue = min(d$map, na.rm = TRUE),
          maxUncertainty = max(d$cir, na.rm = TRUE), # Use the renamed 'cir' here
          avgUncertainty = mean(d$cir, na.rm = TRUE), # Use the renamed 'cir' here
          timePoints = nrow(d)
        )
      })
    )
  
  # Write optimized JSON
  write_json(location_grouped_data, json_output_file, pretty = TRUE, auto_unbox = TRUE)
  
  return(combined_cat_data)
}

# Process each category
cat_results <- tryCatch({
  lapply(categories, process_category)
}, error = function(e) {
  cat("Error processing categories:", e$message, "\n")
  list() # Return empty list on error
})

# Fix: Guard against empty results
if (nrow(all_summary) == 0) {
  cat("Warning: No valid summary data generated. Creating placeholder data...\n")
  
  # Create placeholder data
  for (cat in categories) {
    for (loc in 1:19) {
      # Add minimal placeholder data
      placeholder <- tibble(
        time = default_time_min,
        location = loc,
        loc_name = loc_names[loc],
        category = cat,
        map = 0,
        mean = 0,
        ci_lower_95 = 0,
        ci_upper_95 = 0,
        CIRatMaxMAP = 5,
        certainty_level = "medium",
        latest_update = default_time_min,
        time_diff = 0,
        in15min = 1,
        in60min = 0,
        over60min = 0
      )
      all_summary <- bind_rows(all_summary, placeholder)
    }
  }
}

# Save combined summary data
write_csv(
  all_summary,
  file.path(OUTPUT_DIR, "all_summary_processed.csv")
)

# Handle potential empty aggregated data
if (nrow(all_aggregated) == 0) {
  cat("Warning: No valid aggregated data. Creating placeholder aggregated data...\n")
  
  # Create minimal aggregated data
  for (cat in categories) {
    for (loc in 1:19) {
      placeholder_agg <- tibble(
        location = loc,
        loc_name = loc_names[loc],
        category = cat,
        dateHour = format(default_time_min, "%Y-%m-%d %H:00:00"),
        map = 0,
        avgMAP = 0,
        maxCIR = 5,
        avgCIR = 5,
        CIRatMaxMAP = 5
      )
      all_aggregated <- bind_rows(all_aggregated, placeholder_agg)
    }
  }
}

write_csv(
  all_aggregated,
  file.path(OUTPUT_DIR, "all_summary_aggregated.csv")
)

# Create visualization data for frontend with error handling
visualization_data <- tryCatch({
  list(
    locations = data %>%
      group_by(location) %>%
      summarize(
        loc_name = loc_names[as.numeric(location)],
        categories = list(unique(category)),
        avg_damage = mean(map, na.rm = TRUE),
        max_damage = max(map, na.rm = TRUE),
        avg_uncertainty = mean(CIRatMaxMAP, na.rm = TRUE), # Use CIRatMaxMAP
        last_update = max(time, na.rm = TRUE),
        .groups = "drop"
      ),
    categories = setNames(
      lapply(categories, function(cat) {
        data %>%
          filter(category == cat) %>%
          group_by(location) %>%
          summarize(
            loc_name = loc_names[as.numeric(location)],
            max_value = max(map, na.rm = TRUE),
            avg_value = mean(map, na.rm = TRUE),
            avg_uncertainty = mean(CIRatMaxMAP, na.rm = TRUE), # Use CIRatMaxMAP
            .groups = "drop"
          )
      }),
      categories
    )
  )
}, error = function(e) {
  cat("Error creating visualization data:", e$message, "\n")
  
  # Return minimal visualization data on error
  list(
    locations = tibble(
      location = 1:19,
      loc_name = loc_names,
      categories = replicate(19, list(categories)),
      avg_damage = rep(0, 19),
      max_damage = rep(0, 19),
      avg_uncertainty = rep(5, 19),
      last_update = rep(default_time_min, 19)
    ),
    categories = setNames(
      lapply(categories, function(cat) {
        tibble(
          location = 1:19,
          loc_name = loc_names,
          max_value = rep(0, 19),
          avg_value = rep(0, 19),
          avg_uncertainty = rep(5, 19)
        )
      }),
      categories
    )
  )
})

# Save visualization data
write_json(
  visualization_data,
  file.path(OUTPUT_DIR, "visualization_data.json"),
  pretty = TRUE,
  auto_unbox = TRUE
)

# Create optimized data for direct use in map component with error handling
map_data <- tryCatch({
  all_summary %>%
    # Get the latest value for each location and category at each hour
    mutate(hour = floor_date(time, "hour")) %>%
    group_by(hour, location, loc_name, category) %>%
    filter(time == max(time)) %>%
    ungroup() %>%
    # Select fields needed for map display
    select(
      time = hour, 
      location, 
      loc_name, 
      category, 
      value = map, 
      uncertainty = CIRatMaxMAP, # Use CIRatMaxMAP
      certainty_level,
      ci_lower = ci_lower_95,
      ci_upper = ci_upper_95
    ) %>%
    # Create nested structure by time > category > location
    nest(loc_data = c(location, loc_name, value, uncertainty, certainty_level, ci_lower, ci_upper)) %>%
    group_by(time) %>%
    nest(cat_data = c(category, loc_data))
}, error = function(e) {
  cat("Error creating map data:", e$message, "\n")
  
  # Create minimal map data
  tibble(
    time = default_time_min,
    cat_data = list(
      tibble(
        category = categories[1],
        loc_data = list(
          tibble(
            location = 1:19,
            loc_name = loc_names,
            value = rep(0, 19),
            uncertainty = rep(5, 19), # Default uncertainty
            certainty_level = rep("medium", 19),
            ci_lower = rep(0, 19),
            ci_upper = rep(0, 19)
          )
        )
      )
    )
  )
})

# Save map data
write_json(
  map_data,
  file.path(OUTPUT_DIR, "map_data.json"),
  pretty = TRUE,
  auto_unbox = TRUE
)

# Create combined frontend data optimized for the JavaScript visualization
frontend_data <- list(
  metadata = list(
    generatedAt = Sys.time(),
    dataPoints = nrow(data),
    timeRange = list(
      min = default_time_min,
      max = default_time_max
    ),
    categories = categories,
    locations = setNames(as.list(1:length(loc_names)), loc_names)
  ),
  locations = visualization_data$locations,
  timeSeriesData = setNames(
    lapply(categories, function(cat) {
      # Try to use real data, but fall back to placeholder
      tryCatch({
        data %>%
          filter(category == cat) %>%
          arrange(time) %>%
          group_by(time) %>%
          summarize(
            max_map = max(map, na.rm = TRUE),
            avg_map = mean(map, na.rm = TRUE),
            max_cir = max(CIRatMaxMAP, na.rm = TRUE), # Use CIRatMaxMAP
            .groups = "drop"
          ) %>%
          select(time, max_map, avg_map, max_cir) # Use max_cir here
      }, error = function(e) {
        # Create placeholder time series data
        tibble(
          time = seq(default_time_min, default_time_max, by = "1 hour"),
          max_map = rep(0, 24 * 5), # Adjust length for 5 days (Apr 6-10)
          avg_map = rep(0, 24 * 5),
          max_cir = rep(5, 24 * 5)  # Default uncertainty
        )
      })
    }),
    categories
  ),
  uncertainty = all_summary %>%
    select(time, location, loc_name, category, map, ci_lower_95, ci_upper_95, cir = CIRatMaxMAP, certainty_level, time_diff) # Rename CIRatMaxMAP
)

# Save frontend data
write_json(
  frontend_data,
  file.path(OUTPUT_DIR, "frontend_data.json"),
  pretty = TRUE,
  auto_unbox = TRUE
)

# Create neighborhood lookup map for JS to use
neighborhood_map <- tibble(
  id = 1:19,
  name = loc_names
)

write_json(
  neighborhood_map,
  file.path(OUTPUT_DIR, "neighborhood_map.json"),
  pretty = TRUE,
  auto_unbox = TRUE
)

cat("All data processed and saved to", OUTPUT_DIR, "\n")
cat("Generated files are ready for the visualization frontend\n") 