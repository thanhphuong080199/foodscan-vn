import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { getByCode } from '../data/foodRepo';
import type { FoodRow } from '../data/types';
import { selectLocalNutrition } from '../domain/nutritionSelect';
import { vegetarianFromGroup } from '../domain/vegetarian';
import { Section } from '../components/Section';
import { SourceBadge } from '../components/SourceBadge';
import { NutritionTable } from '../components/NutritionTable';
import { VegBadge } from '../components/VegBadge';
import { colors, radius, space } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FoodDetail'>;

const DISCLAIMER =
  'Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế chuyên môn.';

export function FoodDetailScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { foodCode } = route.params;

  const [food, setFood] = useState<FoodRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getByCode(foodCode)
      .then((row) => {
        if (!cancelled) setFood(row);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [foodCode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Không tìm thấy dữ liệu món ăn.</Text>
      </View>
    );
  }

  const nutrition = selectLocalNutrition(food);
  const veg = vegetarianFromGroup(food.food_group);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
    >
      <View style={styles.header}>
        <Text style={styles.nameVn}>{food.food_name_vn}</Text>
        {!!food.food_name_en && <Text style={styles.nameEn}>{food.food_name_en}</Text>}
        <View style={styles.badgeRow}>
          {veg && <VegBadge isVegetarian={false} notes={veg.notes} />}
          {!!food.food_group && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{food.food_group}</Text>
            </View>
          )}
        </View>
      </View>

      <Section title="Dinh dưỡng">
        <View style={{ marginBottom: space.md }}>
          <SourceBadge source="local" />
        </View>
        <NutritionTable view={nutrition} />
      </Section>

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  missing: { fontSize: 15, color: colors.textMuted },

  header: { paddingHorizontal: space.lg, paddingTop: space.lg },
  nameVn: { fontSize: 26, fontWeight: '800', color: colors.text },
  nameEn: { fontSize: 15, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    flexWrap: 'wrap',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  categoryChipText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },

  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.xl,
  },
});
