import Link from "next/link";
import { ArrowRight, Bot, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {
    return (
        <div className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4 py-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        About
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Learn about Eventky and the tools built around it for meetup
                        organizers and communities.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CalendarDays className="h-10 w-10 text-primary mb-2" />
                            <CardTitle className="text-2xl">Eventky</CardTitle>
                            <CardDescription>
                                Decentralized calendars and events on Pubky.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 gap-4">
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 flex-1">
                                <li>Publish events to multiple calendars at once</li>
                                <li>Regional sub-calendars for local communities</li>
                                <li>Public read-only browsing, no account required</li>
                            </ul>
                            <Button asChild className="gap-2 w-full">
                                <Link href="/about/eventky">
                                    Learn more
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <Bot className="h-10 w-10 text-primary mb-2" />
                            <CardTitle className="text-2xl">Loombot</CardTitle>
                            <CardDescription>
                                A modular Telegram bot for Bitcoin &amp; Pubky communities.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 gap-4">
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 flex-1">
                                <li>Event creation, meetup broadcasts, welcome messages</li>
                                <li>Configurable per chat by group admins via <code>/config</code></li>
                                <li>Self-hostable, or use the ready-made <code>@dezentralschweiz_bot</code></li>
                            </ul>
                            <Button asChild className="gap-2 w-full">
                                <Link href="/about/loombot">
                                    Learn more
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
