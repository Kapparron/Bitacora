import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { ScreenHeader } from '@/components/screen-header';
import { TextPrompt } from '@/components/text-prompt';
import { ThemedText } from '@/components/themed-text';
import type { Note } from '@/db/schema';
import { MarkdownView } from '@/features/agenda/components/markdown-view';
import {
  applyInline,
  applyLine,
  applyLink,
  continueList,
  toggleTask,
  type Edit,
  type InlineFormat,
  type LineFormat,
  type Selection,
} from '@/features/agenda/markdown';
import { deleteNote, discardNoteIfEmpty, updateNote } from '@/features/agenda/mutations';
import { useNote } from '@/features/agenda/queries';
import { useTheme } from '@/hooks/use-theme';

/** Quiet time after the last keystroke before the note is written. */
const SAVE_DELAY_MS = 500;

/**
 * A note, as in any notes app: a title and text, read formatted and edited as
 * Markdown (see features/agenda/markdown.ts). Tapping the text opens it for
 * writing, with a toolbar over the keyboard for bold, italic, underline,
 * links, headings, lists and things to tick off; "Hecho" goes back to reading.
 *
 * It saves itself as it is typed, and a note left empty is dropped on the way
 * out.
 */
export default function NoteScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { note, loading } = useNote(id);

  if (!note) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="default" themeColor="textSecondary">
          {loading ? 'Cargando...' : 'Esta nota ya no existe.'}
        </ThemedText>
      </View>
    );
  }

  // Keyed on the note so the text is read from the database once: from then on
  // the screen owns it, and a save coming back cannot move the cursor.
  return <NoteEditor key={note.id} note={note} />;
}

type ToolbarAction =
  | { kind: 'inline'; format: InlineFormat; icon: keyof typeof Ionicons.glyphMap; label: string }
  | { kind: 'line'; format: LineFormat; icon: keyof typeof Ionicons.glyphMap; label: string }
  | { kind: 'link'; icon: keyof typeof Ionicons.glyphMap; label: string };

const TOOLBAR: ToolbarAction[] = [
  { kind: 'inline', format: 'bold', icon: 'text', label: 'Negrita' },
  { kind: 'inline', format: 'italic', icon: 'text-outline', label: 'Cursiva' },
  { kind: 'inline', format: 'underline', icon: 'remove-outline', label: 'Subrayado' },
  { kind: 'link', icon: 'link', label: 'Enlace' },
  { kind: 'line', format: 'heading', icon: 'reorder-two', label: 'Título' },
  { kind: 'line', format: 'bullet', icon: 'list', label: 'Lista' },
  { kind: 'line', format: 'task', icon: 'checkbox-outline', label: 'Lista de tareas' },
];

