# eventky — calendar & event management (Next.js)

# Start dev server
dev:
    npm run dev

# Production build
build:
    npm run build

# Run tests
test:
    npm run test:run

# Lint
lint:
    npm run lint

# Start full testnet + nexus + eventky stack (tmux)
stack-start:
    ./scripts/start-eventky-testnet-nexus.sh

# Stop all stack services
stack-stop:
    ./scripts/stop-eventky-testnet-nexus.sh

# Reset databases and restart
stack-reset:
    ./scripts/reset-eventky-testnet.sh
