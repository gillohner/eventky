# Environment Setup

This guide explains how to set up different Pubky environments for Eventky.

## Testnet

For local development with a testnet homeserver and relay:

### 1. Configure Environment

Set the environment in your `.env.local` file:

```bash
NEXT_PUBLIC_PUBKY_ENV=testnet
```

This connects the application to a local homeserver and relay for development and testing.

### 2. Run Pubky Testnet

Clone and run the Pubky testnet:

```bash
# Clone the pubky-core repository
git clone https://github.com/pubky/pubky-core

# Navigate to the repository
cd pubky-core

# Start a local PostgreSQL instance
docker run --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pubky_homeserver \
  -p 5432:5432 \
  -d postgres:17

# Run the testnet
export TEST_PUBKY_CONNECTION_STRING="postgres://postgres:postgres@localhost:5432/postgres"
cargo run --bin pubky-testnet
```

The testnet will start:
- **Homeserver**: `localhost:4173`
- **HTTP Relay**: `localhost:15412`

### 3. Start Eventky

In a separate terminal, start the Next.js development server:

```bash
npm run dev
```

Your app will now connect to the local testnet environment.

## Staging

To connect to the staging environment:

```bash
NEXT_PUBLIC_PUBKY_ENV=staging
```

This uses:
- **Homeserver**: `ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy`
- **HTTP Relay**: `https://httprelay.staging.pubky.app/link/`
- **Gateway**: `https://nexus.staging.pubky.app`

## Production

To connect to the production environment:

```bash
NEXT_PUBLIC_PUBKY_ENV=production
```

This uses:
- **Homeserver**: `ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy`
- **HTTP Relay**: `https://httprelay.pubky.app/link/`
- **Gateway**: `https://nexus.pubky.app`

## Troubleshooting

### Testnet Not Starting

If `cargo run --bin pubky-testnet` fails:
- Ensure you have Rust installed: `rustup --version`
- Update Rust: `rustup update`
- Check if ports 4173 and 15412 are available

### Connection Issues

If the app can't connect to the testnet:
- Verify the testnet is running in another terminal
- Check that `NEXT_PUBLIC_PUBKY_ENV=testnet` is set in `.env.local`
- Restart the Next.js dev server after changing environment variables
- Refer to Pubky Core docs for more help

See [CONFIGURATION.md](./CONFIGURATION.md) for more configuration options.