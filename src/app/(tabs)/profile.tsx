import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { BodyPanel } from '@/features/body/components/body-panel';
import {
  BackupFormatError,
  exportBackup,
  pickBackup,
  restoreBackup,
} from '@/features/backup/backup';
import { setGoal } from '@/features/nutrition/mutations';
import { ProgressPanel } from '@/features/progress/progress-panel';
import { useGoalFor } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber, toIsoDay } from '@/lib/format';

function parse(value: string): number | null {
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const today = toIsoDay();
  const goal = useGoalFor(today);

  const [editing, setEditing] = useState(false);
  /** Result or error of the last backup action, shown under the buttons. */
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  async function runExport() {
    setBusy(true);
    setBackupNote(null);

    try {
      const result = await exportBackup();
      setBackupNote(
        result.shared
          ? `Copia de ${result.rows} registros lista: ${result.fileName}`
          : `Copia guardada en la cache como ${result.fileName}; este dispositivo no puede compartirla.`
      );
    } catch (cause) {
      setBackupNote(`No se pudo exportar: ${String(cause)}`);
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBackupNote(null);

    try {
      const backup = await pickBackup();
      if (!backup) return;

      const rows = Object.values(backup.tables).reduce((sum, table) => sum + table.length, 0);
      const accepted = await confirm({
        title: 'Restaurar copia',
        message: `Se borran TODOS los datos de la app y se sustituyen por los ${rows} registros de la copia. Esto no se puede deshacer.`,
        confirmLabel: 'Restaurar',
        destructive: true,
      });

      if (!accepted) return;

      setBusy(true);
      const result = await restoreBackup(backup);
      setBackupNote(`Restaurados ${result.rows} registros.`);
    } catch (cause) {
      setBackupNote(
        cause instanceof BackupFormatError
          ? cause.message
          : `No se pudo restaurar: ${String(cause)}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            OBJETIVO DIARIO
          </ThemedText>

          {goal && !editing ? (
            <>
              <ThemedText type="subtitle" style={styles.kcal}>
                {formatNumber(goal.kcal, 0)} kcal
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {goal.protein ? `Proteina ${formatNumber(goal.protein, 0)} g` : 'Sin proteina'} ·{' '}
                {goal.carbs ? `Carbos ${formatNumber(goal.carbs, 0)} g` : 'sin carbos'} ·{' '}
                {goal.fat ? `Grasa ${formatNumber(goal.fat, 0)} g` : 'sin grasa'}
              </ThemedText>
              <Button title="Cambiar objetivo" variant="secondary" onPress={() => setEditing(true)} />
            </>
          ) : (
            <GoalForm
              initial={goal}
              onCancel={goal ? () => setEditing(false) : undefined}
              onSave={async (values) => {
                // Dated today, so past days keep the goal they were judged against.
                await setGoal({ effectiveFrom: today, ...values });
                setEditing(false);
              }}
            />
          )}
        </View>

        <BodyPanel />

        <ProgressPanel />

        <View style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            COPIA DE SEGURIDAD
          </ThemedText>

          <Button
            title="Exportar copia"
            variant="secondary"
            disabled={busy}
            onPress={() => void runExport()}
          />
          <Button
            title="Restaurar copia"
            variant="secondary"
            disabled={busy}
            onPress={() => void runImport()}
          />

          {backupNote ? (
            <ThemedText type="small" themeColor="textSecondary">
              {backupNote}
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { kcal: number; protein: number | null; carbs: number | null; fat: number | null } | null;
  onSave: (values: {
    kcal: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }) => void;
  onCancel?: () => void;
}) {
  const [kcal, setKcal] = useState(initial ? String(initial.kcal) : '');
  const [protein, setProtein] = useState(initial?.protein ? String(initial.protein) : '');
  const [carbs, setCarbs] = useState(initial?.carbs ? String(initial.carbs) : '');
  const [fat, setFat] = useState(initial?.fat ? String(initial.fat) : '');

  const energy = parse(kcal);

  return (
    <View style={styles.form}>
      <Field label="Calorias" value={kcal} onChange={setKcal} />
      <Field label="Proteina (g)" value={protein} onChange={setProtein} />
      <Field label="Carbohidratos (g)" value={carbs} onChange={setCarbs} />
      <Field label="Grasa (g)" value={fat} onChange={setFat} />

      <Button
        title="Guardar objetivo"
        disabled={energy === null || energy <= 0}
        onPress={() => {
          if (energy === null) return;
          onSave({ kcal: energy, protein: parse(protein), carbs: parse(carbs), fat: parse(fat) });
        }}
      />

      {onCancel ? <Button title="Cancelar" variant="secondary" onPress={onCancel} /> : null}
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
  container: { flex: 1 },
  content: { padding: 12, gap: 12, paddingBottom: 120 },
  card: { padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  kcal: { fontSize: 30, lineHeight: 36 },
  form: { gap: 10 },
  field: { gap: 4 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
