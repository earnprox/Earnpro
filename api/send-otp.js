// api/send-otp.js
module.exports = async function handler(req, res) {
    // 1. केवल POST मेथड अलाउ करें
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔥 FIX: Frontend 'phone' भेज रहा है, इसलिए दोनों को चेक करें
    const phone = req.body.phone || req.body.phoneNumber;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    // 2. वैलिडेशन
    if (!phone || phone.length !== 10) {
        return res.status(400).json({ error: 'Valid 10-digit phone number is required' });
    }

    try {
        // 3. 2Factor.in API Call
        // AUTOGEN3 का मतलब है 6-digit OTP (जो हमने UI में सेट किया है)
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN3/OTP1`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status === 'Success') {
            // 4. Success Response
            return res.status(200).json({
                message: 'OTP sent successfully!',
                sessionId: data.Details // यह ID वेरिफिकेशन के लिए बहुत जरूरी है
            });
        } else {
            // 2Factor की तरफ से एरर (जैसे बैलेंस खत्म होना या गलत API Key)
            console.error("2Factor Error:", data.Details);
            return res.status(400).json({ error: data.Details || 'Failed to send OTP' });
        }
    } catch (error) {
        console.error("System Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
