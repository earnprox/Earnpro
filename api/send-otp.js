module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const phone = req.body.phone || req.body.phoneNumber;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    // 1. अगर Vercel में Key सेव नहीं हुई है, तो स्क्रीन पर बता देगा
    if (!API_KEY) {
        return res.status(500).json({ error: 'Vercel ENV Missing: API Key not found' });
    }

    // 2. अगर Frontend से नंबर नहीं आ रहा है, तो बता देगा
    if (!phone) {
        return res.status(400).json({ error: 'Phone number not received from frontend' });
    }

    try {
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN3/OTP1`;
        const response = await fetch(url);
        
        // पहले text में पढ़ रहे हैं ताकि 2Factor कोई अजीब एरर दे तो क्रैश न हो
        const textData = await response.text(); 
        
        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            return res.status(500).json({ error: '2Factor API Format Error' });
        }

        if (data.Status === 'Success') {
            return res.status(200).json({ sessionId: data.Details });
        } else {
            // 🔥 3. अगर 2Factor ने रिजेक्ट किया (जैसे बैलेंस खत्म, या गलत Key), तो असली कारण स्क्रीन पर दिखाएगा!
            return res.status(400).json({ error: `2Factor Error: ${data.Details}` });
        }
    } catch (error) {
        return res.status(500).json({ error: `Fetch Error: ${error.message}` });
    }
};
