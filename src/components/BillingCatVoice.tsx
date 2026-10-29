'use client';

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { Mic } from 'lucide-react';
import styles from './BillingCatVoice.module.css';

type HoldControls = Pick<ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture'
  | 'onContextMenu' | 'onTouchStart' | 'onTouchMove' | 'onTouchEnd'
  | 'onKeyDown' | 'onKeyUp' | 'onBlur'
>;

type Props = {
  controls: HoldControls;
  isListening: boolean;
  hindiMode: boolean;
  showFace?: boolean;
  className?: string;
};

export default function BillingCatVoice({ controls, isListening, hindiMode, showFace = true, className }: Props) {
  const [isBooped, setIsBooped] = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelId = useId();

  useEffect(() => () => {
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
  }, []);

  const boopNose = () => {
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setIsBooped(true);
    reactionTimer.current = setTimeout(() => {
      setIsBooped(false);
      reactionTimer.current = null;
    }, 1000);
  };

  return (
    <div
      className={`${styles.mascot} ${className ?? ''}`}
      data-reaction={isBooped ? 'true' : undefined}
      data-listening={isListening ? 'true' : undefined}
      data-compact={!showFace ? 'true' : undefined}
    >
      <div className={styles.portrait} aria-hidden="true">
        <div className={`${styles.face} ${styles.happy}`} />
        <div className={`${styles.face} ${styles.grumpy}`} />
      </div>
      <button
        {...controls}
        type="button"
        aria-label={hindiMode ? 'ऑर्डर बोलने के लिए दबाए रखें। रोकने के लिए छोड़ें।' : 'Hold to speak order. Release to stop.'}
        aria-describedby={labelId}
        aria-pressed={isListening}
        className={styles.nose}
        onPointerDown={(event) => {
          if (event.isPrimary && event.button === 0) boopNose();
          controls.onPointerDown?.(event);
        }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && !event.repeat && [' ', 'Enter'].includes(event.key)) boopNose();
          controls.onKeyDown?.(event);
        }}
      >
        <span className={styles.noseSurface} aria-hidden="true">
          <Mic className={styles.mic} size={20} strokeWidth={1.9} />
        </span>
      </button>
      <div id={labelId} className={styles.caption}>
        <span className={styles.captionTitle}>
          {isListening && <span className={styles.statusDot} aria-hidden="true" />}
          {isListening
            ? (hindiMode ? 'छोड़कर पूरा करें' : 'Release to finish')
            : (hindiMode ? 'दबाकर बोलें' : 'Hold to speak')}
        </span>
        {showFace && (
          <span className={styles.captionHint}>
            {isListening
              ? (hindiMode ? 'मैं सुन रही हूँ…' : 'I’m listening…')
              : (hindiMode ? 'मेरी नाक दबाकर रखें' : 'Press and hold my nose')}
          </span>
        )}
      </div>
    </div>
  );
}
