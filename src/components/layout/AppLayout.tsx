import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { Suspense, useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { OnboardingTour } from '@/components/shared/OnboardingTour';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TopLoadingBar } from '@/components/shared/TopLoadingBar';
import { DashboardSkeleton } from '@/components/shared/PageSkeletons';
import { DailyWelcomePopup } from '@/components/shared/DailyWelcomePopup';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

export function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  useKeyboardShortcuts();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <TopLoadingBar />
      {isMobile ? (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        <AppSidebar />
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AppHeader onMobileMenuToggle={() => setMobileOpen(true)} />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={location.pathname}
              className="min-h-full"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Suspense fallback={<DashboardSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <OnboardingTour />
        <DailyWelcomePopup />
      </div>
    </div>
  );
}
