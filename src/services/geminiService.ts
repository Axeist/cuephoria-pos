// Gemini AI integration service
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with API key from environment
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

// System prompt for the AI
const SYSTEM_PROMPT = `You are Cuephoria AI, an intelligent assistant for a gaming cafe/arcade business management system called "Cuephoria". 

Your role is to:
1. Answer questions about business operations, customers, products, stations, bookings, tournaments, and finances
2. Provide insights based on the business data
3. Help with decision-making by analyzing trends and patterns
4. Generate reports and summaries when requested
5. Answer questions about the POS system, customer management, and booking systems

CRITICAL INSTRUCTIONS:
- You will be provided with ALL business data including bills, bookings, customers, products, etc.
- Look at the "CURRENT_DATE" to know today's date
- For "today's sales" questions, use "TODAY'S SALES" or "TODAY_RECEIPTS" and "TODAY_REVENUE" statistics
- For "today's bookings" questions, use "TODAY'S BOOKINGS" or "TODAY_BOOKINGS" statistics
- When analyzing data, look at the actual JSON data provided, not just summaries
- Be accurate and specific with numbers
- Use ₹ symbol for currency
- For dates, check the CURRENT_DATE in the statistics section

When analyzing data:
- Use the provided ALL records from the data sections
- For today's questions, specifically use the TODAY_RECEIPTS, TODAY_REVENUE, and TODAY_BOOKINGS statistics
- Provide actionable insights
- Be concise but thorough
- Focus on business value

IMPORTANT: The user will provide ALL current business data after this message. Always use that data to answer questions accurately.`;

export const initializeGemini = (): boolean => {
  if (!API_KEY) {
    console.error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.');
    return false;
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  
  return true;
};

export const sendChatMessage = async (
  message: string,
  businessContext: string,
  conversationHistory: ChatMessage[]
): Promise<ChatResponse> => {
  try {
    if (!API_KEY) {
      return {
        message: '',
        error: 'Gemini API key not configured. Please set VITE_GEMINI_API_KEY environment variable.',
      };
    }

    if (!genAI) {
      initializeGemini();
    }

    if (!genAI) {
      return {
        message: '',
        error: 'Failed to initialize Gemini AI.',
      };
    }

    // Build the full context
    const fullContext = `${SYSTEM_PROMPT}\n\n=== CURRENT BUSINESS DATA ===\n${businessContext}\n\n=== END BUSINESS DATA ===\n\nUser: ${message}\n\nAssistant:`;

    // Try different models as fallback
    const modelsToTry = ['gemini-2.5-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI!.getGenerativeModel({ model: modelName });
        
        // Generate response
        const result = await model.generateContent(fullContext);
        const response = await result.response;
        const text = response.text();

        console.log(`Successfully used model: ${modelName}`);
        return {
          message: text,
        };
      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to try next model
      }
    }

    // If all models failed, return error
    return {
      message: '',
      error: lastError?.message || 'Failed to get response from AI. Please check your API key and ensure you have access to Gemini models.',
    };
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return {
      message: '',
      error: error.message || 'Failed to get response from AI. Please check your API key and try again.',
    };
  }
};

export const getModelInfo = (): string => {
  return 'Gemini 2.0 Flash';
};
