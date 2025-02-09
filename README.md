# Multiverse Speed Telegram Bot

A Telegram bot that roleplays as IShowSpeed from an alternate universe where he's a Messi fan instead of a Ronaldo fan. The bot uses Ollama for response generation and maintains Speed's energetic personality while focusing on different football allegiances.

## Features

- Roleplays as an alternate universe IShowSpeed who's a Messi fan
- Uses Ollama for generating contextual responses
- Includes spam protection and rate limiting
- Maintains Speed's characteristic speaking style and personality
- Responds to messages about football, gaming, and streaming
- Uses catchphrases and personality traits consistent with Speed's character

## Prerequisites

- Node.js (v14 or higher)
- Ollama installed locally (https://ollama.ai/)
- Telegram Bot Token
- The Llama 2 model pulled in Ollama

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/alterspeed.git
cd alterspeed
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama2
```

4. Make sure Ollama is running and the Llama 2 model is pulled:
```bash
ollama pull llama2
```

## Usage

Start the bot:
```bash
node index.js
```

The bot will now respond to messages in Telegram, maintaining Speed's personality while showing enthusiasm for Messi instead of Ronaldo.

## Configuration

You can modify the following constants in `index.js` to adjust the bot's behavior:

- `SPAM_THRESHOLD`: Number of messages before warning (default: 5)
- `SPAM_BAN_THRESHOLD`: Number of messages before ban (default: 8)
- `SPAM_WINDOW`: Time window for spam detection in ms (default: 60000)
- `MESSAGE_COOLDOWN`: Minimum time between messages in ms (default: 3000)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.