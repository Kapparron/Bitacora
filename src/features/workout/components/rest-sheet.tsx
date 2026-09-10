import { OptionSheet, type SheetOption } from '@/components/option-sheet';

/** Null turns the rest timer off for that exercise. */
export const REST_OPTIONS: SheetOption<number | null>[] = [
  { value: null, label: 'Sin temporizador' },
  { value: 30, label: '30 segundos' },
  { value: 45, label: '45 segundos' },
  { value: 60, label: '1 minuto' },
  { value: 90, label: '1 min 30 s' },
  { value: 120, label: '2 minutos' },
  { value: 150, label: '2 min 30 s' },
  { value: 180, label: '3 minutos' },
  { value: 240, label: '4 minutos' },
  { value: 300, label: '5 minutos' },
];

export function formatRest(seconds: number | null): string {
  if (seconds === null) return 'Sin descanso';
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes}:${rest.toString().padStart(2, '0')}`;
}

/** Render this only while it is open; see the note in OptionSheet. */
export function RestSheet({
  current,
  onSelect,
  onClose,
}: {
  current: number | null;
  onSelect: (seconds: number | null) => void;
  onClose: () => void;
}) {
  return (
    <OptionSheet
      title="Descanso entre series"
      options={REST_OPTIONS}
      current={current}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
