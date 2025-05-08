# Bayesian Structural Time Series Analysis
# Direct implementation based on the award-winning solution

# Required libraries
library(readr)
library(bsts)
library(tidyverse)
library(coda)
library(bayestestR)
library(doFuture)
library(future)
library(future.apply)  # Add for more parallel options
library(parallelly)    # Add for better parallel utilities
library(jsonlite)      # For write_json function
library(progressr)     # For progress reporting

# Define location IDs
loc_ids <- c(
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19"
)

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

# Set paths for input and output
RAW_DATA_PATH <- "public/data/mc1-reports-data.csv"
OUTPUT_DIR <- "public/data/processed/bsts_results/"

# Create output directories
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(paste(OUTPUT_DIR, "summary", sep = "/"), recursive = TRUE, showWarnings = FALSE)

# Load data
cat("Loading raw data...\n")
dataset <- read_csv(
  RAW_DATA_PATH,
  col_types = cols(
    buildings = col_number(),
    medical = col_number(),
    power = col_number(),
    roads_and_bridges = col_number(),
    sewer_and_water = col_number(),
    shake_intensity = col_number(),
    time = col_datetime(format = "%Y-%m-%d %H:%M:%S"),
    location = col_factor(levels = loc_ids)
  )
)

# Ensure all values are positive by using a floor of 0.1
dataset <- dataset %>%
  mutate(
    buildings = pmax(0.1, buildings),
    medical = pmax(0.1, medical),
    power = pmax(0.1, power),
    roads_and_bridges = pmax(0.1, roads_and_bridges),
    sewer_and_water = pmax(0.1, sewer_and_water),
    shake_intensity = pmax(0.1, shake_intensity)
  )

# MAP estimation function
map_estimate <- function(x) {
  d <- density(x)
  return(d$x[which.max(d$y)])
}

# Memory-optimized lapply that cleans up after each iteration
mem_lapply <- function(X, FUN, ...) {
  result <- list()
  for (i in seq_along(X)) {
    result[[i]] <- FUN(X[[i]], ...)
    gc() # Force garbage collection after each iteration
  }
  return(result)
}

