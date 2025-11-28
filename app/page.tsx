"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"
import { useProfile } from "@/hooks/use-profile"

export default function Home() {
  const router = useRouter()
  const { auth, logout } = useAuth()
  const { profile, isLoading } = useProfile()

  const handleLogout = () => {
    logout()
    toast.success("Logged out successfully")
    router.push("/login")
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome to Eventky
          </h1>
          <p className="text-muted-foreground text-lg">
            Your calendar and event management platform
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => toast.success("Toast is working perfectly!")}>
              Test Toast
            </Button>
            <Button variant="outline" onClick={() => toast.error("This is an error toast")}>
              Test Error
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-4">Your Pubky Profile</h3>
          {isLoading ? (
            <p className="text-muted-foreground">Loading profile...</p>
          ) : profile ? (
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Name:</strong> {profile.name || "Not set"}
              </p>
              <p className="text-sm">
                <strong>Bio:</strong> {profile.bio || "Not set"}
              </p>
              <p className="text-sm">
                <strong>Public Key:</strong>{" "}
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {auth.publicKey}
                </code>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No profile found</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Calendar</h2>
            <p className="text-muted-foreground">
              View and manage your personal calendar
            </p>
          </div>

          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Events</h2>
            <p className="text-muted-foreground">
              Discover and create events
            </p>
          </div>
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
          <p className="text-muted-foreground">
            This is the MVP framework. Use the sidebar to navigate between
            Calendar and Events sections. The layout is mobile-friendly with
            a collapsible sidebar.
          </p>
        </div>
      </div>
    </div>
  );
}

