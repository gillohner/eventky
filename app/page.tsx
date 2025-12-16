"use client";

import { useAuth } from "@/components/providers/auth-provider";
import {
  MyEventsWidget,
  MyCalendarsWidget,
  QuickStatsWidget,
  ProfileWidget,
} from "@/components/dashboard";

export default function Home() {
  const { auth, isAuthenticated } = useAuth();
  const userId = auth?.publicKey || undefined;

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Row: Profile and Quick Stats */}
        {isAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ProfileWidget />
            <div className="lg:col-span-2">
              <QuickStatsWidget />
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {isAuthenticated && <MyEventsWidget userId={userId} maxItems={5} />}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {isAuthenticated && <MyCalendarsWidget maxItems={6} />}
          </div>
        </div>

        {/* Additional widgets can be added here - fully extensible */}
      </div>
    </div>
  );
}

