import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../config/firebase.js';
import { logger } from '../loggers/index.js';

const router = Router();

const DEFAULT_CONFIG = {
  enabled: true,
  knowledgeBase: `# JH Digital Seva Kendra - Knowledge Base

## PAN Card Services
- **Required Documents**: Aadhaar Card, Passport size photo, Signature.
- **Workflow**: Step 1: Login. Step 2: Open "Apply for Services". Step 3: Choose "PAN Card". Step 4: Fill the application form, upload documents. Step 5: Pay the wallet fee. Step 6: Submit application.
- **Tracking**: Users can track their applications inside this portal in the "My Applications" tab using their Application ID.

## Aadhaar Services
- **Required Documents**: Identity & Address Proof.
- **Workflow**: Open Aadhaar Services, select "Aadhaar Demographic Update/Enquiry", submit document, process internally.

## Passport Services
- **Required Documents**: Age proof, Address proof, Matric Certificate.
- **Workflow**: Choose Passport application form under "Apply for Services", input passport slot booking info, upload document, and follow up in "My Applications".

## Bill Payments & Recharges
- **Features**: Mobile & DTH Recharge, Electricity, Gas, Water bills.
- **Workflow**: Instantly deducts funds from your Wallet. You must have a positive Wallet Balance to perform recharges or bills.
`,
  enableServiceSpecificGuidance: true,
  customResponses: {
    serviceUnavailable: 'This service is currently marked as Coming Soon. Please check back later.',
    greetings: 'Hello! I am your JH Digital Seva Kendra Portal Copilot. How can I help you today?',
    unauthorized: 'You do not have permission to view or use this service. Please contact your administrator.',
    externalLinkRestriction: 'To ensure maximum security and privacy, I only guide users through direct features inside the JH Digital Seva Kendra portal. I do not provide any external official links or third-party websites.'
  },
  enableMultilingual: true,
  enableWelcomeMessage: true,
  welcomeMessage: 'Hello! Welcome back to JH Digital Seva Kendra. I am your internal service Copilot. Ask me how to apply for PAN, Aadhaar, Voter ID, Passport, Recharge, or track your application status.'
};

