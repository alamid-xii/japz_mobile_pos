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
import { Feedback } from "../models/feedbackModel.js";
import { analyzeWithGemmaAI, analyzeWithKeywords } from "./gemmaService.js";

// Helper function to get themes based on rating
const getRatingThemes = (rating) => {
    const themesMap = {
        1: ['Service Issues', 'Quality Problems', 'Major Complaints'],
        2: ['Poor Quality', 'Service Concerns', 'Needs Improvement'],
        3: ['Acceptable Service', 'Standard Quality', 'Basic Requirements Met'],
        4: ['Excellent Service', 'High Quality', 'Positive Experience'],
        5: ['Outstanding Service', 'Premium Quality', 'Exceptional Experience']
    };
    return themesMap[rating] || ['General Feedback'];
};

// Helper function to get rating-based feedback message
const getRatingFeedback = (rating) => {
    const feedbackMap = {
        1: 'Poor experience - significant issues encountered',
        2: 'Below expectations - multiple problems noted',
        3: 'Acceptable service - met basic requirements',
        4: 'Good experience - exceeded expectations',
        5: 'Excellent - outstanding service and quality'
    };
    return feedbackMap[rating] || 'Customer feedback received';
};

// Helper function to get praises based on rating
const getRatingPraises = (rating) => {
    if (rating >= 4) {
        return rating === 5
            ? ['excellent', 'outstanding', 'outstanding service']
            : ['good', 'satisfied', 'positive experience'];
    }
    return [];
};

// Helper function to get issues based on rating
const getRatingIssues = (rating) => {
    if (rating <= 2) {
        return rating === 1
            ? ['poor quality', 'major issues', 'unsatisfactory']
            : ['problems', 'disappointing', 'below standard'];
    }
    return [];
};

/**
 * Analyze feedback comment with Gemma AI
 * Uses Gemma AI when available, falls back to keyword analysis
 * 
 * @param {string} comment - The feedback comment to analyze
 * @returns {Promise<Object>} Analysis result with themes, sentiment, summary, and keyPoints
 */
export const analyzeFeedbackWithGemma = async (comment) => {
    try {
        // If no comment, return basic structure
        if (!comment || comment.trim().length === 0) {
            return {
                themes: [],
                sentiment: 'neutral',
                summary: 'No comment provided',
                keyPoints: []
            };
        }

        // Try Gemma AI first
        let analysis = await analyzeWithGemmaAI(comment);

        // Fallback to keyword analysis if Gemma fails
        if (!analysis) {
            console.log('📊 Using keyword-based analysis...');
            analysis = analyzeWithKeywords(comment);
        }

        return {
            themes: analysis.themes || ['General Feedback'],
            sentiment: analysis.sentiment || 'neutral',
            summary: analysis.summary || comment.substring(0, 200),
            keyPoints: (analysis.keyPraises && analysis.keyPraises.length > 0) ? analysis.keyPraises : [comment.substring(0, 150)],
            keyIssues: analysis.keyIssues || [],
            recommendation: analysis.recommendation || '',
            source: analysis.source || 'unknown'
        };
    } catch (error) {
        console.error('Error analyzing feedback:', error);
        // Ultimate fallback
        return analyzeWithKeywords(comment);
    }
};

/**
 * Process unprocessed feedback
 * Runs periodically to analyze pending feedback
 * Processes feedback from both direct submissions and Google Forms
 */
export const processPendingFeedback = async () => {
    try {
        console.log('🔄 Processing pending feedback...');
        console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);

        // Find all pending feedback with comments (including those without aiAnalysis)
        const pendingFeedback = await Feedback.findAll({
            where: {
                status: 'pending'
            },
            limit: 50 // Process in batches
        });

        if (pendingFeedback.length === 0) {
            console.log('✅ No pending feedback to process');
            return {
                processed: 0,
                failed: 0
            };
        }

        console.log(`Found ${pendingFeedback.length} pending feedback items to process`);

        let processedCount = 0;
        let failedCount = 0;

        // Process each feedback
        for (const feedback of pendingFeedback) {
            try {
                const analysis = await analyzeFeedbackWithGemma(feedback.comment);

                // Determine sentiment from rating (1-2 stars = negative, 3-5 = positive)
                let sentiment = analysis.sentiment;
                if (feedback.rating <= 2) {
                    sentiment = 'negative';
                } else if (feedback.rating >= 3) {
                    sentiment = 'positive';
                }

                // Enhance analysis with rating-based feedback and override keyPraises/keyIssues
                analysis.sentiment = sentiment;
                analysis.ratingFeedback = getRatingFeedback(feedback.rating);
                analysis.keyPraises = getRatingPraises(feedback.rating);
                analysis.keyIssues = getRatingIssues(feedback.rating);

                // Update feedback with analysis
                await feedback.update({
                    aiAnalysis: analysis,
                    themes: getRatingThemes(feedback.rating),
                    sentiment: sentiment,
                    processed: true,
                    status: 'processed'
                });

                processedCount++;
                console.log(`✅ Processed #${feedback.id} (${feedback.orderNumber || 'Anonymous'}) - Rating: ${feedback.rating}★ → ${sentiment} [${analysis.themes.join(', ')}]`);
            } catch (error) {
                failedCount++;
                console.error(`❌ Error processing feedback #${feedback.id}:`, error.message);
            }
        }

        console.log('');
        console.log('═══════════════════════════════════');
        console.log(`✅ Feedback Processing Complete`);
        console.log(`   ✅ Processed: ${processedCount}`);
        console.log(`   ❌ Failed:    ${failedCount}`);
        console.log('═══════════════════════════════════');
        console.log('');

        return {
            processed: processedCount,
            failed: failedCount
        };
    } catch (error) {
        console.error('❌ Error in processPendingFeedback:', error);
        return { processed: 0, failed: 1 };
    }
};

/**
 * Initialize scheduled feedback processing
 * Sets up AI processing at regular intervals
 * 
 * @param {number} aiProcessInterval - AI processing interval in ms (default: 15 min)
 */
export const initializeFeedbackScheduler = (aiProcessInterval = 15 * 60 * 1000) => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  FEEDBACK SYSTEM INITIALIZATION');
    console.log('═══════════════════════════════════════════');
    console.log(`⏰ AI Processing interval: ${aiProcessInterval / 60000} minutes`);
    console.log('═══════════════════════════════════════════');
    console.log('');

    // Run AI processing immediately
    processPendingFeedback();

    // Then run AI processing at intervals
    setInterval(async () => {
        await processPendingFeedback();
    }, aiProcessInterval);
};
