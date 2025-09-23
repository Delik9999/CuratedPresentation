import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

type PresenceState = 'present' | 'exiting';

type Transition = {
  duration?: number;
  ease?: string;
};

type MotionBaseProps = {
  initial?: React.CSSProperties;
  animate?: React.CSSProperties;
  exit?: React.CSSProperties;
  transition?: Transition;
  __presence?: PresenceState;
  __onExitComplete?: () => void;
};

type MotionProps<T extends HTMLElement> = React.HTMLAttributes<T> & MotionBaseProps;

const PresenceContext = React.createContext<PresenceState>('present');

function mergeStyles(
  base: React.CSSProperties | undefined,
  state: React.CSSProperties | undefined
): React.CSSProperties {
  return { ...(base ?? {}), ...(state ?? {}) };
}

function resolveDurationMs(transition?: Transition): number {
  if (!transition || typeof transition.duration !== 'number') {
    return 300;
  }
  return Math.max(transition.duration * 1000, 0);
}

function resolveEasing(transition?: Transition): string {
  if (!transition || !transition.ease) return 'ease';
  if (transition.ease === 'easeOut') {
    return 'cubic-bezier(0.16,1,0.3,1)';
  }
  return transition.ease;
}

function createMotionComponent<T extends HTMLElement>(Tag: React.ElementType) {
  const MotionComponent = React.forwardRef<T, MotionProps<T>>(function MotionComponent(
    props,
    ref
  ) {
    const {
      initial,
      animate,
      exit,
      transition,
      style,
      children,
      __presence,
      __onExitComplete,
      ...rest
    } = props as MotionProps<T> & MotionBaseProps;

    const parentPresence = useContext(PresenceContext);
    const presence: PresenceState = __presence ?? parentPresence ?? 'present';

    const durationMs = resolveDurationMs(transition);
    const easing = resolveEasing(transition);

    const [renderStyle, setRenderStyle] = useState<React.CSSProperties>(() => {
      if (presence === 'exiting') {
        return mergeStyles(style, exit ?? animate);
      }
      return mergeStyles(style, initial ?? animate);
    });

    useEffect(() => {
      if (presence === 'present') {
        const frame = requestAnimationFrame(() => {
          setRenderStyle(mergeStyles(style, animate));
        });
        return () => cancelAnimationFrame(frame);
      }
      return undefined;
    }, [presence, animate, style]);

    useEffect(() => {
      if (presence === 'exiting') {
        setRenderStyle(mergeStyles(style, exit ?? animate));
        const timeout = window.setTimeout(() => {
          __onExitComplete?.();
        }, durationMs);
        return () => window.clearTimeout(timeout);
      }
      return undefined;
    }, [presence, exit, animate, style, durationMs, __onExitComplete]);

    const combinedStyle = useMemo(() => {
      const transitionStyles: React.CSSProperties = {
        transitionProperty: 'opacity, transform',
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: easing,
      };
      return { ...renderStyle, ...transitionStyles };
    }, [renderStyle, durationMs, easing]);

    const content = React.createElement(Tag, {
      ...rest,
      ref,
      style: combinedStyle,
      children,
    });

    return React.createElement(
      PresenceContext.Provider,
      { value: presence },
      content
    );
  });

  MotionComponent.displayName = `Motion(${typeof Tag === 'string' ? Tag : 'Component'})`;
  return MotionComponent;
}

export function AnimatePresence({ children }: { children: React.ReactNode }) {
  const [presentChild, setPresentChild] = useState<React.ReactElement | null>(
    React.isValidElement(children) ? children : null
  );
  const [isPresent, setIsPresent] = useState<boolean>(Boolean(children));

  useEffect(() => {
    if (React.isValidElement(children)) {
      setPresentChild(children);
      setIsPresent(true);
    } else if (presentChild) {
      setIsPresent(false);
    } else {
      setPresentChild(null);
    }
  }, [children, presentChild]);

  const handleExitComplete = useCallback(() => {
    setPresentChild(null);
  }, []);

  if (!presentChild) {
    return null;
  }

  return React.cloneElement(presentChild, {
    __presence: isPresent ? 'present' : 'exiting',
    __onExitComplete: handleExitComplete,
  });
}

export const motion = {
  div: createMotionComponent<HTMLDivElement>('div'),
};
