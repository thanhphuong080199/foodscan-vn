// Shared React Navigation types for the Capture -> Result stack.

export type RootStackParamList = {
  Capture: undefined;
  // The captured image travels as a local uri (for preview) plus base64 for the
  // Gemini call. Camera output is JPEG; gallery supplies its own mimeType.
  Result: { uri: string; base64: string; mimeType: string };
};
