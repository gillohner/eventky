import {
    CalendarDays,
    Layers,
    Repeat,
    ShieldCheck,
    Users,
    ExternalLink,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function AboutEventkyPage() {
    return (
        <div className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-6 py-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Eventky
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Decentralized calendars and events on Pubky. Own your data,
                        publish to multiple calendars, and let communities discover what
                        matters locally.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">What is Eventky?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>
                            Eventky is an event and calendar client built on the Pubky
                            stack. Anyone can browse calendars and events publicly; signing
                            in with a Pubky identity lets you publish your own.
                        </p>
                        <p>
                            Events aren&apos;t locked to a single calendar. One event can be
                            added to multiple calendars at once — a city meetup can live in
                            a regional calendar and a national one simultaneously — and
                            calendars can have multiple authors, so communities can
                            collaborate on a shared schedule.
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-center">Key features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <Layers className="h-8 w-8 text-primary mb-3" />
                            <h3 className="text-lg font-semibold mb-2">
                                Multi-calendar publishing
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Attach a single event to any number of calendars you have
                                permission to write to.
                            </p>
                        </div>
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <Users className="h-8 w-8 text-primary mb-3" />
                            <h3 className="text-lg font-semibold mb-2">
                                Multi-author calendars
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Calendars support multiple contributors, so communities
                                can maintain a shared schedule without a single
                                gatekeeper.
                            </p>
                        </div>
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <CalendarDays className="h-8 w-8 text-primary mb-3" />
                            <h3 className="text-lg font-semibold mb-2">
                                Rich event details
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Formatted descriptions, locations, images, and recurrence
                                rules — everything an organizer needs to tell the full
                                story.
                            </p>
                        </div>
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <Repeat className="h-8 w-8 text-primary mb-3" />
                            <h3 className="text-lg font-semibold mb-2">
                                Planned improvements
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Attendance management and per-instance overrides for
                                recurring events are on the roadmap.
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                            <CardTitle className="text-2xl">Built on Pubky</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>
                            Pubky is a decentralized identity and storage stack. Your
                            events live on a Pubky homeserver you control, not in a
                            corporate database — you can move them to another homeserver
                            at any time without losing your audience.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <a
                                href="https://pubky.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                pubky.org
                                <ExternalLink className="h-3 w-3" />
                            </a>
                            <a
                                href="https://pubky.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                pubky.app
                                <ExternalLink className="h-3 w-3" />
                            </a>
                            <a
                                href="https://docs.pubky.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                docs.pubky.app
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
