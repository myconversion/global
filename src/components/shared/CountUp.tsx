import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function CountUp({
  end,
  duration = 800,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatter,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(formatter ? formatter(0) : `${prefix}0${suffix}`);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(formatter ? formatter(end) : `${prefix}${end.toFixed(decimals)}${suffix}`);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current || now);
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * end;

      if (formatter) {
        setDisplay(formatter(current));
      } else {
        setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, prefix, suffix, decimals, formatter]);

  return <span className={className}>{display}</span>;
}
