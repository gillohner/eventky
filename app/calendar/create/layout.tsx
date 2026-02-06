import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create Calendar | Eventky",
    description: "Create a new calendar on Eventky",
    robots: {
        index: false,
        follow: false,
    },
};

export default function CreateCalendarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
