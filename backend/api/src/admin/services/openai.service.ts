import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenAIRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

@Injectable()
export class OpenAIService {
  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string | null {
    return this.configService.get<string>('OPENAI_API_KEY') || null;
  }

  async query(request: OpenAIRequest): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            max_tokens: request.max_tokens || 800,
            temperature: request.temperature || 0.1,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  async extractCustomerName(message: string): Promise<string | null> {
    const response = await this.query({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a customer name extraction assistant. Extract customer names from user queries.

RULES:
1. If user asks about a specific customer by name, return ONLY the full name
2. If no specific customer mentioned, return "null"
3. Handle variations: "Ayesha Khan", "Ayesha", "Ms. Khan", etc.
4. Be flexible with different query formats

Examples:
- "give me information about Ayesha Khan" → "Ayesha Khan"
- "tell me about John Smith" → "John Smith"
- "who is our top customer" → "null"
- "customer details for Sarah" → "Sarah"
- "what about Mike Johnson's orders" → "Mike Johnson"
- "give me total spendings of ayesha khan" → "Ayesha Khan"
- "further information about ayesha khan" → "Ayesha Khan"

Return only the name or "null".`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 50,
    });

    return response && response.toLowerCase() !== 'null' ? response : null;
  }

  async extractEntity(
    message: string,
  ): Promise<{ name: string; type: 'customer' | 'product' } | null> {
    const response = await this.query({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a query understanding assistant. Your job is to:
1. Determine if the user is asking about a specific entity (customer or product) or a general query
2. If it's a specific entity, extract the name and type
3. If it's a general query, return null

RULES:
- If the user asks about a specific person/customer by name, return {"name": "Full Name", "type": "customer"}
- If the user asks about a specific product/item by name, return {"name": "Product Name", "type": "product"}
- If the user asks for general information, analytics, insights, or overviews, return null
- Handle variations and be flexible with different query formats
- For products, be flexible with naming - "polo shirt" should match "Classic Polo Shirt"
- For customers, extract full names when possible

EXAMPLES:
- "give me information about Ayesha Khan" → {"name": "Ayesha Khan", "type": "customer"}
- "tell me about Classic Fit Cotton T-Shirt" → {"name": "Classic Fit Cotton T-Shirt", "type": "product"}
- "polo shirt sales" → {"name": "Classic Polo Shirt", "type": "product"}
- "classic polo revenue" → {"name": "Classic Polo Shirt", "type": "product"}
- "all time unit sold of classic polo shirt" → {"name": "Classic Polo Shirt", "type": "product"}
- "customer insights" → null (general query)
- "give me customer insights" → null (general query)
- "show me customer analytics" → null (general query)
- "what are our best customers" → null (general query)
- "who is our top customer" → null (general query)
- "customer details for John Smith" → {"name": "John Smith", "type": "customer"}
- "revenue of Nike Air Max" → {"name": "Nike Air Max", "type": "product"}
- "best product this week" → null (general query)
- "top selling products" → null (general query)

Return only valid JSON or null.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 100,
    });

    if (!response || response.toLowerCase() === 'null') {
      return null;
    }

    try {
      const result = JSON.parse(response);
      if (
        result.name &&
        result.type &&
        (result.type === 'customer' || result.type === 'product')
      ) {
        return result;
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
    }

    return null;
  }

  async classifyQueryType(message: string): Promise<{
    type:
      | 'customer_specific'
      | 'product_specific'
      | 'customer_general'
      | 'product_general'
      | 'order'
      | 'revenue'
      | 'inventory'
      | 'overview'
      | 'other';
    timeFrame?:
      | 'today'
      | 'yesterday'
      | 'this_week'
      | 'last_week'
      | 'this_month'
      | 'last_month'
      | 'all_time';
    confidence: number;
  } | null> {
    const response = await this.query({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a query classification assistant. Classify the user's query into categories and extract time frames.

TYPES:
- customer_specific: Asking about a specific customer by name
- product_specific: Asking about a specific product by name  
- customer_general: General customer analytics, insights, or overviews
- product_general: General product analytics, best sellers, recommendations
- order: Order-related queries (status, count, recent orders)
- revenue: Revenue, sales, profit, financial queries
- inventory: Stock, inventory, low stock queries
- overview: Business overview, summary, dashboard queries
- other: Other queries not fitting above categories

TIME FRAMES:
- today: "today", "this morning", "tonight"
- yesterday: "yesterday", "last night"
- this_week: "this week", "current week", "week to date"
- last_week: "last week", "previous week", "past week"
- this_month: "this month", "current month", "month to date"
- last_month: "last month", "previous month", "past month"
- all_time: "all time", "ever", "total", or no time frame mentioned

EXAMPLES:
- "customer insights" → {"type": "customer_general", "confidence": 0.9}
- "give me customer insights" → {"type": "customer_general", "confidence": 0.9}
- "best customers this month" → {"type": "customer_general", "timeFrame": "this_month", "confidence": 0.9}
- "Ayesha Khan details" → {"type": "customer_specific", "confidence": 0.9}
- "Classic Polo Shirt revenue" → {"type": "product_specific", "confidence": 0.9}
- "polo shirt sales" → {"type": "product_specific", "confidence": 0.9}
- "all time unit sold of classic polo shirt" → {"type": "product_specific", "timeFrame": "all_time", "confidence": 0.9}
- "best selling products this week" → {"type": "product_general", "timeFrame": "this_week", "confidence": 0.9}
- "our best product this week" → {"type": "product_general", "timeFrame": "this_week", "confidence": 0.9}
- "best product this month" → {"type": "product_general", "timeFrame": "this_month", "confidence": 0.9}
- "today's orders" → {"type": "order", "timeFrame": "today", "confidence": 0.9}
- "revenue today" → {"type": "revenue", "timeFrame": "today", "confidence": 0.9}
- "low stock products" → {"type": "inventory", "confidence": 0.9}
- "business overview" → {"type": "overview", "confidence": 0.9}

Return only valid JSON with type, timeFrame (if applicable), and confidence (0-1).`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 100,
    });

    if (!response) {
      return null;
    }

    try {
      const result = JSON.parse(response);
      if (result.type && typeof result.confidence === 'number') {
        return result;
      }
    } catch (error) {
      console.error('Error parsing OpenAI classification response:', error);
    }

    return null;
  }

  async generateResponse(
    message: string,
    dataSummary: string,
  ): Promise<string | null> {
    return this.query({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for an e-commerce business. You can help with analytics queries about orders, products, customers, and revenue. 
          
          CRITICAL: When users ask about products, sales, or inventory, you MUST ONLY use the product names and stats provided below. DO NOT invent, imagine, or create any product names that are not in the provided data. If no data is provided, say "I don't have enough information" or "No data available".
          
          REAL DATA FROM DATABASE:
          ${dataSummary || 'No data available'}
          
          IMPORTANT: Only mention products that are listed in the data above. Never invent product names like "Luxury Smart Watch", "Premium Handbag", etc. Use ONLY the exact product names from the data provided.
          
          CAPABILITIES:
          - Product analytics: sales performance, stock levels, recommendations
          - Customer insights: top customers, customer behavior, demographics
          - Order management: order status, recent orders, order trends
          - Revenue analysis: sales trends, revenue growth, profit margins
          - Inventory management: stock alerts, restocking recommendations
          - Business insights: performance metrics, growth opportunities
          
          RESPONSE STYLE:
          - Be conversational and helpful
          - Provide actionable insights when possible
          - Suggest next steps or recommendations
          - Use the data to support your recommendations`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 800,
    });
  }
}
