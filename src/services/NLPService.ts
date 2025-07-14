// @ts-ignore - Compromise doesn't have proper TypeScript types
import nlp from 'compromise';
import { NLPAnalysis } from '../agents/types';



declare module 'compromise' {
  interface Document {
    numbers(): any;
    nouns(): any;
    has(term: string): boolean;
  }
}

export class NLPService {
  static analyzeText(text: string, _context: Record<string, any> = {}): NLPAnalysis {
    const doc = nlp(text.toLowerCase());
    const analysis: NLPAnalysis = {
      intent: 'GENERAL_QUERY',
      entities: [],
      confidence: 0.8
    };

    const lowerText = text.toLowerCase();
    
    // Check for order cancellation first
    if (/(cancel|remove|delete).*order|(stop|don't want).*anymore/i.test(lowerText) || 
        /(never mind)|(forget about it)/i.test(lowerText)) {
      analysis.intent = 'CANCEL_ORDER';
      analysis.confidence = 0.95;
      
      // Extract order ID if mentioned
      const orderIdMatch = lowerText.match(/order[\s-]*(?:#|no\.?)?\s*([A-Z0-9-]+)/i);
      if (orderIdMatch) {
        analysis.entities.push({
          type: 'order_id',
          value: orderIdMatch[1].toUpperCase(),
          confidence: 1.0
        });
      }
      
      return analysis;
    }

    // Check for order modification
    if (/(change|modify|update|edit|add more|remove).*order/i.test(lowerText)) {
      analysis.intent = 'MODIFY_ORDER';
      analysis.confidence = 0.9;
      
      // Extract modification type
      if (/(add|more|another|extra)/i.test(lowerText)) {
        analysis.entities.push({
          type: 'modification',
          value: 'add',
          confidence: 0.9
        });
      } else if (/(remove|delete|less|fewer)/i.test(lowerText)) {
        analysis.entities.push({
          type: 'modification',
          value: 'remove',
          confidence: 0.9
        });
      }
    }
    // Check for new orders
    else if (/(?:order|buy|purchase|get|want|need|i'd like|i would like|can i have|give me)/i.test(lowerText)) {
      analysis.intent = 'ORDER';
      analysis.confidence = 0.9;

      // Extract product names (nouns following the order verb)
      const nouns = doc.nouns().out('array');
      const orderVerb = doc.match('(order|buy|purchase|get|want|need|have|give)');
      if (orderVerb.found && nouns.length > 0) {
        // A simple approach: assume the first noun after the verb is the product
        const firstNoun = nouns[0];
        if (firstNoun) {
          analysis.entities.push({
            type: 'product',
            value: firstNoun,
            confidence: 0.85
          });
        }
      }
    } 
    // Check for inventory queries
    else if (/(inventory|stock|available|do you have|in stock)/i.test(lowerText)) {
      analysis.intent = 'QUERY_INVENTORY';
      analysis.confidence = 0.85;
    } 
    // Check for order tracking
    else if (/(track|where is|status of|my order|order status)/i.test(lowerText)) {
      analysis.intent = 'TRACK_ORDER';
      analysis.confidence = 0.9;
    }

    // Extract quantities using more robust patterns
    const quantityMatch = lowerText.match(/(\d+)|(a|an|one|two|three|four|five|six|seven|eight|nine|ten)\b/g);
    if (quantityMatch) {
      const wordToNumber: Record<string, string> = {
        'a': '1', 'an': '1', 'one': '1', 'two': '2', 'three': '3',
        'four': '4', 'five': '5', 'six': '6', 'seven': '7',
        'eight': '8', 'nine': '9', 'ten': '10'
      };
      
      quantityMatch.forEach(match => {
        const quantity = wordToNumber[match.toLowerCase()] || match;
        analysis.entities.push({
          type: 'quantity',
          value: quantity,
          confidence: 0.9
        });
      });
    }

    // Extract products with variations and aliases
    const products = doc.nouns().out('array') as string[];
    const productVariations: Record<string, string[]> = {
      'banana': ['bananas', 'banana', 'banano', 'bananos'],
      'yogurt': ['yogurt', 'yoghurt', 'yogurts', 'yoghurts', 'greek yogurt'],
      'headphone': ['headphones', 'headset', 'earphones', 'earbuds'],
      'milk': ['milk', 'dairy milk', 'almond milk', 'soy milk'],
      'bread': ['bread', 'loaf', 'sourdough', 'whole wheat', 'white bread'],
      'eggs': ['eggs', 'egg', 'dozen eggs'],
      'apple': ['apple', 'apples', 'red apple', 'green apple'],
      'orange': ['orange', 'oranges', 'navel orange'],
      'coffee': ['coffee', 'ground coffee', 'coffee beans', 'espresso'],
      'tea': ['tea', 'green tea', 'black tea', 'herbal tea']
    };

    products.forEach((product: string) => {
      const normalizedProduct = product.toLowerCase().trim();
      
      // Check for product variations
      for (const [canonical, variations] of Object.entries(productVariations)) {
        if (variations.some(v => normalizedProduct.includes(v) || 
                                v.includes(normalizedProduct))) {
          analysis.entities.push({
            type: 'product',
            value: canonical,
            confidence: 0.9,
            metadata: { originalText: product }
          });
          break;
        }
      }
    });

    // Extract order IDs with more patterns
    const orderIdPatterns = [
      /(?:order|#|no\.?)[\s-]*(?:#|no\.?)?\s*([A-Z0-9-]+)/i,
      /[A-Z]{2,}-\d+/,
      /ORD-?\d+/
    ];
    
    for (const pattern of orderIdPatterns) {
      const matches = lowerText.match(pattern);
      if (matches && matches[1]) {
        analysis.entities.push({
          type: 'order_id',
          value: matches[1].toUpperCase(),
          confidence: 1.0
        });
        break;
      }
    }

    return analysis;
  }

  static formatResponse(message: string, data?: any): string {
    // Simple response formatter
    if (data) {
      return `${message}\n\n${JSON.stringify(data, null, 2)}`;
    }
    return message;
  }
}
