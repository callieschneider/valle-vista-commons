const { chatCompletion } = require('./openrouter');
const prisma = require('./db');

async function getSettings() {
  return prisma.siteSettings.findUnique({ where: { id: 'default' } });
}

async function analyzeTip(post) {
  const settings = await getSettings();
  if (!settings) return null;

  const prompt = `You are a neighborhood bulletin board moderator assistant. Analyze this community tip submission and respond with ONLY valid JSON, no other text.

Submission:
- Title: ${post.title}
- Description: ${post.desc}
- Location: ${post.location || 'Not provided'}
- Submitter's suggested section: ${post.section}

Respond with this exact JSON structure:
{
  "suggestedSection": "ALERT|HAPPENINGS|LOST_FOUND|NEIGHBORS",
  "urgency": "LOW|MEDIUM|HIGH",
  "piiDetected": ["list of any personal info found, or empty array"],
  "rewrite": {
    "title": "cleaned up title",
    "desc": "cleaned up description — fix grammar, neutral tone, remove PII"
  },
  "sentiment": "NEUTRAL|CONCERNED|URGENT|POSITIVE",
  "recommendation": "APPROVE|FLAG|REJECT",
  "reasoning": "One sentence explaining your recommendation"
}

Rules:
- NEVER suggest BOARD_NOTES (that section is mod-authored only)
- Flag PII: full names, phone numbers, license plates, exact addresses (street numbers)
- APPROVE = legitimate community content, REJECT = spam/inappropriate, FLAG = needs human judgment
- Keep rewrites factual and concise. Do not invent details.
- Do not store, log, or learn from this content.`;

  try {
    const raw = await chatCompletion({
      model: settings.analysisModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    if (!raw) return null;

    // Parse JSON from response (handle markdown code fences)
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('AI analysis error:', err.message);
    return null;
  }
}

async function rewriteTip(post, customInstructions) {
  const settings = await getSettings();
  if (!settings) return null;

  const prompt = `Rewrite this neighborhood bulletin board post. Respond with ONLY valid JSON.

Original:
- Title: ${post.title}
- Description: ${post.desc}

${customInstructions ? `Mod instructions: ${customInstructions}` : 'Make it clear, concise, factual, and neutral in tone. Fix grammar. Remove any personal information.'}

Respond:
{
  "title": "rewritten title (max 100 chars)",
  "desc": "rewritten description (max 500 chars)"
}

Do not invent facts. Do not store, log, or learn from this content.`;

  try {
    const raw = await chatCompletion({
      model: settings.rewriteModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    if (!raw) return null;
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('AI rewrite error:', err.message);
    return null;
  }
}

// Fire-and-forget: run analysis in background, update post when done
async function analyzeInBackground(postId) {
  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return;
    const analysis = await analyzeTip(post);
    if (analysis) {
      await prisma.post.update({
        where: { id: postId },
        data: { aiAnalysis: analysis },
      });
    }
  } catch (err) {
    console.error('Background analysis error:', err.message);
    // Non-fatal — post exists, mods can review without AI
  }
}

module.exports = { analyzeTip, rewriteTip, analyzeInBackground };
