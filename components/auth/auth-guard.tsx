"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AuthGuardProps {
    mode: "create" | "edit";
    resourceType: "event" | "calendar";
    authorId?: string;
    resourceId?: string;
}

export function AuthGuard({ mode, resourceType, authorId, resourceId }: AuthGuardProps) {
    const router = useRouter();

    const handleSignIn = () => {
        const currentPath = mode === "edit"
            ? `/${resourceType}/${authorId}/${resourceId}?edit=true`
            : `/${resourceType}/create`;
        router.push(`/login?returnPath=${encodeURIComponent(currentPath)}`);
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
                    <p className="text-muted-foreground mb-6">
                        You need to be signed in to {mode === "edit" ? "edit" : "create"}{" "}
                        {resourceType}s.
                    </p>
                    <Button onClick={handleSignIn}>Sign In</Button>
                </div>
            </div>
        </div>
    );
}