function NoteEditor({ note }: { note: Note }) {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();

  const blank = note.title === '' && note.body === '';
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [editing, setEditing] = useState(blank);
  const [linking, setLinking] = useState(false);

  /** Where the cursor is, as the text input last reported it. */
  const selection = useRef<Selection>({ start: note.body.length, end: note.body.length });
  /**
   * A cursor the toolbar has just placed. Handed to the input once and then let
   * go: holding the input's selection all the time makes Android's cursor jump.
   */
  const [placed, setPlaced] = useState<Selection | undefined>();

  /**
   * Writes wait for a pause, since every write reloads the notes on the agenda.
   * What is still pending is written on the way out.
   */
  const pending = useRef<{ title?: string; body?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flush(): Promise<void> {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    const patch = pending.current;
    pending.current = {};
    return Object.keys(patch).length > 0 ? updateNote(note.id, patch) : Promise.resolve();
  }

  function save(patch: { title?: string; body?: string }) {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  // On leaving, whatever was still waiting is written first, and only then is a
  // note left empty dropped: the other way round could drop a title just typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => void flush().then(() => discardNoteIfEmpty(note.id)), []);

  function setText(edit: Edit) {
    setBody(edit.text);
    selection.current = edit.selection;
    setPlaced(edit.selection);
    save({ body: edit.text });
  }

  function type(next: string) {
    // Enter on a list line carries the list on, as notes apps do.
    const continued = continueList(body, next);
    if (continued) {
      setText(continued);
      return;
    }
    setBody(next);
    save({ body: next });
  }

  function runToolbar(action: ToolbarAction) {
    if (action.kind === 'link') {
      setLinking(true);
      return;
    }

    setText(
      action.kind === 'inline'
        ? applyInline(body, selection.current, action.format)
        : applyLine(body, selection.current, action.format)
    );
  }

  function tick(line: number) {
    const next = toggleTask(body, line);
    setBody(next);
    save({ body: next });
  }

  async function remove() {
    const accepted = await confirm({
      title: 'Borrar nota',
      message: title.trim() || 'Esta nota y todo lo que tiene.',
      confirmLabel: 'Borrar',
    });
    if (!accepted) return;

    pending.current = {};
    await deleteNote(note.id);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenHeader
        title=""
        right={
          editing ? (
            <Pressable onPress={() => setEditing(false)} hitSlop={8}>
              <ThemedText type="default" style={{ color: theme.accentText, fontWeight: '700' }}>
                Hecho
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={() => void remove()} hitSlop={8} accessibilityLabel="Borrar nota">
              <Ionicons name="trash-outline" size={22} color={theme.textSecondary} />
            </Pressable>
          )
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            save({ title: text });
          }}
          autoFocus={blank}
          placeholder="Título"
          placeholderTextColor={theme.textSecondary}
          style={[styles.title, { color: theme.text }]}
        />

        {editing ? (
          <TextInput
            value={body}
            onChangeText={type}
            onSelectionChange={({ nativeEvent }) => {
              selection.current = nativeEvent.selection;
              if (placed) setPlaced(undefined);
            }}
            selection={placed}
            autoFocus={!blank}
            multiline
            scrollEnabled={false}
            placeholder="Escribe aquí..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.body, { color: theme.text }]}
          />
        ) : body.trim() === '' ? (
          <Pressable onPress={() => setEditing(true)} style={styles.emptyBody}>
            <ThemedText type="default" themeColor="textSecondary">
              Toca para escribir.
            </ThemedText>
          </Pressable>
        ) : (
          <MarkdownView markdown={body} onToggleTask={tick} onEdit={() => setEditing(true)} />
        )}
      </ScrollView>

      {editing ? (
        <View style={[styles.toolbar, { borderColor: theme.border, backgroundColor: theme.background }]}>
          {TOOLBAR.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => runToolbar(action)}
              accessibilityLabel={action.label}
              hitSlop={4}
              style={({ pressed }) => [styles.tool, pressed && { backgroundColor: theme.backgroundElement }]}>
              {action.kind === 'inline' ? (
                <ThemedText
                  style={[
                    styles.toolLetter,
                    action.format === 'bold' && { fontWeight: '900' },
                    action.format === 'italic' && { fontStyle: 'italic' },
                    action.format === 'underline' && { textDecorationLine: 'underline' },
                  ]}>
                  {action.format === 'bold' ? 'B' : action.format === 'italic' ? 'I' : 'U'}
                </ThemedText>
              ) : (
                <Ionicons name={action.icon} size={22} color={theme.text} />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      {linking ? (
        <TextPrompt
          title="Añadir enlace"
          message="Se pone sobre el texto seleccionado, o como la dirección misma."
          placeholder="https://..."
          confirmLabel="Añadir"
          keyboardType="url"
          onCancel={() => setLinking(false)}
          onSubmit={(value) => {
            setLinking(false);
            const url = value.trim();
            if (!url) return;
            setText(applyLink(body, selection.current, /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`));
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 8 },
  title: { fontSize: 24, fontWeight: '800', paddingVertical: 8 },
  body: { fontSize: 16, lineHeight: 24, minHeight: 200, textAlignVertical: 'top' },
  emptyBody: { minHeight: 200 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tool: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  toolLetter: { fontSize: 18, lineHeight: 22 },
});
