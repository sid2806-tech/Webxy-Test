import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The content of the question" },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of 4 MCQ options" 
      },
      correctIndex: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
      explanation: { type: Type.STRING, description: "Brief explanation of the answer" }
    },
    required: ["text", "options", "correctIndex"]
  }
};

export async function generateQuizQuestions(topic: string, count: number = 5): Promise<Question[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a higher-level educational quiz on the topic: "${topic}". 
      Produce exactly ${count} multiple choice questions. 
      Ensure options are distinct and challenging.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      },
    });

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to generate quiz:", error);
    throw error;
  }
}
