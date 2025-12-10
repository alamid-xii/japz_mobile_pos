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
 * AI Analysis Service
 * Supports Gemma AI via Together.ai API
 * Falls back to local keyword analysis if API unavailable
 * Analyzes customer feedback for sentiment, themes, issues, and urgency
 */

// Sentiment keywords for local analysis
const SENTIMENT_KEYWORDS = {
    positive: [
        'good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'best', 'awesome',
        'fantastic', 'delicious', 'tasty', 'wonderful', 'outstanding', 'superb',
        'impressed', 'pleased', 'satisfied', 'happy', 'enjoyed', 'recommend',
        'quality', 'fresh', 'prompt', 'friendly', 'polite', 'helpful', 'attentive',
        'nice', 'lovely', 'brilliant', 'impressed', 'satisfied'
    ],
    negative: [
        'bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'slow', 'cold', 'burnt',
        'disgusting', 'rude', 'wait', 'long', 'overpriced', 'expensive', 'disappointing',
        'stale', 'dirty', 'greasy', 'salty', 'bland', 'tough', 'raw', 'undercooked',
        'overcooked', 'unclean', 'unprofessional', 'careless', 'inattentive',
        'complained', 'issue', 'problem', 'broken', 'failed', 'wrong', 'mistake'
    ]
};

// Theme keywords for issue/praise detection
const THEME_KEYWORDS = {
    'Wait Time': ['wait', 'slow', 'long', 'delay', 'rushing', 'hurry', 'queue', 'line', 'took', 'hours'],
    'Food Quality': ['food', 'taste', 'flavor', 'delicious', 'quality', 'fresh', 'cooked', 'ingredient', 'meal'],
    'Food Temperature': ['temp', 'temperature', 'cold', 'hot', 'warm', 'heat', 'cool', 'frozen', 'lukewarm'],
    'Service Quality': ['staff', 'service', 'rude', 'friendly', 'polite', 'helpful', 'attentive', 'waiter', 'crew'],
    'Pricing': ['price', 'expensive', 'cheap', 'value', 'cost', 'worth', 'money', 'afford', 'overcharged', 'rate'],
    'Cleanliness': ['clean', 'dirty', 'hygiene', 'sanitary', 'messy', 'tidy', 'spotless', 'trash', 'garbage'],
    'Ambiance': ['atmosphere', 'ambiance', 'noise', 'loud', 'quiet', 'crowded', 'spacious', 'cozy', 'atmosphere'],
    'Packaging': ['package', 'bag', 'container', 'wrap', 'presentation', 'box', 'delivery', 'packaging']
};

/**
 * Analyze feedback using Gemma AI via Together.ai API
 * Requires GEMMA_API_KEY environment variable
 * 
 * @param {string} comment - Customer feedback comment
 * @returns {Promise<Object>} Analysis result from Gemma
 */
export const analyzeWithGemma = async (comment) => {
    try {
        const apiKey = process.env.GEMMA_API_KEY;
        const model = process.env.GEMMA_MODEL || 'google/gemma-2b-it';
        const apiEndpoint = process.env.GEMMA_ENDPOINT || 'https://api.together.xyz/v1/completions';

        if (!apiKey) {
            console.warn('⚠️  GEMMA_API_KEY not configured');
            return null;
        }

        console.log(`🤖 Analyzing with Gemma (${model})...`);

        const prompt = `You are a restaurant feedback analyzer. Analyze this customer feedback and return ONLY valid JSON (no additional text before or after).

Feedback: "${comment}"

Return a JSON object with these exact fields:
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0-100,
  "key_issues": ["issue1", "issue2"],
  "key_praises": ["praise1", "praise2"],
  "themes": ["theme1", "theme2"],
  "summary": "one sentence summary",
  "urgency_score": 1-10,
  "actionable_insights": ["insight1", "insight2"]
}

If no issues found, use empty array [].
Urgency: 1=low, 10=critical (health/safety issues get high score).`;

        const response = await axios.post(
            apiEndpoint,
            {
                model: model,
                prompt: prompt,
                max_tokens: 300,
                temperature: 0.1,
                top_p: 0.9
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000 // 15 second timeout
            }
        );

        if (!response.data || !response.data.output) {
            console.warn('⚠️  No output from Gemma API');
            return null;
        }

        // Extract text from response
        const outputText = response.data.output[0]?.text || response.data.output || '';

        // Find JSON in response
        const jsonMatch = outputText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.warn('⚠️  Could not parse Gemma response as JSON');
            console.warn('Raw output:', outputText.substring(0, 200));
            return null;
        }

        const analysis = JSON.parse(jsonMatch[0]);

        console.log(`✅ Gemma analysis complete - Sentiment: ${analysis.sentiment}, Urgency: ${analysis.urgency_score}`);

        return {
            ...analysis,
            provider: 'gemma',
            confidence: analysis.confidence || 75
        };
    } catch (error) {
        console.error('❌ Gemma API error:', error.message);
        if (error.response?.status === 401) {
            console.error('   📍 Check GEMMA_API_KEY validity');
        } else if (error.code === 'ENOTFOUND') {
            console.error('   📍 Network error - check internet connection');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   📍 Connection refused - API endpoint may be down');
        }
        return null;
    }
};

