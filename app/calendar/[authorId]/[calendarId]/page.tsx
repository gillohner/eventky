"use client";

import { use } from "react";
import { useCalendar } from "@/hooks/use-calendar-optimistic";
import { DevJsonView } from "@/components/dev-json-view";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Edit } from "lucide-react";
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

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-4">
                {isOwner && (
                    <Button onClick={() => router.push(`/calendar/${authorId}/${calendarId}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Calendar
                    </Button>
                )}
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
