import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import type { BodyMetric } from '@/db/schema';
import { deleteBodyMetric, saveBodyMetric } from '@/features/body/mutations';
import { useBodyMetrics } from '@/features/body/queries';
import { DayPrompt } from '@/features/calendar/date-prompt';
import { LineChart } from '@/features/charts/line-chart';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatNumber, toIsoDay } from '@/lib/format';

/** `YYYY-MM-DD` as a local timestamp at midday, away from any DST edge. */
function dayTimestamp(day: string): number {
  return new Date(`${day}T12:00:00`).getTime();
}

function parse(value: string): number | null {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
}

/**
 * Body weight and fat percentage over time, as a block of cards for the profile
 * screen. One measurement per day, so logging the same day twice corrects it
 * instead of adding a second point.
 */
export function BodyPanel() {
  const theme = useTheme();
  const confirm = useConfirm();
  const { metrics } = useBodyMetrics();

  /** The measurement being written, `new` for a fresh one, null while closed. */
  const [draft, setDraft] = useState<BodyMetric | 'new' | null>(null);
  const [menuMetric, setMenuMetric] = useState<BodyMetric | null>(null);

  const weightPoints = metrics
    .filter((metric) => metric.weight !== null)
    .map((metric) => ({ x: dayTimestamp(metric.date), y: metric.weight as number }));

  const first = weightPoints.at(0);
  const last = weightPoints.at(-1);
  const latest = [...metrics].reverse().find((metric) => metric.weight !== null) ?? null;
  const change = first && last ? last.y - first.y : null;

  async function remove(metric: BodyMetric) {
    const accepted = await confirm({
      title: 'Borrar medida',
      message: `Se borra la medida del ${formatDay(dayTimestamp(metric.date))}.`,
      confirmLabel: 'Borrar',
      destructive: true,
    });

    if (accepted) await deleteBodyMetric(metric.id);
  }

  return (
    <>
      <View style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          PESO ACTUAL
        </ThemedText>

        <ThemedText type="subtitle" style={styles.weight}>
          {latest?.weight != null ? `${formatNumber(latest.weight, 1)} kg` : '-'}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          {latest === null ? 'Sin medidas todavia.' : formatDay(dayTimestamp(latest.date))}
          {change !== null && weightPoints.length > 1
            ? ` · ${change >= 0 ? '+' : ''}${formatNumber(change, 1)} kg desde el primer registro`
            : ''}
        </ThemedText>

        <LineChart
          points={weightPoints}
          formatValue={(value) => `${formatNumber(value, 1)} kg`}
          formatX={(x) => formatDay(x)}
        />
      </View>

      {draft ? (
        <MetricForm
          metric={draft === 'new' ? null : draft}
          onCancel={() => setDraft(null)}
          onSave={async (values) => {
            await saveBodyMetric(values);
            setDraft(null);
          }}
        />
      ) : (
        <Button title="Anadir medida" onPress={() => setDraft('new')} />
      )}

      {metrics.length > 0 ? (
        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            HISTORIAL
          </ThemedText>

          {[...metrics].reverse().map((metric) => (
            <Pressable
              key={metric.id}
              onLongPress={() => setMenuMetric(metric)}
              style={({ pressed }) => [
                styles.row,
                { borderTopColor: theme.border },
                pressed && { backgroundColor: theme.backgroundElement },
              ]}>
              <View style={styles.rowText}>
                <ThemedText type="default">{formatDay(dayTimestamp(metric.date))}</ThemedText>
                {metric.notes ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {metric.notes}
                  </ThemedText>
                ) : null}
              </View>

              <ThemedText type="default" style={styles.rowValue}>
                {metric.weight != null ? `${formatNumber(metric.weight, 1)} kg` : '-'}
                {metric.bodyFatPct != null ? ` · ${formatNumber(metric.bodyFatPct, 1)} %` : ''}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
      {menuMetric ? (
        <OptionSheet
          title={formatDay(dayTimestamp(menuMetric.date))}
          options={METRIC_ACTIONS}
          current={null}
          onSelect={(action) => {
            const metric = menuMetric;
            setMenuMetric(null);
            if (!metric) return;

            if (action === 'edit') setDraft(metric);
            else void remove(metric);
          }}
          onClose={() => setMenuMetric(null)}
        />
      ) : null}
    </>
  );
}

const METRIC_ACTIONS: SheetOption<'edit' | 'delete'>[] = [
  { value: 'edit', label: 'Editar', description: 'Cambiar los valores de ese dia' },
  { value: 'delete', label: 'Eliminar', description: 'Quitar la medida' },
];

function MetricForm({
  metric,
  onSave,
  onCancel,
}: {
  metric: BodyMetric | null;
  onSave: (values: {
    date: string;
    weight: number | null;
    bodyFatPct: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [date, setDate] = useState(metric?.date ?? toIsoDay());
  const [pickingDay, setPickingDay] = useState(false);
  const [weight, setWeight] = useState(metric?.weight != null ? String(metric.weight) : '');
  const [fat, setFat] = useState(metric?.bodyFatPct != null ? String(metric.bodyFatPct) : '');
  const [notes, setNotes] = useState(metric?.notes ?? '');

  const kilograms = parse(weight);
  const bodyFat = parse(fat);

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {metric ? 'EDITAR MEDIDA' : 'NUEVA MEDIDA'}
      </ThemedText>

      <Pressable
        onPress={() => setPickingDay(true)}
        style={({ pressed }) => [
          styles.input,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="default">{formatDay(dayTimestamp(date))}</ThemedText>
      </Pressable>

      <Field label="Peso (kg)" value={weight} onChange={setWeight} />
      <Field label="Grasa corporal (%)" value={fat} onChange={setFat} />

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Notas
        </ThemedText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
      </View>

      <Button
        title="Guardar medida"
        disabled={kilograms === null && bodyFat === null}
        onPress={() =>
          onSave({
            date,
            weight: kilograms,
            bodyFatPct: bodyFat,
            notes: notes.trim() === '' ? null : notes.trim(),
          })
        }
      />
      <Button title="Cancelar" variant="secondary" onPress={onCancel} />

      {pickingDay ? (
        <DayPrompt
          title="Dia de la medida"
          initialDay={date}
          onCancel={() => setPickingDay(false)}
          onSubmit={(day) => {
            setPickingDay(false);
            setDate(day);
          }}
        />
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  weight: { fontSize: 30, lineHeight: 36 },
  field: { gap: 4 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  pressed: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowValue: { fontWeight: '700' },
});
