"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { CalendarFormData } from "@/types/calendar";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { BasicInfoFields } from "./basic-info";
import { SettingsFields } from "./settings";
import { PubkySpecsBuilder } from "pubky-app-specs";
import { config } from "@/lib/config";
import { useCreateCalendar } from "@/hooks/use-calendar-mutations";

export function CreateCalendarPageLayout() {
    const router = useRouter();
    const { auth, isAuthenticated } = useAuth();

    const form = useForm<CalendarFormData>({
        defaultValues: {
            name: "",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            color: "#3b82f6",
            description: "",
            url: "",
        },
    });

    const { control, handleSubmit, setValue, watch, formState: { errors } } = form;

    // Use mutation hook for optimistic caching
    const createCalendar = useCreateCalendar({
        onSuccess: (result) => {
            // Reset form
            form.reset({
                name: "",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                color: "#3b82f6",
                description: "",
                url: "",
            });
            // Navigate to calendar detail page
            router.push(`/calendar/${result.authorId}/${result.calendarId}`);
        },
    });

    const onSubmit = async (data: CalendarFormData) => {
        if (!auth?.publicKey || !auth?.session) {
            return;
        }

        // Create calendar using WASM builder
        const builder = new PubkySpecsBuilder(auth.publicKey);
        const calendarResult = builder.createCalendar(
            data.name,
            data.timezone,
            data.color || null,
            data.image_uri || null,
            data.description || null,
            data.url || null,
            data.x_pubky_admins || null
        );

        // Use mutation to save with optimistic caching
        createCalendar.mutate({
            calendar: calendarResult.calendar,
            calendarId: calendarResult.meta.id,
        });
    };

    // Check authentication
    if (!isAuthenticated) {
        return <AuthGuard mode="create" resourceType="calendar" />;
    }


    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarIcon className="h-8 w-8" />
                        Create Calendar
                    </h1>
                    <p className="text-muted-foreground">
                        Set up a new calendar to organize your events
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
                                        form.reset({
                                            name: "",
                                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                                            color: "#3b82f6",
                                            description: "",
                                            url: "",
                                        });
                                        router.back();
                                    }
                                } else {
                                    form.reset({
                                        name: "",
                                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                                        color: "#3b82f6",
                                        description: "",
                                        url: "",
                                    });
                                    router.back();
                                }
                            }}
                            disabled={createCalendar.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createCalendar.isPending}>
                            {createCalendar.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Create Calendar
                                </>
                            )}
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
