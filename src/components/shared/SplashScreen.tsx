import { motion } from 'framer-motion';
import logoImg from '@/assets/logo-primary.png';

export function SplashScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <motion.img
          src={logoImg}
          alt="Logo"
          className="h-12 w-auto"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative w-48 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '70%', '40%', '90%', '100%'] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </motion.div>
    </div>
  );
}