# Simpler BSTS analysis function based directly on the original code
run_bsts <- function(data, loc, cat, time_end, out_dir = OUTPUT_DIR) {
  cat("Processing", loc, "-", cat, "with end time", format(time_end), "\n")
  
  # Filter dataset for this location and category
  dataset_filtered <- dataset %>%
    dplyr::filter(location == loc) %>%
    drop_na(!!sym(cat)) %>%
    arrange(time) %>%
    dplyr::filter(time <= time_end)
  
  # Skip if not enough data points
  if (nrow(dataset_filtered) < 5) {
    cat("Skipping", loc, "-", cat, ": insufficient data points\n")
    return(NULL)
  }
  
  # Extract values and create regular time points
  y <- dataset_filtered[[cat]]
  
  # Calculate time range and sequence
  time_min <- min(dataset_filtered$time)
  time_max <- max(dataset_filtered$time)
  # Create regular 5-minute intervals (like in the original code)
  time_points <- seq(time_min, time_max, by = "5 min")
  
  # Add local level model
  ss <- AddLocalLevel(list(), y)
  
  # Run BSTS model - simplified like the original
  model <- tryCatch({
    bsts(
      y,
      ss,
      niter = 300,
      ping = 0,
      seed = 42,
      family = "gaussian"  # Using gaussian distribution
    )
  }, error = function(e) {
    cat("Error in BSTS model for", loc, "-", cat, ":", e$message, "\n")
    return(NULL)
  })
  
  if (is.null(model)) {
    cat("Failed to create BSTS model for", loc, "-", cat, "\n")
    return(NULL)
  }
  
  # Process BSTS results
  burn <- 100
  state <- model$state.contributions
  state <- state[-(1:burn), , , drop = FALSE]
  state <- rowSums(aperm(state, c(1, 3, 2)), dims = 2)
  
  # Calculate summary statistics
  means <- colMeans(state)
  maps <- unlist(apply(state, 2, map_estimate))
  
  # Calculate credible intervals
  hdi95 <- HPDinterval(as.mcmc(state), prob = 0.95)
  hdi90 <- HPDinterval(as.mcmc(state), prob = 0.9)
  hdi80 <- HPDinterval(as.mcmc(state), prob = 0.8)
  hdi50 <- HPDinterval(as.mcmc(state), prob = 0.5)
  
  # Make sure dimensions match
  n_data_points <- length(y)
  n_state_points <- nrow(hdi95)
  
  if (n_data_points != n_state_points) {
    cat("Warning: Mismatch between data points (", n_data_points, 
        ") and state points (", n_state_points, "). Using minimum.\n")
  }
  
  n_points <- min(n_data_points, n_state_points)
  time_points_use <- dataset_filtered$time[1:n_points]
  
  # Create result tibble safely
  mcmc_summary <- tibble(
    category = cat,
    location = loc,
    time = time_points_use,
    mean = means[1:n_points],
    map = maps[1:n_points],
    ci_lower_95 = pmax(0, hdi95[1:n_points, 1]),
    ci_upper_95 = pmin(10, hdi95[1:n_points, 2]),
    ci_lower_90 = pmax(0, hdi90[1:n_points, 1]),
    ci_upper_90 = pmin(10, hdi90[1:n_points, 2]),
    ci_lower_80 = pmax(0, hdi80[1:n_points, 1]),
    ci_upper_80 = pmin(10, hdi80[1:n_points, 2]),
    ci_lower_50 = pmax(0, hdi50[1:n_points, 1]),
    ci_upper_50 = pmin(10, hdi50[1:n_points, 2]),
    CIRatMaxMAP = ci_upper_95 - ci_lower_95,
    certainty_level = case_when(
      CIRatMaxMAP <= 1.25 ~ "very_high",
      CIRatMaxMAP <= 2.5 ~ "high",
      CIRatMaxMAP <= 5 ~ "medium",
      TRUE ~ "low"
    )
  )
  
  # Save to file
  if (out_dir != "") {
    vis_dir_exists <- dir.exists(out_dir)
    if (!vis_dir_exists) {
      dir.create(out_dir, recursive = TRUE)
    }
    
    summary_dir_exists <- dir.exists(paste(out_dir, "summary", sep = "/"))
    if (!summary_dir_exists) {
      dir.create(paste(out_dir, "summary", sep = "/"), recursive = TRUE)
    }
    
    summary_filename <- paste0(
      out_dir, 
      "summary/", 
      "bsts_", loc, "_", cat, 
      "_", format(time_end, "%Y-%m-%d_%H-%M-%S"), 
      ".json"
    )
    
    tryCatch({
      write_json(mcmc_summary, summary_filename, pretty = TRUE, auto_unbox = TRUE)
    }, error = function(e) {
      cat("Error saving JSON to", summary_filename, ":", e$message, "\n")
      # Try saving as CSV as fallback
      write.csv(mcmc_summary, 
                gsub("\\.json$", ".csv", summary_filename), 
                row.names = FALSE)
    })
    
    # Also save in the format expected by visualization
    vis_filename <- paste0(
      out_dir,
      "bsts_", 
      gsub(" ", "_", tolower(loc)), 
      "_", 
      gsub(" ", "_", tolower(cat)), 
      ".json"
    )
    
    tryCatch({
      write_json(mcmc_summary, vis_filename, pretty = TRUE, auto_unbox = TRUE)
    }, error = function(e) {
      cat("Error saving JSON to", vis_filename, ":", e$message, "\n")
      # Try saving as CSV as fallback
      write.csv(mcmc_summary,
                gsub("\\.json$", ".csv", vis_filename),
                row.names = FALSE)
    })
  }
  
  # Force garbage collection to free memory
  gc()
  
  return(mcmc_summary)
}

# Define categories
categories <- c(
  "shake_intensity",
  "buildings", 
  "medical",
  "power",
  "roads_and_bridges",
  "sewer_and_water"
)

# Define time end for analysis - use end of data
time_end <- max(dataset$time)

# Initialize results collection
all_results <- list()

# Enable sequential processing with progress reporting
use_sequential <- FALSE
show_progress <- TRUE

