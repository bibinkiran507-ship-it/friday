import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const key = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
console.log('Testing key:', key?.substring(0, 15) + '...');
console.log('Testing model:', modelName);

const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: modelName });
try {
  const result = await model.generateContent('Say hello in one word');
  console.log('SUCCESS! Response:', result.response.text());
} catch(e) {
  console.log('FAILED! Error:', e.message);
}
