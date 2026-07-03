import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';

// Chay (vegetarian) status chip. Includes the ngũ vị tân / group-guard note.
export function VegBadge({
  isVegetarian,
  overridden,
}: {
  isVegetarian: boolean;
  overridden?: boolean;
}) {
  const bg = isVegetarian ? colors.localSoft : colors.accentSoft;
  const fg = isVegetarian ? colors.veg : colors.nonVeg;
  const label = isVegetarian ? 'Chay ✓' : 'Không chay';
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
      {overridden && <Text style={styles.note}>(theo nhóm thực phẩm)</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    gap: space.xs,
  },
  text: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 11, color: colors.textMuted },
});
