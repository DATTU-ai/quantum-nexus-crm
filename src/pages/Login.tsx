import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import QuantumBackground from "@/components/QuantumBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { apiRequest, storeAuthToken } from "@/lib/apiClient";

const RETURN_URL_KEY = "dattu.crm.returnUrl";
const DEMO_EMAIL = import.meta.env.VITE_DEMO_USER_EMAIL || "admin@dattu.local";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_USER_PASSWORD || "QuantumCRM!2026";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email: trimmedEmail, password },
        skipAuth: true,
      });

      storeAuthToken(response.token, rememberMe ? "local" : "session");
      const returnUrl = window.sessionStorage.getItem(RETURN_URL_KEY) || "/";
      window.sessionStorage.removeItem(RETURN_URL_KEY);
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <QuantumBackground />
      <div className="relative z-10 w-full max-w-md">
        <Card className="border border-border/70 bg-card/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to continue to the CRM workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  Remember me
                </label>
              </div>
              {error ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
