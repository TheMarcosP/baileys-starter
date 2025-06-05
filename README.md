# Baileys Starter Kit

A minimal starter kit to create WhatsApp bots with [Baileys](https://github.com/WhiskeySockets/Baileys). It includes hot reloadable TypeScript, a lightweight Express dashboard and optional OpenAI integration.

## Features

- **Echo or AI replies** – Responds to messages by echoing them or by sending a GPT response when AI is enabled.
- **Web dashboard** – Simple interface to login, check connection status and view the QR code.
- **Structured logging** – Pino based logger for debugging.

## Quick Start

```bash
npm install
cp .env.example .env # edit values
npm run dev
```

Scan the QR printed in the terminal or open `/qr` in the browser. Login to `/login` with `test/test` to view the dashboard.

## Example Handler

When AI is enabled every message is sent to OpenAI, otherwise the bot simply echoes the text:

```ts
if (config.bot.aiEnabled) {
    const aiReply = await generateResponse(textContent)
    await sock.sendMessage(remoteJid, { text: aiReply })
} else {
    await sock.sendMessage(remoteJid, { text: `Echo: ${textContent}` })
}
```

## Configuration

Environment variables control everything:

| Variable           | Description                              |
| ------------------ | ---------------------------------------- |
| `PORT`             | Port for the Express server.             |
| `BOT_NAME`         | Name used in logs.                       |
| `SESSION_NAME`     | Directory for WhatsApp credentials.      |
| `OPENAI_API_KEY`   | Optional key to enable GPT responses.    |
| `AI_ENABLED`       | Set to `true` to use OpenAI for replies. |
| `LOG_LEVEL`        | Logging level (info, debug, warn...).    |
| `AI_SYSTEM_PROMPT` | Optional system prompt for OpenAI.       |

## Documentation

For detailed documentation about Baileys and WhatsApp bot development, check out:

- **[BAILEYSDOCS.md](./BAILEYSDOCS.md)** - Comprehensive guide to using Baileys (Updated)
- **[Official Baileys Repository](https://github.com/WhiskeySockets/Baileys)**
- **[Baileys Documentation](https://whiskeysockets.github.io/Baileys/)**

Happy hacking! 🚀
