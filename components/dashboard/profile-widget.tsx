"use client";

import { User, Globe } from "lucide-react";
import { DashboardWidget } from "./dashboard-widget";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPubkyAvatarUrl, getInitials, truncatePublicKey } from "@/lib/pubky/utils";

/**
 * Widget showing user's profile information
 */
export function ProfileWidget() {
    const { auth } = useAuth();
    const { profile, isLoading } = useProfile();

    const avatarUrl = profile?.image && auth?.publicKey ? getPubkyAvatarUrl(auth.publicKey) : null;
    const initials = getInitials(profile?.name);
    const displayName = profile?.name || truncatePublicKey(auth?.publicKey, 12);

    if (isLoading) {
        return (
            <DashboardWidget title="Profile" icon={User}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                </div>
            </DashboardWidget>
        );
    }

    return (
        <DashboardWidget title="Profile" icon={User}>
            <div className="space-y-4">
                {/* Avatar and Name */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.name || "User"} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                            {initials || <User className="h-8 w-8" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold truncate">{displayName}</h3>
                        {profile?.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {profile.bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* Additional Info */}
                {profile && (
                    <div className="space-y-2 pt-2 border-t">
                        {/* Public Key */}
                        {auth?.publicKey && (
                            <div className="flex items-start gap-2 text-xs">
                                <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <code className="text-muted-foreground break-all">
                                    {auth.publicKey}
                                </code>
                            </div>
                        )}

                        {/* Links */}
                        {profile.links && profile.links.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {profile.links.slice(0, 3).map((link: { title: string; url: string }, idx: number) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <Globe className="h-3 w-3" />
                                        <span className="truncate max-w-[150px]">{link.title}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardWidget>
    );
}
