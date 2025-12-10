import axios from 'axios';
import { Feedback } from '../models/feedbackModel.js';
import { Op } from 'sequelize';

/**
 * Get API credentials from environment variables
 * This is done dynamically to ensure .env is loaded
 */
const getCredentials = () => {
    return {
        apiKey: process.env.GOOGLE_SHEETS_API_KEY,
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
    };
};

/**
 * Get last sync timestamp from database
 * Used to fetch only new responses since last sync
 */
export const getLastSyncTime = async () => {
    try {
        const lastFeedback = await Feedback.findOne({
            where: { source: 'google_form' },
            order: [['createdAt', 'DESC']],
            attributes: ['createdAt']
        });

        if (!lastFeedback) {
            // If no feedback exists, return 24 hours ago
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }

        return lastFeedback.createdAt;
    } catch (error) {
        console.error('Error getting last sync time:', error);
        return new Date(0); // Return epoch if error
    }
};

/**
 * Fetch feedback responses from Google Sheets
 * Connects via Google Sheets API v4
 */
export const fetchGoogleFormResponses = async () => {
    try {
        console.log('📊 Fetching Google Forms responses from Sheets API...');

        const { apiKey: API_KEY, spreadsheetId: SPREADSHEET_ID } = getCredentials();

        if (!API_KEY || !SPREADSHEET_ID) {
            console.warn('⚠️ Google Sheets credentials not configured');
            console.warn('   Set GOOGLE_SHEETS_API_KEY and GOOGLE_SPREADSHEET_ID in .env');
            return [];
        }

        console.log('✅ Google Sheets API Key loaded:', API_KEY.substring(0, 10) + '...');
        console.log('✅ Google Spreadsheet ID:', SPREADSHEET_ID);

        // Get last sync time to fetch only new responses
        const lastSyncTime = await getLastSyncTime();
        console.log(`🔍 Fetching responses since: ${lastSyncTime.toISOString()}`);

        // Try multiple sheet names (Sheet1, Form Responses 1, etc.)
        const possibleSheetNames = ['Sheet1', 'Form Responses 1', 'Feedback', 'Responses'];
        let response = null;
        let lastError = null;

        for (const sheetName of possibleSheetNames) {
            try {
                console.log(`🔎 Trying to fetch from sheet: "${sheetName}"...`);
                response = await axios.get(
                    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}`,
                    {
                        params: {
                            key: API_KEY,
                            majorDimension: 'ROWS'
                        },
                        timeout: 10000
                    }
                );
                console.log(`✅ Successfully connected to sheet: "${sheetName}"`);
                break;
            } catch (error) {
                lastError = error;
                console.log(`⚠️ Sheet "${sheetName}" not accessible (${error.response?.status})`);
                continue;
            }
        }

        if (!response) {
            console.error('❌ Could not access any sheet. Last error:', lastError?.response?.status, lastError?.message);
            console.error('📋 Make sure your Google Sheet is:');
            console.error('   1. Shared as "Anyone with the link" or "Public"');
            console.error('   2. Has a sheet named Sheet1, Form Responses 1, Feedback, or Responses');
            console.error('   3. API key has Google Sheets API enabled');
            return [];
        }

        const rows = response.data.values || [];

        if (rows.length < 2) {
            console.log('ℹ️ No responses in Google Form yet (need at least header + 1 data row)');
            console.log(`📊 Total rows found: ${rows.length}`);
            if (rows.length > 0) {
                console.log('📝 Headers:', rows[0]);
            }
            return [];
        }

        console.log(`📈 Total rows in sheet: ${rows.length}`);

        // Parse header row (row 0)
        const headers = rows[0];
        console.log('📝 Headers found:', headers.join(', '));

        // Find column indices (case-insensitive matching)
        const timestampIndex = headers.findIndex(h =>
            h && h.toLowerCase().includes('timestamp')
        );
        const orderNumberIndex = headers.findIndex(h =>
            h && (h.toLowerCase().includes('order') || h.toLowerCase().includes('order number') || h.toLowerCase().includes('order id'))
        );
        const ratingIndex = headers.findIndex(h =>
            h && (h.toLowerCase().includes('rate') || h.toLowerCase().includes('experience') || h.toLowerCase().includes('rating'))
        );
        const tagsIndex = headers.findIndex(h =>
            h && (h.toLowerCase().includes('aspects') || h.toLowerCase().includes('impressed') || h.toLowerCase().includes('concerned') || h.toLowerCase().includes('tags'))
        );
        const commentsIndex = headers.findIndex(h =>
            h && (h.toLowerCase().includes('comments') || h.toLowerCase().includes('suggestions') || h.toLowerCase().includes('additional') || h.toLowerCase().includes('feedback'))
        );

        console.log(`📍 Column indices:`);
        console.log(`   Timestamp: ${timestampIndex} ${timestampIndex >= 0 ? '✅' : '❌'}`);
        console.log(`   Order Number: ${orderNumberIndex} ${orderNumberIndex >= 0 ? '✅' : '❌'}`);
        console.log(`   Rating: ${ratingIndex} ${ratingIndex >= 0 ? '✅' : '❌'}`);
        console.log(`   Tags: ${tagsIndex} ${tagsIndex >= 0 ? '✅' : '⚠️ (optional)'}`);
        console.log(`   Comments: ${commentsIndex} ${commentsIndex >= 0 ? '✅' : '⚠️ (optional)'}`);

        // Parse response rows (skip header)
        const responses = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            try {
                // Parse timestamp
                const timestamp = row[timestampIndex] ? new Date(row[timestampIndex]) : new Date();

                // Skip if older than last sync
                if (timestamp < lastSyncTime) {
                    continue;
                }

                const responseData = {
                    timestamp: timestamp.toISOString(),
                    orderNumber: row[orderNumberIndex] ? row[orderNumberIndex].trim() : null,
                    rating: parseInt(row[ratingIndex]) || 3,
                    tags: row[tagsIndex] ? parseTags(row[tagsIndex]) : [],
                    comment: row[commentsIndex] ? row[commentsIndex].trim() : null,
                    googleFormResponseId: generateResponseId(
                        row[timestampIndex],
                        row[orderNumberIndex]
                    )
                };

                responses.push(responseData);
            } catch (error) {
                console.error(`⚠️ Error parsing row ${i}:`, error.message);
                continue;
            }
        }

        console.log(`✅ Fetched ${responses.length} new responses from Google Forms`);
        return responses;
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            console.error('❌ Network error: Cannot reach Google Sheets API');
            console.error('   Check your internet connection');
        } else if (error.response?.status === 404) {
            console.error('❌ Spreadsheet not found. Check GOOGLE_SPREADSHEET_ID in .env');
            console.error('   Spreadsheet ID:', process.env.GOOGLE_SPREADSHEET_ID);
        } else if (error.response?.status === 403) {
            console.error('❌ Access forbidden. The Google Sheet is not publicly accessible.');
            console.error('   To fix:');
            console.error('   1. Open your Google Sheet');
            console.error('   2. Click "Share" button');
            console.error('   3. Change to "Anyone with the link" or "Public"');
            console.error('   4. Set permission to "Viewer"');
            console.error('   5. Click Share');
        } else {
            console.error('❌ Error fetching Google Forms responses:', error.message);
        }
        return [];
    }
};

/**
 * Parse tags/aspects from checkbox response string
 * Handles multiple formats: comma-separated, semicolon-separated, newline-separated
 */
const parseTags = (tagString) => {
    if (!tagString || typeof tagString !== 'string') return [];

    // Split by comma, semicolon, or newline
    const tags = tagString
        .split(/[,;\n]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag !== 'Other (please specify in comments)');

    return [...new Set(tags)]; // Remove duplicates
};

/**
 * Generate unique response ID from timestamp and order number
 * Used to prevent duplicate imports
 */
const generateResponseId = (timestamp, orderNumber) => {
    if (!timestamp || !orderNumber) {
        return Buffer.from(`${timestamp}_${Date.now()}`).toString('base64').substring(0, 50);
    }

    const combined = `${timestamp}_${orderNumber}`;
    return Buffer.from(combined).toString('base64').substring(0, 50);
};

/**
 * Sync Google Forms responses to database
 * Only imports new responses since last sync
 */
export const syncGoogleFormResponses = async () => {
    try {
        console.log('🔄 Syncing Google Forms responses to database...');
        console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);

        const responses = await fetchGoogleFormResponses();

        if (responses.length === 0) {
            console.log('✅ No new responses to sync');
            return {
                total: 0,
                created: 0,
                skipped: 0,
                errors: 0
            };
        }

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const syncResult = { total: responses.length, created: 0, skipped: 0, errors: 0 };

        console.log(`📨 Processing ${responses.length} responses...`);

        for (const response of responses) {
            try {
                // Check if this response already exists (prevent duplicates)
                const existing = await Feedback.findOne({
                    where: {
                        googleFormResponseId: response.googleFormResponseId
                    }
                });

                if (existing) {
                    skippedCount++;
                    syncResult.skipped++;
                    continue;
                }

                // Create new feedback record
                const feedback = await Feedback.create({
                    orderNumber: response.orderNumber,
                    rating: response.rating,
                    tags: response.tags,
                    comment: response.comment,
                    source: 'google_form',
                    googleFormResponseId: response.googleFormResponseId,
                    status: 'pending',
                    processed: false
                });

                createdCount++;
                syncResult.created++;
                console.log(`  ✅ Imported: ${feedback.orderNumber || 'Anonymous'} (Rating: ${feedback.rating}⭐)`);
            } catch (error) {
                errorCount++;
                syncResult.errors++;
                console.error(`  ❌ Error importing response:`, error.message);
            }
        }

        console.log('');
        console.log('═══════════════════════════════════');
        console.log(`✅ Google Forms Sync Complete`);
        console.log(`   Total processed: ${responses.length}`);
        console.log(`   ✅ Created:     ${createdCount}`);
        console.log(`   ⏭️  Skipped:     ${skippedCount}`);
        console.log(`   ❌ Errors:      ${errorCount}`);
        console.log('═══════════════════════════════════');
        console.log('');

        return syncResult;
    } catch (error) {
        console.error('❌ Error syncing Google Forms:', error);
        return { total: 0, created: 0, skipped: 0, errors: 1 };
    }
};

/**
 * Get sync statistics
 */
export const getSyncStatistics = async () => {
    try {
        const googleFormCount = await Feedback.count({
            where: { source: 'google_form' }
        });

        const directCount = await Feedback.count({
            where: { source: 'direct' }
        });

        const qrCodeCount = await Feedback.count({
            where: { source: 'qr_code' }
        });

        const lastSync = await Feedback.findOne({
            where: { source: 'google_form' },
            order: [['createdAt', 'DESC']],
            attributes: ['createdAt']
        });

        return {
            sources: {
                googleForm: googleFormCount,
                direct: directCount,
                qrCode: qrCodeCount
            },
            total: googleFormCount + directCount + qrCodeCount,
            lastGoogleFormSync: lastSync ? lastSync.createdAt : 'Never'
        };
    } catch (error) {
        console.error('Error getting sync statistics:', error);
        return null;
    }
};

/**
 * Validate Google Sheets API connection
 */
export const validateGoogleSheetsConnection = async () => {
    try {
        console.log('🔐 Validating Google Sheets API connection...');

        const { apiKey: API_KEY, spreadsheetId: SPREADSHEET_ID } = getCredentials();

        if (!API_KEY) {
            console.error('❌ GOOGLE_SHEETS_API_KEY not set');
            return { valid: false, error: 'API key not configured' };
        }

        if (!SPREADSHEET_ID) {
            console.error('❌ GOOGLE_SPREADSHEET_ID not set');
            return { valid: false, error: 'Spreadsheet ID not configured' };
        }

        // Try to fetch metadata
        const response = await axios.get(
            `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=spreadsheetId,properties.title`,
            {
                params: { key: API_KEY },
                timeout: 5000
            }
        );

        console.log(`✅ Connected to spreadsheet: "${response.data.properties.title}"`);
        return {
            valid: true,
            spreadsheetId: response.data.spreadsheetId,
            title: response.data.properties.title
        };
    } catch (error) {
        let errorMsg = error.message;

        if (error.response?.status === 404) {
            errorMsg = 'Spreadsheet not found. Check GOOGLE_SPREADSHEET_ID';
        } else if (error.response?.status === 403) {
            errorMsg = 'Access forbidden. Check GOOGLE_SHEETS_API_KEY permissions';
        } else if (error.code === 'ENOTFOUND') {
            errorMsg = 'Network error. Check internet connection';
        }

        console.error(`❌ Connection validation failed: ${errorMsg}`);
        return { valid: false, error: errorMsg };
    }
};

/**
 * Initialize Google Forms syncer
 * Runs at specified interval (default: 15 minutes)
 */
export const initializeGoogleFormsSyncer = (interval = 15 * 60 * 1000) => {
    console.log(`⏰ Google Forms syncer initialized (every ${interval / 60000} minutes)`);

    // Validate connection on startup
    validateGoogleSheetsConnection();

    // Run immediately
    syncGoogleFormResponses();

    // Then run at intervals
    setInterval(async () => {
        await syncGoogleFormResponses();
    }, interval);
};

/**
 * Manual sync trigger (for testing/admin endpoints)
 */
export const triggerGoogleFormSync = async () => {
    console.log('🔄 Manual sync triggered by admin');
    return await syncGoogleFormResponses();
};
