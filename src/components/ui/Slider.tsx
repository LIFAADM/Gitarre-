import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SliderProps {
  label?: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Slider({ label, value, min, max, step = 1, onChange, format, className, disabled, ...rest }: SliderProps) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className={cn('block', className)}>
      {(label || format) && (
        <span className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted">{label}</span>
          <span className="font-semibold tabular-nums text-text">{format ? format(value) : value}</span>
        </span>
      )}
      <input
        type="range"
        className="gc-range"
        style={{ ['--gc-fill' as string]: `${fill}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={rest['aria-label']}
      />
    </label>
  );
}
