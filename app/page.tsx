"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  MyEventsWidget,
  MyCalendarsWidget,
  QuickStatsWidget,
  ProfileWidget,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays, LogIn, Users, Globe } from "lucide-react";

function LandingPage() {
  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Welcome to Eventky
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A decentralized event management platform built on Pubky. Create calendars,
            organize events, and collaborate — all with full ownership of your data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                <LogIn className="h-5 w-5" />
                Sign In to Get Started
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/events">
                <CalendarDays className="h-5 w-5" />
                Browse Public Events
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border bg-card text-card-foreground">
            <Calendar className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create Calendars</h3>
            <p className="text-muted-foreground">
              Organize your events with custom calendars. Share them publicly or keep them private.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-card-foreground">
            <CalendarDays className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Manage Events</h3>
            <p className="text-muted-foreground">
              Create one-time or recurring events with full details, location, and scheduling.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-card-foreground">
            <Globe className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Decentralized</h3>
            <p className="text-muted-foreground">
              Your data stays yours. Built on Pubky for true data ownership and portability.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-8 space-y-4 border-t">
          <h2 className="text-2xl font-semibold">Ready to get started?</h2>
          <p className="text-muted-foreground">
            Sign in with your Pubky account.
          </p>
          <Button asChild size="lg">
            <Link href="/login">
              Sign In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { auth, isAuthenticated } = useAuth();
  const userId = auth?.publicKey || undefined;

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Row: Profile and Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProfileWidget />
          <div className="lg:col-span-2">
            <QuickStatsWidget />
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <MyEventsWidget userId={userId} maxItems={5} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <MyCalendarsWidget maxItems={6} />
          </div>
        </div>

        {/* Additional widgets can be added here - fully extensible */}
      </div>
    </div>
  );
}

