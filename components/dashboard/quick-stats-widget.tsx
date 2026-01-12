"use client";

import { Calendar, CalendarDays, TrendingUp } from "lucide-react";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { useEventsStream } from "@/hooks";
import { useUserCalendars } from "@/hooks/use-user-calendars";
import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

/**
 * Widget showing quick statistics about user's activity
 */
export function QuickStatsWidget() {
    const { auth } = useAuth();
    const userId = auth?.publicKey;
    const { data: events, isLoading: eventsLoading } = useEventsStream({ limit: 1000 });
    const { data: calendars, isLoading: calendarsLoading } = useUserCalendars({ limit: 100 });

    const stats = useMemo(() => {
        if (!events || !calendars || !userId) {
            return {
                myCalendars: 0,
                myEvents: 0,
                totalEvents: events?.length || 0,
            };
        }

        const myCalendars = calendars.length;

        const myEvents = events.filter((event) => event.author === userId).length;

        return {
            myCalendars,
            myEvents,
            totalEvents: events.length,
        };
    }, [events, calendars, userId]);

    const isLoading = eventsLoading || calendarsLoading;

    if (isLoading) {
        return (
            <DashboardWidget title="Quick Stats" icon={TrendingUp}>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            </DashboardWidget>
        );
    }

    const statItems = [
        {
            label: "My Calendars",
            value: stats.myCalendars,
            icon: Calendar,
            color: "text-blue-500",
        },
        {
            label: "Events Created",
            value: stats.myEvents,
            icon: CalendarDays,
            color: "text-green-500",
        },
        {
            label: "Total Events",
            value: stats.totalEvents,
            icon: TrendingUp,
            color: "text-purple-500",
        },
    ];

    return (
        <DashboardWidget title="Quick Stats" icon={TrendingUp}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {statItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="flex flex-col items-center justify-center p-4 rounded-lg border bg-card/50"
                        >
                            <Icon className={`h-8 w-8 mb-2 ${item.color}`} />
                            <div className="text-3xl font-bold">{item.value}</div>
                            <div className="text-xs text-muted-foreground text-center mt-1">
                                {item.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </DashboardWidget>
    );
}
