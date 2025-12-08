import { createAgent, HumanMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { systemPrompt } from "./systemPrompt";
import { searchUserReportsTool, searchPDF } from "./tools";

export const main = async (prompt: string) => {
  const model = new ChatOpenAI({
    model: "gpt-gpt-4o-mini",
    temperature: 0,
  });

  const agent = createAgent({
    model: "gpt-4o-mini",
    tools: [searchUserReportsTool, searchPDF],
    systemPrompt: systemPrompt,
  });

  const runAgent = async (prompt: string): Promise<string> => {
    const result = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    });

    const lastMessage = result.messages.at(-1);
    const content = lastMessage?.content;

    if (!content) return "";

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content
        .map((block) => (typeof block === "string" ? block : block.text ?? ""))
        .join("");
    }

    return "";
  };

  return runAgent(prompt);
};
