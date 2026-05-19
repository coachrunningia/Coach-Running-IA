
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class GoogleGenerativeAI {
  constructor(apiKey) { this.apiKey = apiKey; }
  getGenerativeModel(opts) {
    return {
      generateContent: async (req) => {
        const prompt = req?.contents?.[0]?.parts?.[0]?.text || '<NO PROMPT>';
        const file = process.env.PROMPT_OUTPUT_FILE;
        if (!file) throw new Error('PROMPT_OUTPUT_FILE not set');
        try { mkdirSync(dirname(file), { recursive: true }); } catch {}
        writeFileSync(file, prompt);
        const err = new Error('__PROMPT_CAPTURED__');
        err.code = '__PROMPT_CAPTURED__';
        throw err;
      }
    };
  }
}

export default { GoogleGenerativeAI };
