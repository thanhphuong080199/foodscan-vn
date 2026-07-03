import { StyleSheet, Text, View } from 'react-native';
import type { NutritionSource } from '../domain/identifyFood';
import { colors, radius, space } from '../theme';

// Communicates where the nutrition numbers came from (SPEC §2): authoritative
// local DB vs an AI estimate that must be visibly badged.
export function SourceBadge({ source }: { source: NutritionSource }) {
  const local = source === 'local';
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: local ? colors.localSoft : colors.aiSoft },
      ]}
    >
      <View
        style={[styles.dot, { backgroundColor: local ? colors.local : colors.ai }]}
      />
      <Text style={[styles.label, { color: local ? colors.local : colors.ai }]}>
        {local ? 'Dữ liệu địa phương (Viện Dinh dưỡng)' : 'Ước tính bởi AI'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    gap: space.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600' },
});
