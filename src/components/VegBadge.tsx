import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';

// "Ngũ vị tân" (five pungent spices) is jargon most users won't know, so we
// spell it out — but only when the notes actually reference it (see below).
const NGU_VI_TAN_RE = /ngũ vị tân/i;
const NGU_VI_TAN_EXPLAINER =
  'Ngũ vị tân là năm loại gia vị có mùi cay nồng — hành, tỏi, hẹ, kiệu (nén) ' +
  'và hưng cừ (a ngùy). Người ăn chay theo đạo Phật thường kiêng năm loại này.';

// Chay (vegetarian) status chip. Tapping it opens a sheet with the full
// explanation (why it's chay / not, group-guard note, ngũ vị tân glossary).
export function VegBadge({
  isVegetarian,
  notes,
}: {
  isVegetarian: boolean;
  notes?: string;
}) {
  const [open, setOpen] = useState(false);

  const bg = isVegetarian ? colors.localSoft : colors.accentSoft;
  const fg = isVegetarian ? colors.veg : colors.nonVeg;
  const label = isVegetarian ? 'Chay ✓' : 'Không chay';
  const body = notes?.trim() || 'Không có ghi chú.';
  const showGlossary = !!notes && NGU_VI_TAN_RE.test(notes);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pill, { backgroundColor: bg }]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Nhấn để xem giải thích.`}
      >
        <Text style={[styles.text, { color: fg }]}>{label}</Text>
        <View style={[styles.infoDot, { borderColor: fg }]}>
          <Text style={[styles.infoGlyph, { color: fg }]}>i</Text>
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Stop taps inside the card from closing the sheet. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.grabber} />
            <Text style={[styles.sheetTitle, { color: fg }]}>{label}</Text>
            <Text style={styles.sheetBody}>{body}</Text>

            {showGlossary && (
              <View style={styles.glossary}>
                <Text style={styles.glossaryTerm}>Ngũ vị tân là gì?</Text>
                <Text style={styles.glossaryText}>{NGU_VI_TAN_EXPLAINER}</Text>
              </View>
            )}

            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Đã hiểu</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  infoDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  infoGlyph: { fontSize: 11, fontWeight: '800', lineHeight: 13 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: space.xs,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetBody: { fontSize: 15, lineHeight: 22, color: colors.text },
  glossary: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  glossaryTerm: { fontSize: 14, fontWeight: '700', color: colors.text },
  glossaryText: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    marginTop: space.xs,
  },
  closeText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
});
