import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>

      {user ? (
        <>
          <p className="mt-4 text-xl text-gray-600">
            You are not allowed to access this page.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            The page does not exist or you don’t have permission.
          </p>

          <div className="mt-6">
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-xl text-gray-600">
            This page does not exist.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please login to continue.
          </p>

          <div className="mt-6">
            <Link to="/">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
