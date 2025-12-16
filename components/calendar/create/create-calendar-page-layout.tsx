"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { CalendarFormData } from "@/types/calendar";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useDebugView } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BasicInfoFields } from "./basic-info";
import { SettingsFields } from "./settings";
import { PubkySpecsBuilder, PubkyAppCalendar, parse_uri } from "pubky-app-specs";
import { useCreateCalendar, useUpdateCalendar } from "@/hooks/use-calendar-mutations";
import { useCalendar } from "@/hooks/use-calendar-hooks";
import { NexusCalendarResponse } from "@/lib/nexus/calendars";

interface CreateCalendarPageLayoutProps {
    mode?: "create" | "edit";
    authorId?: string;
    calendarId?: string;
}

/**
 * Extract user ID from a pubky URI or return as-is if already a plain ID
 */
function extractUserIdFromUri(uri: string): string {
    // If it's already a plain user ID (no pubky:// prefix), return as-is
    if (!uri.startsWith("pubky://")) {
        return uri;
    }
    // Use parse_uri from pubky-app-specs for proper parsing
    try {
        const parsed = parse_uri(uri);
        return parsed.user_id;
    } catch {
        // Fallback to returning the original if parsing fails
        return uri;
    }
}

/**
 * Convert NexusCalendarResponse to CalendarFormData for the form
 */
function calendarToFormData(calendar: NexusCalendarResponse): CalendarFormData {
    // Convert author URIs to user IDs for the form
    const authorIds = calendar.details.x_pubky_authors?.map(extractUserIdFromUri);

    return {
        name: calendar.details.name,
        timezone: calendar.details.timezone,
        color: calendar.details.color || "#3b82f6",
        image_uri: calendar.details.image_uri,
        description: calendar.details.description || "",
        url: calendar.details.url || "",
        x_pubky_authors: authorIds,
    };
}

const defaultFormValues: CalendarFormData = {
    name: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    color: "#3b82f6",
    description: "",
    url: "",
};

export function CreateCalendarPageLayout({
    mode = "create",
    authorId,
    calendarId,
}: CreateCalendarPageLayoutProps) {
    const router = useRouter();
    const { auth, isAuthenticated } = useAuth();
    const { debugEnabled } = useDebugView();

    // Fetch existing calendar if in edit mode
    const shouldFetchCalendar = mode === "edit" && !!authorId && !!calendarId;
    const { data: existingCalendar, isLoading } = useCalendar(
        authorId || "",
        calendarId || "",
        {
            queryOptions: {
                enabled: shouldFetchCalendar,
            },
        }
    );

    const form = useForm<CalendarFormData>({
        defaultValues: defaultFormValues,
    });

    const { control, handleSubmit, setValue, watch, formState: { errors } } = form;

    // Update form when existing calendar loads
    useEffect(() => {
        if (mode === "edit" && existingCalendar) {
            form.reset(calendarToFormData(existingCalendar));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingCalendar, mode]);

    // Use mutation hooks for optimistic caching
    const createCalendar = useCreateCalendar({
        onSuccess: (result) => {
            form.reset(defaultFormValues);
            router.push(`/calendar/${result.authorId}/${result.calendarId}`);
        },
    });

    const updateCalendar = useUpdateCalendar({
        onSuccess: (result) => {
            router.push(`/calendar/${result.authorId}/${result.calendarId}`);
        },
    });

    const isPending = createCalendar.isPending || updateCalendar.isPending;

    const onSubmit = async (data: CalendarFormData) => {
        if (!auth?.publicKey || !auth?.session) {
            return;
        }

        // x_pubky_authors can be plain user IDs - pubky-app-specs accepts both IDs and URIs
        const authors = data.x_pubky_authors?.length ? data.x_pubky_authors : null;

        if (mode === "edit" && calendarId) {
            // Create PubkyAppCalendar from form data for update
            // Increment sequence for versioning
            const currentSequence = existingCalendar?.details.sequence ?? 0;
            const calendarJson = {
                name: data.name,
                timezone: data.timezone,
                color: data.color || null,
                image_uri: data.image_uri || null,
                description: data.description || null,
                url: data.url || null,
                x_pubky_authors: authors,
                created: existingCalendar?.details.created || Date.now() * 1000,  // microseconds
                sequence: currentSequence + 1,  // Increment sequence on edit
                last_modified: Date.now() * 1000,  // Current time in microseconds
            };
            const calendar = PubkyAppCalendar.fromJson(calendarJson);

            updateCalendar.mutate({
                calendar,
                calendarId,
            });
        } else {
            // Create calendar using WASM builder
            const builder = new PubkySpecsBuilder(auth.publicKey);
            const calendarResult = builder.createCalendar(
                data.name,
                data.timezone,
                data.color || null,
                data.image_uri || null,
                data.description || null,
                data.url || null,
                authors
            );

            createCalendar.mutate({
                calendar: calendarResult.calendar,
                calendarId: calendarResult.meta.id,
            });
        }
    };

    // Check authentication
    if (!isAuthenticated) {
        return <AuthGuard mode={mode} resourceType="calendar" authorId={authorId} resourceId={calendarId} />;
    }

    // Check authorization in edit mode
    if (mode === "edit" && existingCalendar && auth?.publicKey) {
        if (authorId !== auth.publicKey) {
            return (
                <div className="container mx-auto py-8 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-bold mb-4">Unauthorized</h2>
                            <p className="text-muted-foreground mb-6">
                                You can only edit your own calendars.
                            </p>
                            <Button onClick={() => router.back()}>Go Back</Button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // Loading state for edit mode
    if (mode === "edit" && shouldFetchCalendar && isLoading) {
        return (
            <div className="container max-w-4xl mx-auto py-8 px-4">
                <Skeleton className="h-9 w-48 mb-8" />
                <div className="space-y-8">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    // Calendar not found in edit mode
    if (mode === "edit" && shouldFetchCalendar && !existingCalendar && !isLoading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold mb-4">Calendar Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            The calendar you&apos;re trying to edit could not be found.
                        </p>
                        <Button onClick={() => router.back()}>Go Back</Button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarIcon className="h-8 w-8" />
                        {mode === "edit" ? "Edit Calendar" : "Create Calendar"}
                    </h1>
                    <p className="text-muted-foreground">
                        {mode === "edit"
                            ? "Update your calendar settings"
                            : "Set up a new calendar to organize your events"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Info Section */}
                    <BasicInfoFields
                        control={control}
                        nameError={errors.name}
                        urlError={errors.url}
                    />

                    {/* Settings Section */}
                    <SettingsFields
                        control={control}
                        timezoneError={errors.timezone}
                        colorError={errors.color}
                        imageUri={watch("image_uri")}
                        onImageChange={(uri) => setValue("image_uri", uri)}
                        ownerUserId={auth?.publicKey ?? undefined}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (form.formState.isDirty) {
                                    if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
                                        form.reset(defaultFormValues);
                                        router.back();
                                    }
                                } else {
                                    form.reset(defaultFormValues);
                                    router.back();
                                }
                            }}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {mode === "edit" ? "Saving..." : "Creating..."}
                                </>
                            ) : (
                                <>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {mode === "edit" ? "Save Changes" : "Create Calendar"}
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Debug: Show current form state */}
                    {debugEnabled && (
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <h3 className="font-medium mb-2">Form State:</h3>
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
                                    {JSON.stringify(watch(), null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
