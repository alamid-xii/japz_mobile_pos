// Test keyword matching
const comment = "Nice";
const lowerComment = comment.toLowerCase();

const positiveKeywords = [
    'good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'best', 'awesome',
    'fantastic', 'delicious', 'tasty', 'wonderful', 'outstanding', 'superb', 'brilliant',
    'impressed', 'satisfied', 'happy', 'pleased', 'recommend', 'fresh', 'clean',
    'quick', 'fast', 'efficient', 'friendly', 'polite', 'helpful', 'attentive',
    'nice', 'lovely', 'enjoyed', 'like', 'quality', 'prompt', 'excellent', 'superior',
    'outstanding', 'terrific', 'wonderful', 'marvelous', 'superb'
];

const matchWord = (text, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return text.match(regex);
};

let sentimentScore = 0;
const foundPositive = [];

console.log(`Testing: "${comment}" (lowercased: "${lowerComment}")\n`);

positiveKeywords.forEach(word => {
    const matches = matchWord(lowerComment, word);
    if (matches) {
        console.log(`✅ Found "${word}": ${matches} matches`);
        sentimentScore += matches.length;
        foundPositive.push(word);
    }
});

console.log(`\nSentiment Score: ${sentimentScore}`);
console.log(`Found Positive: ${foundPositive}`);
console.log(`Final Sentiment: ${sentimentScore >= 1 ? 'positive' : sentimentScore <= -1 ? 'negative' : 'neutral'}`);
