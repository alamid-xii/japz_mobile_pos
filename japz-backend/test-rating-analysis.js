import { Feedback } from "./models/feedbackModel.js";

(async () => {
    try {
        console.log('\n📊 AI ANALYSIS WITH RATING-BASED FEEDBACK\n');

        const ratings = [1, 2, 3, 4, 5];
        for (const r of ratings) {
            const fb = await Feedback.findOne({ where: { rating: r }, raw: true });
            if (fb) {
                const stars = '⭐'.repeat(r);
                console.log(`${stars} Rating ${r}★ (ID #${fb.id}):`);
                console.log(`  Sentiment: ${fb.sentiment}`);
                console.log(`  ratingFeedback: "${fb.aiAnalysis.ratingFeedback}"`);
                const praises = fb.aiAnalysis.keyPraises && fb.aiAnalysis.keyPraises.length > 0
                    ? fb.aiAnalysis.keyPraises.join(', ')
                    : '-';
                const issues = fb.aiAnalysis.keyIssues && fb.aiAnalysis.keyIssues.length > 0
                    ? fb.aiAnalysis.keyIssues.join(', ')
                    : '-';
                console.log(`  keyPraises: ${praises}`);
                console.log(`  keyIssues: ${issues}`);
                console.log();
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();
