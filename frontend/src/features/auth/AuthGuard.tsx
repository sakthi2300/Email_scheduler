import { useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchCurrentUser } from "./authSlice";
import { Loader } from "../../components/Loader";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard — wraps protected routes.
 * Checks the JWT cookie via /api/auth/me.
 * Redirects to /login if not authenticated.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-950">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
