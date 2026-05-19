// Dependency-free SVG charts. No external scripts (Surface CSP forbids
// remote <script>/connect, §12.1), so we render charts ourselves.

import type { ChartSpec } from "../shared/types.js";

const W = 720;
const H = 360;
const PAD = { top: 24, right: 24, bottom: 56, left: 64 };
const COLORS = ["#5b8cff", "#3fcf8e", "#ffb454", "#ff6b6b", "#a78bfa"];

function fmt(n: number): string {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1) + "억";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + "만";
  return n.toLocaleString("ko-KR");
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

export default function Chart({ spec }: { spec: ChartSpec | null }) {
  if (!spec || spec.series.length === 0 || spec.labels.length === 0) {
    return (
      <div className="chart-empty">
        데이터셋을 선택하고 프롬프트를 입력하거나 예시 칩을 눌러보세요.
      </div>
    );
  }

  const series = spec.series[0];
  const data = series.data;
  const labels = spec.labels;
  const max = niceMax(Math.max(...data, 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const horizontal = spec.indexAxis === "y";

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={spec.title}
    >
      {/* gridlines + axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const val = max * (1 - t);
        const y = PAD.top + innerH * t;
        const x = PAD.left + innerW * t;
        return horizontal ? (
          <g key={t}>
            <line
              x1={x}
              y1={PAD.top}
              x2={x}
              y2={PAD.top + innerH}
              stroke="#2a2f3c"
            />
            <text x={x} y={H - PAD.bottom + 18} className="chart-tick" textAnchor="middle">
              {fmt(max * t)}
            </text>
          </g>
        ) : (
          <g key={t}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + innerW}
              y2={y}
              stroke="#2a2f3c"
            />
            <text x={PAD.left - 10} y={y + 4} className="chart-tick" textAnchor="end">
              {fmt(val)}
            </text>
          </g>
        );
      })}

      {spec.type === "line" ? (
        <polyline
          fill="none"
          stroke={COLORS[0]}
          strokeWidth="2.5"
          points={data
            .map((v, i) => {
              const x =
                PAD.left +
                (data.length === 1
                  ? innerW / 2
                  : (innerW * i) / (data.length - 1));
              const y = PAD.top + innerH * (1 - v / max);
              return `${x},${y}`;
            })
            .join(" ")}
        />
      ) : (
        data.map((v, i) => {
          const band = (horizontal ? innerH : innerW) / data.length;
          const thick = band * 0.62;
          const off = (band - thick) / 2;
          const len = (horizontal ? innerW : innerH) * (v / max);
          return horizontal ? (
            <rect
              key={i}
              x={PAD.left}
              y={PAD.top + band * i + off}
              width={len}
              height={thick}
              rx={3}
              fill={COLORS[i % COLORS.length]}
            />
          ) : (
            <rect
              key={i}
              x={PAD.left + band * i + off}
              y={PAD.top + innerH - len}
              width={thick}
              height={len}
              rx={3}
              fill={COLORS[0]}
            />
          );
        })
      )}

      {spec.type === "line" &&
        data.map((v, i) => {
          const x =
            PAD.left +
            (data.length === 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
          const y = PAD.top + innerH * (1 - v / max);
          return <circle key={i} cx={x} cy={y} r={3} fill={COLORS[0]} />;
        })}

      {/* category labels */}
      {labels.map((l, i) => {
        const band = (horizontal ? innerH : innerW) / labels.length;
        return horizontal ? (
          <text
            key={i}
            x={PAD.left - 10}
            y={PAD.top + band * i + band / 2 + 4}
            className="chart-cat"
            textAnchor="end"
          >
            {l}
          </text>
        ) : (
          <text
            key={i}
            x={
              PAD.left +
              (spec.type === "line"
                ? labels.length === 1
                  ? innerW / 2
                  : (innerW * i) / (labels.length - 1)
                : band * i + band / 2)
            }
            y={H - PAD.bottom + 20}
            className="chart-cat"
            textAnchor="middle"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