/**
 * Local sentiment analysis using keyword matching
 * Fast, no API calls needed - perfect for fallback
 * 
 * @param {string} comment - Customer feedback comment
 * @returns {Object} Analysis result from keyword matching
 */
export const analyzeBasicSentiment = (comment) => {
    if (!comment || comment.trim().length === 0) {
        return {
            sentiment: 'neutral',
            confidence: 0,
            key_issues: [],
            key_praises: [],
            themes: [],
            summary: 'No comment provided',
            urgency_score: 1,
            actionable_insights: [],
            provider: 'basic'
        };
    }

    const lowerComment = comment.toLowerCase();

    // Count sentiment keywords
    const posMatches = SENTIMENT_KEYWORDS.positive.filter(word => lowerComment.includes(word));
    const negMatches = SENTIMENT_KEYWORDS.negative.filter(word => lowerComment.includes(word));

    const posCount = posMatches.length;
    const negCount = negMatches.length;
    const totalMatches = posCount + negCount;

    // Determine sentiment
    let sentiment = 'neutral';
    let confidence = 0;

    if (totalMatches > 0) {
        confidence = Math.min((totalMatches / 8) * 100, 100); // Normalize to 100
        if (posCount > negCount) {
            sentiment = 'positive';
        } else if (negCount > posCount) {
            sentiment = 'negative';
        }
    }

    // Extract themes
    const detectedThemes = [];
    Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerComment.includes(keyword))) {
            detectedThemes.push(theme);
        }
    });

    // Extract key issues and praises
    const key_issues = [];
    const key_praises = [];

    if (sentiment === 'negative') {
        negMatches.slice(0, 2).forEach(word => key_issues.push(word));
        detectedThemes.slice(0, 1).forEach(theme => {
            if (!key_issues.includes(theme)) key_issues.push(theme);
        });
    }

    if (sentiment === 'positive') {
        posMatches.slice(0, 2).forEach(word => key_praises.push(word));
        detectedThemes.slice(0, 1).forEach(theme => {
            if (!key_praises.includes(theme)) key_praises.push(theme);
        });
    }

    // Calculate urgency score
    let urgency_score = 5; // Default middle
    if (sentiment === 'negative') {
        urgency_score = Math.min(7 + Math.floor(negCount / 2), 10);
    } else if (sentiment === 'positive') {
        urgency_score = 2;
    }

    // Check for critical issues
    const criticalWords = ['sick', 'poisoning', 'health', 'safety', 'contaminated', 'dangerous', 'injury'];
    if (criticalWords.some(word => lowerComment.includes(word))) {
        urgency_score = 10;
        key_issues.push('🚨 CRITICAL: Health/Safety Issue');
    }

    return {
        sentiment,
        confidence: Math.round(confidence),
        key_issues: [...new Set(key_issues)].slice(0, 3),
        key_praises: [...new Set(key_praises)].slice(0, 3),
        themes: detectedThemes,
        summary: comment.length > 100 ? comment.substring(0, 100) + '...' : comment,
        urgency_score,
        actionable_insights: [],
        provider: 'basic'
    };
};

