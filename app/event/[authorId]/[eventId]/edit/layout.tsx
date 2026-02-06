import type { Metadata } from "next";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
    title: "Edit Event | Eventky",
};

export default function EditEventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
