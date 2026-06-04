import { useEffect, useRef, useState } from 'react';

const GAP = 10;

export type StationGridLayout = {
  cols: number;
  rows: number;
  gap: number;
  tileSize: number;
};

function computeGrid(count: number, width: number, height: number): StationGridLayout {
  if (count <= 0 || width <= 0 || height <= 0) {
    return { cols: 1, rows: 1, gap: GAP, tileSize: 200 };
  }

  let bestCols = 1;
  let bestSize = 0;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (width - GAP * (cols - 1)) / cols;
    const cellH = (height - GAP * (rows - 1)) / rows;
    const size = Math.min(cellW, cellH);
    const bias = cols * 6;
    if (size + bias > bestSize + bestCols * 6 || (size > bestSize && size >= bestSize * 0.97)) {
      bestSize = size;
      bestCols = cols;
    }
  }

  const rows = Math.ceil(count / bestCols);
  const cellW = (width - GAP * (bestCols - 1)) / bestCols;
  const cellH = (height - GAP * (rows - 1)) / rows;
  const tileSize = Math.floor(Math.min(cellW, cellH));

  return { cols: bestCols, rows, gap: GAP, tileSize };
}

/** Picks column/row counts so square tiles fill the available viewport area. */
export function useStationGridLayout(stationCount: number) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<StationGridLayout>({
    cols: Math.min(stationCount || 1, 4),
    rows: Math.ceil((stationCount || 1) / 4),
    gap: GAP,
    tileSize: 200,
  });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const update = () => {
      setLayout(computeGrid(stationCount, el.clientWidth, el.clientHeight));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stationCount]);

  return { gridRef, layout };
}
