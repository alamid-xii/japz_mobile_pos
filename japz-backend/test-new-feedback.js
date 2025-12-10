import axios from 'axios';
import { Feedback } from "./models/feedbackModel.js";
import { sequelize } from "./models/db.js";

(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connected\n");

        // First, get the count before
        let countBefore = await Feedback.count();
        console.log(`📊 Feedback count before: ${countBefore}`);

        // Create test feedback with keywords that should trigger sentiment analysis
        const testFeedbacks = [
            { orderNumber: "TEST-001", rating: 5, comment: "Excellent service and delicious food!" },
            { orderNumber: "TEST-002", rating: 4, comment: "Great experience, loved it" },
            { orderNumber: "TEST-003", rating: 2, comment: "Terrible wait time, food was cold" }
        ];

        console.log(`\n📝 Submitting ${testFeedbacks.length} test feedbacks...\n`);

        for (const testFb of testFeedbacks) {
            const feedback = await Feedback.create({
                orderNumber: testFb.orderNumber,
                rating: testFb.rating,
                comment: testFb.comment,
                source: 'qr_code',
                status: 'pending',
                sentiment: 'neutral',
                themes: [],
                aiAnalysis: null
            });

            // Now manually run the analysis (like submitFeedback does)
            const { analyzeWithKeywords } = await import('./services/gemmaService.js');
            const analysis = analyzeWithKeywords(testFb.comment);

            await feedback.update({
                sentiment: analysis.sentiment,
                themes: analysis.themes,
                aiAnalysis: analysis
            });

            console.log(`✅ Created: "${testFb.comment.substring(0, 40)}..."`);
            console.log(`   → Sentiment: ${analysis.sentiment}`);
            console.log(`   → Themes: ${analysis.themes.join(', ')}`);
            console.log(`   → AI Analysis: ${analysis.source}`);
            console.log();
        }

        // Verify count after
        let countAfter = await Feedback.count();
        console.log(`\n📊 Feedback count after: ${countAfter}`);
        console.log(`✅ Added ${countAfter - countBefore} new feedbacks`);

        // Show the latest feedbacks
        console.log('\n📋 Latest feedbacks with AI analysis:');
        const latestFeedbacks = await Feedback.findAll({
            order: [['id', 'DESC']],
            limit: 3,
            raw: true
        });

        latestFeedbacks.forEach(fb => {
            console.log(`\n  ID #${fb.id}: "${(fb.comment || 'no comment').substring(0, 40)}"`);
            console.log(`    Sentiment: ${fb.sentiment}`);
            console.log(`    Themes: ${fb.themes ? fb.themes.join(', ') : 'none'}`);
            console.log(`    AI Analysis: ${fb.aiAnalysis ? JSON.stringify(fb.aiAnalysis).substring(0, 60) + '...' : 'null'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();
