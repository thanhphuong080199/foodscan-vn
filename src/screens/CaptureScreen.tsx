import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { colors, radius, space } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

// Downscale-by-quality keeps the base64 payload small enough for the Gemini
// inline-data request without pulling in expo-image-manipulator.
const CAPTURE_QUALITY = 0.6;

export function CaptureScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const goToResult = (uri: string, base64: string, mimeType: string) => {
    navigation.navigate('Result', { uri, base64, mimeType });
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: CAPTURE_QUALITY,
      });
      if (photo?.base64) goToResult(photo.uri, photo.base64, 'image/jpeg');
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: CAPTURE_QUALITY,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset?.base64) {
          goToResult(asset.uri, asset.base64, asset.mimeType ?? 'image/jpeg');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // Permission not yet resolved.
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Permission denied / not granted: explain + let them grant, or use gallery.
  if (!permission.granted) {
    return (
      <View style={[styles.center, { padding: space.xl }]}>
        <Text style={styles.title}>FoodScan VN</Text>
        <Text style={styles.permText}>
          Cần quyền truy cập máy ảnh để chụp và nhận diện thực phẩm.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Cấp quyền máy ảnh</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
          <Text style={styles.secondaryBtnText}>Chọn từ thư viện</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        facing="back"
        style={StyleSheet.absoluteFill}
        onCameraReady={() => setReady(true)}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <Text style={styles.brand}>FoodScan VN</Text>
        <Text style={styles.hint}>Đưa máy ảnh vào món ăn rồi chụp</Text>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }]}>
        <Pressable style={styles.galleryBtn} onPress={pickFromGallery} disabled={busy}>
          <Text style={styles.galleryText}>Thư viện</Text>
        </Pressable>

        <Pressable
          style={[styles.shutter, (!ready || busy) && styles.shutterDisabled]}
          onPress={takePhoto}
          disabled={!ready || busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        {/* Spacer to keep the shutter centered opposite the gallery button. */}
        <View style={styles.galleryBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: space.md },
  permText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: space.xl,
  },
  topBar: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  brand: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  controls: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
  },
  galleryBtn: {
    width: 72,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  galleryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
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
});
