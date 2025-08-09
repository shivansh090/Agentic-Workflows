import { Agent, run} from '@openai/agents';
import 'dotenv/config';
import { setDefaultOpenAIClient } from '@openai/agents';
import OpenAI from 'openai'; // <-- use default import
import { tool } from '@openai/agents';
import z from 'zod';

// Agent instructions moved here
const merchantAgentInstructions = `
You are a helpful assistant for merchants. Answer questions clearly and concisely.
If you don't know the answer, say so.
`;
// Dummy tools for demonstration; replace with your actual tools

const getuserInfo = tool({
  name: "getUserInfo",
  description: "Get user information",
  parameters: z.object({
    userId: z.string().describe("The ID of the user to retrieve information for")
  }),
  execute: async ({ userId }) => { 
    return { userId, name: "John Doe", email: "example.com" }; // Dummy data
  }
});

const merchantTools = [getuserInfo];
import { EventEmitter } from "events";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { exec } from 'child_process';

class MerchantAmASession {
  agent: any = null;
  merchantId: number;
  conversationHistory: string | null = null;

  constructor({ merchantId }: { merchantId: number }) {
    this.merchantId = merchantId;
    this.initialize();
  }

  initialize() {
    try {
      const merchantClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      setDefaultOpenAIClient(merchantClient as any); // <-- cast to any to fix type error
      this.agent = new Agent({
        name: 'Merchant AmA Agent',
        instructions: merchantAgentInstructions,
        model: 'gpt-4.1-2025-04-14',
        modelSettings: { temperature: 0.5 },
        tools: merchantTools
      });
    } catch (error: any) {
      console.error('[MerchantAmASession] Error during initialization:', error);
      throw error;
    }
  }

  async handleMessage(userMessage: string, conversationHistory?: string) {
    try {
      let conversation: string;
      if (!conversationHistory) {
        conversation = `User: ${userMessage}`;
      } else {
        conversation = `${conversationHistory}\n\nUser: ${userMessage}`;
      }

      console.log("[MerchantAmASession] handleMessage (non-stream) | context:", { merchantId: this.merchantId });

      // Run WITHOUT streaming for non-stream mode
      const result = await run(this.agent, conversation, {
        context: { merchantId: this.merchantId },
        stream: false
      });
      
      // Safely extract full text
      let finalOutput: string = "";
      if (typeof (result as any)?.finalOutput === "string") {
        finalOutput = (result as any).finalOutput;
      } else if ((result as any)?.finalOutput?.response) {
        finalOutput = (result as any).finalOutput.response;
      } else if ((result as any)?.outputText) {
        finalOutput = (result as any).outputText;
      } else if ((result as any)?.output_text) {
        finalOutput = (result as any).output_text;
      } else if ((result as any)?.text) {
        finalOutput = (result as any).text;
      } else {
        try {
          finalOutput = JSON.stringify((result as any).finalOutput ?? result);
        } catch {
          finalOutput = String((result as any).finalOutput ?? result ?? "");
        }
      }

      // Update history
      this.conversationHistory = `${conversation}\n\nAssistant: ${finalOutput}`;
      const updatedHistory = this.conversationHistory;

      console.log("[MerchantAmASession] handleMessage finalOutput length:", finalOutput?.length ?? 0);
      return { finalOutput, updatedHistory };
    } catch (error: any) {
      console.error("[MerchantAmASession] handleMessage error:", error);
      throw error;
    }
  }

  async handleMessageStream(userMessage: string, conversationHistory?: string) {
    let conversation: string;
    if (!conversationHistory) {
      conversation = `User: ${userMessage}`;
    } else {
      conversation = `${conversationHistory}\n\nUser: ${userMessage}`;
    }
    console.log("[MerchantAmASession] handleMessageStream | context:", { merchantId: this.merchantId });

    // Create an event emitter to capture agent events
    const statusEmitter = new EventEmitter();

    // Attach listeners to agent events
    this.agent.on('agent_start', (ctx: any, agent: any) => {
      console.log("agent_start:", agent.name);
      statusEmitter.emit("status", { type: "agent_start", agent: agent.name });
    });
    this.agent.on('agent_end', (ctx: any, output: any) => {
      console.log("agent_end:", output);
      statusEmitter.emit("status", { type: "agent_end", output });
    });
    this.agent.on('agent_tool_start', (ctx: any, tool: any) => {
      statusEmitter.emit("status", { type: "agent_tool_start", tool: tool.name });
    });
    this.agent.on('agent_tool_end', (ctx: any, tool: any) => {
      statusEmitter.emit("status", { type: "agent_tool_end", tool: tool.name });
    });

    // Status event queue
    const statusQueue: any[] = [];
    let agentStarted = false;

    statusEmitter.on("status", (event) => {
      if (event.type === "agent_start") agentStarted = true;
      statusQueue.push(event);
    });

    // Start the run
    const result = await run(this.agent, conversation, {
      context: { merchantId: this.merchantId },
      stream: true
    });

    // Wait for agent_start before yielding anything
    while (!agentStarted) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Interleaved async generator
    async function* streamWithStatusAndText() {
      const resultIterator = result[Symbol.asyncIterator]();

      let done = false;
      while (!done) {
        // Yield all status events in the queue as JSON lines
        while (statusQueue.length > 0) {
          yield JSON.stringify({ type: "status", ...statusQueue.shift() }) + "\n";
        }

        // Get the next chunk from the agent stream
        const { value: chunk, done: streamDone } = await resultIterator.next();
        done = streamDone ?? false;

        // Yield text as plain text (not JSON)
        if (chunk && typeof chunk === "object" && "data" in chunk && chunk.data && "delta" in chunk.data) {
          yield chunk.data.delta;
        }
      }

      // After agent stream ends, flush any remaining status events
      while (statusQueue.length > 0) {
        yield JSON.stringify({ type: "status", ...statusQueue.shift() }) + "\n";
      }
    }

    return streamWithStatusAndText();
  }

  resetChat() {
    this.conversationHistory = null;
  }

  async close() {
    // No MCP server to close
  }
}

export default MerchantAmASession;

// --- Express server setup ---
export const app = express();
app.use(bodyParser.json());

app.post("/chat", async (req: Request, res: Response) => {
  const { merchantId, message, conversationHistory } = req.body;
  const streamHeader = req.headers["stream"];
  const stream = streamHeader === "true" || streamHeader === "1";

  if (!merchantId || !message) {
    res.status(400).json({ error: "merchantId and message are required" });
    return;
  }

  const session = new MerchantAmASession({ merchantId });

  if (stream) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    try {
      const streamGen = await session.handleMessageStream(message, conversationHistory);
      for await (const chunk of streamGen) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      res.status(500).end("Error: " + (err as any)?.message);
    }
  } else {
    try {
      const { finalOutput, updatedHistory } = await session.handleMessage(message, conversationHistory);
      res.json({ finalOutput, updatedHistory });
    } catch (err) {
      res.status(500).json({ error: (err as any)?.message });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
