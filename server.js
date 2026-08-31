const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large Audio File Handling

// Bhashini Credentials
const USER_ID = process.env.BHASHINI_USER_ID || "YOUR_USER_ID";
const API_KEY = process.env.BHASHINI_API_KEY || "YOUR_API_KEY";
const PIPELINE_ID = process.env.BHASHINI_PIPELINE_ID || "YOUR_PIPELINE_ID";

// Health Check Route
app.get('/', (req, res) => {
  res.send('EduBharat Bhashini Backend Running!');
});

// Main Translation Endpoint
app.post('/translate', async (req, res) => {
  try {
    const { audio, sourceLang = 'hi', targetLang = 'sat' } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio Base64 data missing' });
    }

    // Step A: Bhashini Dynamic Config Request
    const configRes = await axios.post(
      'https://meity-auth.ulca.in/ulca/apis/v1/model/getPipelineInference',
      {
        pipelineTasks: [
          { taskType: 'asr', config: { language: { sourceLanguage: sourceLang } } },
          { taskType: 'translation', config: { language: { sourceLanguage: sourceLang, targetLanguage: targetLang } } },
          { taskType: 'tts', config: { language: { sourceLanguage: targetLang } } }
        ],
        pipelineRequestConfig: { pipelineId: PIPELINE_ID }
      },
      {
        headers: {
          'userID': USER_ID,
          'ulcaApiKey': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const callbackUrl = configRes.data.pipelineInferenceAPIEndPoint.callbackUrl;
    const authHeader = configRes.data.pipelineInferenceAPIEndPoint.inferenceApiKey.value;

    // Step B: Bhashini Speech-to-Speech Execution
    const computeRes = await axios.post(
      callbackUrl,
      {
        pipelineTasks: [
          {
            taskType: 'asr',
            config: {
              language: { sourceLanguage: sourceLang },
              serviceId: configRes.data.pipelineResponseConfig[0].config[0].serviceId,
              audioFormat: 'wav'
            }
          },
          {
            taskType: 'translation',
            config: {
              language: { sourceLanguage: sourceLang, targetLanguage: targetLang },
              serviceId: configRes.data.pipelineResponseConfig[1].config[0].serviceId
            }
          },
          {
            taskType: 'tts',
            config: {
              language: { sourceLanguage: targetLang },
              serviceId: configRes.data.pipelineResponseConfig[2].config[0].serviceId,
              gender: 'female'
            }
          }
        ],
        inputData: { audio: [{ audioContent: audio }] }
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract Translated Base64 Audio
    const translatedAudioBase64 = computeRes.data.pipelineResponse[2].audio[0].audioContent;

    res.json({
      success: true,
      translatedAudio: translatedAudioBase64
    });

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
