import { StyleSheet, Text, View } from 'react-native';
import type { NutritionView, NutrientRow } from '../domain/nutritionSelect';
import { colors, space } from '../theme';

// Trim to at most 2 decimals, drop trailing zeros ("12.50" -> "12.5", "9" stays).
function fmt(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

function Row({ row, last }: { row: NutrientRow; last: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>{row.label}</Text>
      <Text style={styles.value}>
        {fmt(row.value)} <Text style={styles.unit}>{row.unit}</Text>
      </Text>
    </View>
  );
}

// Renders the curated per-100g table. `notable` micronutrients get a divider +
// sub-heading below the always-shown macros.
export function NutritionTable({ view }: { view: NutritionView }) {
  const { always, notable } = view;

  if (always.length === 0 && notable.length === 0) {
    return <Text style={styles.empty}>Không có dữ liệu dinh dưỡng.</Text>;
  }

  return (
    <View>
      <Text style={styles.per100}>Giá trị trên 100g phần ăn được</Text>
      {always.map((r, i) => (
        <Row key={r.label} row={r} last={i === always.length - 1 && notable.length === 0} />
      ))}
      {notable.length > 0 && (
        <>
          <Text style={styles.subHeading}>Vi chất đáng chú ý</Text>
          {notable.map((r, i) => (
            <Row key={r.label} row={r} last={i === notable.length - 1} />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  per100: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 15, color: colors.text, flex: 1, paddingRight: space.md },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
  unit: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  empty: { fontSize: 14, color: colors.textMuted },
});
