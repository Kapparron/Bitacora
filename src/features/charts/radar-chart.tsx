import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type RadarAxis = { label: string; value: number };

/** Rings drawn behind the shape, as quarters of the largest value. */
const RINGS = [0.25, 0.5, 0.75, 1];
/** Room around the plot for the labels, as a share of the size. */
const LABEL_ROOM = 0.2;

/**
 * Spider chart over `react-native-svg`, drawn here for the same reason as
 * LineChart: one shape does not need a library's theming and gestures.
 *
 * The first axis points straight up and the rest follow clockwise, evenly
 * spaced. Values are scaled against the largest one, so the shape shows how the
 * work was spread rather than how much there was; the labels carry the counts.
 */
export function RadarChart({ axes, size, color }: { axes: RadarAxis[]; size: number; color?: string }) {
  const theme = useTheme();
  const fill = color ?? theme.accent;

  const center = size / 2;
  const radius = size * (0.5 - LABEL_ROOM);
  const largest = Math.max(1, ...axes.map((axis) => axis.value));

  /** The point at `share` of the radius along axis `index`. */
  function point(index: number, share: number): [number, number] {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    return [center + Math.cos(angle) * radius * share, center + Math.sin(angle) * radius * share];
  }

  const ring = (share: number) => axes.map((_, index) => point(index, share).join(',')).join(' ');
  const shape = axes.map((axis, index) => point(index, axis.value / largest).join(',')).join(' ');

  return (
    <Svg width={size} height={size}>
      {RINGS.map((share) => (
        <Polygon key={share} points={ring(share)} fill="none" stroke={theme.border} strokeWidth={1} />
      ))}

      {axes.map((axis, index) => {
        const [x, y] = point(index, 1);
        return <Line key={axis.label} x1={center} y1={center} x2={x} y2={y} stroke={theme.border} />;
      })}

      <Polygon points={shape} fill={fill} fillOpacity={0.35} stroke={fill} strokeWidth={2} />

      {axes.map((axis, index) => {
        if (axis.value === 0) return null;
        const [x, y] = point(index, axis.value / largest);
        return <Circle key={axis.label} cx={x} cy={y} r={3} fill={fill} />;
      })}

      {axes.map((axis, index) => {
        const [x, y] = point(index, 1 + LABEL_ROOM * 0.9);
        const muted = axis.value === 0;
        return (
          <SvgText
            key={axis.label}
            x={x}
            y={y}
            fill={muted ? theme.textSecondary : theme.text}
            fontSize={12}
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="middle">
            {`${axis.label} ${axis.value}`}
          </SvgText>
        );
      })}
    </Svg>
  );
}
