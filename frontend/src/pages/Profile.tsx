import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/api/userApi";
import { Loader2, User } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getCurrentUser();
        setUser(data);
      } catch (err: any) {
        console.error("Failed to fetch current user:", err);
        setError("Unable to load your profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="p-6 flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl p-6">
        <CardHeader className="flex flex-col items-center text-center space-y-2">
          <CardTitle className="text-2xl font-semibold">Your Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            View your personal account details below.
          </p>
        </CardHeader>

        <Separator className="my-4" />

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : user ? (
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar */}
              <Avatar className="h-24 w-24 shadow-md border border-border">
                <AvatarImage
                  src={user.avatarUrl || ""}
                  alt={user.username}
                />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {user.username?.charAt(0)?.toUpperCase() || <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>

              {/* User Details */}
              <div className="text-center space-y-1">
                <h2 className="text-xl font-semibold">{user.username}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge
                  variant="secondary"
                  className="mt-2 px-3 py-1 text-xs font-medium bg-primary/10 text-primary"
                >
                  {user.role}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No profile information available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
