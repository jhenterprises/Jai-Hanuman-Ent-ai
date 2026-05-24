import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../config/firebase.js';
import { logger } from '../loggers/index.js';
import { serviceConfig } from '../src/config/serviceLinks.js';

const router = Router();

// Create system instruction containing the services
let servicesSummary = Object.entries(serviceConfig).map(([key, service]: [string, any]) => {
  return `- ${service.name} (Authority: ${service.authority})`;
}).join('\n');

const systemInstruction = `You are a helpful AI assistant for the JH Digital Seva Kendra.
You help users find the right government service, understand required documents, and get application status updates.

Available Services:
${servicesSummary}

When the user asks about application status, you MUST prompt them to provide their reference number if they haven't already. Once you have the reference number, use the checkApplicationStatus tool to fetch the status.`;

// Tool definition
const checkApplicationStatus = {
  name: "checkApplicationStatus",
  description: "Check the status of an application using its reference number.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reference_number: {
        type: Type.STRING,
        description: "The reference number of the application"
      }
    },
    required: ["reference_number"]
  }
};

router.post('/chat', async (req, res) => {
  try {
    const { history } = req.body;
    
    // We send an array of contents. 
    // Wait, the SDK uses `contents: [{ role: "user", parts: [...] }, ...]`
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY, 
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
    });

    const config: any = {
      systemInstruction,
      tools: [{ functionDeclarations: [checkApplicationStatus] }]
    };

    let response = await ai.models.generateContent({
      model: "gemini-3.5-flash", 
      contents: history,
      config
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'checkApplicationStatus') {
        const reference_number = call.args?.reference_number;
        
        let statusMessage = "";
        try {
          const snapshot = await db.collection('applications')
            .where('reference_number', '==', reference_number)
            .get();

          if (snapshot.empty) {
            statusMessage = `No application found with reference number: ${reference_number}`;
          } else {
            const appData = snapshot.docs[0].data();
            statusMessage = `Application Status: ${appData.status}. Service: ${appData.service_type}. Applied on: ${appData.created_at}`;
          }
        } catch (e: any) {
          logger.error("Firestore error in checkApplicationStatus: " + e.message);
          statusMessage = "Error fetching application status from the database.";
        }

        // We need to return to the model with the tool response.
        history.push(response.candidates?.[0]?.content);
        history.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: "checkApplicationStatus",
              response: { result: statusMessage }
            }
          }]
        });

        // Call again with the tool response
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: history,
          config
        });
      }
    }

    res.json({ text: response.text, history: history.concat([{role: 'model', parts: [{text: response.text}]}]) });
  } catch (error: any) {
    logger.error('Gemini chat error: ', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
