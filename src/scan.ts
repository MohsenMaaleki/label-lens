import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Asset } from 'expo-asset';

export type ScanSource = 'camera' | 'library' | 'sample';

export class PermissionError extends Error {}

export interface PickedImage {
  uri: string;
  width: number;
}

const MAX_WIDTH = 1600;

/** A local image to explain, or null when the user closed the camera or picker. */
export async function pickImage(source: ScanSource): Promise<PickedImage | null> {
  if (source === 'sample') {
    const [asset] = await Asset.loadAsync(require('../assets/sample-letter.jpg'));
    return { uri: asset.localUri ?? asset.uri, width: asset.width ?? MAX_WIDTH };
  }
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new PermissionError('camera');
  }
  // The system photo picker needs no permission.
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const picked =
    source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const asset = picked.canceled ? undefined : picked.assets[0];
  return asset ? { uri: asset.uri, width: asset.width } : null;
}

/** JPEG at most 1600 px wide: text stays legible, the upload and the model's input shrink. */
export async function prepareImage(image: PickedImage) {
  const ctx = ImageManipulator.manipulate(image.uri);
  if (image.width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
  const out = await (await ctx.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  return { uri: out.uri, base64: out.base64 ?? '' };
}
