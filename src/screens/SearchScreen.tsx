import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { searchFoods, type FoodSearchHit } from '../data/foodRepo';
import { colors, radius, space } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

// Manual lookup: type a food name, tap a result to see its VTN nutrition.
// No image, no Gemini, no history — pure local-database search.
export function SearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<FoodSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  // Guards against a slow search overwriting results from a newer keystroke.
  const runIdRef = useRef(0);

  // Debounce so we filter once typing settles rather than on every keystroke.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const runId = ++runIdRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await searchFoods(q);
        if (runId === runIdRef.current) setHits(res);
      } finally {
        if (runId === runIdRef.current) setSearching(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const trimmed = query.trim();

  return (
    <View style={[styles.container, { paddingTop: insets.top + space.md }]}>
      <View style={styles.searchBar}>
        <Text style={styles.searchGlyph}>🔍</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm món ăn, ví dụ: trứng gà, rau muống…"
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={hits}
        keyExtractor={(h) => h.food.food_code}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={
          hits.length === 0 ? styles.emptyContent : { paddingBottom: insets.bottom + space.xl }
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              navigation.navigate('FoodDetail', { foodCode: item.food.food_code })
            }
          >
            <View style={styles.rowText}>
              <Text style={styles.nameVn} numberOfLines={1}>
                {item.food.food_name_vn}
              </Text>
              {!!item.food.food_name_en && (
                <Text style={styles.nameEn} numberOfLines={1}>
                  {item.food.food_name_en}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {searching ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Text style={styles.emptyGlyph}>{trimmed ? '🤔' : '🍜'}</Text>
                <Text style={styles.emptyText}>
                  {trimmed
                    ? 'Không tìm thấy món phù hợp. Thử từ khóa khác.'
                    : 'Nhập tên món ăn để tra cứu dinh dưỡng từ dữ liệu Viện Dinh dưỡng.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  searchGlyph: { fontSize: 16 },
  input: { flex: 1, fontSize: 16, color: colors.text, padding: 0 },
  clear: { fontSize: 15, color: colors.textMuted, paddingHorizontal: space.xs },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  rowPressed: { opacity: 0.7 },
  rowText: { flex: 1 },
  nameVn: { fontSize: 16, fontWeight: '700', color: colors.text },
  nameEn: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: space.sm },

  emptyContent: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.xl * 2,
    paddingHorizontal: space.xl,
  },
  emptyGlyph: { fontSize: 40, marginBottom: space.md },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
