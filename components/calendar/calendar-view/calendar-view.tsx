"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCalendarView } from "@/hooks";
import type { CalendarViewProps, CalendarViewMode } from "@/types";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarAgendaView } from "./calendar-agenda-view";

/**
 * Complete calendar view component with controls
 * Supports month/week/agenda views with filtering
 */
export function CalendarView({
    events,
    calendars,
    initialSelectedCalendars,
    externalDateRange,
    className,
}: CalendarViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const isInitialMount = useRef(true);

    // Get initial values from URL params
    const urlViewMode = searchParams.get("view") as CalendarViewMode | null;
    const urlDate = searchParams.get("date");

    const initialViewMode = (urlViewMode && ["month", "week", "agenda"].includes(urlViewMode))
        ? urlViewMode
        : "month";
    const initialDate = urlDate ? parseISO(urlDate) : new Date();

    const {
        currentDate,
        viewMode,
        selectedCalendars,
        dateRange,
        calendarEvents,
        goToNext,
        goToPrevious,
        goToToday,
        setViewMode,
        toggleCalendar,
        selectAllCalendars,
        deselectAllCalendars,
    } = useCalendarView(events, {
        calendars,
        initialSelectedCalendars,
        initialViewMode,
        initialDate,
        externalDateRange,
    });

    // Update URL when view mode or date changes (skip initial mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const params = new URLSearchParams(searchParams.toString());
        const dateStr = format(currentDate, "yyyy-MM-dd");

        // Only update if values actually changed
        if (params.get("view") !== viewMode || params.get("date") !== dateStr) {
            params.set("view", viewMode);
            params.set("date", dateStr);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [viewMode, currentDate, pathname, router, searchParams]);

    // Get current period label
    const getPeriodLabel = () => {
        switch (viewMode) {
            case "month":
                return format(currentDate, "MMMM yyyy");
            case "week":
                return `Week of ${format(currentDate, "MMM d, yyyy")}`;
            case "agenda":
                return format(currentDate, "MMMM yyyy");
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Controls */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevious}
                        className="h-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="h-8 min-w-[80px]"
                    >
                        Today
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNext}
                        className="h-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="ml-2 text-lg font-semibold">
                        {getPeriodLabel()}
                    </div>
                </div>

                {/* View mode toggle - hidden on mobile, agenda is default */}
                <div className="hidden md:block">
                    <Tabs
                        value={viewMode}
                        onValueChange={(value: string) => {
                            setViewMode(value as "month" | "week" | "agenda");
                        }}
                    >
                        <TabsList>
                            <TabsTrigger value="month">Month</TabsTrigger>
                            <TabsTrigger value="week">Week</TabsTrigger>
                            <TabsTrigger value="agenda">Agenda</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Calendar filters */}
            {calendars && calendars.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Calendars:</span>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={
                            selectedCalendars.length === calendars.length
                                ? deselectAllCalendars
                                : selectAllCalendars
                        }
                        className="h-7 text-xs"
                    >
                        {selectedCalendars.length === calendars.length ? "Deselect All" : "Select All"}
                    </Button>

                    {calendars.map((calendar) => {
                        const isSelected = selectedCalendars.includes(calendar.id);

                        return (
                            <Badge
                                key={calendar.id}
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer"
                                style={
                                    isSelected
                                        ? {
                                            backgroundColor: calendar.color,
                                            borderColor: calendar.color,
                                        }
                                        : { borderLeft: `3px solid ${calendar.color}` }
                                }
                                onClick={() => toggleCalendar(calendar.id)}
                            >
                                {calendar.name}
                            </Badge>
                        );
                    })}
                </div>
            )}

            {/* Views */}
            <div className="mt-6">
                {/* Mobile: Always agenda */}
                <div className="md:hidden">
                    <CalendarAgendaView
                        dateRange={dateRange}
                        events={calendarEvents}
                    />
                </div>

                {/* Desktop: Switch based on mode */}
                <div className="hidden md:block">
                    {viewMode === "month" && (
                        <CalendarMonthView
                            currentDate={currentDate}
                            events={calendarEvents}
                        />
                    )}

                    {viewMode === "week" && (
                        <CalendarWeekView
                            currentDate={currentDate}
                            events={calendarEvents}
                        />
                    )}

                    {viewMode === "agenda" && (
                        <CalendarAgendaView
                            dateRange={dateRange}
                            events={calendarEvents}
                        />
                    )}
                </div>
            </div>

            {/* Event count */}
            <div className="text-sm text-muted-foreground text-center">
                {calendarEvents.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8">
                        <CalendarIcon className="h-5 w-5 opacity-50" />
                        <span>No events to display</span>
                    </div>
                ) : (
                    <span>Showing {calendarEvents.length} events</span>
                )}
            </div>
        </div>
    );
}
