import { Agent, run, RunContext, tool } from "@openai/agents";
import 'dotenv/config';
import {z} from "zod";

const responseSchema=z.object({
    finalOutput: z.string().describe('The final output of the agent after processing the input.'),
    happinessLevel: z.boolean().describe('Did the agent successfully process the input with 100% accuracy?')
});

const getUserinfo = () => tool({
    name: "user_info",
    description: "Get information about the user",
    parameters: z.object({
        userId: z.string().describe("The ID of the user to retrieve information for")
    }),
    execute: (input: { userId: string }) => {
        return {
            userId: input.userId,
            name: "John Doe",
            email: "john.doe@example.com"
        };
    }
});

export const agent = Agent.create({
  name: 'MerchantAmA',
  instructions: 'You are a problem solver agent. Help users find solutions to their problems.',
  outputType: responseSchema,
  tools: [getUserinfo()],
  model: 'o3-mini-2025-01-31',
  handoffs: []
});

const myquery = `What is 2 squared - 39 squared? After calculating give me user 275 info as well.`;

agent.on('agent_start', (ctx: unknown, agent: any) => {
  console.log(`[${agent.name}] started`);
});

agent.on('agent_end', (ctx: unknown, output: any) => {
  console.log(`[agent] produced:`, output);
});

agent.on('agent_tool_start', (ctx: unknown, tool: any) => {
  console.log(`[toolInfo] using tool:`, tool.name);
});
agent.on('agent_tool_end', (ctx: unknown, tool: any) => {
  console.log(`[toolInfo] finished using tool:`, tool.name);
});

const execute = async () => {
  const response = await run(agent, myquery, { stream: true });
  for await (const chunk of response) {
    if (
      typeof chunk === "object" &&
      chunk !== null &&
      "data" in chunk &&
      typeof (chunk as any).data === "object" &&
      (chunk as any).data !== null &&
      "delta" in (chunk as any).data
    ) {
      process.stdout.write((chunk as any).data.delta);
    }
  }
  process.stdout.write('\n');
};

execute();