/**
 * Main feedback analysis function
 * Tries Gemma first, falls back to basic analysis
 * 
 * @param {string} comment - Customer feedback
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis result
 */
export const analyzeFeedback = async (comment, options = {}) => {
    const {
        useGemma = process.env.USE_GEMMA === 'true',
        fallbackToBasic = true
    } = options;

    try {
        if (!comment || comment.trim().length === 0) {
            return {
                sentiment: 'neutral',
                confidence: 0,
                key_issues: [],
                key_praises: [],
                themes: [],
                summary: 'No comment provided',
                urgency_score: 1,
                actionable_insights: [],
                provider: 'none'
            };
        }

        // Try Gemma if enabled
        if (useGemma) {
            const gemmaResult = await analyzeWithGemma(comment);
            if (gemmaResult) {
                return gemmaResult;
            }

            if (!fallbackToBasic) {
                throw new Error('Gemma API unavailable and fallback disabled');
            }

            console.log('📍 Falling back to basic keyword analysis...');
        }

        // Use basic analysis
        return analyzeBasicSentiment(comment);
    } catch (error) {
        console.error('❌ Error in analyzeFeedback:', error.message);

        // Return safe fallback
        return {
            sentiment: 'neutral',
            confidence: 0,
            key_issues: [],
            key_praises: [],
            themes: [],
            summary: comment.substring(0, 100),
            urgency_score: 5,
            actionable_insights: [],
            provider: 'error',
            error: error.message
        };
    }
};

/**
 * Batch analyze multiple feedback items
 * Useful for processing accumulated feedback
 * 
 * @param {Array} feedbackItems - Array of feedback objects
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Batch analysis results
 */
