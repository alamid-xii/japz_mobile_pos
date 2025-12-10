import { Feedback } from "./models/feedbackModel.js";
import { sequelize } from "./models/db.js";
import { analyzeFeedbackWithGemma } from "./services/feedbackService.js";

(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connected\n");

        // Get all feedback with comments
        const feedbacks = await Feedback.findAll({
            where: {},
            raw: false
        });

        console.log(`📊 Found ${feedbacks.length} feedback items to reprocess\n`);

        let processedCount = 0;

        for (const feedback of feedbacks) {
            if (!feedback.comment || feedback.comment.trim().length === 0) {
                continue;
            }

            try {
                const analysis = await analyzeFeedbackWithGemma(feedback.comment);

                // Update feedback with corrected analysis
                await feedback.update({
                    aiAnalysis: analysis,
                    themes: analysis.themes,
                    sentiment: analysis.sentiment,
                    processed: true,
                    status: 'processed'
                });

                processedCount++;
                console.log(`✅ [${processedCount}] ID #${feedback.id}: "${feedback.comment.substring(0, 30)}" -> ${analysis.sentiment}`);
            } catch (error) {
                console.error(`❌ Error processing #${feedback.id}:`, error.message);
            }
        }

        console.log(`\n✅ Reprocessed ${processedCount} feedback items`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();
