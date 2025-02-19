import redis from "../config/redis";
import { getDocument } from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";

const AI_MODEL = "gemini-pro";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const aiModel = genAI.getGenerativeModel({ model: AI_MODEL });

export const extractTextFromPDF = async (fileKey: string) => {
  try {
    const fileData = await redis.get(fileKey);
    if (!fileData) {
      throw new Error("No file found");
    }

    let fileBuffer: Uint8Array;
    if (Buffer.isBuffer(fileData)) {
      fileBuffer = new Uint8Array(fileData);
    } else if (typeof fileData === "object" && fileData !== null) {
      // check if the the object has the expected structure
      const bufferData = fileData as { type?: string; data?: number[] };
      if (bufferData.type === "Buffer" && Array.isArray(bufferData.data)) {
        fileBuffer = new Uint8Array(bufferData.data);
      } else {
        throw new Error("File data is not valid");
      }
    } else {
      throw new Error("File data is not valid");
    }

    const pdf = await getDocument({ data: fileBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  } catch (error) {
    console.log(error);
    throw new Error(
      `Failed to extract text from PDF provided. Error: ${JSON.stringify(error)}`
    );
  }
};

export const detectContractType = async (
  contractText: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: AI_MODEL });
  const prompt = `
    Analyze the given contract text and identify its type. 
    Respond with only the contract type as a single string (e.g., "Employment", "Non-Disclosure Agreement", "Sales", "Lease", etc.).
    Exclude any additional explanation or details.

    Contract text:
    ${contractText.substring(0, 2000)}
  `;

  const results = await aiModel.generateContent(prompt);
  const response = results.response;
  return response.text().trim();
};

