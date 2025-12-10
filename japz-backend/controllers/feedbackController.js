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
import { Order } from "../models/orderModel.js";
import { sequelize } from "../models/db.js";
import { analyzeWithKeywords } from "../services/gemmaService.js";

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

// Submit feedback from Google Form or direct entry
export const submitFeedback = async (req, res) => {
    try {
        const { orderNumber, rating, tags, comment, googleFormResponseId } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Try to find order by order number
        let orderId = null;
        if (orderNumber) {
            const order = await Order.findOne({ where: { orderNumber } });
            if (order) {
                orderId = order.id;
            }
        }

        // Analyze sentiment based on rating and comment
        let sentiment = 'neutral';
        let themes = [];
        let aiAnalysis = null;

        // Determine sentiment from rating: 1-2 stars = negative, 3-5 stars = positive
        if (rating <= 2) {
            sentiment = 'negative';
        } else if (rating >= 3) {
            sentiment = 'positive';
        }

        // If there's a comment, analyze it for themes and details
        if (comment && comment.trim().length > 0) {
            const analysis = analyzeWithKeywords(comment);
            themes = getRatingThemes(rating); // Use rating-based themes
            aiAnalysis = analysis; // Store complete analysis
            // Ensure sentiment matches rating
            aiAnalysis.sentiment = sentiment;
            // Add rating-based feedback
            aiAnalysis.ratingFeedback = getRatingFeedback(rating);
            // Override keyPraises and keyIssues with rating-based values
            aiAnalysis.keyPraises = getRatingPraises(rating);
            aiAnalysis.keyIssues = getRatingIssues(rating);
        } else {
            // Even without comment, create AI analysis based on rating
            aiAnalysis = {
                source: 'rating',
                sentiment: sentiment,
                themes: getRatingThemes(rating),
                summary: getRatingFeedback(rating),
                keyPraises: getRatingPraises(rating),
                keyIssues: getRatingIssues(rating),
                ratingFeedback: getRatingFeedback(rating)
            };
            themes = getRatingThemes(rating);
        }

        const feedback = await Feedback.create({
            orderId,
            orderNumber,
            rating: parseInt(rating),
            tags: tags || [],
            comment: comment || null,
            source: googleFormResponseId ? 'google_form' : 'qr_code',
            googleFormResponseId,
            status: 'pending',
            sentiment,
            themes,
            aiAnalysis
        });

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedback
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get feedback analytics
export const getFeedbackAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, limit = 100 } = req.query;

        let whereClause = {};
        if (startDate || endDate) {
            const { Op } = sequelize.Sequelize;
            whereClause.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                whereClause.createdAt[Op.gte] = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                whereClause.createdAt[Op.lte] = end;
            }
        }

        // Get all feedback WITHOUT associations (faster)
        const allFeedback = await Feedback.findAll({
            where: whereClause,
            attributes: ['id', 'rating', 'sentiment', 'themes', 'comment', 'orderNumber', 'createdAt', 'processed'],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            raw: true // Raw query is faster
        });

        if (allFeedback.length === 0) {
            return res.json({
                summary: {
                    totalFeedback: 0,
                    overallScore: 0,
                    ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
                    sentimentCount: { positive: 0, neutral: 0, negative: 0 }
                },
                topThemes: [],
                recentFeedback: []
            });
        }

        // Calculate overall score
        const totalRating = allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0);
        const overallScore = allFeedback.length > 0 ? (totalRating / allFeedback.length).toFixed(2) : 0;

        // Count ratings
        const ratingDistribution = {
            '1': allFeedback.filter(f => f.rating === 1).length,
            '2': allFeedback.filter(f => f.rating === 2).length,
            '3': allFeedback.filter(f => f.rating === 3).length,
            '4': allFeedback.filter(f => f.rating === 4).length,
            '5': allFeedback.filter(f => f.rating === 5).length,
        };

        // Count sentiments
        const sentimentCount = {
            positive: allFeedback.filter(f => f.sentiment === 'positive').length,
            neutral: allFeedback.filter(f => f.sentiment === 'neutral').length,
            negative: allFeedback.filter(f => f.sentiment === 'negative').length,
        };

        // Aggregate themes
        const themeMap = {};
        allFeedback.forEach(feedback => {
            let themes = feedback.themes;
            if (typeof themes === 'string') {
                try { themes = JSON.parse(themes); } catch (e) { themes = []; }
            }
            if (themes && Array.isArray(themes)) {
                themes.forEach(theme => {
                    themeMap[theme] = (themeMap[theme] || 0) + 1;
                });
            }
        });

        // Sort themes by frequency
        const topThemes = Object.entries(themeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([theme, count]) => ({
                theme,
                count,
                percentage: ((count / allFeedback.length) * 100).toFixed(1)
            }));

        res.json({
            summary: {
                totalFeedback: allFeedback.length,
                overallScore: parseFloat(overallScore),
                ratingDistribution,
                sentimentCount
            },
            topThemes,
            recentFeedback: allFeedback.slice(0, 10)
        });
    } catch (error) {
        console.error('Error in getFeedbackAnalytics:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all feedback with filtering
export const getAllFeedback = async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        // Build where clause - only filter by status if explicitly provided
        const whereClause = {};
        if (status && status !== 'all') {
            whereClause.status = status;
        }

        const feedback = await Feedback.findAll({
            where: whereClause,
            attributes: ['id', 'orderNumber', 'rating', 'comment', 'tags', 'sentiment', 'themes', 'status', 'createdAt', 'processed', 'aiAnalysis', 'source'],
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'orderNumber', 'customerName', 'total', 'createdAt']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const total = await Feedback.count({
            where: whereClause
        });

        res.json({
            feedback,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get feedback by ID
export const getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findByPk(req.params.id, {
            include: [
                {
                    model: Order,
                    as: 'order',
                    attributes: ['id', 'orderNumber', 'customerName', 'total', 'createdAt']
                }
            ]
        });

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update feedback (for marking as processed or archived)
export const updateFeedback = async (req, res) => {
    try {
        const { status, processed, aiAnalysis, themes, sentiment } = req.body;
        const feedback = await Feedback.findByPk(req.params.id);

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        if (status) feedback.status = status;
        if (processed !== undefined) feedback.processed = processed;
        if (aiAnalysis) feedback.aiAnalysis = aiAnalysis;
        if (themes) feedback.themes = themes;
        if (sentiment) feedback.sentiment = sentiment;

        await feedback.save();

        res.json({
            message: 'Feedback updated successfully',
            feedback
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete feedback
export const deleteFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findByPk(req.params.id);

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        await feedback.destroy();

        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
