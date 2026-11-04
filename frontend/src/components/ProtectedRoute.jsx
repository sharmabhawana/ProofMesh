import { useAuth } from "../context/AuthContext";
import LoadingState from "./LoadingState";

export default function ProtectedRoute({ children, fallback }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Authenticating ProofMesh session..." />;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return children;
}

