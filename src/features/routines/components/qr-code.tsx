import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Modules of white border a scanner needs around the code. */
const QUIET_ZONE = 4;

/**
 * Draws a QR code as a single SVG path. Always black on white, whatever the
 * theme: cameras read inverted codes badly.
 */
export function QrCode({ value, size }: { value: string; size: number }) {
  const { path, count } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'L' });
    let d = '';

    for (let row = 0; row < modules.size; row++) {
      for (let column = 0; column < modules.size; column++) {
        if (modules.get(row, column)) {
          d += `M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
        }
      }
    }

    return { path: d, count: modules.size + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
      <Rect width={count} height={count} fill="#ffffff" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
