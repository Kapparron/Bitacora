import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import type { Food } from '@/db/schema';
import { cacheProduct } from '@/features/nutrition/mutations';
import { searchProducts, type OffProduct } from '@/features/nutrition/openfoodfacts';
import { useSuggestedFoods, type Meal } from '@/features/nutrition/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';

/** Long enough that typing a word does not fire three searches at the API. */
const SEARCH_DELAY_MS = 500;

export default function FoodSearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { date, meal } = useLocalSearchParams<{ date: string; meal: Meal }>();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const { favorites, recents } = useSuggestedFoods();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // TanStack Query keeps one request in flight per term and caches the result,
  // which matters against an API that rate-limits searches to about ten a minute.
  const {
    data: results = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['off-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: debounced.length >= 3,
    staleTime: 10 * 60 * 1000,
  });

  function openAmount(foodId: string) {
    router.push({ pathname: '/food/amount', params: { foodId, date, meal } });
  }

  async function chooseProduct(product: OffProduct) {
    const food = await cacheProduct(product);
    openAmount(food.id);
  }

  const searching = debounced.length >= 3;
  const suggestions = [...favorites, ...recents.filter((food) => !favorites.some((f) => f.id === food.id))];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Anadir alimento" />

      <View style={styles.tools}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar un alimento"
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
            onPress={() => router.push({ pathname: '/food/new', params: { date, meal } })}
          />
        </View>
      </View>

      {searching ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.barcode}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductRow
              name={item.name}
              brand={item.brand}
              kcal={item.kcalPer100g}
              imageUrl={item.imageUrl}
              onPress={() => void chooseProduct(item)}
            />
          )}
          ListHeaderComponent={
            isFetching ? <ActivityIndicator style={styles.spinner} /> : null
          }
          ListEmptyComponent={
            isFetching ? null : (
              <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
                {error
                  ? 'No se pudo consultar Open Food Facts. Comprueba la conexion.'
                  : 'Ningun producto con ese nombre. Puedes crearlo a mano.'}
              </ThemedText>
            )
          }
        />
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            suggestions.length > 0 ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                TUS ALIMENTOS
              </ThemedText>
            ) : null
          }
          renderItem={({ item }: { item: Food }) => (
            <ProductRow
              name={item.name}
              brand={item.brand}
              kcal={item.kcalPer100g}
              imageUrl={item.imageUrl}
              favorite={item.isFavorite}
              onPress={() => openAmount(item.id)}
            />
          )}
          ListEmptyComponent={
            <ThemedText type="default" themeColor="textSecondary" style={styles.empty}>
              Escribe al menos tres letras para buscar en Open Food Facts, escanea un codigo de
              barras o crea el alimento a mano.
            </ThemedText>
          }
        />
      )}
    </View>
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

function ProductRow({
  name,
  brand,
  kcal,
  imageUrl,
  favorite,
  onPress,
}: {
  name: string;
  brand: string | null;
  kcal: number;
  imageUrl: string | null;
  favorite?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
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
  spinner: { paddingVertical: 16 },
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
  empty: { textAlign: 'center', paddingHorizontal: 32, paddingTop: 32 },
});
