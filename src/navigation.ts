// Shared React Navigation types for the Capture -> Result stack.

export type RootStackParamList = {
  // Landing hub: choose to scan a new dish or browse saved scans.
  Home: undefined;
  Capture: undefined;
  // Two ways to reach Result:
  //  - Fresh scan: uri (preview) + base64/mimeType (the Gemini call). Camera
  //    output is JPEG; gallery supplies its own mimeType.
  //  - Re-view from history: uri + historyId; the saved IdentifyResult is
  //    loaded from SQLite and no Gemini call is made.
  Result: {
    uri: string;
    base64?: string;
    mimeType?: string;
    historyId?: number;
  };
  History: undefined;
};
