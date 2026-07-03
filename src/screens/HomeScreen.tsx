import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { getHistoryCount } from '../data/historyRepo';
import { colors, radius, space } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Landing hub. Keeps the camera behind an explicit action so first launch isn't
// an unexplained permission prompt, and gives history a first-class entry point.
export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      getHistoryCount()
        .then(setCount)
        .catch(() => setCount(null));
    }, []),
  );

  const historySubtitle =
    count === null
      ? 'Xem lại các món đã quét'
      : count === 0
        ? 'Chưa có lượt quét nào'
        : `${count} lượt đã lưu`;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brand}>FoodScan VN</Text>
        <Text style={styles.tagline}>
          Chụp món ăn để nhận diện, biết chay/mặn, dinh dưỡng và gợi ý món Việt.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryCard, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Capture')}
        >
          <Text style={styles.primaryGlyph}>📷</Text>
          <View style={styles.cardText}>
            <Text style={styles.primaryTitle}>Quét món mới</Text>
            <Text style={styles.primarySub}>Chụp ảnh hoặc chọn từ thư viện</Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryCard, pressed && styles.pressed]}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.secondaryGlyph}>🕗</Text>
          <View style={styles.cardText}>
            <Text style={styles.secondaryTitle}>Lịch sử quét</Text>
            <Text style={styles.secondarySub}>{historySubtitle}</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế chuyên môn.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.xl,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: space.xl * 1.5 },
  logo: { width: 96, height: 96, borderRadius: radius.lg, marginBottom: space.lg },
  brand: { fontSize: 30, fontWeight: '800', color: colors.text },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.md,
  },

  actions: { gap: space.md },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  pressed: { opacity: 0.85 },
  cardText: { flex: 1 },
  primaryGlyph: { fontSize: 28 },
  secondaryGlyph: { fontSize: 28 },
  primaryTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  primarySub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  secondaryTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  secondarySub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.xl * 1.5,
  },
});
