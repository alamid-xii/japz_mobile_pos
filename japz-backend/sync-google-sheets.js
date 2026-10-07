import { Feedback } from "./models/feedbackModel.js";
import { sequelize } from "./models/db.js";
import { analyzeWithKeywords } from "./services/gemmaService.js";
import 'dotenv/config';

// Google Sheets API URL (public read)
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const RANGE = 'Form Responses 1!A:G'; // Adjust range based on your sheet columns

async function fetchGoogleSheetData() {
    if (!SPREADSHEET_ID || !API_KEY) {
        throw new Error('Set GOOGLE_SPREADSHEET_ID and GOOGLE_SHEETS_API_KEY in the private backend environment.');
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

    console.log('📊 Fetching data from Google Sheets...');

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error('❌ Failed to fetch Google Sheets:', error.message);
        throw error;
    }
}

async function syncFeedback() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Fetch data from Google Sheets
        const rows = await fetchGoogleSheetData();

        if (rows.length <= 1) {
            console.log('⚠️ No data found in Google Sheet (or only header row)');
            return;
        }

        // First row is headers
        const headers = rows[0];
        console.log('📋 Headers:', headers);
        console.log(`📝 Found ${rows.length - 1} feedback entries\n`);

        // Find column indexes (adjust based on your sheet structure)
        const timestampIdx = headers.findIndex(h => h.toLowerCase().includes('timestamp'));
        const ratingIdx = headers.findIndex(h => h.toLowerCase().includes('rating') || h.toLowerCase().includes('rate'));
        const commentIdx = headers.findIndex(h => h.toLowerCase().includes('comment') || h.toLowerCase().includes('feedback'));
        const orderIdx = headers.findIndex(h => h.toLowerCase().includes('order'));

        console.log('📍 Column indexes:', { timestampIdx, ratingIdx, commentIdx, orderIdx });

        let importedCount = 0;
        let skippedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];

            try {
                const timestamp = row[timestampIdx] || new Date().toISOString();
                const rating = parseInt(row[ratingIdx]) || 5;
                const comment = row[commentIdx] || '';
                const orderNumber = row[orderIdx] || `SHEET-${i}`;

                // Check if already imported (by orderNumber/comment combo)
                const existing = await Feedback.findOne({
                    where: {
                        orderNumber: orderNumber,
                        comment: comment
                    }
                });

                if (existing) {
                    skippedCount++;
                    continue;
                }

                // Analyze sentiment
                const analysis = analyzeWithKeywords(comment || `Rating: ${rating} stars`);

                // Determine sentiment from rating: 1-2 = negative, 3-5 = positive
                let sentiment = 'neutral';
                if (rating <= 2) sentiment = 'negative';
                else if (rating >= 3) sentiment = 'positive';

                // Create feedback entry
                await Feedback.create({
                    orderNumber: orderNumber,
                    rating: rating,
                    comment: comment,
                    sentiment: sentiment,
                    themes: analysis.themes || [],
                    aiAnalysis: {
                        ...analysis,
                        sentiment: sentiment,
                        source: 'google_sheets_sync'
                    },
                    source: 'google_form',
                    status: 'processed',
                    processed: true
                });

                importedCount++;
                console.log(`✅ [${importedCount}] Imported: "${comment.substring(0, 40)}..." - ${rating}★ → ${sentiment}`);

            } catch (rowError) {
                console.error(`❌ Error on row ${i}:`, rowError.message);
            }
        }

        console.log(`\n═══════════════════════════════════`);
        console.log(`📊 SYNC COMPLETE`);
        console.log(`═══════════════════════════════════`);
        console.log(`✅ Imported: ${importedCount}`);
        console.log(`⏭️  Skipped (duplicates): ${skippedCount}`);
        console.log(`═══════════════════════════════════\n`);

    } catch (error) {
        console.error('❌ Sync failed:', error.message);
    } finally {
        process.exit(0);
    }
}

syncFeedback();
