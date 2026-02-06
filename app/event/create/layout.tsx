import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create Event | Eventky",
    description: "Create a new event on Eventky",
    robots: {
        index: false,
        follow: false,
    },
};

export default function CreateEventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
