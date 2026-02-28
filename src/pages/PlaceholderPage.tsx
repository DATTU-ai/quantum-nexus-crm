import { motion } from "framer-motion";
import { Construction } from "lucide-react";

const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-12 text-center max-w-md"
      >
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Construction className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">This module is under development. Check back soon.</p>
      </motion.div>
    </div>
  );
};

export default PlaceholderPage;
