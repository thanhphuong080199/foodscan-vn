import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import {
  identifyFood,
  GeminiError,
  type IdentifyResult,
} from '../domain/identifyFood';
import { getScan, saveScan } from '../data/historyRepo';
import {
  selectAiNutrition,
  selectLocalNutrition,
  type NutritionView,
} from '../domain/nutritionSelect';
import { Section } from '../components/Section';
import { SourceBadge } from '../components/SourceBadge';
import { NutritionTable } from '../components/NutritionTable';
import { TagList } from '../components/TagList';
import { DishList } from '../components/DishList';
import { VegBadge } from '../components/VegBadge';
import { colors, radius, space } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const DISCLAIMER =
  'Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế chuyên môn.';

// Map the typed Gemini failure to a Vietnamese message + whether retry helps.
function errorMessage(err: unknown): { text: string; canRetry: boolean } {
  if (err instanceof GeminiError) {
    switch (err.code) {
      case 'no_api_key':
        return {
          text: 'Chưa cấu hình Gemini API key. Thêm khóa vào tệp .env rồi khởi động lại.',
          canRetry: false,
        };
      case 'rate_limited':
        return {
          text: 'Tất cả model đều đã hết hạn mức (429). Thử lại sau ít phút.',
          canRetry: true,
        };
      case 'server_error':
        return {
          text: 'Máy chủ AI đang quá tải (503). Thử lại sau ít phút.',
          canRetry: true,
        };
      case 'network':
        return {
          text: 'Lỗi kết nối mạng. Kiểm tra Internet rồi thử lại.',
          canRetry: true,
        };
      case 'bad_response':
        return {
          text: 'AI trả về dữ liệu không hợp lệ. Thử chụp lại rõ hơn.',
          canRetry: true,
        };
      default:
        return { text: err.message || 'Đã xảy ra lỗi không xác định.', canRetry: true };
    }
  }
  if (err instanceof Error && err.message) {
    return { text: err.message, canRetry: true };
  }
  return { text: 'Đã xảy ra lỗi không xác định.', canRetry: true };
}

export function ResultScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { uri, base64, mimeType, historyId } = route.params;

  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [error, setError] = useState<{ text: string; canRetry: boolean } | null>(null);
  const [status, setStatus] = useState('Đang phân tích ảnh…');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        // Re-view path: load the saved result from SQLite, no Gemini call.
        if (historyId != null) {
          setStatus('Đang tải kết quả đã lưu…');
          const row = await getScan(historyId);
          if (!row) throw new Error('Không tìm thấy lượt quét đã lưu.');
          if (!cancelled) setResult(JSON.parse(row.result_json) as IdentifyResult);
          return;
        }

        // Fresh-scan path: identify, then persist on success.
        if (!base64) throw new Error('Thiếu dữ liệu ảnh.');
        const res = await identifyFood(
          { base64, mimeType: mimeType ?? 'image/jpeg' },
          (model, attempt) => {
            if (!cancelled) setStatus(`Đang hỏi ${model} (lần ${attempt})…`);
          },
        );
        if (!cancelled) {
          setResult(res);
          // Fire-and-forget; a failed save shouldn't block showing the result.
          saveScan({
            imageUri: uri,
            foodCode: res.matched?.food_code ?? null,
            nameVn: res.matched?.food_name_vn ?? res.gemini.food_name_vn,
            source: res.source,
            result: res,
          }).catch((e) => console.warn('saveScan failed:', e));
        }
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // Re-run when a new photo comes in, or when re-viewing a saved scan.
  }, [base64, mimeType, historyId, uri]);

  const retry = () => {
    // Reuse the effect by toggling state: simplest is to re-navigate replace.
    navigation.replace('Result', route.params);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Image source={{ uri }} style={styles.loadingThumb} />
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: space.xl }]}>
        <Text style={styles.errIcon}>⚠️</Text>
        <Text style={styles.errText}>{error.text}</Text>
        {error.canRetry && (
          <Pressable style={styles.primaryBtn} onPress={retry}>
            <Text style={styles.primaryBtnText}>Thử lại</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Chụp ảnh khác</Text>
        </Pressable>
      </View>
    );
  }

  if (!result) return null;

  const { gemini, matched, veg, source } = result;
  const nutrition: NutritionView =
    source === 'local' && matched
      ? selectLocalNutrition(matched)
      : selectAiNutrition(gemini.nutrition_estimate);

  // Prefer the authoritative local names when we matched; else Gemini's.
  const nameVn = matched?.food_name_vn ?? gemini.food_name_vn;
  const nameEn = matched?.food_name_en ?? gemini.food_name_en;
  const category = matched?.food_group ?? gemini.category;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
    >
      <Image source={{ uri }} style={styles.hero} />

      <View style={styles.header}>
        <Text style={styles.nameVn}>{nameVn}</Text>
        {!!nameEn && <Text style={styles.nameEn}>{nameEn}</Text>}
        <View style={styles.badgeRow}>
          <VegBadge isVegetarian={veg.isVegetarian} notes={veg.notes} />
          {!!category && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{category}</Text>
            </View>
          )}
        </View>
      </View>

      <Section title="Dinh dưỡng">
        <View style={{ marginBottom: space.md }}>
          <SourceBadge source={source} />
        </View>
        <NutritionTable view={nutrition} />
      </Section>

      <Section title="Lợi ích">
        <TagList items={gemini.benefits} tone="good" />
      </Section>

      <Section title="Rủi ro / Lưu ý">
        <TagList items={gemini.risks} tone="bad" />
      </Section>

      <Section title="Gợi ý món Việt">
        <DishList dishes={gemini.suggested_dishes} />
      </Section>

      {!!gemini.confidence_note && (
        <Section title="Độ tin cậy nhận diện">
          <Text style={styles.body}>{gemini.confidence_note}</Text>
        </Section>
      )}

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

      <Pressable style={styles.rescan} onPress={() => navigation.goBack()}>
        <Text style={styles.rescanText}>Chụp món khác</Text>
      </Pressable>
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
  loadingThumb: { width: 160, height: 160, borderRadius: radius.lg },
  statusText: { marginTop: space.md, color: colors.textMuted, fontSize: 14 },

  hero: { width: '100%', height: 240, backgroundColor: colors.border },
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
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

  body: { fontSize: 15, lineHeight: 22, color: colors.text },

  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.xl,
  },

  errIcon: { fontSize: 40, marginBottom: space.md },
  errText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: space.xl,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: space.sm },
  secondaryBtnText: { color: colors.accent, fontSize: 15, fontWeight: '600' },

  rescan: {
    alignSelf: 'center',
    marginTop: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  rescanText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
});
