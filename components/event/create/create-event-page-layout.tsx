"use client";

import { useEvent } from "@/hooks/use-event-hooks";
import { useCreateEvent, useUpdateEvent } from "@/hooks/use-event-mutations";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/ui/image-upload";
import { BasicInfoFields } from "./basic-info";
import { DateTimeFields } from "./datetime-fields";
import { RecurrenceFields } from "./recurrence-fields";
import { LocationFields } from "./location-fields";
import { CalendarSelector } from "./calendar-selector";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { EventFormData, useEventFormStore } from "@/stores/event-form-store";
import { PubkyAppEvent } from "pubky-app-specs";
import {
  formDataToEventData,
  eventToFormData,
} from "@/lib/pubky/event-utils";
import { config } from "@/lib/config";

interface CreateEventPageLayoutProps {
  mode?: "create" | "edit";
  authorId?: string;
  eventId?: string;
  /** Pre-fill with this calendar URI (used when coming from a calendar page) */
  initialCalendarUri?: string;
}

export function CreateEventPageLayout({
  mode = "create",
  authorId,
  eventId,
  initialCalendarUri,
}: CreateEventPageLayoutProps) {
  const router = useRouter();
  const { auth, isAuthenticated } = useAuth();
  const { formData: persistedFormData, eventId: persistedEventId, setFormData, clearFormData } = useEventFormStore();

  // Mutation hooks with optimistic updates
  const createEventMutation = useCreateEvent({
    showToasts: false, // We handle toasts manually for better UX
  });
  const updateEventMutation = useUpdateEvent({
    showToasts: false,
  });

  // Fetch existing event if in edit mode
  const shouldFetchEvent = mode === "edit" && !!authorId && !!eventId;
  const { data: existingEvent, isLoading } = useEvent(
    authorId || "",
    eventId || "",
    {
      queryOptions: {
        enabled: shouldFetchEvent,
      },
    }
  );

  // Determine default values
  const getDefaultValues = (): EventFormData => {
    // In edit mode, use existing event data
    if (mode === "edit" && existingEvent) {
      return eventToFormData(existingEvent);
    }

    // In create mode, check if we have persisted data for this event
    if (mode === "create" && persistedFormData && !persistedEventId) {
      // Restore persisted form data, but handle calendar URIs specially:
      // - If initialCalendarUri is provided (coming from a calendar page), use it
      // - Otherwise, clear any persisted calendar selection to start fresh
      const calendarUris = initialCalendarUri
        ? [initialCalendarUri]
        : undefined;

      return {
        ...persistedFormData,
        x_pubky_calendar_uris: calendarUris,
      };
    }

    // Default empty form with optional initial calendar
    return {
      summary: "",
      dtstart: null,
      status: "CONFIRMED",
      x_pubky_rsvp_access: "PUBLIC",
      x_pubky_calendar_uris: initialCalendarUri ? [initialCalendarUri] : undefined,
    };
  };

  // Initialize React Hook Form
  const form = useForm<EventFormData>({
    defaultValues: getDefaultValues(),
    mode: "onChange", // Validate on change for better UX
  });

  // Update form when existing event loads
  useEffect(() => {
    if (mode === "edit" && existingEvent) {
      form.reset(eventToFormData(existingEvent));
    }
    // form.reset is stable and doesn't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEvent, mode]);

  // Persist form data on changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      const eventIdKey = mode === "edit" ? `${authorId}-${eventId}` : undefined;
      setFormData(value as EventFormData, eventIdKey);
    });
    return () => subscription.unsubscribe();
    // form.watch is stable and doesn't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, authorId, eventId, setFormData]);

  // Check authentication
  if (!isAuthenticated) {
    return (
      <AuthGuard
        mode={mode}
        resourceType="event"
        authorId={authorId}
        resourceId={eventId}
      />
    );
  }

  // Check authorization in edit mode
  if (mode === "edit" && existingEvent && auth?.publicKey) {
    if (authorId !== auth.publicKey) {
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Unauthorized</h2>
              <p className="text-muted-foreground mb-6">
                You can only edit your own events.
              </p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Loading state for edit mode
  if (mode === "edit" && shouldFetchEvent && isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-9 w-48 mb-8" /> {/* Page title */}
        <div className="space-y-8">
          <Skeleton className="h-32 w-full" /> {/* Basic Information section */}
          <Skeleton className="h-96 w-full" /> {/* Date & Time section */}
          <Skeleton className="h-12 w-full" /> {/* Submit buttons */}
        </div>
      </div>
    );
  }

  // Event not found in edit mode
  if (mode === "edit" && shouldFetchEvent && !existingEvent && !isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The event you&apos;re trying to edit could not be found.
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (data: EventFormData) => {
    try {
      // Verify we have auth data
      if (!auth?.session || !auth?.publicKey) {
        toast.error("Authentication required. Please sign in.");
        const currentPath = mode === "edit"
          ? `/event/${authorId}/${eventId}?edit=true`
          : "/event/create";
        router.push(`/login?returnPath=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Convert form data to WASM event data
      const eventData = formDataToEventData(
        data,
        mode,
        existingEvent || undefined
      );

      if (!eventData) {
        toast.error("Invalid event data");
        return;
      }

      // Create PubkyAppEvent from JSON (this will sanitize via WASM)
      let event: PubkyAppEvent;
      try {
        event = PubkyAppEvent.fromJson(eventData);
      } catch (wasmError: unknown) {
        const errorMessage = wasmError instanceof Error ? wasmError.message : String(wasmError);
        toast.error(errorMessage || "Invalid event data");
        console.error("WASM error:", wasmError);
        return;
      }

      // Generate event ID for new events using the event's createId method
      const eventIdToUse = mode === "edit" ? eventId! : event.createId();

      // Use mutation hooks for optimistic updates
      if (mode === "edit") {
        await updateEventMutation.mutateAsync({
          event,
          eventId: eventIdToUse,
        });
        toast.success("Event updated successfully!");
      } else {
        await createEventMutation.mutateAsync({
          event,
          eventId: eventIdToUse,
        });
        toast.success("Event created successfully!");
      }

      // Clear persisted form data
      clearFormData();

      // Reset form to default state - provide explicit default values
      form.reset({
        summary: "",
        dtstart: null,
        status: "CONFIRMED",
        x_pubky_rsvp_access: "PUBLIC",
      });

      // Redirect to event page - optimistic cache will show data immediately
      router.push(`/event/${auth.publicKey}/${eventIdToUse}`);
    } catch (error) {
      console.error("Error saving event:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(
        mode === "edit"
          ? `Failed to update event: ${errorMessage}`
          : `Failed to create event: ${errorMessage}`
      );
    }
  });

  const handleCancel = () => {
    if (form.formState.isDirty) {
      if (
        confirm(
          "You have unsaved changes. Are you sure you want to leave?"
        )
      ) {
        clearFormData();
        form.reset({
          summary: "",
          dtstart: null,
          status: "CONFIRMED",
          x_pubky_rsvp_access: "PUBLIC",
        });
        router.back();
      }
    } else {
      clearFormData();
      form.reset({
        summary: "",
        dtstart: null,
        status: "CONFIRMED",
        x_pubky_rsvp_access: "PUBLIC",
      });
      router.back();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">
        {mode === "edit" ? "Edit Event" : "Create Event"}
      </h1>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Basic Information */}
        <section className="space-y-6">
          <div>
            <div className="space-y-4">
              <ImageUpload
                value={form.watch("image_uri")}
                onChange={(uri) => form.setValue("image_uri", uri)}
                title="Event Image"
                description="Upload a banner image for your event (max 5MB)"
                aspectRatio="video"
              />
              <BasicInfoFields
                control={form.control}
                titleError={form.formState.errors.summary}
                urlError={form.formState.errors.url}
              />
            </div>
          </div>
        </section>

        {/* Date & Time */}
        <section>
          <DateTimeFields
            control={form.control}
            errors={form.formState.errors}
            setValue={form.setValue}
          />
        </section>

        {/* Location */}
        <section>
          <LocationFields
            control={form.control}
            locationError={form.formState.errors.location}
            geoError={form.formState.errors.geo}
          />
        </section>

        {/* Recurrence */}
        <section>
          <RecurrenceFields
            control={form.control}
            setValue={form.setValue}
          />
        </section>

        {/* Calendars */}
        <section>
          <CalendarSelector
            control={form.control}
            initialCalendarUris={initialCalendarUri ? [initialCalendarUri] : undefined}
          />
        </section>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
            className="min-w-32"
          >
            {form.formState.isSubmitting
              ? "Saving..."
              : mode === "edit"
                ? "Update Event"
                : "Create Event"}
          </Button>
        </div>
        {/* Debug: Show current form state */}
        {config.isDevelopment && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">Form State (Dev Mode Only):</h3>
            <div className="space-y-2 text-xs">
              <div>
                <strong>Is Valid:</strong> {form.formState.isValid ? "Yes" : "No"}
              </div>
              <div>
                <strong>Is Dirty:</strong> {form.formState.isDirty ? "Yes" : "No"}
              </div>
              <div>
                <strong>Is Submitting:</strong> {form.formState.isSubmitting ? "Yes" : "No"}
              </div>
              <pre className="overflow-auto mt-2">
                {JSON.stringify(form.watch(), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}