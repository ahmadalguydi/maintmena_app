import { useState, useEffect } from 'react';

interface KeyboardState {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  containerStyle: {
    paddingBottom: string;
    transition: string;
  };
}

export function useKeyboardAvoidance(offset: number = 0): KeyboardState {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setupKeyboardListeners = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { Keyboard } = await import('@capacitor/keyboard');

        const showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
          setIsKeyboardVisible(true);
          setKeyboardHeight(info.keyboardHeight);
        });

        const hideListener = await Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        });

        cleanup = () => {
          showListener.remove();
          hideListener.remove();
        };
      } catch (e) {
        // Plugin not available or web platform
      }
    };

    setupKeyboardListeners();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return {
    isKeyboardVisible,
    keyboardHeight,
    containerStyle: {
      paddingBottom: isKeyboardVisible ? `${keyboardHeight + offset}px` : '0px',
      transition: 'padding-bottom 0.3s ease-out',
    },
  };
}
