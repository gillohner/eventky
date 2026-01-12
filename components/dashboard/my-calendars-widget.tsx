"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { useUserCalendars } from "@/hooks/use-user-calendars";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface MyCalendarsWidgetProps {
    maxItems?: number;
}

/**
 * Widget showing calendars the user is author of or admin
 */
export function MyCalendarsWidget({ maxItems = 6 }: MyCalendarsWidgetProps) {
    const { data: calendars, isLoading } = useUserCalendars({ limit: 100 });

    // Limit to maxItems and sort by name
    const myCalendars = useMemo(() => {
        if (!calendars) return [];
        return calendars
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, maxItems);
    }, [calendars, maxItems]);

    if (isLoading) {
        return (
            <DashboardWidget
                title="My Calendars"
                description="Calendars you manage"
                icon={Calendar}
                viewAllHref="/calendars"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            </DashboardWidget>
        );
    }

    return (
        <DashboardWidget
            title="My Calendars"
            description="Calendars you manage"
            icon={Calendar}
            viewAllHref="/calendars"
            isEmpty={myCalendars.length === 0}
            emptyMessage="You haven't created any calendars yet"
            emptyIcon={Calendar}
            emptyAction={{ label: "Create Calendar", href: "/calendar/create" }}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myCalendars.map((calendar) => {
                    return (
                        <Link
                            key={calendar.id}
                            href={`/calendar/${calendar.author}/${calendar.id}`}
                            className="block"
                        >
                            <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors h-full">
                                {/* Calendar Header */}
                                <div className="flex items-start gap-2">
                                    <div
                                        className="h-3 w-3 rounded-sm flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: calendar.color || "#3b82f6" }}
                                    />
                                    <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                                        {calendar.name}
                                    </h4>
                                </div>

                                {/* Calendar Description */}
                                {calendar.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {calendar.description}
                                    </p>
                                )}

                                {/* Calendar Meta */}
                                <div className="flex items-center gap-2 mt-auto pt-2">
                                    <Badge variant="secondary" className="text-xs">
                                        {calendar.timezone}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {calendar.isOwner ? "Owner" : "Author"}
                                    </Badge>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </DashboardWidget>
    );
}
