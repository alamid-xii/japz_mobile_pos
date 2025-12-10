import { Feedback } from "./models/feedbackModel.js";

(async () => {
    try {
        const feedbacks = await Feedback.findAll({
            order: [['rating', 'DESC'], ['id', 'DESC']],
            raw: true
        });

        console.log('\n📋 All Feedback (sorted by rating):\n');
        console.log('ID | Rating | Sentiment | Comment');
        console.log('---|--------|-----------|--------');
        feedbacks.forEach(f => {
            const comment = (f.comment || 'no comment').substring(0, 25).padEnd(25);
            console.log(`#${String(f.id).padEnd(2)} | ${String(f.rating).padEnd(6)} | ${String(f.sentiment).padEnd(9)} | ${comment}`);
        });

        const pos = feedbacks.filter(f => f.sentiment === 'positive').length;
        const pct = Math.round((pos / feedbacks.length) * 100);
        console.log(`\n✅ Total: ${feedbacks.length} | Positive: ${pos} | Percentage: ${pct}%\n`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();