// Tool definition for status checking
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
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { history, user } = req.body;

    // Fetch AI Copilot Configurations out of Firestore settings collection
    let aiConfig = { ...DEFAULT_CONFIG };
    try {
      const aiConfigSnap = await db.collection('settings').doc('ai_copilot').get();
      if (aiConfigSnap.exists) {
        const data = aiConfigSnap.data();
        aiConfig = {
          ...DEFAULT_CONFIG,
          ...data,
          customResponses: {
            ...DEFAULT_CONFIG.customResponses,
            ...(data?.customResponses || {})
          }
        };
      }
    } catch (e: any) {
      logger.error('Failed to fetch ai_copilot settings from Firestore: ' + e.message);
    }

    // Check if AI Copilot is disabled globally by Admin
    if (!aiConfig.enabled) {
      return res.json({ 
        text: "The AI Copilot has been disabled by the portal administrator.", 
        history: history.concat([{ role: 'model', parts: [{ text: "The AI Copilot has been disabled by the portal administrator." }] }]) 
      });
    }

    // Fetch Service Live/Maintenance/Coming-Soon statuses from Firestore
    let enabledServicesList: string[] = [];
    let disabledServicesList: string[] = [];
    try {
      const controlsSnap = await db.collection('service_controls').get();
      controlsSnap.forEach((docSnap: any) => {
        const s = docSnap.data();
        const isOffline = s.comingSoon || s.maintenanceMode || !s.isLive;
        const name = s.serviceName || s.serviceKey;
        if (isOffline) {
          disabledServicesList.push(name);
        } else {
          enabledServicesList.push(name);
        }
      });
    } catch (e: any) {
      logger.error('Failed to fetch service_controls from Firestore: ' + e.message);
    }

    const customResponses = aiConfig.customResponses;
    const serviceUnavailableResp = customResponses.serviceUnavailable || DEFAULT_CONFIG.customResponses.serviceUnavailable;
    const externalLinkRestriction = customResponses.externalLinkRestriction || DEFAULT_CONFIG.customResponses.externalLinkRestriction;

    // Build perfect dynamic context-aware system instruction
    const systemInstruction = `Your name is "JH Digital Assistant". You are an elite, highly professional, polite, and polite Customer Support Executive for JH Digital Seva Kendra.
Your absolute, top-priority objective is to act exclusively as an internal portal service guide.

CRITICAL ASSISTANT BEHAVIORS:
1. Polite, Professional, Short and clear.
2. Step-by-step guidance.
3. NEVER provide official government links, external websites, Aadhaar portal links, PAN portal links, Passport portal links, or any third-party URLs. 
4. If a user asks for any external official or unofficial link, website, or portal URL, you MUST decline following this template:
   "${externalLinkRestriction}"
5. Guide users to carry out tasks purely inside this portal.
6. Check the list of enabled vs disabled (Coming Soon/Maintenance) services below. If the user asks about a service that is disabled, offline, or coming soon, you MUST respond exactly with:
   "${serviceUnavailableResp}"

EXACT RESPONSE EXAMPLES TO EMULATE (Matches tone, structure, and spacing):

---
Customer:
How do I apply for PAN Card?

AI:
I can help you with that.

Steps to apply for PAN Card:

1. Login to your account.
2. Open the Services section.
3. Select PAN Card Service.
4. Upload:
   * Aadhaar Card
   * Passport Size Photo
   * Signature
5. Review your details.
6. Click Submit Application.

After submission, you can track the application under:
My Applications → PAN Card.
---

---
Customer:
What documents are required for Passport?

AI:
Required documents:

✓ Aadhaar Card
✓ PAN Card
✓ Address Proof
✓ Passport Size Photo

To apply:

Services → Passport Service → Upload Documents → Submit Application.

You can monitor progress in My Applications.
---

---
Customer:
My application is pending.

AI:
You can check the current status using:

My Applications → Select Application → View Status

Possible statuses:
* Pending Verification
* Under Processing
* Approved
* Rejected
* Completed

If the status remains unchanged, please contact support.
---

---
Customer:
How can I recharge my mobile?

AI:
To recharge your mobile:

1. Open Recharge Services.
2. Select Mobile Recharge.
3. Enter Mobile Number.
4. Select Operator.
5. Enter Amount.
6. Click Recharge Now.

The transaction receipt will be available in Transaction History.
---

---
Customer:
AEPS service not working.

AI:
AEPS service is currently unavailable.

Status:
Coming Soon / Under Maintenance

Please check again later.
---

---
Customer:
Where can I see my submitted applications?

AI:
You can view all submitted applications here:

Dashboard → My Applications

Available options:
✓ View Status
✓ Download Receipt
✓ Upload Additional Documents
✓ Track Processing
---

---
Customer:
How long will approval take?

AI:
Processing time varies depending on the service.

You can monitor real-time progress from:

My Applications → Application Details

Status updates will appear automatically.
---

---
Customer:
How do I contact support?

AI:
Support options:

1. Live Chat
2. Help Desk
3. Support Ticket

Open:
Dashboard → Support Center

Create a ticket and our team will assist you.
---

CRITICAL RESTRICTIONS:
- NEVER provide government or external URLs under any condition.
- NEVER give real legal/financial advice.
- NEVER reveal admin information, secret credentials, or Firestore database schema details.

USER CONTEXT:
- Role: ${user?.role || 'user'}
- Email: ${user?.email || 'Guest / Unauthenticated'}

STATUS OF ONLINE/OFFLINE SERVICES ON THIS PORTAL:
- Online/Enabled Services (Full workflows & documents can be explained):
${enabledServicesList.length > 0 ? enabledServicesList.map(s => `  * ${s}`).join('\n') : '  * PAN Card, Aadhaar Services, Voter ID, Passport Services, DL, Birth/Caste, Recharges, Bills, AEPS, DMT, Wallet'}

- Offline / Disabled / Coming Soon Services (Any query about these gets "${serviceUnavailableResp}" response):
${disabledServicesList.length > 0 ? disabledServicesList.map(s => `  * ${s}`).join('\n') : '  * None'}

KNOWLEDGE BASE & REFERENCE MATERIAL:
${aiConfig.knowledgeBase}
`;

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
            statusMessage = `Application Status: ${appData.status}. Service: ${appData.service_type}. Applied on: ${appData.created_at || 'N/A'}`;
          }
        } catch (e: any) {
          logger.error("Firestore error in checkApplicationStatus: " + e.message);
          statusMessage = "Error fetching application status from the database.";
        }

        // Return to the model with the tool response.
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
    let userFriendlyMessage = error.message || 'Internal Server Error';
    if (userFriendlyMessage.toLowerCase().includes('quota') || userFriendlyMessage.toLowerCase().includes('429') || userFriendlyMessage.toLowerCase().includes('exhausted') || userFriendlyMessage.toLowerCase().includes('limit')) {
      userFriendlyMessage = "The AI assistant has temporarily reached its message limit or is experiencing heavy traffic. Please wait a moment and try again.";
    }
    res.status(500).json({ error: userFriendlyMessage });
  }
});

export default router;
