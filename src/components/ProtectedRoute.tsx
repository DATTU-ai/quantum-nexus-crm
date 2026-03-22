import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
