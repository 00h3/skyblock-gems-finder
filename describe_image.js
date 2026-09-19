import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const filePart = {
      inlineData: {
        data: fs
          .readFileSync("attached_assets/file_000000003628820d85b5003960745b25_1788909484962.png")
          .toString("base64"),
        mimeType: "image/png",
      },
    };
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            filePart,
            {
              text: "Describe what is shown in this UI screenshot in detail, specifically pointing out any images or placeholders, what page it is, and any text that stands out.",
            },
          ],
        },
      ],
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
run();
