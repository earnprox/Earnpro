module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { sessionId, otpEntered } = req.body;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!sessionId || !otpEntered) {
        return res.status(400).json({ error: 'Session ID and OTP are required' });
    }

    try {
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otpEntered}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status === 'Success' && data.Details === 'OTP Matched') {
            res.status(200).json({ message: 'Login Successful! OTP Matched.' });
        } else {
            res.status(400).json({ error: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).json({ error: 'OTP Verification Failed or Expired' });
    }
};
