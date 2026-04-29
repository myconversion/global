import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function TopLoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setVisible(true);
    setProgress(30);

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) {
          clearInterval(timerRef.current);
          return 85;
        }
        return prev + Math.random() * 20;
      });
    }, 100);

    const completeTimer = setTimeout(() => {
      clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 150);
    }, 250);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(completeTimer);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 8px hsl(var(--primary) / 0.4)',
        }}
      />
    </div>
  );
}
