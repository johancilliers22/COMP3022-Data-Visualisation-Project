# Install required packages for VAST Challenge 2019 MC1 data processing

# Function to safely unload a package
safe_unload <- function(pkg) {
  if (pkg %in% (.packages())) {
    try({
      # First detach all dependent packages
      deps <- tools::package_dependencies(pkg, reverse = TRUE)[[1]]
      if (!is.null(deps)) {
        for (dep in deps) {
          if (dep %in% (.packages())) {
            detach(paste0("package:", dep), character.only = TRUE, unload = TRUE, force = TRUE)
          }
        }
      }
      # Then detach the package itself
      detach(paste0("package:", pkg), character.only = TRUE, unload = TRUE, force = TRUE)
    }, silent = TRUE)
  }
}

# Function to install packages if not already installed
install_if_missing <- function(pkg, repos = "https://cloud.r-project.org") {
  if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat("Installing package:", pkg, "\n")
    install.packages(pkg, repos = repos, dependencies = TRUE)
    if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
      warning("Failed to install package: ", pkg)
      return(FALSE)
    }
  }
  return(TRUE)
}

# First, unload potentially conflicting packages
pkgs_to_unload <- c(
  "jsonlite", "geojsonio", "geojson", "V8",
  "future", "future.apply", "doFuture",
  "zoo", "xts", "bsts", "bayestestR",
  "progressr"  # Added progressr to packages to unload
)

for (pkg in pkgs_to_unload) {
  safe_unload(pkg)
}

# Define required packages
pkgs <- c(
  # Core data manipulation
  "tidyverse",    # For dplyr, ggplot2, etc.
  "readr",        # Fast CSV reading
  "stringr",      # String manipulation
  
  # Time series handling
  "zoo",          # Time series utilities
  "lubridate",    # Date/time manipulation
  
  # Bayesian analysis
  "bsts",         # Bayesian structural time series
  "bayestestR",   # Bayesian analysis utilities
  "coda",         # MCMC diagnostics
  
  # JSON and GeoJSON handling
  "jsonlite",     # JSON handling
  "geojsonio",    # GeoJSON handling
  
  # Parallel processing
  "future",       # Parallel backend
  "future.apply", # Parallel apply functions
  "doFuture",     # Parallel foreach
  
  # Progress reporting
  "progressr"     # Progress reporting for parallel and sequential operations
)

# Install packages one by one
cat("Installing required packages...\n")
install_success <- sapply(pkgs, install_if_missing)

# Report results
if (all(install_success)) {
  cat("All required packages have been successfully installed.\n")
} else {
  failed_pkgs <- pkgs[!install_success]
  warning("The following packages could not be installed: ",
          paste(failed_pkgs, collapse = ", "))
}

# Load core packages needed for processing
core_pkgs <- c("tidyverse", "readr", "jsonlite", "zoo", "lubridate")
for (pkg in core_pkgs) {
  library(pkg, character.only = TRUE)
}

cat("Package installation complete. Ready for data processing.\n") 