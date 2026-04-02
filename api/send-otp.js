module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { phoneNumber } = req.body;
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        const url = `https://2factor.in/API/V1/${API_KEY}/SMS/${phoneNumber}/AUTOGEN`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.Status === 'Success') {
            res.status(200).json({
                message: 'OTP sent successfully!',
                sessionId: data.Details
            });
        } else {
            res.status(400).json({ error: 'Failed to send OTP' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
