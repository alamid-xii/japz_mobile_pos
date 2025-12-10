import { Feedback } from "./models/feedbackModel.js";
import { sequelize } from "./models/db.js";

(async () => {
    try {
        await sequelize.authenticate();

        const feedbacks = await Feedback.findAll({ raw: true });

        const totalFeedback = feedbacks.length;
        const positiveCount = feedbacks.filter(f => f.sentiment && f.sentiment === 'positive').length;
        const positivePercentage = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;

        console.log('\n═══════════════════════════════════');
        console.log('📊 FEEDBACK STATISTICS');
        console.log('═══════════════════════════════════');
        console.log(`Total Feedback:      ${totalFeedback}`);
        console.log(`Positive Sentiment:  ${positiveCount}`);
        console.log(`Positive Percentage: ${positivePercentage}%`);
        console.log('═══════════════════════════════════\n');

        console.log('Breakdown:');
        feedbacks.forEach(f => {
            console.log(`  ID #${f.id}: "${(f.comment || 'no comment').substring(0, 20)}" -> ${f.sentiment}`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();
