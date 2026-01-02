/**
 * Pulsating Dot Component for Recharts
 * Shows a pulsating animation on the last data point only
 */

interface PulsatingDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
  data?: any[];
  index?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export default function PulsatingDot({ 
  cx, 
  cy, 
  index,
  data,
  fill = '#3b82f6', 
  stroke = '#ffffff', 
  strokeWidth = 2 
}: PulsatingDotProps) {
  if (cx === undefined || cy === undefined) {
    return null;
  }

  // Only render if this is the last data point
  if (index === undefined || !data || data.length === 0) {
    return null;
  }

  const isLastPoint = index === data.length - 1;
  
  if (!isLastPoint) {
    return null;
  }

  return (
    <g>
      {/* Outer pulsating ring */}
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={fill}
        opacity={0.3}
        className="animate-ping"
        style={{ animationDuration: '2s' }}
      />
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        className="animate-pulse"
        style={{ animationDuration: '1.5s' }}
      />
      {/* Inner dot */}
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={stroke}
      />
    </g>
  );
}
