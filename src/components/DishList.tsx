import { StyleSheet, Text, View } from 'react-native';
import type { SuggestedDish } from '../data/gemini/schema';
import { colors, space } from '../theme';

// Suggested Vietnamese dishes: name + one-line description.
export function DishList({ dishes }: { dishes: SuggestedDish[] }) {
  if (!dishes || dishes.length === 0) {
    return <Text style={styles.empty}>Không có gợi ý món.</Text>;
  }
  return (
    <View style={{ gap: space.md }}>
      {dishes.map((d, i) => (
        <View key={i}>
          <Text style={styles.name}>{d.name}</Text>
          {!!d.brief_description && (
            <Text style={styles.desc}>{d.brief_description}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  desc: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: 14, color: colors.textMuted },
});
