const { GoogleGenerativeAI } = require("@google/generative-ai");

// ⚠️ SECURITY WARNING: Apni API key ko direct code mein mat rakho. Ise process.env.GEMINI_API_KEY mein daalo.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyAQy79lGLMWm2OQLDKPjnsvqDp6wBydkic"); 
const SECURE_API_TOKEN = process.env.ADMIN_SECRET_KEY || "RashiAkash@2026_Secure";

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userMessage, secureToken } = req.body;

    // 🛡️ STRICT SECURITY: Verify Master Token
    if (secureToken !== SECURE_API_TOKEN) {
        return res.status(401).json({ error: '🚨 Unauthorized Access. Hacker spotted!' });
    }

    if (!userMessage) return res.status(400).json({ error: "Message empty" });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });
        
        const systemPrompt = `
        You are the official Customer Support AI for "EarnproX", a premium tap-to-earn platform.
        Rules to follow strictly based on Stage 1 MVP:
        1. 1000 X Coins = ₹1 (INR).
        2. Daily energy limit is 2000 taps. Daily earning limit is ₹1000.
        3. Minimum withdrawal amount is ₹100. Processing is manual.
        4. Reply in short, polite, and helpful sentences using emojis.
        5. Reply in Hinglish (Hindi + English).
        User's Message: "${userMessage}"
        `;

        const result = await model.generateContent(systemPrompt);
        const botReply = result.response.text();

        return res.status(200).json({ success: true, reply: botReply });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: "AI Server Busy. Try again later!" });
    }
};
