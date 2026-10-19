import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface MiniPlotProps {
  data: any[];
  layout: any;
  height?: number;
}

export const MiniPlot: React.FC<MiniPlotProps> = ({ data, layout, height = 120 }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      Plotly.newPlot(chartRef.current, data, {
        ...layout,
        margin: { t: 10, r: 15, b: 50, l: 85, ...layout.margin },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { size: 10, family: 'Inter, sans-serif', ...layout.font },
        xaxis: { 
          gridcolor: '#e5e5e5', 
          zeroline: false, 
          tickfont: { size: 8 },
          ...layout.xaxis,
          title: { 
            text: typeof layout.xaxis?.title === 'string' ? layout.xaxis.title : layout.xaxis?.title?.text, 
            font: { size: 9, color: '#444', weight: 'bold' },
            standoff: 10,
            ...layout.xaxis?.title
          },
        },
        yaxis: { 
          gridcolor: '#e5e5e5', 
          zeroline: false, 
          tickfont: { size: 8 },
          ...layout.yaxis,
          title: { 
            text: typeof layout.yaxis?.title === 'string' ? layout.yaxis.title : layout.yaxis?.title?.text, 
            font: { size: 9, color: '#444', weight: 'bold' },
            standoff: 10,
            ...layout.yaxis?.title
          },
        },
      }, {
        responsive: true,
        displayModeBar: false
      });
    }
  }, [data, layout]);

  return (
    <div className="w-full bg-[#f5f5f4] rounded-lg overflow-hidden border border-black/5 mt-2">
      <div ref={chartRef} style={{ height: `${height}px` }} />
    </div>
  );
};
