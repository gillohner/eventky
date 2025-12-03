"use client";

import { use } from "react";
import { useCalendar } from "@/hooks/use-calendar";
import { DevJsonView } from "@/components/dev-json-view";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Edit } from "lucide-react";

interface CalendarPageProps {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

export default function CalendarPage({ params }: CalendarPageProps) {
    const { authorId, calendarId } = use(params);
    const { data: calendar, isLoading, error } = useCalendar(authorId, calendarId);
    const router = useRouter();
    const { auth } = useAuth();
    const isOwner = auth?.publicKey === authorId;

    return (
        <div className="container mx-auto py-8 px-4">
            {isOwner && (
                <div className="mb-4">
                    <Button onClick={() => router.push(`/calendar/${authorId}/${calendarId}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Calendar
                    </Button>
                </div>
            )}
            <DevJsonView
                data={calendar}
                title={`Calendar: ${authorId}/${calendarId}`}
                isLoading={isLoading}
                error={error as Error}
            />
        </div>
    );
}
