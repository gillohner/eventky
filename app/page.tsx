"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function Home() {
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
          </div>
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

