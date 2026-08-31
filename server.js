const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/translate', async (req, res) => {
    try {
        const { audio } = req.body;

        if (!audio) {
            return res.status(400).json({ error: "No audio data provided" });
        }

        // Bhashini API Request Config
        const bhashiniPayload = {
            pipelineTasks: [
                { taskType: "asr", config: { language: { sourceLanguage: "hi" } } },
                { taskType: "translation", config: { language: { sourceLanguage: "hi", targetLanguage: "sat" } } },
                { taskType: "tts", config: { language: { sourceLanguage: "sat" } } }
            ],
            inputData: { audio: [{ audioContent: audio }] }
        };

        const response = await fetch("YOUR_BHASHINI_API_ENDPOINT", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "YOUR_BHASHINI_API_KEY" // Apni Bhashini API Key yahan rakhein
            },
            body: JSON.stringify(bhashiniPayload)
        });

        const bhashiniData = await response.json();

        // Base64 Audio Safe Extraction Logic
        let outputAudio = null;

        try {
            // Standard Pipeline response structure
            outputAudio = bhashiniData.pipelineResponse[2].output[0].audio[0].audioContent;
        } catch (e) {
            // Alternate Direct Key Fallbacks
            outputAudio = bhashiniData.audioContent || bhashiniData.audio || bhashiniData.translatedAudio;
        }

        if (outputAudio) {
            res.json({ translatedAudio: outputAudio });
        } else {
            console.log("Bhashini Output Parsing Failed:", JSON.stringify(bhashiniData));
            res.json({ translatedAudio: null, error: "Audio not found in Bhashini response" });
        }

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Translation failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
                  
