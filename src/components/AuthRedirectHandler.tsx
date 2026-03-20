import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_REDIRECT_EVENT = "crm:auth-required";

const AuthRedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => navigate("/login");
    window.addEventListener(AUTH_REDIRECT_EVENT, handler);
    return () => window.removeEventListener(AUTH_REDIRECT_EVENT, handler);
  }, [navigate]);

  return null;
};

export default AuthRedirectHandler;
