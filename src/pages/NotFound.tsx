import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    // 404 route tracked for debugging
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-4"
      >
        <div className="w-24 h-24 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-2">
          <span className="text-4xl font-extrabold text-muted-foreground">404</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.notFound.title}</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {t.notFound.description}
        </p>
        <Button asChild className="gap-2">
          <Link to="/"><Home className="w-4 h-4" /> {t.notFound.backToHome}</Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
