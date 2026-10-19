#' Coho Growth & Overwinter Survival Simulation
#'
#' R port of the TypeScript simulation in src/utils/simulation.ts.
#' Implements the Ratkowsky growth model with allometric mass update
#' and logistic overwinter survival.

# --- Helper functions --------------------------------------------------------

#' Sample from a truncated normal distribution via rejection sampling.
#' Matches the TypeScript randomTruncatedNormal (1000-attempt fallback).
r_truncated_normal <- function(n, mean, sd, lower = -Inf, upper = Inf) {
  out <- numeric(n)
  for (j in seq_len(n)) {
    attempts <- 0L
    repeat {
      val <- rnorm(1, mean, sd)
      attempts <- attempts + 1L
      if ((val >= lower && val <= upper) || attempts > 1000L) break
    }
    if (attempts > 1000L) {
      out[j] <- max(lower, min(upper, mean))
    } else {
      out[j] <- val
    }
  }
  out
}

# --- Main simulation function ------------------------------------------------

#' Run the coho growth and overwinter survival simulation.
#'
#' @param temp_data  data.frame with columns \code{date} (Date or character
#'   "YYYY-MM-DD") and \code{temp_c} (numeric).
#' @param start_date,end_date  Start/end of the growth season (character
#'   "YYYY-MM-DD" or Date).
#' @param n_fish  Number of individual fish per replicate.
#' @param n_rep   Number of replicates.
#' @param seed    Optional RNG seed for reproducibility.
#' @return A list with components \code{replicate_summaries},
#'   \code{pooled_fish}, \code{temp_stats}, \code{growth_season_days}, and
#'   \code{parameters}.
run_simulation <- function(
  temp_data,
  start_date,
  end_date,
  n_fish       = 100,
  n_rep        = 20,
  # Growth (Ratkowsky)
  b_grow       = 0.386,
  t_l          = 1.3,
  t_u_min      = 24,
  t_u_max      = 25,
  mean_d       = 0.341,
  sd_d         = 0.048,
  mean_gamma_g = 0.142,
  sd_gamma_g   = 0.025,
  # Food ration
  food_mode    = "scenario",
  fixed_r      = 0.87,
  mean_r       = 0.87,
  cv_r         = 0.2,
  lower_r      = 0.43,
  upper_r      = 1.19,
  # Initial mass
  mean_m0      = 1.0,
  sd_m0        = 0.7,
  min_m0       = 0.1,
  # Length-weight
  a_min        = 0.00001,
  a_max        = 0.00001,
  b_lw_min     = 3.0,
  b_lw_max     = 3.0,
  # Survival
  beta0        = -4.77,
  beta1        = 0.053,
  # Reproducibility
  seed         = NULL
) {

  # --- Validate inputs -------------------------------------------------------
  if (!is.data.frame(temp_data) ||
      !all(c("date", "temp_c") %in% names(temp_data))) {
    stop("temp_data must be a data.frame with columns 'date' and 'temp_c'")
  }
  food_mode <- match.arg(food_mode, c("scenario", "stochastic"))

  # --- Set seed --------------------------------------------------------------
  if (!is.null(seed)) set.seed(seed)

  # --- Date sequence ---------------------------------------------------------
  start_date <- as.Date(start_date)
  end_date   <- as.Date(end_date)
  season_dates <- seq.Date(start_date, end_date, by = "day")
  season_days  <- length(season_dates)

  # --- Temperature lookup (named vector) -------------------------------------
  temp_keys <- as.character(as.Date(temp_data$date))
  temp_vals <- as.numeric(temp_data$temp_c)
  temp_lookup <- setNames(temp_vals, temp_keys)

  # Get temperatures for the growth season (0 if date missing)
  season_keys <- as.character(season_dates)
  season_temps <- unname(temp_lookup[season_keys])
  season_temps[is.na(season_temps)] <- 0

  # --- Temperature statistics (collected once, matching TS behaviour) --------
  temp_stats <- list(
    min   = min(season_temps),
    max   = max(season_temps),
    mean  = mean(season_temps),
    count = season_days
  )

  # --- Pre-allocate storage --------------------------------------------------
  rep_summaries <- vector("list", n_rep)
  pooled_list   <- vector("list", n_rep)

  # --- Replicate loop --------------------------------------------------------
  for (r in seq_len(n_rep)) {

    # Sample replicate-level parameters
    t_u    <- runif(1, t_u_min, t_u_max)
    d_param <- r_truncated_normal(1, mean_d, sd_d, lower = 0)
    gamma_g <- r_truncated_normal(1, mean_gamma_g, sd_gamma_g, lower = 0)

    R <- if (food_mode == "scenario") {
      fixed_r
    } else {
      r_truncated_normal(1, mean_r, mean_r * cv_r, lower_r, upper_r)
    }

    g    <- gamma_g * R
    a_lw <- runif(1, a_min, a_max)
    b_lw <- runif(1, b_lw_min, b_lw_max)

    # Sample all initial masses at once (vectorised)
    init_mass <- r_truncated_normal(n_fish, mean_m0, sd_m0, lower = min_m0)
    mass      <- init_mass  # working copy

    # --- Daily growth loop (sequential — mass depends on prior day) ----------
    for (day_idx in seq_len(season_days)) {
      temp <- season_temps[day_idx]

      # Ratkowsky growth rate
      omega <- rep(0, n_fish)
      if (temp < t_u) {
        omega <- d_param * (temp - t_l) * (1 - exp(g * (temp - t_u)))
        omega <- pmax(0, omega)
      }

      # Allometric mass update
      mass <- (mass^b_grow + b_grow * omega / 100)^(1 / b_grow)
    }

    # --- Final size & survival (vectorised) ----------------------------------
    final_mass <- mass
    final_fl   <- (final_mass / a_lw)^(1 / b_lw)
    logit_s    <- beta0 + beta1 * final_fl
    surv_prob  <- 1 / (1 + exp(-logit_s))

    # --- Replicate summary ---------------------------------------------------
    probs <- c(0.05, 0.25, 0.50, 0.75, 0.95)
    mass_q <- unname(quantile(final_mass, probs, type = 7))
    fl_q   <- unname(quantile(final_fl,   probs, type = 7))
    s_q    <- unname(quantile(surv_prob,  probs, type = 7))

    rep_summaries[[r]] <- data.frame(
      replicate_id = r - 1L,   # 0-indexed to match TS
      mean_mass    = mean(final_mass),
      median_mass  = mass_q[3],
      q05_mass     = mass_q[1],
      q25_mass     = mass_q[2],
      q75_mass     = mass_q[4],
      q95_mass     = mass_q[5],
      mean_fl      = mean(final_fl),
      median_fl    = fl_q[3],
      q05_fl       = fl_q[1],
      q25_fl       = fl_q[2],
      q75_fl       = fl_q[4],
      q95_fl       = fl_q[5],
      mean_s       = mean(surv_prob),
      median_s     = s_q[3],
      q05_s        = s_q[1],
      q25_s        = s_q[2],
      q75_s        = s_q[4],
      q95_s        = s_q[5],
      stringsAsFactors = FALSE
    )

    # --- Pooled fish (no cap — R handles large data frames) ------------------
    pooled_list[[r]] <- data.frame(
      replicate_id  = r - 1L,
      initial_mass  = init_mass,
      final_mass    = final_mass,
      final_fl      = final_fl,
      survival_prob = surv_prob,
      stringsAsFactors = FALSE
    )

    # Progress feedback
    if (r %% 10 == 0 || r == n_rep) {
      message(sprintf("  replicate %d / %d", r, n_rep))
    }
  }

  # --- Combine results -------------------------------------------------------
  replicate_summaries <- do.call(rbind, rep_summaries)
  pooled_fish         <- do.call(rbind, pooled_list)
  rownames(replicate_summaries) <- NULL
  rownames(pooled_fish)         <- NULL

  # --- Echo input parameters for reproducibility -----------------------------
  parameters <- list(
    n_fish = n_fish, n_rep = n_rep,
    start_date = as.character(start_date), end_date = as.character(end_date),
    b_grow = b_grow, t_l = t_l, t_u_min = t_u_min, t_u_max = t_u_max,
    mean_d = mean_d, sd_d = sd_d,
    mean_gamma_g = mean_gamma_g, sd_gamma_g = sd_gamma_g,
    food_mode = food_mode, fixed_r = fixed_r,
    mean_r = mean_r, cv_r = cv_r, lower_r = lower_r, upper_r = upper_r,
    mean_m0 = mean_m0, sd_m0 = sd_m0, min_m0 = min_m0,
    a_min = a_min, a_max = a_max, b_lw_min = b_lw_min, b_lw_max = b_lw_max,
    beta0 = beta0, beta1 = beta1,
    seed = seed
  )

  list(
    replicate_summaries = replicate_summaries,
    pooled_fish         = pooled_fish,
    temp_stats          = temp_stats,
    growth_season_days  = season_days,
    parameters          = parameters
  )
}


# =============================================================================
# Example usage (uncomment to run)
# =============================================================================
# temp_data <- read.csv("path/to/temps.csv")  # columns: date, temp_c
# results   <- run_simulation(
#   temp_data  = temp_data,
#   start_date = "2024-04-01",
#   end_date   = "2024-10-15",
#   seed       = 42
# )
#
# str(results$replicate_summaries)
# str(results$pooled_fish)
# results$temp_stats
# results$growth_season_days
