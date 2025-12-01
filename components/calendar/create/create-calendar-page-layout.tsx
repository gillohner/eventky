"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { CalendarFormData } from "@/types/calendar";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BasicInfoFields } from "./basic-info";
import { SettingsFields } from "./settings";
import { saveCalendar } from "@/lib/pubky/calendars";
import { config } from "@/lib/config";

export function CreateCalendarPageLayout() {
    const router = useRouter();
    const { auth } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

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

    const onSubmit = async (data: CalendarFormData) => {
        if (!auth?.publicKey || !auth?.session) {
            toast.error("Please log in to create a calendar");
            return;
        }

        setIsSaving(true);

        try {
            const result = await saveCalendar(auth.session, auth.publicKey, data);

            if (result.success) {
                toast.success("Calendar created successfully!");
                // TODO: Navigate to calendar view when implemented
                router.push("/");
            } else {
                toast.error(result.error || "Failed to create calendar");
            }
        } catch (error) {
            console.error("Failed to create calendar:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    if (!auth?.publicKey) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">
                        Please log in to create a calendar
                    </p>
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
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? (
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