export const analyzeBatchFeedback = async (feedbackItems, options = {}) => {
    try {
        console.log(`📦 Batch analyzing ${feedbackItems.length} feedback items`);
        console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);

        const results = [];
        let successCount = 0;
        let errorCount = 0;
        const startTime = Date.now();

        for (const item of feedbackItems) {
            try {
                const analysis = await analyzeFeedback(item.comment || '', options);
                results.push({
                    id: item.id,
                    analysis
                });
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`❌ Error analyzing item ${item.id}:`, error.message);
                results.push({
                    id: item.id,
                    error: error.message
                });
            }

            // Rate limiting for API calls (1 second delay every 5 items)
            if (options.useGemma && successCount % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('');
        console.log('═══════════════════════════════════');
        console.log(`✅ Batch Analysis Complete`);
        console.log(`   Total:     ${feedbackItems.length}`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed:  ${errorCount}`);
        console.log(`   ⏱️  Time:    ${duration}s`);
        console.log('═══════════════════════════════════');
        console.log('');

        return {
            total: feedbackItems.length,
            successful: successCount,
            failed: errorCount,
            duration: parseFloat(duration),
            results
        };
    } catch (error) {
        console.error('❌ Error in batch analysis:', error);
        throw error;
    }
};

/**
 * Get analysis statistics from feedback items
 * Useful for dashboard analytics
 * 
 * @param {Array} feedbackItems - Array of feedback objects with analysis
 * @returns {Object} Statistics and insights
 */
export const getAnalysisStatistics = (feedbackItems) => {
    if (!feedbackItems || feedbackItems.length === 0) {
        return {
            total: 0,
            sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
            topIssues: [],
            topPraises: [],
            averageUrgency: 0,
            criticalCount: 0,
            recommendedActions: []
        };
    }

    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    const issueMap = {};
    const praiseMap = {};
    let totalUrgency = 0;
    let criticalCount = 0;

    feedbackItems.forEach(item => {
        // Count sentiments
        if (item.sentiment) {
            sentiments[item.sentiment]++;
        }

        // Track urgency
        if (item.urgency_score) {
            totalUrgency += item.urgency_score;
            if (item.urgency_score >= 8) {
                criticalCount++;
            }
        }

        // Count issues and praises
        if (item.key_issues && Array.isArray(item.key_issues)) {
            item.key_issues.forEach(issue => {
                issueMap[issue] = (issueMap[issue] || 0) + 1;
            });
        }

        if (item.key_praises && Array.isArray(item.key_praises)) {
            item.key_praises.forEach(praise => {
                praiseMap[praise] = (praiseMap[praise] || 0) + 1;
            });
        }
    });

    // Get top issues and praises
    const topIssues = Object.entries(issueMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([issue, count]) => ({
            issue,
            count,
            percentage: ((count / feedbackItems.length) * 100).toFixed(1)
        }));

    const topPraises = Object.entries(praiseMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([praise, count]) => ({
            praise,
            count,
            percentage: ((count / feedbackItems.length) * 100).toFixed(1)
        }));

    // Generate recommendations
    const recommendedActions = [];
    if (criticalCount > 0) {
        recommendedActions.push(`⚠️ ${criticalCount} critical issues requiring immediate attention`);
    }
    if (topIssues.length > 0) {
        recommendedActions.push(`📍 Address top issue: ${topIssues[0].issue} (${topIssues[0].percentage}% of feedback)`);
    }
    if (sentiments.negative > feedbackItems.length * 0.3) {
        recommendedActions.push('📊 More than 30% negative feedback - review operations');
    }
    if (topPraises.length > 0) {
        recommendedActions.push(`✨ Continue excellence in: ${topPraises[0].praise}`);
    }

    return {
        total: feedbackItems.length,
        sentimentBreakdown: sentiments,
        sentimentPercentages: {
            positive: ((sentiments.positive / feedbackItems.length) * 100).toFixed(1),
            neutral: ((sentiments.neutral / feedbackItems.length) * 100).toFixed(1),
            negative: ((sentiments.negative / feedbackItems.length) * 100).toFixed(1)
        },
        topIssues,
        topPraises,
        averageUrgency: Math.round(totalUrgency / feedbackItems.length),
        criticalCount,
        recommendedActions
    };
};

/**
 * Validate Gemma API configuration
 * Tests if API credentials are valid
 * 
 * @returns {Promise<Object>} Validation result
 */
export const validateGemmaConfig = async () => {
    try {
        console.log('🔐 Validating Gemma API configuration...');

        const apiKey = process.env.GEMMA_API_KEY;
        const endpoint = process.env.GEMMA_ENDPOINT || 'https://api.together.xyz/v1/completions';
        const model = process.env.GEMMA_MODEL || 'google/gemma-2b-it';

        if (!apiKey) {
            console.error('❌ GEMMA_API_KEY not configured');
            return {
                valid: false,
                error: 'API key not set',
                configured: false
            };
        }

        // Test API call
        const testResponse = await axios.post(
            endpoint,
            {
                model: model,
                prompt: 'Return this exact JSON: {"test": true}',
                max_tokens: 20,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (testResponse.data) {
            console.log(`✅ Gemma API validated successfully`);
            console.log(`   Endpoint: ${endpoint}`);
            console.log(`   Model: ${model}`);
            return {
                valid: true,
                configured: true,
                endpoint,
                model
            };
        }
    } catch (error) {
        console.error('❌ Gemma API validation failed:', error.message);
        return {
            valid: false,
            error: error.message,
            configured: !!process.env.GEMMA_API_KEY
        };
    }
};

/**
 * Get AI service status
 * Shows which AI providers are available and active
 * 
 * @returns {Promise<Object>} Service status
 */
export const getAIServiceStatus = async () => {
    const status = {
        timestamp: new Date().toISOString(),
        services: {
            basic: {
                available: true,
                speed: 'instant',
                description: 'Local keyword-based analysis'
            },
            gemma: {
                available: !!process.env.GEMMA_API_KEY,
                configured: !!process.env.GEMMA_API_KEY,
                speed: 'fast',
                description: 'Google Gemma AI via Together.ai',
                model: process.env.GEMMA_MODEL || 'google/gemma-2b-it'
            }
        },
        activeProvider: process.env.USE_GEMMA === 'true' ? 'gemma' : 'basic',
        fallbackEnabled: true
    };

    // Validate Gemma if configured
    if (status.services.gemma.configured) {
        const validation = await validateGemmaConfig();
        status.services.gemma.valid = validation.valid;
    }

    return status;
};
