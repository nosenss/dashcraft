import { useVideoConfig } from "remotion";

export type Rect = { x: number; y: number; w: number; h: number };

// Раскладка кадра: квадрат — подпись сверху, окно снизу; горизонталь — подпись слева, окно справа
export function useLayout() {
  const { width, height } = useVideoConfig();
  const wide = width > height;
  const region: Rect = wide ? { x: 800, y: 100, w: 1020, h: 880 } : { x: 64, y: 330, w: 952, h: 690 };
  const caption: Rect = wide ? { x: 110, y: 0, w: 640, h: height } : { x: 72, y: 70, w: 936, h: 240 };
  const states: Record<string, Rect> = {
    full: region,
    card: wide
      ? { x: region.x + 170, y: region.y + 230, w: 680, h: 420 }
      : { x: region.x + 150, y: region.y + 150, w: 652, h: 390 },
    chat: wide
      ? { x: region.x + 60, y: region.y + 20, w: 900, h: 840 }
      : { x: region.x + 70, y: region.y, w: 812, h: 690 },
    cta: wide ? { x: 900, y: 290, w: 900, h: 500 } : { x: 90, y: 400, w: 900, h: 470 },
  };
  return { wide, width, height, region, caption, states };
}
