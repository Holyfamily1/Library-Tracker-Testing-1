
import { GoogleGenAI } from "@google/genai";
import { Session, Student } from "../types";

// Always initialize GoogleGenAI with process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemPrompt = (students: Student[], activeSessions: Session[], history: Session[]) => {
  const activeCount = activeSessions.length;
  const totalStudents = students.length;
  const recentHistory = history.slice(0, 5);

  return `
    You are the "HF NMTC Library Intelligence Assistant".
    
    CURRENT LIBRARY CONTEXT:
    - Active students in library right now: ${activeCount}
    - Total registered students: ${totalStudents}
    - Recent activity: ${JSON.stringify(recentHistory)}

    LIBRARY POLICIES:
    1. Maximum study duration per session is 3 hours (180 minutes).
    2. Level 300 and 400 students have priority for the "Quiet Research Zone" during morning blocks (8 AM - 12 PM).
    3. No food or open drinks are allowed.
    4. Borrowing books requires a valid physical ID verification after scanning.
    5. The library operates from 8 AM to 8 PM.

    YOUR CAPABILITIES:
    - You can answer questions about who is currently in the library.
    - You can explain policies.
    - You can provide suggestions based on attendance data.
    - Be professional, concise (max 2-3 sentences), and use medical/academic librarian terminology.
  `;
};

export const getChatResponse = async (
  userMessage: string, 
  students: Student[], 
  activeSessions: Session[], 
  history: Session[]
): Promise<string> => {
  try {
    // Call generateContent directly using the pre-initialized ai instance.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: getSystemPrompt(students, activeSessions, history),
        temperature: 0.7,
      }
    });
    
    // Use the .text property to access extracted text output.
    return response.text?.trim() || "I'm processing that data. Could you rephrase?";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "The intelligence core is temporarily occupied. Please try again in a moment.";
  }
};

export const getLibraryInsights = async (history: Session[]): Promise<string> => {
  const recentActivity = history.slice(0, 10).map(h => ({
    time: h.checkIn instanceof Date ? h.checkIn.toLocaleTimeString() : 'Unknown',
    duration: h.duration || 0,
    status: h.checkOut ? 'Completed' : 'Active'
  }));

  const prompt = `
    As an expert academic librarian for HF NMTC, analyze these recent student library logs: ${JSON.stringify(recentActivity)}. 
    Provide ONE tactical, concise recommendation (max 20 words) for the librarian on duty. 
    Focus on capacity, atmosphere, or engagement. No intro.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    
    return response.text?.trim() || "Monitor student turnover during shift transitions to ensure desk availability.";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "Prioritize quiet-zone enforcement during peak morning study blocks to support Level 300 research sessions.";
  }
};
