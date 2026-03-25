/**
 * Safely extract and parse JSON from AI responses
 * Handles various formats and extra text
 */
export const extractJSON = (text: string): any => {
    try {
        // Try to parse the entire text first
        return JSON.parse(text);
    } catch (e) {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
            try {
                return JSON.parse(jsonBlockMatch[1].trim());
            } catch (e2) {
                // Continue to next attempt
            }
        }

        // Try to find JSON object by finding first { and last }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
                const jsonStr = text.substring(firstBrace, lastBrace + 1);
                return JSON.parse(jsonStr);
            } catch (e3) {
                // Continue to array attempt
            }
        }

        // Try to find JSON array by finding first [ and last ]
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            try {
                const jsonStr = text.substring(firstBracket, lastBracket + 1);
                return JSON.parse(jsonStr);
            } catch (e4) {
                // Give up and throw original error
            }
        }

        throw new Error(`Could not parse JSON from response: ${text.substring(0, 100)}...`);
    }
};
