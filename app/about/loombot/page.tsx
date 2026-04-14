import {
    ArrowRight,
    Bot,
    CalendarDays,
    CalendarPlus,
    Database,
    Filter,
    Github,
    HelpCircle,
    Key,
    Link2,
    MessageCircle,
    MessageSquare,
    Send,
    Shield,
    ShieldCheck,
    Terminal,
    UserPlus,
    Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const GITHUB_URL = "https://github.com/gillohner/loombot";
const DEMO_BOT_URL = "https://t.me/dezentralschweiz_bot";
const CONTACT_URL = "https://t.me/lazerclippy";

type ServiceKind = "command" | "listener" | "flow";

const services: {
    name: string;
    kind: ServiceKind;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}[] = [
    {
        name: "/help",
        kind: "command",
        icon: HelpCircle,
        description: "Configurable help message with optional command list.",
    },
    {
        name: "/hello",
        kind: "command",
        icon: MessageSquare,
        description:
            "Canned response template — reuse it for any static command your community needs.",
    },
    {
        name: "/links",
        kind: "flow",
        icon: Link2,
        description:
            "Multi-step categorized link menu with inline keyboard navigation.",
    },
    {
        name: "/meetups",
        kind: "flow",
        icon: CalendarDays,
        description:
            "Upcoming events pulled from Pubky calendars with day, week, 2-week and 30-day views.",
    },
    {
        name: "/meetup_erstellen",
        kind: "flow",
        icon: CalendarPlus,
        description:
            "Multi-step event creation wizard that publishes to Pubky with admin approval. Requires Pubky.",
    },
    {
        name: "new_member",
        kind: "listener",
        icon: UserPlus,
        description:
            "Auto-welcomes joiners with a customizable message and template variables.",
    },
    {
        name: "triggerwords",
        kind: "listener",
        icon: Zap,
        description:
            "Keyword responders (e.g. shitcoin-alarm). Multiple instances per config with independent word lists.",
    },
    {
        name: "url_cleaner",
        kind: "listener",
        icon: Filter,
        description:
            "Strips tracking params and suggests alt-frontends (Xcancel, Invidious, Redlib, Scribe).",
    },
];

const kindLabel: Record<ServiceKind, string> = {
    command: "command",
    listener: "listener",
    flow: "flow",
};

const kindVariant: Record<ServiceKind, "default" | "secondary" | "outline"> = {
    command: "secondary",
    listener: "outline",
    flow: "default",
};

const setupSteps: { title: string; body: React.ReactNode }[] = [
    {
        title: "Create a Telegram bot",
        body: (
            <>
                Talk to{" "}
                <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    @BotFather
                </a>
                , create a new bot, and save the token it gives you.
            </>
        ),
    },
    {
        title: "Find your Telegram user ID",
        body: (
            <>
                Message{" "}
                <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    @userinfobot
                </a>{" "}
                to get your numeric user ID — you&apos;ll list it as an admin in the
                config.
            </>
        ),
    },
    {
        title: "Clone loombot and pick a profile",
        body: (
            <>
                Clone{" "}
                <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    github.com/gillohner/loombot
                </a>{" "}
                and pick a config profile from <code>configs/</code>:{" "}
                <code>general-purpose.example.yaml</code> for any community, or{" "}
                <code>dezentralschweiz.example.yaml</code> for a Pubky-enabled
                Swiss-Bitcoin setup with curated calendars and German UI.
            </>
        ),
    },
    {
        title: "Configure the bot",
        body: (
            <>
                Copy your chosen profile to <code>config.yaml</code> and set{" "}
                <code>BOT_TOKEN</code> in <code>.env</code>. Add your Telegram user ID
                under <code>bot.admin_ids</code>.
            </>
        ),
    },
    {
        title: "Run it",
        body: (
            <>
                Start the bot with Docker (<code>docker compose up -d</code>) or Deno
                (<code>deno task dev</code>). That&apos;s it — the bot is now online.
            </>
        ),
    },
    {
        title: "Add the bot to your group",
        body: (
            <>
                Invite the bot to your Telegram group and promote it to admin with at
                least Delete Messages, Pin Messages, and Read Messages permissions.
            </>
        ),
    },
    {
        title: "Customize per chat",
        body: (
            <>
                Group admins run <code>/config</code> inside the chat to open an
                inline menu that toggles features, picks calendars, edits the welcome
                message, and configures periodic meetup broadcasts — all without
                touching the server.
            </>
        ),
    },
];

export default function AboutLoombotPage() {
    return (
        <div className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-6 py-12">
                    <div className="flex justify-center">
                        <div className="p-4 rounded-2xl bg-primary/10">
                            <Bot className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Loombot
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        A modular Telegram community bot for Bitcoin and Pubky
                        communities. Powers{" "}
                        <a
                            href={DEMO_BOT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            @dezentralschweiz_bot
                        </a>
                        .
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button asChild size="lg" className="gap-2">
                            <a
                                href={DEMO_BOT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Send className="h-5 w-5" />
                                Try the demo bot
                            </a>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="gap-2">
                            <a
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Github className="h-5 w-5" />
                                View on GitHub
                            </a>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="gap-2">
                            <a
                                href={CONTACT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <MessageCircle className="h-5 w-5" />
                                Message me
                            </a>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">What is Loombot?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                        <p>
                            Loombot is a self-hostable Telegram bot that you configure
                            entirely through a single YAML file. It ships with a handful
                            of community-oriented services — help messages, curated link
                            menus, meetup broadcasts, welcome greetings, trigger-word
                            responders, URL cleaners — and lets each chat&apos;s admins
                            toggle and customize them via an inline <code>/config</code>{" "}
                            menu inside Telegram.
                        </p>
                        <p>
                            Pubky integration is optional. Without it, Loombot works as a
                            plain Telegram community bot. With it, services like{" "}
                            <code>/meetup_erstellen</code> can publish events to Pubky
                            calendars on{" "}
                            <a
                                href="https://eventky.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                eventky.app
                            </a>{" "}
                            — each write passes through a human admin-approval queue
                            first, so nothing hits the homeserver without review.
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-semibold">Shipped services</h2>
                        <p className="text-sm text-muted-foreground">
                            All services can be enabled, disabled, or customized per chat
                            by admins via <code>/config</code>.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map((service) => {
                            const Icon = service.icon;
                            return (
                                <div
                                    key={service.name}
                                    className="p-5 rounded-lg border bg-card text-card-foreground flex flex-col gap-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Icon className="h-5 w-5 text-primary shrink-0" />
                                            <code className="text-sm font-semibold truncate">
                                                {service.name}
                                            </code>
                                        </div>
                                        <Badge
                                            variant={kindVariant[service.kind]}
                                            className="text-[10px] uppercase tracking-wide"
                                        >
                                            {kindLabel[service.kind]}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {service.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-center">
                        For community organizers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="flex flex-col">
                            <CardHeader>
                                <Send className="h-8 w-8 text-primary mb-2" />
                                <CardTitle>Use @dezentralschweiz_bot</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col flex-1 gap-4 text-sm text-muted-foreground">
                                <p>
                                    Running a Swiss Bitcoin meetup chat? Add the hosted
                                    bot, and I&apos;ll help you set it up and create a
                                    regional sub-calendar so your local events show up
                                    alongside the national Dezentralschweiz calendar.
                                </p>
                                <div className="mt-auto">
                                    <Button asChild className="w-full gap-2">
                                        <a
                                            href={CONTACT_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Message me to get set up
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col">
                            <CardHeader>
                                <Terminal className="h-8 w-8 text-primary mb-2" />
                                <CardTitle>Run your own instance</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col flex-1 gap-4 text-sm text-muted-foreground">
                                <p>
                                    Want full control, your own branding, or a custom
                                    language and service mix? Self-host Loombot with your
                                    own Telegram bot and (optionally) your own Pubky
                                    identity. Setup takes about ten minutes — see the
                                    walkthrough below.
                                </p>
                                <div className="mt-auto">
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full gap-2"
                                    >
                                        <a href="#setup">
                                            Jump to setup
                                            <ArrowRight className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div id="setup" className="space-y-6 scroll-mt-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-semibold">Self-host setup</h2>
                        <p className="text-sm text-muted-foreground">
                            Seven steps to get a fresh instance running.
                        </p>
                    </div>
                    <div className="space-y-4">
                        {setupSteps.map((step, index) => (
                            <div
                                key={step.title}
                                className="flex gap-4 p-5 rounded-lg border bg-card text-card-foreground"
                            >
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold">
                                        {index + 1}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h3 className="font-semibold">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {step.body}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Key className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold">
                            Optional: enable Pubky event publishing
                        </h3>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-3">
                        <p>
                            Only needed for services that publish to Pubky (e.g.{" "}
                            <code>/meetup_erstellen</code>). The bot works fine without
                            this — the feature simply stays disabled until you provide a
                            keypair.
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>
                                Generate a Pubky recovery file via{" "}
                                <a
                                    href="https://pubky.org/ring"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Pubky Ring
                                </a>{" "}
                                or the{" "}
                                <a
                                    href="https://github.com/pubky/pubky"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Pubky CLI
                                </a>
                                .
                            </li>
                            <li>
                                Register that identity with a Pubky homeserver and create
                                a calendar on{" "}
                                <a
                                    href="https://eventky.app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    eventky.app
                                </a>
                                .
                            </li>
                            <li>
                                Point <code>pubky.recovery_file</code> at the file and set{" "}
                                <code>PUBKY_PASSPHRASE</code> in <code>.env</code>.
                            </li>
                            <li>
                                Add an admin-approval group in <code>config.yaml</code>{" "}
                                under <code>pubky.approval_group_chat_id</code> so
                                submitted events queue for human review.
                            </li>
                        </ol>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-center">
                        Architecture highlights
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-lg border bg-card text-card-foreground">
                            <Shield className="h-8 w-8 text-primary mb-3" />
                            <h3 className="font-semibold mb-2">Sandboxed services</h3>
                            <p className="text-sm text-muted-foreground">
                                Each service runs in a zero-permission Deno subprocess.
                                Network access is opt-in per service via an explicit
                                allowlist.
                            </p>
                        </div>
                        <div className="p-5 rounded-lg border bg-card text-card-foreground">
                            <ShieldCheck className="h-8 w-8 text-primary mb-3" />
                            <h3 className="font-semibold mb-2">Admin-approved writes</h3>
                            <p className="text-sm text-muted-foreground">
                                Pubky writes land in a review queue first: admins see a
                                preview, approve or reject, and only then does anything
                                reach the homeserver.
                            </p>
                        </div>
                        <div className="p-5 rounded-lg border bg-card text-card-foreground">
                            <Database className="h-8 w-8 text-primary mb-3" />
                            <h3 className="font-semibold mb-2">Per-chat state</h3>
                            <p className="text-sm text-muted-foreground">
                                Feature toggles, selected calendars, welcome overrides,
                                and periodic-broadcast settings persist per chat in
                                SQLite and survive restarts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
