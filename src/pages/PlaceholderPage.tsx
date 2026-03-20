import { motion } from "framer-motion";
import { Construction } from "lucide-react";

const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-md p-12 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
          <Construction className="h-6 w-6 text-primary" />
        </div>
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle max-w-none">This module is under development. Check back soon.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PlaceholderPage;
