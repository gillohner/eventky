"use client";

import { useSearchParams } from "next/navigation";
import { CreateEventPageLayout } from "@/components/event/create/create-event-page-layout";

export default function CreateEventPage() {
  const searchParams = useSearchParams();
  const calendarUri = searchParams.get("calendar") || undefined;

  return <CreateEventPageLayout mode="create" initialCalendarUri={calendarUri} />;
}