import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="glass-card max-w-lg p-12 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-quantum-danger/30 bg-quantum-danger/10 text-quantum-danger">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="page-header">
          <h1 className="page-title">Page not found</h1>
          <p className="page-subtitle max-w-none">
            The route <span className="font-mono text-foreground">{location.pathname}</span> does not exist in this workspace.
          </p>
        </div>
        <div className="mt-8">
          <Button asChild>
            <Link to="/">Return to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

