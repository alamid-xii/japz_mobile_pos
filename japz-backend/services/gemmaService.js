/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import axios from 'axios';

/**
 * Gemma AI Service for Feedback Analysis
 * Integrates with Together.ai API for Gemma 2B model
 * Provides advanced sentiment analysis, theme detection, and actionable insights
 */

const GEMMA_SYSTEM_PROMPT = `You are an expert restaurant feedback analyzer. Your task is to analyze customer feedback and extract:
1. Sentiment (positive, neutral, negative)
2. Main themes (food quality, service, wait time, price, cleanliness, etc.)
3. Key issues or problems mentioned
4. Key praises or positive points
5. Actionable recommendations

Return ONLY valid JSON with no additional text.`;

/**
 * Analyze feedback using Gemma AI via Together.ai API
 * @param {string} comment - Customer feedback to analyze
 * @returns {Promise<Object>} Analysis with sentiment, themes, issues, praises
 */
export const analyzeWithGemmaAI = async (comment) => {
    try {
        const apiKey = process.env.GEMMA_API_KEY;

        if (!apiKey) {
            console.log('⚠️  GEMMA_API_KEY not configured, skipping Gemma analysis');
            return null;
        }

        console.log('🤖 Analyzing with Gemma AI...');

        const prompt = `${GEMMA_SYSTEM_PROMPT}

Customer Feedback: "${comment}"

Analyze this feedback and return JSON in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0-100,
  "themes": ["theme1", "theme2", "theme3"],
  "key_issues": ["issue1", "issue2"],
  "key_praises": ["praise1", "praise2"],
  "summary": "one line summary",
  "recommendation": "what should the restaurant do"
}`;

        const response = await axios.post(
            'https://api.together.xyz/v1/chat/completions',
            {
                model: 'mistralai/Mistral-7B-Instruct-v0.1',
                messages: [
                    {
                        role: 'system',
                        content: GEMMA_SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.3,
                top_p: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        let analysisText = response.data?.choices?.[0]?.message?.content || '';

        // Clean the response
        analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const analysis = JSON.parse(analysisText);

        console.log('✅ Gemma AI analysis successful');

        return {
            sentiment: analysis.sentiment || 'neutral',
            themes: analysis.themes || [],
            keyIssues: analysis.key_issues || [],
            keyPraises: analysis.key_praises || [],
            summary: analysis.summary || comment.substring(0, 200),
            recommendation: analysis.recommendation || '',
            confidence: analysis.confidence || 80,
            source: 'gemma'
        };
    } catch (error) {
        console.error('❌ Gemma AI analysis failed:', error.message);
        return null;
    }
};

/**
 * Fallback local keyword analysis
 * Used when Gemma API is unavailable
 * @param {string} comment - Customer feedback
 * @returns {Object} Analysis using keyword matching
 */
export const analyzeWithKeywords = (comment) => {
    if (!comment || comment.trim().length === 0) {
        return {
            themes: [],
            sentiment: 'neutral',
            summary: 'No comment provided',
            keyIssues: [],
            keyPraises: [],
            source: 'keywords'
        };
    }

    const lowerComment = comment.toLowerCase();

    // Sentiment keywords with word boundaries
    const positiveKeywords = [
        'good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'best', 'awesome',
        'fantastic', 'delicious', 'tasty', 'wonderful', 'outstanding', 'superb', 'brilliant',
        'impressed', 'satisfied', 'happy', 'pleased', 'recommend', 'fresh', 'clean',
        'quick', 'fast', 'efficient', 'friendly', 'polite', 'helpful', 'attentive',
        'nice', 'lovely', 'enjoyed', 'like', 'quality', 'prompt', 'excellent', 'superior',
        'outstanding', 'terrific', 'wonderful', 'marvelous', 'superb'
    ];

    const negativeKeywords = [
        'bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'slow', 'burnt',
        'disgusting', 'rude', 'wait', 'long', 'overpriced', 'expensive', 'disappointing',
        'stale', 'dirty', 'unclean', 'unprofessional', 'problem', 'issue', 'never',
        'complaint', 'horrible', 'nasty', 'disgusted', 'upset', 'sad'
    ];

    // Helper function to match words with boundaries
    const matchWord = (text, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return text.match(regex);
    };

    // Count keywords
    let sentimentScore = 0;
    const foundPositive = [];
    const foundNegative = [];

    positiveKeywords.forEach(word => {
        const matches = matchWord(lowerComment, word);
        if (matches) {
            sentimentScore += matches.length;
            foundPositive.push(word);
        }
    });

    negativeKeywords.forEach(word => {
        const matches = matchWord(lowerComment, word);
        if (matches) {
            sentimentScore -= matches.length;
            foundNegative.push(word);
        }
    });

    // Improved sentiment threshold (changed from > 1 to >= 1)
    let sentiment = 'neutral';
    if (sentimentScore >= 1) sentiment = 'positive';
    else if (sentimentScore <= -1) sentiment = 'negative';

    // Theme detection
    const themeKeywords = {
        'Food Quality': ['food', 'taste', 'flavor', 'delicious', 'fresh', 'quality'],
        'Wait Time': ['wait', 'slow', 'long', 'quick', 'fast', 'speed'],
        'Temperature': ['cold', 'hot', 'warm', 'burnt', 'temperature'],
        'Service': ['staff', 'service', 'friendly', 'polite', 'helpful', 'rude'],
        'Pricing': ['price', 'expensive', 'cheap', 'value', 'cost'],
        'Cleanliness': ['clean', 'dirty', 'hygiene', 'sanitary', 'messy'],
        'Ambiance': ['ambiance', 'atmosphere', 'music', 'noise', 'crowded']
    };

    const detectedThemes = [];
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        const matches = keywords.filter(keyword => lowerComment.includes(keyword)).length;
        if (matches > 0) {
            detectedThemes.push({ theme, matches });
        }
    });

    const themes = detectedThemes
        .sort((a, b) => b.matches - a.matches)
        .slice(0, 3)
        .map(item => item.theme);

    return {
        sentiment,
        themes: themes.length > 0 ? themes : ['General Feedback'],
        keyIssues: foundNegative.slice(0, 3),
        keyPraises: foundPositive.slice(0, 3),
        summary: comment.substring(0, 200),
        source: 'keywords'
    };
};
