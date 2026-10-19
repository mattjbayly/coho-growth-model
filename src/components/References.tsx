import React from 'react';
import { BookOpen } from 'lucide-react';

export const REFERENCES: React.ReactNode[] = [
  <>Araujo, H. A., Cooper, A. B., MacIsaac, E. A., Knowler, D., & Velez-Espino, A. (2015). Modeling population responses of Chinook and coho salmon to suspended sediment using a life history approach. <em>Theoretical Population Biology</em>, 104, 1–13.</>,
  <>Campbell, E. Y. (2017). <em>Influences of thermal and trophic heterogeneity on phenology, growth and resource use by juvenile coho salmon</em> (Doctoral dissertation). Oregon State University, Corvallis, OR.</>,
  <>Campbell, E. Y., Dunham, J. B., Reeves, G. H., & Wondzell, S. M. (2019). Phenology of hatching, emergence, and end-of-season body size in young-of-year coho salmon in thermally contrasting streams draining the Copper River Delta, Alaska. <em>Canadian Journal of Fisheries and Aquatic Sciences</em>, 76(2), 185–191.</>,
  <>Chittenden, C. M., Melnychuk, M. C., Welch, D. W., & McKinley, R. S. (2010). An investigation into the poor survival of an endangered coho salmon population. <em>PLoS ONE</em>, 5(5), e10869.</>,
  <>Drobny, P. Y. (2016). <em>Influence of body size, intra- and inter-specific salmonid densities, and habitat on overwinter survival of juvenile Coho Salmon (Oncorhynchus kisutch) in Prairie Creek, California</em> (Master's thesis). Humboldt State University, Arcata, CA.</>,
  <>Ebersole, J. L., Wigington, P. J. Jr., Baker, J. P., Cairns, M. A., Church, M. R., Hansen, B. P., Miller, B. A., LaVigne, H. R., Compton, J. E., & Leibowitz, S. G. (2006). Juvenile coho salmon growth and survival across stream network seasonal habitats. <em>Transactions of the American Fisheries Society</em>, 135(6), 1681–1697.</>,
  <>Iacarella, J. C., Chea, R., & Patterson, D. A. (2025). Potential limits to local adaptation of Coho Salmon populations from eggs to fry under naturally varying and warming temperature conditions. <em>Transactions of the American Fisheries Society</em>, 154, 693–707.</>,
  <>Lang, D. W., Hall, J. D., Reeves, G. H., & Wipfli, M. S. (2006). The influence of fall-spawning coho salmon (<em>Oncorhynchus kisutch</em>) on growth and production of juvenile coho salmon rearing in beaver ponds on the Copper River Delta, Alaska. <em>Canadian Journal of Fisheries and Aquatic Sciences</em>, 63(4), 917–930.</>,
  <>Lusardi, R. A., Hammock, B. G., Jeffres, C. A., Dahlgren, R. A., & Kiernan, J. D. (2020). Oversummer growth and survival of juvenile coho salmon (<em>Oncorhynchus kisutch</em>) across a natural gradient of stream water temperature and prey availability: an in situ enclosure experiment. <em>Canadian Journal of Fisheries and Aquatic Sciences</em>, 77(3), 413–424.</>,
  <>Manhard, C. V., Som, N. A., Perry, R. W., & Plumb, J. M. (2018). A laboratory-calibrated model of coho salmon growth with utility for ecological analyses. <em>Canadian Journal of Fisheries and Aquatic Sciences</em>, 75, 684–690. (Referenced as Manhard et al. 2017 per online acceptance date.)</>,
  <>Pess, G. R., Kiffney, P. M., Liermann, M. C., Bennett, T. R., Anderson, J. H., & Quinn, T. P. (2011). The influences of body size, habitat quality, and competition on the movement and survival of juvenile coho salmon during the early stages of stream recolonization. <em>Transactions of the American Fisheries Society</em>, 140(4), 883–897.</>,
  <>Quinn, T. P., & Peterson, N. P. (1996). The influence of habitat complexity and fish size on over-winter survival and growth of individually marked juvenile coho salmon (<em>Oncorhynchus kisutch</em>) in Big Beef Creek, Washington. <em>Canadian Journal of Fisheries and Aquatic Sciences</em>, 53(7), 1555–1564.</>,
  <>Sandercock, F. K. (1991). Life history of coho salmon (<em>Oncorhynchus kisutch</em>). In C. Groot & L. Margolis (Eds.), <em>Pacific salmon life histories</em> (pp. 395–446). University of British Columbia Press.</>,
  <>Spanjer, A. R., Moran, P. W., Larsen, K. A., Wetzel, L. A., Hansen, A. G., & Beauchamp, D. A. (2018). Juvenile coho salmon growth and health in streams across an urbanization gradient. <em>Science of the Total Environment</em>, 625, 1003–1012.</>,
  <>Sullivan, K., Martin, D. J., Cardwell, R. D., Toll, J. E., & Duke, S. (2000). <em>An analysis of the effects of temperature on salmonids of the Pacific Northwest with implications for selecting temperature criteria</em>. Sustainable Ecosystems Institute.</>,
  <>Willey, W. S. (2004). <em>Energetic response of juvenile coho salmon (Oncorhynchus kisutch) to varying water temperature regimes in northern California streams</em> (Master's thesis). Humboldt State University, Arcata, CA.</>,
];

export const References: React.FC<{ id?: string }> = ({ id }) => (
  <div id={id} className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-black/5 scroll-mt-24">
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-black/5 p-2 rounded-lg">
        <BookOpen className="w-5 h-5 text-black/50" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">References</h2>
        <p className="text-xs text-black/40">Sources used for model parameterization and validation</p>
      </div>
    </div>
    <div className="columns-1 md:columns-2 gap-8 text-[11px] text-black/60 leading-relaxed space-y-3">
      {REFERENCES.map((ref, i) => (
        <p key={i} className="break-inside-avoid">{ref}</p>
      ))}
    </div>
  </div>
);
