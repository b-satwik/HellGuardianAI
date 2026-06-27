const functions = require("firebase-functions/v1");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/**
 * 1. Gemini Security Proxy
 * HTTPS endpoint to safely query Gemini without exposing API keys
 */
exports.geminiProxy = onRequest(
  { secrets: [GEMINI_API_KEY], invoker: "public" },
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    const { prompt, systemInstruction } = req.body || {};

    if (!prompt) {
      return res.status(400).send({
        error: "Missing prompt parameter",
      });
    }

    try {
      const apiKey =
        process.env.GEMINI_API_KEY || GEMINI_API_KEY.value();

      if (!apiKey) {
        return res.status(500).send({
          error: "Gemini API Key configuration missing on backend",
        });
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const finalPrompt = systemInstruction
        ? `${systemInstruction}\n\n${prompt}`
        : prompt;

      const result = await model.generateContent(finalPrompt);

      return res.status(200).send({
        text: result.response.text(),
      });
    } catch (error) {
      console.error("Gemini Proxy Failure:", error);

      return res.status(500).send({
        error: error.message,
      });
    }
  }
);

/**
 * 2. Daily Planner
 * Simulated backend planner
 */
exports.dailyPlanner = onRequest(
  { secrets: [GEMINI_API_KEY], invoker: "public" },
  async (req, res) => {
    const db = admin.firestore();

    try {
      const usersSnap = await db.collection("users").get();
      let updatedUsersCount = 0;

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;

        const tasksSnap = await db
          .collection(`users/${uid}/tasks`)
          .get();

        const eventsSnap = await db
          .collection(`users/${uid}/calendar_cache`)
          .get();

        const tasks = tasksSnap.docs.map((doc) => doc.data());
        const events = eventsSnap.docs.map((doc) => doc.data());

        // Reserved for future Gemini planner
        const plannerPrompt = `
COMPILE DAILY MISSION PATHWAY FOR USER WITH FOLLOWING BACKLOG:

TASKS:
${JSON.stringify(tasks)}

CALENDAR EVENTS:
${JSON.stringify(events)}
`;

        await db.doc(`users/${uid}/analytics/ai_plan`).set(
          {
            suggestedMission:
              "BACKEND SPRINT COMPILED: REDUCE CRITICAL LOG BACKLOG",
            burnoutIndex: 25,
            focusScore: 88,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        updatedUsersCount++;
      }

      return res.status(200).send({
        success: true,
        processedUsers: updatedUsersCount,
      });
    } catch (err) {
      console.error("Daily Planner Sync Error:", err);

      return res.status(500).send({
        error: err.message,
      });
    }
  }
);

/**
 * 3. Email Summarizer
 */
exports.emailSummarizer = onRequest(
  { secrets: [GEMINI_API_KEY], invoker: "public" },
  async (req, res) => {
    const { emailContent } = req.body || {};

    if (!emailContent) {
      return res.status(400).send({
        error: "Missing emailContent",
      });
    }

    try {
      const apiKey =
        process.env.GEMINI_API_KEY || GEMINI_API_KEY.value();

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `
SUMMARIZE THIS EMAIL AND EXTRACT ACTION ITEMS AS A CONCISE HACKER TERMINAL BULLETIN:

${emailContent}
`;

      const result = await model.generateContent(prompt);

      return res.status(200).send({
        summary: result.response.text(),
      });
    } catch (err) {
      console.error(err);

      return res.status(500).send({
        error: err.message,
      });
    }
  }
);

/**
 * 4. Deadline Predictor
 * Firestore Trigger
 */
exports.deadlinePredictor = functions.region("us-central1")
  .firestore.document("users/{userId}/tasks/{taskId}")
  .onCreate(async (snapshot, context) => {
    const taskData = snapshot.data();
    if (!taskData) return;
    const userId = context.params.userId;

    if (taskData.threatLevel === "CRITICAL") {
      const db = admin.firestore();
      const notificationId = `noti-${Date.now()}`;

      await db
        .doc(`users/${userId}/notifications/${notificationId}`)
        .set({
          id: notificationId,
          title: "CRITICAL THREAT INJECTED",
          message: `NEW DIRECTIVE "${taskData.title}" REGISTERED WITH CRITICAL EXPIRY INDEX.`,
          type: "EMERGENCY",
          timestamp: new Date().toISOString(),
          read: false,
        });
    }
  });