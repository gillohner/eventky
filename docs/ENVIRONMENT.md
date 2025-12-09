# Environment Setup

## Environments

| Environment    | `.env.local`                       | Gateway                   | Relay                         |
| -------------- | ---------------------------------- | ------------------------- | ----------------------------- |
| **testnet**    | `NEXT_PUBLIC_PUBKY_ENV=testnet`    | `localhost:8080`          | `localhost:15412`             |
| **staging**    | `NEXT_PUBLIC_PUBKY_ENV=staging`    | `nexus.staging.pubky.app` | `httprelay.staging.pubky.app` |
| **production** | `NEXT_PUBLIC_PUBKY_ENV=production` | `nexus.pubky.app`         | `httprelay.pubky.app`         |

## Quick Start (Testnet)

```bash
cp .env.example .env.local

# Run Eventky
./scripts/start-eventky.sh

# npm run dev
```

## QR Auth (Pubky Ring)

For mobile QR authentication, use your LAN IP:

```bash
NEXT_PUBLIC_PUBKY_RELAY=http://192.168.1.x:15412/link
sudo ufw allow 15412/tcp  # If using firewall
```

## Troubleshooting

- **Testnet not connecting**: Check `docker compose ps` and ensure services are
  running
- **Port conflicts**: Verify ports 4173, 8080, 15412 are available
