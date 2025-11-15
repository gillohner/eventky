# Eventky

A calendar and event management platform built with Next.js and Pubky authentication.

## Features

- 🔐 **Pubky Authentication** - Decentralized authentication with recovery file and QR code support
- 📅 **Calendar Management** - Personal calendar view and management
- 🎉 **Event Discovery** - Browse and create events
- 👤 **Profile Integration** - Read user profiles from pubky.app
- 🎨 **Modern UI** - Built with Shadcn UI and Tailwind CSS v4

## Getting Started

### Prerequisites

- Node.js 20+
- NPM (workspace setup for monorepo)

### Setup

This project uses an NPM workspace setup to link the local `pubky-app-specs` package.

1. **Install from monorepo root**:
```bash
# From ~/Repositories/
npm install
```

This automatically links both `eventky` and `pubky-app-specs/pkg` as workspaces.

2. **Configure environment** (optional):
```bash
cd eventky
cp .env.example .env.local
# Edit NEXT_PUBLIC_PUBKY_ENV (testnet/staging/live)
```

3. **Run the development server**:
```bash
cd eventky
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
eventky/
├── app/                    # Next.js app directory
│   ├── login/             # Login page with QR & recovery file
│   └── page.tsx           # Home page
├── components/
│   ├── auth/              # Authentication providers
│   └── ui/                # Shadcn UI components
├── lib/
│   └── pubky/             # Pubky SDK wrapper & utilities
├── stores/                # Zustand state management
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

## Authentication

Eventky uses Pubky for decentralized authentication:

- **Recovery File Login**: Upload your `.pubky` file with passphrase
- **QR Code Login**: Scan with Pubky Ring mobile app
- **Read-only Profiles**: Profile data is managed in pubky.app

See [docs/PUBKY_AUTH.md](docs/PUBKY_AUTH.md) for detailed documentation.

## Technologies

- **Framework**: Next.js 16 with App Router & Turbopack
- **Authentication**: @synonymdev/pubky
- **State Management**: Zustand + TanStack Query
- **UI**: Shadcn UI + Tailwind CSS v4
- **Types**: pubky-app-specs (local workspace package)

## Development Notes

### Monorepo Workspace Setup

This project uses NPM workspaces for local development with `pubky-app-specs`. The workspace is configured at `/home/gil/Repositories/package.json`:

```json
{
  "name": "pubky-events-monorepo",
  "private": true,
  "workspaces": [
    "eventky",
    "pubky-app-specs/pkg"
  ]
}
```

Next.js is configured to resolve the workspace package with Turbopack:

```typescript
// next.config.ts
turbopack: {
  root: join(__dirname, ".."), // Points to monorepo root
}
```

### Rebuilding pubky-app-specs

When you make changes to `pubky-app-specs`:

```bash
cd ~/Repositories/pubky-app-specs
cargo run --bin bundle_specs_npm

# The workspace link is automatic - just restart dev server
cd ~/Repositories/eventky
npm run dev
```

## Learn More

- [Pubky Documentation](https://pubky.tech)
- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com)

## License

MIT

