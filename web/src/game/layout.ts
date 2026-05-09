export interface BoardLayout {
  GRID_SIZE: number;
  CELL_SIZE: number;
  GRID_ORIGIN_X: number;
  GRID_ORIGIN_Y: number;
  width: number;
  height: number;
}

const PADDING = 12;

export function computeBoardLayout(params: {
  width: number;
  height: number;
  topReserved: number;
  bottomReserved: number;
  gridDimension: number;
}): BoardLayout {
  const innerH = params.height - params.topReserved - params.bottomReserved - PADDING * 2;
  const innerW = params.width - PADDING * 2;
  const GRID_SIZE = Math.min(innerW, innerH);
  const CELL_SIZE = GRID_SIZE / params.gridDimension;
  const GRID_ORIGIN_X = (params.width - GRID_SIZE) / 2;
  const GRID_ORIGIN_Y =
    params.topReserved + PADDING + Math.max(0, (innerH - GRID_SIZE) / 2);

  return {
    GRID_SIZE,
    CELL_SIZE,
    GRID_ORIGIN_X,
    GRID_ORIGIN_Y,
    width: params.width,
    height: params.height,
  };
}

export function clientToCell(
  clientX: number,
  clientY: number,
  canvasRect: DOMRectReadOnly,
  layout: BoardLayout,
  gridDimension: number,
): { row: number; col: number } | null {
  const x = clientX - canvasRect.left;
  const y = clientY - canvasRect.top;
  const col = Math.floor((x - layout.GRID_ORIGIN_X) / layout.CELL_SIZE);
  const row = Math.floor((y - layout.GRID_ORIGIN_Y) / layout.CELL_SIZE);
  if (row < 0 || row >= gridDimension || col < 0 || col >= gridDimension) return null;
  return { row, col };
}
