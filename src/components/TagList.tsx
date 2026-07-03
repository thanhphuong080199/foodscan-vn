import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../theme';

// Simple bulleted list for benefits / risks. `tone` colors the bullet.
export function TagList({
  items,
  tone = 'neutral',
}: {
  items: string[];
  tone?: 'good' | 'bad' | 'neutral';
}) {
  if (!items || items.length === 0) {
    return <Text style={styles.empty}>Không có thông tin.</Text>;
  }
  const dotColor =
    tone === 'good' ? colors.local : tone === 'bad' ? colors.accent : colors.textMuted;

  return (
    <View style={{ gap: space.sm }}>
      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  text: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.text },
  empty: { fontSize: 14, color: colors.textMuted },
});
