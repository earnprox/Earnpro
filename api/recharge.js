const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

module.exports = async (req, res) => {
    // 1. Sirf POST request allow karein
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Frontend (recharge.html) se aane wala data pakdein
    const { mobileNumber, amount, operatorCode } = req.body;

    // 3. Fixie Proxy ka setup (Jo aapne Vercel environment me daala hoga)
    // Agar FIXIE_URL env variable me nahi hai, toh Vercel dashboard se pehle copy kar lijiye
    const proxyUrl = process.env.FIXIE_URL; 
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

    // 4. SKV Pay ke Credentials (Isko Vercel Environment variables me chupakar rakhna best hai)
    const userId = process.env.SKV_USER_ID; // Aapka SKV ID (e.g. 18039)
    const token = process.env.SKV_TOKEN;    // Aapka secret Token

    // 5. SKV API ka URL banayein
    const skvUrl = `https://api.roundpay.net/API/TransactionAPI?UserID=${userId}&Token=${token}&Account=${mobileNumber}&Amount=${amount}&SPKey=${operatorCode}&Format=2`;

    try {
        // 6. Request bhejein (Proxy ka use karke)
        const response = await axios.get(skvUrl, { httpsAgent: agent });

        // 7. SKV se jo jawab aaya, wo wapas aapke frontend ko bhej dein
        res.status(200).json(response.data);

    } catch (error) {
        console.error("Recharge Error:", error);
        res.status(500).json({ error: 'Recharge failed due to server error' });
    }
};
