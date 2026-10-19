# Coho Growth & Overwinter Survival Model

A client-side bioenergetics simulation for juvenile coho salmon growth and overwinter survival.

**Live app:** https://mattjbayly.github.io/coho-growth-model/

Source code: https://github.com/mattjbayly/coho-growth-model

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open http://localhost:3000 in your browser

## Deployment

Pushes to `main` build the app and publish it to GitHub Pages through the workflow in `.github/workflows/deploy.yml`.

## Methods

### Assumptions

- Daily stream temperature is the only environmental driver of growth. Flow, density, and habitat are not modelled.
- Food ration (R) is constant over the growth season within a replicate.
- Fish do not die during summer. Survival is applied once, as a function of fall fork length.
- Survival coefficients describe apparent survival from about September 30 to April 30 and are not corrected for emigration.
- Fork length is back-calculated from mass with a fixed length-weight relationship (a = 0.00001, b = 3).
- Missing temperature days are filled by linear interpolation. Days outside the data range carry the nearest observed value.

### Overview

The model tracks the mass of individual coho fry through one summer growth season, converts final mass to fork length, and uses fork length to predict the probability of surviving the following winter. It runs entirely in the browser. Monte Carlo replicates propagate parameter uncertainty into the outputs.

### Inputs

The user supplies a daily temperature series as a CSV with `date` and `temp_c` columns. A demo series is preloaded. The user sets the growth window (default June 1 to September 30), the food ration scenario, the initial mass distribution, the length-weight coefficients, and the survival coefficients.

### Daily growth

Daily growth follows the Ratkowsky-type model that Manhard et al. (2018) calibrated for coho salmon in the laboratory. Specific growth rate Ω (percent body mass per day) at temperature T is:

```
Ω = d (T − T_L) [1 − exp(g (T − T_U))]     for T < T_U
Ω = 0                                       otherwise
```

T_L is the lower temperature limit for growth (1.3 °C). T_U is the upper limit, drawn between 24 and 25 °C. The parameter d sets the growth slope. The deceleration coefficient g controls how sharply growth falls off near T_U and depends on food:

```
g = γ_g × R
```

R is the food ration as a proportion of maximum consumption. Manhard et al. (2018) report values of 0.43, 0.87 and 1.19 for low, medium and high food. Lower food reduces g, which lowers both the optimum temperature and the realised upper thermal limit. Lusardi et al. (2020) observed the same pattern in stream enclosures, where high prey density allowed positive growth at temperatures that caused mass loss under low prey density.

Mass is updated each day with an allometric step so growth rate scales with body size:

```
M_{t+1} = ( M_t^b + b Ω / 100 )^(1/b)
```

The exponent b is 0.386 for coho (Manhard et al., 2018).

### Fork length and survival

At the end of the growth window, final mass M is converted to fork length FL (mm) with FL = (M / a)^(1/b_LW).

Overwinter survival is size-selective. Larger juveniles carry more lipid reserves and survive winter at higher rates (Quinn & Peterson, 1996; Ebersole et al., 2006). Survival probability S is a logistic function of fall fork length, following Pess et al. (2011):

```
logit(S) = β0 + β1 × FL
```

Default coefficients (β0 = −4.77, β1 = 0.053) were set so that predicted survival matches published benchmarks: under 15% for fish below 60 mm, about 15% at 70 to 79 mm, and 35 to 50% above 90 mm (Pess et al., 2011; Drobny, 2016; Chittenden et al., 2010).

### Monte Carlo structure

The simulation has two levels. Each replicate draws one set of population-level parameters: d and γ_g from truncated normal distributions, T_U and the length-weight coefficients from uniform ranges, and R from a truncated normal when stochastic food is selected. Within each replicate, N fish each draw an initial mass from a truncated normal distribution and grow through the full season.

Outputs separate the two sources of variation. Spread among fish within a replicate reflects variation in starting size. Spread among replicate medians reflects uncertainty in the growth and food parameters. Results report quantiles of final mass, fork length and survival at both levels.

### Limitations

The growth model was calibrated on hatchery fish fed set rations, so field growth may differ (Manhard et al., 2018). The survival relationship pools studies from several regions and does not account for habitat quality or density, both of which affect overwinter survival (Quinn & Peterson, 1996; Pess et al., 2011). The model is best used to compare scenarios rather than to predict absolute survival for a given stream.

## References

Araujo, H. A., Cooper, A. B., MacIsaac, E. A., Knowler, D., & Velez-Espino, A. (2015). Modeling population responses of Chinook and coho salmon to suspended sediment using a life history approach. *Theoretical Population Biology*, 104, 1–13.

