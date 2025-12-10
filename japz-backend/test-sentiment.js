import { Feedback } from "./models/feedbackModel.js";
import { sequelize } from "./models/db.js";

(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connected");

        const feedbacks = await Feedback.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        console.log(`\n📊 Found ${feedbacks.length} feedback items:\n`);
        feedbacks.forEach((f, i) => {
            console.log(`[${i + 1}] ID: ${f.id}, Rating: ${f.rating}, Sentiment: ${f.sentiment || 'NULL'}, Comment: ${(f.comment || '').substring(0, 40)}`);
        });

        // Count positive sentiment
        const positiveCount = feedbacks.filter(f => f.sentiment === 'positive').length;
        console.log(`\n✅ Positive sentiment count: ${positiveCount}/${feedbacks.length}`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();
