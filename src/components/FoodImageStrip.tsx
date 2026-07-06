import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { getFoodImages } from '../data/imageRepo';
import type { FoodImage } from '../data/pixabay/client';
import { colors, radius, space } from '../theme';

const THUMB_W = 160;
const THUMB_H = 120;

// Horizontal strip of Pixabay photos so the user can see what a food looks
// like. Decorative by design: renders nothing while loading fails, when the
// key is missing, or when the food has no usable English name — the screen
// must read the same as before this feature existed.
export function FoodImageStrip({
  foodCode,
  nameEn,
}: {
  foodCode: string;
  nameEn: string;
}) {
  const [images, setImages] = useState<FoodImage[]>([]);

  useEffect(() => {
    let cancelled = false;
    getFoodImages(foodCode, nameEn)
      .then((imgs) => {
        if (!cancelled) setImages(imgs);
      })
      .catch((e) => console.warn('[images] load failed:', e?.message ?? e));
    return () => {
      cancelled = true;
    };
  }, [foodCode, nameEn]);

  if (images.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={images}
        keyExtractor={(img) => img.webformatURL}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.webformatURL }}
            style={styles.thumb}
            resizeMode="cover"
            accessibilityLabel={item.tags}
          />
        )}
      />
      {/* Credit required by the Pixabay API terms. */}
      <Text style={styles.credit}>Ảnh minh họa từ Pixabay</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg },
  list: { paddingHorizontal: space.lg, gap: space.sm },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  credit: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: space.lg,
    marginTop: space.xs,
  },
});
