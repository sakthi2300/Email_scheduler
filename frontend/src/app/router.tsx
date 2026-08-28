import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { SignUpPage } from "../features/auth/SignUpPage";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { AuthGuard } from "../features/auth/AuthGuard";
import { useAppDispatch, useAppSelector } from "./store";
import { fetchCurrentUser } from "../features/auth/authSlice";
import { Loader } from "../components/Loader";

/**
 * UnauthGuard — wraps public/auth pages (e.g. login, signup).
 * If a user is already logged in, redirect them to /dashboard.
 */
function UnauthGuard({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-950">
        <Loader size="lg" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <>{children}</>;
}

/**
 * Application router.
 * - AuthGuard protects /dashboard
 * - UnauthGuard protects /login and /signup (redirects logged-in users to /dashboard)
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <UnauthGuard>
              <LoginPage />
            </UnauthGuard>
          }
        />
        <Route
          path="/signup"
          element={
            <UnauthGuard>
              <SignUpPage />
            </UnauthGuard>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <AuthGuard>
              <DashboardLayout />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
