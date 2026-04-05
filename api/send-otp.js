// api/send-otp.js
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔥 FIX: Frontend 'phone' bhej raha hai, isliye dono check karo
    const phone = req.body.phone || req.body.phoneNumber;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!phone || phone.length !== 10) {
        return res.status(400).json({ error: 'Valid 10-digit phone number is required' });
    }

    try {
        // 2Factor.in API Call
        // AUTOGEN3 use karne se 6-digit OTP jata hai jo humne frontend me set kiya hai
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN3/OTP1`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status === 'Success') {
            res.status(200).json({
                message: 'OTP sent successfully!',
                sessionId: data.Details // Frontend ko sessionId milna bahut zaruri hai
            });
        } else {
            console.error("2Factor Error:", data.Details);
            res.status(400).json({ error: data.Details || 'Failed to send OTP' });
        }
    } catch (error) {
        console.error("System Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
