import { type AiDifficulty } from "@/lib/ai";
import { type Move, type Player } from "@/lib/russianDraughtsEngine";

type AnalyzeRequest = {
  moves: Move[];
  winner: Player;
  playerColor: Player;
  difficulty: AiDifficulty;
};

type ClaudeTextBlock = {
  type: "text";
  text: string;
};

type ClaudeResponse = {
  content?: ClaudeTextBlock[];
};

const SYSTEM_PROMPT = `You are a Russian draughts (шашки) coach. Analyze the game and give 
coaching feedback in Russian. Be specific, concise, and encouraging. 
Focus on: missed captures, risky moves, good tactical decisions, 
promotion opportunities. Format response as JSON with fields:
summary (1-2 sentences), tips (array of 3-5 strings), 
bestMoment (string), worstMoment (string), rating (1-10 integer)`;

const MOCK_ANALYSIS = {
  summary: "Хорошая партия!",
  tips: [
    "Контролируйте центр доски",
    "Старайтесь создавать дамки раньше соперника",
    "Защищайте шашки в паре",
  ],
  rating: 7,
  bestMoment: "Грамотное взятие в середине партии",
  worstMoment: "Несколько шашек остались без защиты",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === "your_key_here") {
      return Response.json(MOCK_ANALYSIS);
    }

    const playerResult = body.winner === body.playerColor ? "won" : "lost";
    const userPrompt = `The player was ${body.playerColor} and ${playerResult}. 
Difficulty: ${body.difficulty}. 
Game had ${body.moves.length} moves total.
Move sequence: ${body.moves.map((move) => move.notation).join(", ")}
Provide coaching feedback in Russian.`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      throw new Error(`Anthropic request failed with ${anthropicResponse.status}.`);
    }

    const claudeJson = (await anthropicResponse.json()) as ClaudeResponse;
    const text = claudeJson.content?.find((block) => block.type === "text")?.text;
    if (!text) {
      throw new Error("Claude response did not include text content.");
    }

    return Response.json(parseClaudeJson(text));
  } catch {
    return Response.json({ error: "Analysis unavailable" }, { status: 500 });
  }
}

function parseClaudeJson(text: string): unknown {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];

  return JSON.parse(fencedJson ?? trimmed);
}
