import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import {
  clearHistory,
  deleteScan,
  getHistory,
  type ScanHistoryEntry,
} from '../data/historyRepo';
import { SourceBadge } from '../components/SourceBadge';
import { colors, radius, space } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

// Compact Vietnamese "time ago"; falls back to a date for older entries.
function timeAgo(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// Thumbnail that degrades to a placeholder if the cached image file is gone.
function Thumb({ uri }: { uri: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.thumb, styles.thumbFallback]}>
        <Text style={styles.thumbGlyph}>🍽️</Text>
      </View>
    );
  }
  return (
    <Image source={{ uri }} style={styles.thumb} onError={() => setFailed(true)} />
  );
}

export function HistoryScreen({ navigation }: Props) {
  const [items, setItems] = useState<ScanHistoryEntry[] | null>(null);

  const load = useCallback(() => {
    getHistory()
      .then(setItems)
      .catch((e) => {
        console.warn('getHistory failed:', e);
        setItems([]);
      });
  }, []);

  // Reload whenever the screen regains focus (a new scan may have been saved).
  useFocusEffect(load);

  const confirmClearAll = useCallback(() => {
    Alert.alert('Xóa tất cả lịch sử?', 'Không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa tất cả',
        style: 'destructive',
        onPress: () => clearHistory().then(load),
      },
    ]);
  }, [load]);

  // Show "Xóa" in the header only when there is something to clear.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        items && items.length > 0
          ? () => (
              <Pressable onPress={confirmClearAll} hitSlop={8}>
                <Text style={styles.headerAction}>Xóa</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, items, confirmClearAll]);

  const confirmDelete = (item: ScanHistoryEntry) => {
    Alert.alert('Xóa lượt quét', item.name_vn, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteScan(item.id).then(load),
      },
    ]);
  };

  if (items === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyGlyph}>🕗</Text>
        <Text style={styles.emptyTitle}>Chưa có lượt quét nào</Text>
        <Text style={styles.emptyBody}>
          Các món bạn quét sẽ được lưu ở đây để xem lại.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(it) => String(it.id)}
      contentContainerStyle={{ padding: space.lg }}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() =>
            navigation.navigate('Result', {
              uri: item.image_uri ?? '',
              historyId: item.id,
            })
          }
          onLongPress={() => confirmDelete(item)}
        >
          <Thumb uri={item.image_uri} />
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name_vn}
            </Text>
            <View style={styles.metaRow}>
              <SourceBadge source={item.source} />
            </View>
            <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: space.xl,
  },
  headerAction: { color: colors.accent, fontSize: 15, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.md,
  },
  rowText: { flex: 1, gap: space.xs },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  time: { fontSize: 12, color: colors.textMuted },

  thumb: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.border },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbGlyph: { fontSize: 26 },

  emptyGlyph: { fontSize: 44, marginBottom: space.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: space.xs },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
