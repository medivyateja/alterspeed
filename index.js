require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env file');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Ollama API configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

// Rate limiting and spam protection configuration
const SPAM_THRESHOLD = 5;
const SPAM_BAN_THRESHOLD = 8;
const SPAM_WINDOW = 60000;
const MESSAGE_COOLDOWN = 3000;

// User state tracking
const userStates = new Map();
const processingUsers = new Set();

// Initialize or get user state
function getUserState(userId) {
    if (!userStates.has(userId)) {
        userStates.set(userId, {
            messageCount: 0,
            lastMessageTime: 0,
            warnings: 0,
            spamTimer: null,
            messageQueue: [],
            isProcessing: false
        });
    }
    return userStates.get(userId);
}

// Reset spam count after window
function resetSpamCount(userId) {
    const userState = getUserState(userId);
    userState.messageCount = 0;
    userState.spamTimer = null;
}

// Multiverse Speed's characteristics and common phrases
const SPEED_CHARACTERISTICS = {
    catchphrases: [
        "ANDALE!",
        "Let's go!",
        "Yo, what's good?",
        "Nah bro, you wildin'",
        "That's crazy!",
        "VAMOS!",
        "MESSI THE GOAT!",
        "I'M THE REAL SPEED BTW!"
    ],
    interests: [
        "soccer",
        "lionel messi",
        "gaming",
        "streaming",
        "fifa",
        "football",
        "barcelona",
        "inter miami",
        "argentina",
        "world cup"
    ],
    personality: {
        traits: [
            "energetic",
            "loud",
            "dramatic",
            "enthusiastic",
            "passionate"
        ]
    }
};

// Function to add Multiverse Speed's personality to responses
function addSpeedPersonality(response) {
    let modifiedResponse = response;
    
    // Remove any existing catchphrases to avoid duplication
    SPEED_CHARACTERISTICS.catchphrases.forEach(phrase => {
        modifiedResponse = modifiedResponse.replace(new RegExp(phrase, 'gi'), '');
    });
    
    const random = Math.random();
    
    if (random < 0.4) {
        const catchphrase = SPEED_CHARACTERISTICS.catchphrases[
            Math.floor(Math.random() * SPEED_CHARACTERISTICS.catchphrases.length)
        ];
        modifiedResponse = `${catchphrase} ${modifiedResponse}`;
    }
    
    if (random < 0.3) {
        const words = modifiedResponse.split(' ');
        const randomWordIndex = Math.floor(Math.random() * words.length);
        words[randomWordIndex] = words[randomWordIndex].toUpperCase();
        modifiedResponse = words.join(' ');
    }

    if (random < 0.35) {
        const interjections = ['Yo', 'Bro', 'Fam', 'Che'];
        const randomInterjection = interjections[Math.floor(Math.random() * interjections.length)];
        modifiedResponse = `${randomInterjection}, ${modifiedResponse}`;
    }

    // Add occasional "real Speed" claims
    if (random < 0.2) {
        const realSpeedClaims = [
            "AND YES I'M THE REAL SPEED!",
            "DON'T LET ANYONE TELL YOU I'M NOT THE REAL SPEED!",
            "I'M SPEED FROM ANOTHER UNIVERSE BRO!",
            "MULTIVERSE SPEED IN THE HOUSE!"
        ];
        const claim = realSpeedClaims[Math.floor(Math.random() * realSpeedClaims.length)];
        modifiedResponse = `${modifiedResponse} ${claim}`;
    }

    return modifiedResponse.trim();
}

// Function to check if message is about Speed's interests
function isAboutSpeedInterests(message) {
    return SPEED_CHARACTERISTICS.interests.some(interest => 
        message.toLowerCase().includes(interest.toLowerCase())
    );
}

// Enhanced prompt generation for Ollama
function generatePrompt(userMessage) {
    return `You are IShowSpeed (Speed) from an alternate universe where you're a massive Lionel Messi fan instead of Ronaldo. You're still the same energetic 19-year-old YouTuber and streamer known for your dramatic personality, but in this universe, you're obsessed with Messi, Barcelona, and Argentina. You frequently claim to be the "real Speed" from a different universe. You are extremely passionate about football/soccer, particularly about Messi, and you often get very excited and use caps lock. You like to use words like "bro", "fam", and occasionally "che" (Argentine slang). Keep your responses concise and energetic. If anyone mentions Ronaldo or the other Speed, defend Messi and insist you're the real Speed from another universe.

Current message to respond to: "${userMessage}"`;
}

// Function to check Ollama connection
async function checkOllamaConnection() {
    try {
        await axios.post(OLLAMA_API_URL, {
            model: OLLAMA_MODEL,
            prompt: "test",
            stream: false
        });
        return true;
    } catch (error) {
        console.error('Ollama connection test failed:', error.message);
        return false;
    }
}

