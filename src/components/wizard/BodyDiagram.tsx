"use client";

import { ZONES, type BodyView, type Zone } from "@/lib/wizard";

export function BodyDiagram({
  view,
  selected,
  onSelect,
}: {
  view: BodyView;
  selected: { id: string; view: BodyView } | null;
  onSelect: (zone: Zone, view: BodyView) => void;
}) {
  const marker =
    selected && selected.view === view
      ? ZONES[view].find((z) => z.id === selected.id)
      : null;

  return (
    <svg
      viewBox="0 0 300 470"
      className="mx-auto block h-[420px] w-auto"
      aria-label="Body diagram, tap a placement"
    >
      {/* mannequin silhouette */}
      <g fill="#efe7f3" stroke="#d9cbe6" strokeWidth={1}>
        <ellipse cx={150} cy={40} rx={23} ry={27} />
        <rect x={142} y={62} width={16} height={16} rx={6} />
        <rect x={116} y={76} width={68} height={120} rx={26} />
        <rect x={120} y={180} width={60} height={58} rx={22} />
        <rect x={92} y={86} width={20} height={118} rx={10} />
        <rect x={188} y={86} width={20} height={118} rx={10} />
        <ellipse cx={102} cy={214} rx={11} ry={15} />
        <ellipse cx={198} cy={214} rx={11} ry={15} />
        <rect x={124} y={226} width={23} height={180} rx={11} />
        <rect x={153} y={226} width={23} height={180} rx={11} />
        <ellipse cx={135} cy={416} rx={13} ry={9} />
        <ellipse cx={165} cy={416} rx={13} ry={9} />
      </g>

      {/* tappable zones */}
      <g>
        {ZONES[view].map((z) => {
          const isSel = selected?.id === z.id && selected?.view === view;
          return (
            <ellipse
              key={z.id}
              cx={z.cx}
              cy={z.cy}
              rx={z.rx}
              ry={z.ry}
              tabIndex={0}
              role="button"
              aria-label={z.label}
              onClick={() => onSelect(z, view)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(z, view);
                }
              }}
              className={`cursor-pointer outline-none transition ${
                isSel ? "fill-trust/40" : "fill-violet/0 hover:fill-violet/15"
              } stroke-transparent focus:fill-violet/25`}
            />
          );
        })}
      </g>

      {/* selected marker */}
      {marker && (
        <g>
          <circle
            cx={marker.cx}
            cy={marker.cy}
            r={6}
            fill="none"
            stroke="#00b67a"
            strokeWidth={1.5}
            opacity={0.5}
          >
            <animate attributeName="r" from="6" to="15" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={marker.cx} cy={marker.cy} r={6} fill="#00b67a" stroke="#fff" strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}
