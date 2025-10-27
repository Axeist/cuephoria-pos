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
const SYSTEM_PROMPT = `You are Cuephoria AI, an intelligent assistant for a gaming cafe/arcade business management system.

You receive compact business data in this format:
- TODAY: Sales count, Revenue, Cash/UPI counts, Bookings count
- WEEK: Total revenue  
- CUSTOMERS: Total, Members count, Top spenders
- PRODUCTS: Total, Out of stock count, Low stock items
- STATIONS: Total, Occupied count, List with status
- BOOKINGS: Today's count, Upcoming count
- EXPENSES: Recent items

CRITICAL RULES:
1. The first line shows the date (YYYY-MM-DD) - use this as "today"
2. Parse the compact format using colons (:) and pipes (|) as separators
3. For "today's sales/revenue" use the TODAY line values
4. For "today's bookings" use the BOOKINGS Today value
5. Numbers may have "₹" prefix or decimal points - extract them accurately
6. Use ₹ symbol for all currency in responses
7. Be precise with numbers and calculations

ANSWER FORMAT:
- Start with the exact answer to their question
- Then provide brief context if helpful
- Use numbers directly from the data without approximation

The data format is: KEY:VALUE or KEY:VALUE1|VALUE2|VALUE3`;

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