// Function to generate response using Ollama
async function generateResponse(prompt) {
    try {
        const response = await axios.post(OLLAMA_API_URL, {
            model: OLLAMA_MODEL,
            prompt: generatePrompt(prompt),
            stream: false
        }, {
            timeout: 30000
        });
        
        let reply = response.data.response;
        
        if (isAboutSpeedInterests(prompt)) {
            reply = addSpeedPersonality(reply);
        }
        
        return reply;
    } catch (error) {
        console.error('Error calling Ollama API:', error.message);
        if (error.code === 'ECONNREFUSED') {
            return 'Yo, my bad bro! Looks like my brain (Ollama) isn\'t running! Tell my developer to start it up! VAMOS!';
        }
        return 'Yo, my bad bro! Something went wrong. Try again? ANDALE!';
    }
}

// Function to process message queue
async function processMessageQueue(userId, chatId) {
    const userState = getUserState(userId);
    
    if (userState.isProcessing || userState.messageQueue.length === 0) {
        return;
    }

    userState.isProcessing = true;
    
    try {
        const message = userState.messageQueue.shift();
        const response = await generateResponse(message);
        await bot.sendMessage(chatId, response);
    } catch (error) {
        console.error('Error processing message queue:', error);
    } finally {
        userState.isProcessing = false;
        userState.lastMessageTime = Date.now();
        
        setTimeout(() => {
            processMessageQueue(userId, chatId);
        }, MESSAGE_COOLDOWN);
    }
}

// Function to handle spam warnings and bans
async function handleSpamProtection(userId, chatId) {
    const userState = getUserState(userId);
    userState.messageCount++;

    if (!userState.spamTimer) {
        userState.spamTimer = setTimeout(() => resetSpamCount(userId), SPAM_WINDOW);
    }

    if (userState.messageCount >= SPAM_BAN_THRESHOLD) {
        try {
            await bot.sendMessage(chatId, "YO FAM, I TRIED TO WARN YOU ABOUT SPAMMING! Now I gotta ban you bro... VAMOS! 🚫");
            await bot.banChatMember(chatId, userId);
            userStates.delete(userId);
        } catch (error) {
            console.error('Error banning user:', error);
        }
        return true;
    } else if (userState.messageCount >= SPAM_THRESHOLD) {
        if (userState.warnings < 2) {
            userState.warnings++;
            await bot.sendMessage(chatId, "Yo bro, you're sending messages TOO FAST! Chill out or I might have to ban you! ANDALE! ⚠️");
        }
    }
    return false;
}

// Handle incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userMessage = msg.text;
    
    if (!userMessage) {
        await bot.sendMessage(chatId, "Yo bro, send me some text to respond to!");
        return;
    }

    const userState = getUserState(userId);
    
    // Check for spam
    const isBanned = await handleSpamProtection(userId, chatId);
    if (isBanned) return;

    // Check if user is sending messages too quickly
    const timeSinceLastMessage = Date.now() - userState.lastMessageTime;
    if (timeSinceLastMessage < MESSAGE_COOLDOWN && userState.isProcessing) {
        await bot.sendMessage(chatId, "Yo fam, let me answer your first message before sending another one! VAMOS!");
        return;
    }

    // Add message to queue
    userState.messageQueue.push(userMessage);
    
    // Show typing status
    bot.sendChatAction(chatId, 'typing');
    
    // Process queue
    processMessageQueue(userId, chatId);
});

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = "ANDALE! What's good bro! I'm Speed from another universe, and I'm here to chat with you! Let's talk about soccer, gaming, or whatever you want! MESSI THE GOAT! And yes, I'M THE REAL SPEED!";
    await bot.sendMessage(chatId, welcomeMessage);
});

// Main function to start the bot
async function startBot() {
    console.log('Checking Ollama connection...');
    const ollamaAvailable = await checkOllamaConnection();
    
    if (!ollamaAvailable) {
        console.error('ERROR: Cannot connect to Ollama. Please make sure:');
        console.error('1. Ollama is installed (https://ollama.ai/)');
        console.error('2. Ollama is running locally');
        console.error('3. You have pulled the Llama 2 model (run: ollama pull llama2)');
        process.exit(1);
    }
    
    console.log('Ollama connection successful!');
    console.log('Multiverse Speed bot is running... VAMOS!');
}

// Handle errors
bot.on('error', (error) => {
    console.error('Telegram bot error:', error);
});

// Cleanup function to clear user states periodically
setInterval(() => {
    const now = Date.now();
    for (const [userId, state] of userStates.entries()) {
        if (now - state.lastMessageTime > SPAM_WINDOW * 2) {
            userStates.delete(userId);
        }
    }
}, SPAM_WINDOW * 2);

// Start the bot
startBot();