if (use_sequential) {
  cat("Using sequential processing with verbose output...\n")
  
  # Get all location-category combinations
  loc_cat_combinations <- expand.grid(loc = loc_ids, cat = categories, stringsAsFactors = FALSE)
  total_combinations <- nrow(loc_cat_combinations)
  
  cat("Total tasks to process:", total_combinations, "\n")
  
  # Start a timer
  start_time <- Sys.time()
  last_update_time <- start_time
  
  # Initialize all_results
  all_results <- list()
  
  # Process sequentially
  for (i in 1:nrow(loc_cat_combinations)) {
    loc <- loc_cat_combinations$loc[i]
    cat <- loc_cat_combinations$cat[i]
    
    # Show progress
    progress_pct <- round(100 * i / total_combinations)
    current_time <- Sys.time()
    elapsed_total <- difftime(current_time, start_time, units = "mins")
    
    cat(sprintf("[%d/%d - %d%%] Processing location %s, category %s (Elapsed: %.1f min)\n", 
                i, total_combinations, progress_pct, loc, cat, as.numeric(elapsed_total)))
    
    # Update estimate every 10 tasks or 5 minutes
    update_estimate <- (i %% 10 == 0) || (difftime(current_time, last_update_time, units = "mins") > 5)
    
    if (update_estimate && i > 1) {
      avg_time_per_task <- as.numeric(elapsed_total) / i
      remaining_tasks <- total_combinations - i
      est_remaining_time <- avg_time_per_task * remaining_tasks
      
      cat(sprintf("  Estimated time remaining: %.1f minutes (%.1f sec per task)\n", 
                  est_remaining_time, avg_time_per_task * 60))
      
      last_update_time <- current_time
    }
    
    # Run the analysis
    result <- run_bsts(dataset, loc, cat, time_end, out_dir = OUTPUT_DIR)
    
    # Store result if valid
    if (!is.null(result)) {
      all_results <- c(all_results, list(result))
      cat(sprintf("  Completed location %s, category %s - Result saved\n", loc, cat))
    } else {
      cat(sprintf("  Skipped location %s, category %s - No valid result\n", loc, cat))
    }
    
    # Force garbage collection
    gc()
  }
  
  # Show completion time
  end_time <- Sys.time()
  total_time <- difftime(end_time, start_time, units = "mins")
  cat(sprintf("\nAll tasks completed in %.1f minutes\n", as.numeric(total_time)))
  
} else {
  # Configure parallel processing with optimal settings for 8 cores/16 threads
  cat("Setting up parallel processing environment...\n")
  
  # Get system memory and core information for optimized settings
  total_cores <- parallelly::availableCores(logical = TRUE)
  cat(sprintf("System has %d logical cores\n", total_cores))
  
  # Determine optimal number of workers based on available resources
  # Use all but one logical core, but not more than 15 (for 16 thread systems)
  optimal_workers <- min(total_cores - 1, 15)
  
  cat(sprintf("Using %d parallel workers\n", optimal_workers))
  
  # Set up future plan for parallel processing
  plan(multisession, workers = optimal_workers)
  
  # Enable progress bars for parallel processing
  handlers(global = TRUE)
  handlers("progress")
  
  # Get all location-category combinations for parallel processing
  loc_cat_combinations <- expand.grid(loc = loc_ids, cat = categories, stringsAsFactors = FALSE)
  
  # Run a single test first
  cat("Running test analysis...\n")
  test_result <- run_bsts(dataset, "1", "shake_intensity", time_end, out_dir = OUTPUT_DIR)
  
  if (!is.null(test_result)) {
    cat("Test successful. Starting parallel processing...\n")
    
    # Setup progress reporting
    total_tasks <- nrow(loc_cat_combinations)
    cat(sprintf("Processing %d location-category combinations\n", total_tasks))
    
    # Track start time for estimation
    start_time <- Sys.time()
    
    # Process all combinations in parallel with progress reporting
    with_progress({
      p <- progressor(steps = total_tasks)
      
      results <- future_lapply(
        1:nrow(loc_cat_combinations),
        function(i) {
          loc <- loc_cat_combinations$loc[i]
          cat <- loc_cat_combinations$cat[i]
          
          # Update progress (note: this is visible in the main R session)
          p(message = sprintf("Processing %s - %s", loc, cat))
          
          # Process this location-category pair
          result <- run_bsts(dataset, loc, cat, time_end, out_dir = OUTPUT_DIR)
          
          # Free memory immediately after each task
          gc()
          return(result)
        },
        future.seed = TRUE    # Ensure reproducibility in parallel
      )
      
      # Calculate and display elapsed time
      elapsed <- difftime(Sys.time(), start_time, units = "mins")
      cat(sprintf("\nParallel processing completed in %.1f minutes\n", as.numeric(elapsed)))
    })
    
    # Filter out NULL results
    valid_results <- results[!sapply(results, is.null)]
    all_results <- valid_results
    
    cat(sprintf("Processing complete: %d of %d tasks returned valid results\n", 
                length(valid_results), total_tasks))
  } else {
    cat("Test failed, please review error messages.\n")
  }
}

