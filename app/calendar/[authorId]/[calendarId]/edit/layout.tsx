import type { Metadata } from "next";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
    title: "Edit Calendar | Eventky",
};

export default function EditCalendarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
