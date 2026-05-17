import twilio from 'twilio';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { playerName } = req.body;

    if (!playerName) {
        return res.status(400).json({ message: 'Player name is required' });
    }

    // You MUST set these environment variables in your Vercel Dashboard manually
    // 1. TWILIO_ACCOUNT_SID
    // 2. TWILIO_AUTH_TOKEN
    // 3. TWILIO_PHONE_NUMBER (your Twilio sender number)
    // 4. OWNER_PHONE_NUMBER (your personal phone number receiving the alert)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const ownerPhone = process.env.OWNER_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone || !ownerPhone) {
        console.error("Twilio credentials are not configured in Vercel environment variables.");
        return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
        const client = twilio(accountSid, authToken);
        const message = await client.messages.create({
            body: `[CITY ESCAPE - ALERT] A new player hopped into the game! Player Name: ${playerName}`,
            from: twilioPhone,
            to: ownerPhone
        });

        return res.status(200).json({ success: true, messageId: message.sid });
    } catch (error) {
        console.error("Twilio Dispatch Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}