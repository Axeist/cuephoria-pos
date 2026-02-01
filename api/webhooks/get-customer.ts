import { supabase } from "../../src/integrations/supabase/server";

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  end: () => void;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = req.body || {};
    const { customer_phone } = payload;

    // Validate required fields
    if (!customer_phone) {
      return j(res, { 
        ok: false, 
        error: "Missing required field: customer_phone"
      }, 400);
    }

    // Normalize phone number (convert to string first in case it comes as a number)
    const phoneString = String(customer_phone || '');
    let normalizedPhone = phoneString.replace(/\D/g, '');
    
    // Handle Indian phone numbers: remove country code if present (91 or +91)
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.substring(2);
    } else if (normalizedPhone.length === 13 && normalizedPhone.startsWith('9191')) {
      normalizedPhone = normalizedPhone.substring(2);
    }
    
    // Validate: Must be exactly 10 digits for Indian numbers
    if (normalizedPhone.length !== 10) {
      return j(res, { 
        ok: false, 
        error: "Invalid phone number. Indian mobile numbers must be exactly 10 digits",
        provided: phoneString
      }, 400);
    }
    
    // Validate: Indian mobile numbers start with 6, 7, 8, or 9
    const firstDigit = normalizedPhone[0];
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return j(res, { 
        ok: false, 
        error: "Invalid phone number. Indian mobile numbers must start with 6, 7, 8, or 9",
        provided: phoneString
      }, 400);
    }

    // Fetch customer by phone number
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      // Return only minimal PII needed for booking UX.
      // Do NOT return CRM/financial stats from a public endpoint.
      .select("id, name, phone, email")
      .eq("phone", normalizedPhone)
      .single();

    if (customerError) {
      if (customerError.code === "PGRST116") {
        // Customer not found
        return j(res, {
          ok: true,
          found: false,
          message: "Customer not found",
          customer: null
        }, 200);
      }
      console.error("❌ Error fetching customer:", customerError);
      return j(res, { ok: false, error: "Failed to fetch customer" }, 500);
    }

    if (!customer) {
      return j(res, {
        ok: true,
        found: false,
        message: "Customer not found",
        customer: null
      }, 200);
    }

    return j(res, {
      ok: true,
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      }
    }, 200);

  } catch (error: any) {
    console.error("💥 Get customer error:", error);
    return j(res, {
      ok: false,
      error: error.message || "Failed to fetch customer"
    }, 500);
  }
}