# Process the results if we have any
if (length(all_results) > 0) {
  start_time <- Sys.time()
  cat("Processing final results...\n")
  
  # Combine all results
  cat("Combining all results...\n")
  combined_results <- bind_rows(all_results)
  
  # Save combined results
  tryCatch({
    write_json(
      combined_results, 
      file.path(OUTPUT_DIR, "all_bsts_results.json"), 
      pretty = TRUE, 
      auto_unbox = TRUE
    )
  }, error = function(e) {
    cat("Error saving combined JSON:", e$message, "\n")
    # Try saving as CSV as fallback
    write.csv(
      combined_results,
      file.path(OUTPUT_DIR, "all_bsts_results.csv"),
      row.names = FALSE
    )
  })
  
  # Also save as CSV for other processing
  write_csv(
    combined_results,
    file.path(OUTPUT_DIR, "all_bsts_results.csv")
  )
  
  # Create aggregated category summary for the Category Comparison Chart
  cat("Creating aggregated category summary...\n")
  if (nrow(combined_results) > 0) {
    category_summary_aggregated <- combined_results %>%
      group_by(location, category) %>%
      dplyr::filter(time == max(time)) %>%
      ungroup() %>%
      group_by(category) %>%
      summarise(
        categoryName = first(case_when( # Create display-friendly names
          category == "shake_intensity" ~ "Shake Intensity",
          category == "buildings" ~ "Buildings",
          category == "medical" ~ "Medical",
          category == "power" ~ "Power",
          category == "roads_and_bridges" ~ "Roads & Bridges",
          category == "sewer_and_water" ~ "Sewer & Water",
          TRUE ~ str_to_title(str_replace_all(category, "_", " "))
        )),
        averageMapValue = mean(map, na.rm = TRUE),
        averageCIR = mean(CIRatMaxMAP, na.rm = TRUE),
        averageLowerCI95 = mean(ci_lower_95, na.rm = TRUE),
        averageUpperCI95 = mean(ci_upper_95, na.rm = TRUE),
        contributingLocations = n_distinct(location)
      ) %>%
      ungroup() %>%
      # Ensure value is not NaN if no data, default to 0
      mutate(
        averageMapValue = ifelse(is.nan(averageMapValue), 0, averageMapValue),
        averageCIR = ifelse(is.nan(averageCIR), 0, averageCIR),
        averageLowerCI95 = ifelse(is.nan(averageLowerCI95), 0, averageLowerCI95),
        averageUpperCI95 = ifelse(is.nan(averageUpperCI95), 0, averageUpperCI95)
      )

    tryCatch({
      write_json(
        category_summary_aggregated,
        file.path(dirname(OUTPUT_DIR), "category_summary_aggregated.json"), # Save in parent of bsts_results
        pretty = TRUE,
        auto_unbox = TRUE
      )
      cat("Aggregated category summary saved to public/data/processed/category_summary_aggregated.json\n")
    }, error = function(e) {
      cat("Error saving aggregated category summary JSON:", e$message, "\n")
    })
  } else {
    cat("Skipping aggregated category summary: combined_results is empty.\n")
  }

  # Create timeline data format
  cat("Creating timeline data...\n")
  timeline_results <- list()
  
  for (result in all_results) {
    if (!is.null(result) && nrow(result) > 0) {
      for (i in 1:nrow(result)) {
        time_key <- format(result$time[i], "%Y-%m-%d %H:%M:%S")
        if (is.null(timeline_results[[time_key]])) {
          timeline_results[[time_key]] <- list()
        }
        timeline_results[[time_key]] <- c(
          timeline_results[[time_key]], 
          list(result[i,])
        )
      }
    }
  }
  
  # Format for visualization
  formatted_timeline <- list()
  for (time_key in names(timeline_results)) {
    if (length(timeline_results[[time_key]]) > 0) {
      formatted_timeline[[time_key]] <- bind_rows(timeline_results[[time_key]])
    }
  }
  
  # Save timeline data
  tryCatch({
    write_json(
      formatted_timeline,
      file.path(OUTPUT_DIR, "timeline_data.json"),
      pretty = TRUE,
      auto_unbox = TRUE
    )
  }, error = function(e) {
    cat("Error saving timeline JSON:", e$message, "\n")
    # Cannot easily save as CSV due to complex nested structure
    # Just report the error
  })
  
  end_time <- Sys.time()
  processing_time <- difftime(end_time, start_time, units = "mins")
  
  cat("Analysis complete. Results saved to", OUTPUT_DIR, "\n")
  cat("Timeline data created with", length(names(formatted_timeline)), "time points\n")
  cat(sprintf("Final processing completed in %.1f minutes\n", as.numeric(processing_time)))
} else {
  cat("No valid results to process.\n")
}

# Clean up parallel workers if used
if (!use_sequential) {
  cat("Cleaning up parallel environment...\n")
  plan(sequential)
}

# Final garbage collection
gc()
cat("Analysis script completed.\n") 