Campbell, E. Y. (2017). *Influences of thermal and trophic heterogeneity on phenology, growth and resource use by juvenile coho salmon* (Doctoral dissertation). Oregon State University, Corvallis, OR.

Campbell, E. Y., Dunham, J. B., Reeves, G. H., & Wondzell, S. M. (2019). Phenology of hatching, emergence, and end-of-season body size in young-of-year coho salmon in thermally contrasting streams draining the Copper River Delta, Alaska. *Canadian Journal of Fisheries and Aquatic Sciences*, 76(2), 185–191.

Chittenden, C. M., Melnychuk, M. C., Welch, D. W., & McKinley, R. S. (2010). An investigation into the poor survival of an endangered coho salmon population. *PLoS ONE*, 5(5), e10869.

Drobny, P. Y. (2016). *Influence of body size, intra- and inter-specific salmonid densities, and habitat on overwinter survival of juvenile Coho Salmon (Oncorhynchus kisutch) in Prairie Creek, California* (Master's thesis). Humboldt State University, Arcata, CA.

Ebersole, J. L., Wigington, P. J. Jr., Baker, J. P., Cairns, M. A., Church, M. R., Hansen, B. P., Miller, B. A., LaVigne, H. R., Compton, J. E., & Leibowitz, S. G. (2006). Juvenile coho salmon growth and survival across stream network seasonal habitats. *Transactions of the American Fisheries Society*, 135(6), 1681–1697.

Iacarella, J. C., Chea, R., & Patterson, D. A. (2025). Potential limits to local adaptation of Coho Salmon populations from eggs to fry under naturally varying and warming temperature conditions. *Transactions of the American Fisheries Society*, 154, 693–707.

Lang, D. W., Hall, J. D., Reeves, G. H., & Wipfli, M. S. (2006). The influence of fall-spawning coho salmon (*Oncorhynchus kisutch*) on growth and production of juvenile coho salmon rearing in beaver ponds on the Copper River Delta, Alaska. *Canadian Journal of Fisheries and Aquatic Sciences*, 63(4), 917–930.

Lusardi, R. A., Hammock, B. G., Jeffres, C. A., Dahlgren, R. A., & Kiernan, J. D. (2020). Oversummer growth and survival of juvenile coho salmon (*Oncorhynchus kisutch*) across a natural gradient of stream water temperature and prey availability: an in situ enclosure experiment. *Canadian Journal of Fisheries and Aquatic Sciences*, 77(3), 413–424.

Manhard, C. V., Som, N. A., Perry, R. W., & Plumb, J. M. (2018). A laboratory-calibrated model of coho salmon growth with utility for ecological analyses. *Canadian Journal of Fisheries and Aquatic Sciences*, 75, 684–690.

Pess, G. R., Kiffney, P. M., Liermann, M. C., Bennett, T. R., Anderson, J. H., & Quinn, T. P. (2011). The influences of body size, habitat quality, and competition on the movement and survival of juvenile coho salmon during the early stages of stream recolonization. *Transactions of the American Fisheries Society*, 140(4), 883–897.

Quinn, T. P., & Peterson, N. P. (1996). The influence of habitat complexity and fish size on over-winter survival and growth of individually marked juvenile coho salmon (*Oncorhynchus kisutch*) in Big Beef Creek, Washington. *Canadian Journal of Fisheries and Aquatic Sciences*, 53(7), 1555–1564.

Sandercock, F. K. (1991). Life history of coho salmon (*Oncorhynchus kisutch*). In C. Groot & L. Margolis (Eds.), *Pacific salmon life histories* (pp. 395–446). University of British Columbia Press.

Spanjer, A. R., Moran, P. W., Larsen, K. A., Wetzel, L. A., Hansen, A. G., & Beauchamp, D. A. (2018). Juvenile coho salmon growth and health in streams across an urbanization gradient. *Science of the Total Environment*, 625, 1003–1012.

Sullivan, K., Martin, D. J., Cardwell, R. D., Toll, J. E., & Duke, S. (2000). *An analysis of the effects of temperature on salmonids of the Pacific Northwest with implications for selecting temperature criteria*. Sustainable Ecosystems Institute.

Willey, W. S. (2004). *Energetic response of juvenile coho salmon (Oncorhynchus kisutch) to varying water temperature regimes in northern California streams* (Master's thesis). Humboldt State University, Arcata, CA.
