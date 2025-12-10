import { Feedback } from "./models/feedbackModel.js";
import { sequelize } from "./models/db.js";
import { analyzeWithKeywords } from "./services/gemmaService.js";

// Helper functions
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

const getRatingPraises = (rating) => {
  if (rating >= 4) {
    return rating === 5 
      ? ['excellent', 'outstanding', 'outstanding service']
      : ['good', 'satisfied', 'positive experience'];
  }
  return [];
};

const getRatingIssues = (rating) => {
  if (rating <= 2) {
    return rating === 1
      ? ['poor quality', 'major issues', 'unsatisfactory']
      : ['problems', 'disappointing', 'below standard'];
  }
  return [];
};

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

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");
    
    const feedbacks = await Feedback.findAll({
      where: {},
      raw: false
    });
    
    console.log(`📊 Reprocessing ${feedbacks.length} feedback items with new rating logic (1-2★=negative, 3-5★=positive)\n`);
    
    let processedCount = 0;
    
    for (const feedback of feedbacks) {
      try {
        // Determine sentiment from rating: 1-2★ = negative, 3-5★ = positive
        let sentiment = 'neutral';
        if (feedback.rating <= 2) {
          sentiment = 'negative';
        } else if (feedback.rating >= 3) {
          sentiment = 'positive';
        }
        
        // Get analysis from comment if exists
        let aiAnalysis = null;
        let themes = [];
        if (feedback.comment && feedback.comment.trim().length > 0) {
          const analysis = analyzeWithKeywords(feedback.comment);
          aiAnalysis = analysis;
          themes = getRatingThemes(feedback.rating);
          aiAnalysis.sentiment = sentiment; // Ensure sentiment matches rating
          // Add rating-based feedback and override keyPraises/keyIssues
          aiAnalysis.ratingFeedback = getRatingFeedback(feedback.rating);
          aiAnalysis.keyPraises = getRatingPraises(feedback.rating);
          aiAnalysis.keyIssues = getRatingIssues(feedback.rating);
        } else {
          // Create analysis based on rating alone
          aiAnalysis = {
            source: 'rating',
            sentiment: sentiment,
            themes: getRatingThemes(feedback.rating),
            summary: getRatingFeedback(feedback.rating),
            keyPraises: getRatingPraises(feedback.rating),
            keyIssues: getRatingIssues(feedback.rating),
            ratingFeedback: getRatingFeedback(feedback.rating)
          };
          themes = getRatingThemes(feedback.rating);
        }
        
        await feedback.update({
          sentiment,
          themes,
          aiAnalysis,
          processed: true,
          status: 'processed'
        });
        
        processedCount++;
        console.log(`✅ [${processedCount}] ID #${feedback.id}: ${feedback.rating}★ → ${sentiment}`);
      } catch (error) {
        console.error(`❌ Error processing #${feedback.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Reprocessed ${processedCount} feedback items`);
    
    // Show statistics
    const allFeedbacks = await Feedback.findAll({ raw: true });
    const positive = allFeedbacks.filter(f => f.sentiment === 'positive').length;
    const negative = allFeedbacks.filter(f => f.sentiment === 'negative').length;
    const neutral = allFeedbacks.filter(f => f.sentiment === 'neutral').length;
    
    console.log('\n📊 Sentiment Breakdown:');
    console.log(`   ✅ Positive: ${positive}`);
    console.log(`   ❌ Negative: ${negative}`);
    console.log(`   ⚪ Neutral:  ${neutral}`);
    console.log(`   📈 Positive %: ${allFeedbacks.length > 0 ? Math.round((positive / allFeedbacks.length) * 100) : 0}%`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
