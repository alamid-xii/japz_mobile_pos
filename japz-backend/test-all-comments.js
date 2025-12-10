import { analyzeWithKeywords } from "./services/gemmaService.js";

const testComments = [
    "Very good",
    "Nice",
    "Wow",
    "Hehehe",
    "Not bad",
    "Ganda"
];

testComments.forEach(comment => {
    const analysis = analyzeWithKeywords(comment);
    console.log(`"${comment}" -> ${analysis.sentiment}`);
});
