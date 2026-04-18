/**
 * useKeyboardAvoidance.ts — Cross-platform keyboard height detection
 *
 * On native (Capacitor iOS/Android): uses the Capacitor Keyboard plugin events
 * for exact keyboard height with animation timing.
 *
 * On web mobile (browsers): uses the visualViewport API to detect when the
 * on-screen keyboard shrinks the visible area.
 *
 * In both cases, when the keyboard shows, the active input element is scrolled
 * into view so it is never obscured.
 */

import { useState, useEffect } from 'react';

interface KeyboardState {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  containerStyle: {
    paddingBottom: string;
    transition: string;
  };
}

const TRANSITION = 'padding-bottom 0.25s ease-out';
// Minimum viewport shrinkage (px) required to infer keyboard is open on web
const WEB_KEYBOARD_THRESHOLD = 150;

function scrollActiveInputIntoView() {
  window.setTimeout(() => {
    const focused = document.activeElement as HTMLElement | null;
    if (focused && typeof focused.scrollIntoView === 'function') {
      focused.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 80);
}

export function useKeyboardAvoidance(offset: number = 0): KeyboardState {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [shouldApplyPadding, setShouldApplyPadding] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setupNative = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return false;
        const isAndroid = Capacitor.getPlatform() === 'android';
        setShouldApplyPadding(!isAndroid);

        const { Keyboard } = await import('@capacitor/keyboard');
        const showEvent = isAndroid ? 'keyboardDidShow' : 'keyboardWillShow';
        const hideEvent = isAndroid ? 'keyboardDidHide' : 'keyboardWillHide';

        const showHandle = await Keyboard.addListener(showEvent, (info) => {
          setIsKeyboardVisible(true);
          setKeyboardHeight(info.keyboardHeight);
          scrollActiveInputIntoView();
        });

        const hideHandle = await Keyboard.addListener(hideEvent, () => {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        });

        cleanup = () => {
          showHandle.remove();
          hideHandle.remove();
        };

        return true;
      } catch {
        return false;
      }
    };

    const setupWeb = () => {
      setShouldApplyPadding(true);
      const vv = window.visualViewport;
      if (!vv) return;

      const windowHeight = window.innerHeight;

      const onResize = () => {
        const diff = windowHeight - (vv.height ?? windowHeight);
        if (diff > WEB_KEYBOARD_THRESHOLD) {
          setIsKeyboardVisible(true);
          setKeyboardHeight(diff);
          scrollActiveInputIntoView();
        } else {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        }
      };

      vv.addEventListener('resize', onResize);
      cleanup = () => vv.removeEventListener('resize', onResize);
    };

    setupNative().then((isNative) => {
      if (!isNative) setupWeb();
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return {
    isKeyboardVisible,
    keyboardHeight,
    containerStyle: {
      paddingBottom: shouldApplyPadding && isKeyboardVisible ? `${keyboardHeight + offset}px` : '0px',
      transition: TRANSITION,
    },
  };
}
