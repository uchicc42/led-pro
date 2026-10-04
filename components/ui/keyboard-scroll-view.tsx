import { forwardRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';

// ScrollView that keeps the focused text box above the on-screen keyboard.
// iOS: the ScrollView insets itself for the keyboard and scrolls the focused input into view.
// Android: KeyboardAvoidingView (no behavior), per Expo's keyboard-handling guide for edge-to-edge.
// Works in Expo Go; react-native-keyboard-controller would need a development build.
export const KeyboardScrollView = forwardRef<ScrollView, ScrollViewProps>(function KeyboardScrollView(props, ref) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={undefined} enabled={Platform.OS === 'android'}>
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        {...props}
      />
    </KeyboardAvoidingView>
  );
});
