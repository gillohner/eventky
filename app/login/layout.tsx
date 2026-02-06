import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login | Eventky",
    description: "Sign in to Eventky with your Pubky identity",
    robots: {
        index: false,
        follow: false,
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
