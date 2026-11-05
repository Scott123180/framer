import type { DesignSpec, Hex } from '@shared/domain';

export type FontSpec = {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  sizePx: number;
  caseTransform: 'none' | 'uppercase';
};

export type Rect = { x: number; y: number; width: number; height: number };
export type SafeArea = Rect;

export type DrawPlan = {
  canvas: { width: number; height: number };
  safeArea: SafeArea;
  marginPx: number;
  lines: Array<{
    text: string;
    x: number;
    y: number;
    font: FontSpec;
    color: Hex;
    role: 'quote' | 'attribution';
  }>;
};

export interface TextMeasurer {
  width(text: string, font: FontSpec): number;
  metrics(font: FontSpec): { ascent: number; descent: number };
}

export interface TextLayoutEngine {
  /** Fit the quote and attribution inside the safe area. Returns null if it can't fit at ≥ 9 pt (FR-007). */
  layout(spec: DesignSpec, safeArea: SafeArea, measurer: TextMeasurer): DrawPlan | null;
}
