"use client";

import { use } from "react";
import { useCalendar } from "@/hooks/use-calendar-hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { calendarUriBuilder } from "pubky-app-specs";
import { Edit, Plus } from "lucide-react";
import { SyncBadge } from "@/components/ui/sync-status-indicator";

interface CalendarPageProps {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

export default function CalendarPage({ params }: CalendarPageProps) {
    const { authorId, calendarId } = use(params);
    const { data: calendar, isLoading, error, syncStatus, isOptimistic } = useCalendar(authorId, calendarId);
    const router = useRouter();
    const { auth } = useAuth();

    const isOwner = auth?.publicKey === authorId;
    const isAdmin = calendar?.details.x_pubky_admins?.includes(auth?.publicKey || "") ?? false;
    const canManage = isOwner || isAdmin;

    // Build the calendar URI for the "Add Event" link
    const calendarUri = calendar?.details.uri || calendarUriBuilder(authorId, calendarId);

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {canManage && (
                        <>
                            <Button
                                variant="default"
                                onClick={() => router.push(`/event/create?calendar=${encodeURIComponent(calendarUri)}`)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Event
                            </Button>
                            {isOwner && (
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/calendar/${authorId}/${calendarId}/edit`)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Calendar
                                </Button>
                            )}
                        </>
                    )}
                </div>
                {isOptimistic && (
                    <SyncBadge status={syncStatus} />
                )}
            </div>
            <DevJsonView
                data={calendar}
                title={`Calendar: ${authorId}/${calendarId}`}
                isLoading={isLoading}
                error={error as Error}
            />
        </div>
    );
}
