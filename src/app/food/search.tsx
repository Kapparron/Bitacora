import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import type { Food } from '@/db/schema';
import { cacheProduct, deleteFood } from '@/features/nutrition/mutations';
import { searchProducts, type OffProduct } from '@/features/nutrition/openfoodfacts';
import { useLocalFoods, useSuggestedFoods, type Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';
import { normalizeText } from '@/lib/text';

type Row =
  | { kind: 'local'; food: Food }
  | { kind: 'remote'; product: OffProduct };

/**
 * Finding a food to log.
 *
 * The box searches what is already stored first, and never calls Open Food Facts
 * on its own: their search endpoint allows about ten requests a minute, and
 * typing a word would spend several of them. The network is only used when the
 * user asks for it, by which point they have seen that nothing local matches.
 */
export default function FoodSearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { date, meal } = useLocalSearchParams<{ date: string; meal: Meal }>();

  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  /** Food whose long-press menu is open. */
  const [menuFood, setMenuFood] = useState<Food | null>(null);
  /** The term the user sent to the network, if any. */
  const [webQuery, setWebQuery] = useState<string | null>(null);

  const localFoods = useLocalFoods();
  const { favorites, recents } = useSuggestedFoods();

  const trimmed = query.trim();

  const localMatches = useMemo(() => {
    const needle = normalizeText(trimmed);
    if (needle.length === 0) return [];

    return localFoods.filter((food) =>
      normalizeText(`${food.name} ${food.brand ?? ''}`).includes(needle)
    );
  }, [localFoods, trimmed]);

  const {
    data: webResults = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['off-search', webQuery],
    queryFn: ({ signal }) => searchProducts(webQuery as string, signal),
    enabled: webQuery !== null,
    staleTime: 30 * 60 * 1000,
  });

  function openAmount(foodId: string) {
    router.push({ pathname: '/food/amount', params: { foodId, date, meal } });
  }

  async function chooseProduct(product: OffProduct) {
    const food = await cacheProduct(product);
    openAmount(food.id);
  }

  const suggestions = useMemo(
    () => [...favorites, ...recents.filter((food) => !favorites.some((f) => f.id === food.id))],
    [favorites, recents]
  );

  // Before typing: what the user already uses. While typing: local matches, and
  // the web results underneath once they have been asked for.
  const rows: Row[] =
    trimmed.length === 0
      ? suggestions.map((food) => ({ kind: 'local', food }))
      : [
          ...localMatches.map((food): Row => ({ kind: 'local', food })),
          ...webResults.map((product): Row => ({ kind: 'remote', product })),
        ];

  const searchedWeb = webQuery !== null && webQuery === trimmed;

  async function removeFood(food: Food) {
    const accepted = await confirm({
      title: 'Eliminar alimento',
      message: `Se quita "${food.name}" de tus alimentos. Lo que ya registraste con el se mantiene.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (accepted) await deleteFood(food.id);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Anadir alimento" />

      <View style={styles.tools}>
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            // A new term means the web results on screen are stale.
            setWebQuery(null);
          }}
          placeholder="Buscar en tus alimentos"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          autoFocus
          style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />

        <View style={styles.actions}>
          <Action
            icon="barcode-outline"
            label="Escanear"
            onPress={() => router.push({ pathname: '/food/scan', params: { date, meal } })}
          />
          <Action
            icon="create-outline"
            label="Crear alimento"
            onPress={() => router.push({ pathname: '/food/form', params: { date, meal } })}
          />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => (item.kind === 'local' ? item.food.id : `off-${item.product.barcode}`)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ListHeader
            typing={trimmed.length > 0}
            localCount={localMatches.length}
            suggestionCount={suggestions.length}
          />
        }
        renderItem={({ item }) =>
          item.kind === 'local' ? (
            <FoodRow
              name={item.food.name}
              brand={item.food.brand}
              kcal={item.food.kcalPer100g}
              imageUrl={item.food.imageUrl}
              favorite={item.food.isFavorite}
              onPress={() => openAmount(item.food.id)}
              onLongPress={() => setMenuFood(item.food)}
            />
          ) : (
            <FoodRow
              name={item.product.name}
              brand={item.product.brand}
              kcal={item.product.kcalPer100g}
              imageUrl={item.product.imageUrl}
              remote
              onPress={() => void chooseProduct(item.product)}
            />
          )
        }
        ListFooterComponent={
          trimmed.length === 0 ? null : (
            <View style={styles.footer}>
              {isFetching ? <ActivityIndicator /> : null}

              {!isFetching && searchedWeb && webResults.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  {error
                    ? 'No se pudo consultar Open Food Facts. Comprueba la conexion.'
                    : 'Open Food Facts tampoco tiene nada con ese nombre.'}
                </ThemedText>
              ) : null}

              {!searchedWeb && !isFetching ? (
                <Button
                  title="Buscar en Open Food Facts"
                  variant={localMatches.length === 0 ? 'primary' : 'secondary'}
                  onPress={() => setWebQuery(trimmed)}
                />
              ) : null}
            </View>
          )
        }
      />

      {menuFood ? (
        <OptionSheet
          title={menuFood.name}
          options={FOOD_ACTIONS}
          current={null}
          onSelect={(action) => {
            const food = menuFood;
            setMenuFood(null);
            if (!food) return;

            if (action === 'edit') {
              router.push({ pathname: '/food/form', params: { date, meal, foodId: food.id } });
            } else {
              void removeFood(food);
            }
          }}
          onClose={() => setMenuFood(null)}
        />
      ) : null}
    </View>
  );
}

const FOOD_ACTIONS: SheetOption<'edit' | 'delete'>[] = [
  { value: 'edit', label: 'Editar', description: 'Cambiar nombre, calorias o macros' },
  { value: 'delete', label: 'Eliminar', description: 'Se quita de tus alimentos' },
];

function ListHeader({
  typing,
  localCount,
  suggestionCount,
}: {
  typing: boolean;
  localCount: number;
  suggestionCount: number;
}) {
  if (!typing) {
    return suggestionCount > 0 ? (
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        TUS ALIMENTOS
      </ThemedText>
    ) : (
      <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
        Escribe para buscar entre tus alimentos, escanea un codigo de barras o crea uno a mano.
      </ThemedText>
    );
  }

  return localCount > 0 ? (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
      TUS ALIMENTOS
    </ThemedText>
  ) : (
    <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
      Ningun alimento tuyo coincide.
    </ThemedText>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.backgroundElement },
        pressed && { opacity: 0.6 },
      ]}>
      <Ionicons name={icon} size={18} color={theme.accentText} />
      <ThemedText type="small" style={{ fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function FoodRow({
  name,
  brand,
  kcal,
  imageUrl,
  favorite,
  remote,
  onPress,
  onLongPress,
}: {
  name: string;
  brand: string | null;
  kcal: number;
  imageUrl: string | null;
  favorite?: boolean;
  remote?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.backgroundElement },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <Image
        source={imageUrl}
        style={[styles.thumbnail, { backgroundColor: theme.backgroundElement }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />

      <View style={styles.rowText}>
        <ThemedText type="default" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {brand ? `${brand} · ` : ''}
          {formatNumber(kcal, 0)} kcal / 100 g
        </ThemedText>
      </View>

      {favorite ? <Ionicons name="star" size={16} color={theme.accentText} /> : null}
      {remote ? <Ionicons name="cloud-download-outline" size={16} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tools: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  search: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  list: { paddingBottom: 32 },
  sectionTitle: { paddingHorizontal: 16, paddingVertical: 8 },
  footer: { padding: 16, gap: 12 },
  centered: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 8 },
});
