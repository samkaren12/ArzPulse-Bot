import React from 'react';
import { AssetInfo, LanguageCode, formatCurrencyValue } from '../utils/currencyEngine';

interface PnLChartCanvasProps {
  asset: AssetInfo;
  lang: LanguageCode;
  compact?: boolean;
}

export const PnLChartCanvas: React.FC<PnLChartCanvasProps> = ({ asset, lang, compact = false }) => {
  const isPositive = asset.change24h >= 0;
  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  const fillId = `pnl-grad-${asset.code}-${compact ? 'sm' : 'lg'}`;

  const points = asset.sparkline;
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const width = 460;
  const height = compact ? 150 : 190;
  const padX = 24;
  const padY = 26;

  const coords = points.map((val, idx) => {
    const x = padX + (idx / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y = height - padY - ((val - minVal) / range) * (height - padY * 2);
    return { x, y, val };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 0
      ? `M ${coords[0].x.toFixed(1)} ${height - padY} ` +
        coords.map((c) => `L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ') +
        ` L ${coords[coords.length - 1].x.toFixed(1)} ${height - padY} Z`
      : '';

  return (
    <div
      className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 overflow-hidden select-none"
      dir="ltr"
      data-testid={`pnl-chart-${asset.code}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-100">
            {asset.code}/USD
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-300 font-medium">
            {asset.names[lang]}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          <span className="text-slate-100 font-semibold">
            ${formatCurrencyValue(asset.priceUsd)}
          </span>
          <span
            className={`font-semibold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {asset.change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block bg-slate-900/60 rounded-lg border border-slate-800/80"
        role="img"
        aria-label={`PnL Chart for ${asset.code}`}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal reference lines */}
        {[0.25, 0.5, 0.75].map((ratio, i) => (
          <line
            key={i}
            x1={padX}
            y1={padY + ratio * (height - padY * 2)}
            x2={width - padX}
            y2={padY + ratio * (height - padY * 2)}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        ))}

        {/* Shaded PnL Area */}
        {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}

        {/* Main PnL Line */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Data nodes */}
        {coords.map((c, idx) => (
          <g key={idx}>
            <circle
              cx={c.x}
              cy={c.y}
              r={idx === coords.length - 1 ? 4.5 : 2.8}
              fill={idx === coords.length - 1 ? strokeColor : '#0f172a'}
              stroke={strokeColor}
              strokeWidth="2"
            />
          </g>
        ))}

        {/* High / Low annotations */}
        <text
          x={padX}
          y={17}
          textAnchor="start"
          fill="#94a3b8"
          fontSize="10.5"
          fontFamily="JetBrains Mono, monospace"
        >
          24h High: ${formatCurrencyValue(asset.high24h)}
        </text>
        <text
          x={width - padX}
          y={17}
          textAnchor="end"
          fill={isPositive ? '#34d399' : '#fb7185'}
          fontSize="10.5"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
        >
          7d PnL: {asset.change7d >= 0 ? '+' : ''}
          {asset.change7d.toFixed(2)}%
        </text>
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
        <span>Low: ${formatCurrencyValue(asset.low24h)}</span>
        <span>Vol: {asset.volume24h}</span>
        <span>
          1 {asset.code} = {formatCurrencyValue(asset.priceUsd * 69500)} IRT
        </span>
      </div>
    </div>
  );
};
