import { useState, useRef, useEffect, TouchEvent } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const { 
    onSwipeLeft, 
    onSwipeRight, 
    onSwipeUp, 
    onSwipeDown, 
    threshold = 50 
  } = options;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontalSwipe) {
      if (deltaX > threshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX < -threshold && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      if (deltaY > threshold && onSwipeUp) {
        onSwipeUp();
      } else if (deltaY < -threshold && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

export const useLongPress = (
  callback: () => void,
  duration: number = 500
) => {
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = (e: TouchEvent) => {
    target.current = e.target;
    timeout.current = setTimeout(callback, duration);
  };

  const clear = () => {
    timeout.current && clearTimeout(timeout.current);
  };

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear
  };
};
