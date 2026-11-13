import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { parseNote, type Block, type Span } from '@/features/agenda/markdown';
import { useTheme } from '@/hooks/use-theme';

const HEADING_SIZE: Record<1 | 2 | 3, TextStyle> = {
  1: { fontSize: 22, lineHeight: 30, fontWeight: '800' },
  2: { fontSize: 19, lineHeight: 26, fontWeight: '800' },
  3: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
};

/**
 * A note's Markdown drawn formatted. Things to tick off are real boxes, and
 * links open in the browser. Tapping anywhere else hands over to `onEdit`,
 * which is how the note is opened for writing.
 */
export function MarkdownView({
  markdown,
  onToggleTask,
  onEdit,
}: {
  markdown: string;
  onToggleTask: (line: number) => void;
  onEdit: () => void;
}) {
  const blocks = parseNote(markdown);

  return (
    <Pressable onPress={onEdit} style={styles.body} accessibilityHint="Toca para editar">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} onToggleTask={onToggleTask} />
      ))}
    </Pressable>
  );
}

function BlockView({ block, onToggleTask }: { block: Block; onToggleTask: (line: number) => void }) {
  const theme = useTheme();

  switch (block.kind) {
    case 'blank':
      return <View style={styles.blank} />;

    case 'heading':
      return (
        <ThemedText style={HEADING_SIZE[block.level]}>
          <Spans spans={block.spans} />
        </ThemedText>
      );

    case 'task':
      return (
        <Pressable
          onPress={() => onToggleTask(block.line)}
          hitSlop={4}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: block.checked }}
          style={styles.row}>
          <Ionicons
            name={block.checked ? 'checkbox' : 'square-outline'}
            size={22}
            color={block.checked ? theme.accentText : theme.textSecondary}
          />
          <ThemedText
            type="default"
            themeColor={block.checked ? 'textSecondary' : undefined}
            style={[styles.rowText, block.checked && styles.crossed]}>
            <Spans spans={block.spans} />
          </ThemedText>
        </Pressable>
      );

    case 'bullet':
    case 'numbered':
      return (
        <View style={styles.row}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.marker}>
            {block.kind === 'bullet' ? '•' : `${block.number}.`}
          </ThemedText>
          <ThemedText type="default" style={styles.rowText}>
            <Spans spans={block.spans} />
          </ThemedText>
        </View>
      );

    case 'paragraph':
      return (
        <ThemedText type="default">
          <Spans spans={block.spans} />
        </ThemedText>
      );
  }
}

/** The styled pieces of a line, nested inside the line's own text. */
function Spans({ spans }: { spans: Span[] }) {
  const theme = useTheme();

  return spans.map((span, index) => {
    const style: TextStyle = {
      fontWeight: span.bold ? '800' : undefined,
      fontStyle: span.italic ? 'italic' : undefined,
      textDecorationLine: span.underline || span.href ? 'underline' : undefined,
      color: span.href ? theme.accentText : undefined,
    };
    const href = span.href;

    return (
      <Text
        key={index}
        style={style}
        onPress={href ? () => void Linking.openURL(href) : undefined}
        suppressHighlighting={!href}>
        {span.text}
      </Text>
    );
  });
}

const styles = StyleSheet.create({
  body: { gap: 4, minHeight: 200 },
  blank: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowText: { flex: 1 },
  marker: { minWidth: 18 },
  crossed: { textDecorationLine: 'line-through' },
});
