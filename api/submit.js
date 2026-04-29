import formidable from 'formidable';
import fs from 'fs';

// Vercel ko bol rahe hain ki default body parser band kare, hum khud file handle karenge
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Sirf POST request allow karni hai
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Parsing Error:", err);
      return res.status(500).json({ error: 'Error parsing data' });
    }

    try {
      // Vercel/Formidable data ko array me bhej sakta hai, isliye unhe extract kar rahe hain
      const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
      const userPhone = Array.isArray(fields.userPhone) ? fields.userPhone[0] : fields.userPhone;
      const taskId = Array.isArray(fields.taskId) ? fields.taskId[0] : fields.taskId;
      const taskTitle = Array.isArray(fields.taskTitle) ? fields.taskTitle[0] : fields.taskTitle;

      if (!imageFile) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // 1. Image ko Base64 format mein convert karna (ImgBB ke liye zaroori hai)
      const fileData = fs.readFileSync(imageFile.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');
      
      const imgbbFormData = new URLSearchParams();
      imgbbFormData.append('image', base64Image);

      // 2. ImgBB par upload karna (Vercel ke secure Env Variable se key uthake)
      const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
        method: 'POST',
        body: imgbbFormData,
      });

      const imgbbResult = await imgbbResponse.json();
      if (!imgbbResult.success) throw new Error('ImgBB upload failed');

      const finalImageUrl = imgbbResult.data.url;

      // 3. Discord Webhook par VIP notification bhejna
      const discordPayload = {
        content: "🚨 **New App Install Verification Request!**",
        embeds: [
          {
            title: `Task: ${taskTitle}`,
            color: 3066993, // Premium Emerald Green Color
            fields: [
              { name: "📱 User Phone", value: `\`${userPhone}\``, inline: true },
              { name: "🆔 Task ID", value: `\`${taskId}\``, inline: true }
            ],
            image: {
              url: finalImageUrl // Discord me yahi URL seedha image ban jayega
            },
            footer: { text: "EarnproX Notification System" },
            timestamp: new Date().toISOString()
          }
        ]
      };

      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });

      // 4. Frontend ko 'Success' bolna taaki Modal band ho jaye
      return res.status(200).json({ success: true, message: 'Verification submitted' });

    } catch (error) {
      console.error("Backend Error:", error);
      return res.status(500).json({ error: 'Backend server error' });
    }
  });
}
