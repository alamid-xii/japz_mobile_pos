import { useState, useEffect, useCallback } from 'react';
import { Star, AlertCircle, Download, X, Calendar, ChevronDown } from 'lucide-react';
import { feedbackAPI } from '../../services/api';

interface OrderData {
    id: number;
    orderNumber: string;
    customerName: string;
    total: number;
    createdAt: string;
    items?: Array<{ name: string; quantity: number }>;
}

interface FeedbackItem {
    id: number; orderNumber?: string; rating: number; comment?: string; tags?: string[];
    sentiment?: string; status: string; aiAnalysis?: string; theme?: string;
    createdAt: string; updatedAt: string;
    order?: OrderData;
}

const sentimentColors: Record<string, { bg: string; text: string }> = {
    positive: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    negative: { bg: 'bg-red-100', text: 'text-red-600' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-600' },
    mixed: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

export default function FeedbackHub() {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Add time period filtering: today, week, month, all
    const [timePeriod, setTimePeriod] = useState('all');
    const [ratingFilter, setRatingFilter] = useState<number | null>(null);

    // Export modal state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [exportLoading, setExportLoading] = useState(false);

    // Filter feedbacks by time period
    const getFilteredFeedbacks = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return feedbacks.filter(fb => {
            const fbDate = new Date(fb.createdAt);
            switch (timePeriod) {
                case 'today': return fbDate >= startOfToday;
                case 'week': return fbDate >= startOfWeek;
                case 'month': return fbDate >= startOfMonth;
                default: return true;
            }
        });
    };
    const filteredFeedbacks = getFilteredFeedbacks();

    const fetchFeedback = useCallback(async () => {
        try {
            const res = await feedbackAPI.getAll(undefined, 50, 0);
            const data = res.data?.feedback || res.data?.data || res.data?.feedbacks || (Array.isArray(res.data) ? res.data : []);
            setFeedbacks(data);
            setError('');
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to fetch feedback');
            setFeedbacks([]);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchFeedback(); const interval = setInterval(fetchFeedback, 10000); return () => clearInterval(interval); }, [fetchFeedback]);

    // updateStatus removed — status column is no longer in the UI

    const avgRating = filteredFeedbacks.length > 0 ? (filteredFeedbacks.reduce((s, f) => s + f.rating, 0) / filteredFeedbacks.length).toFixed(1) : '0.0';
    const positiveCount = filteredFeedbacks.filter(f => f.sentiment === 'positive').length;

    const generateFeedbackReport = async () => {
        try {
            setExportLoading(true);
            const res = await feedbackAPI.export(exportStartDate, exportEndDate);
            const data = res.data;

            const renderStars = (rating: number) => {
                return Array.from({ length: 5 }, (_, i) =>
                    `<span style="color: ${i < rating ? '#FFCE1B' : '#D1D5DB'}; font-size: 14px;">★</span>`
                ).join('');
            };

            const getSentimentBadge = (sentiment: string) => {
                const colors: Record<string, { bg: string; text: string }> = {
                    positive: { bg: '#dcfce7', text: '#16a34a' },
                    negative: { bg: '#fee2e2', text: '#dc2626' },
                    neutral: { bg: '#f3f4f6', text: '#6b7280' },
                    mixed: { bg: '#fef3c7', text: '#d97706' }
                };
                const c = colors[sentiment] || colors.neutral;
                return `<span style="display: inline-block; padding: 2px 8px; border-radius: 10px; background: ${c.bg}; color: ${c.text}; font-size: 10px; font-weight: bold; text-transform: uppercase;">${sentiment}</span>`;
            };

            const html = `<!DOCTYPE html>
<html>
<head>
    <title>JAPZ Feedback Report</title>
    <style>
        @page { 
            size: 8.5in 13in portrait; 
            margin: 0.5in 0.4in 0.7in 0.4in;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: Arial, Helvetica, sans-serif; 
            font-size: 9px; 
            color: #333; 
            line-height: 1.3; 
        }
        
        .page { 
            width: 100%; 
            min-height: 100%;
        }
        
        .header { 
            text-align: center; 
            border-bottom: 2px solid #FFCE1B; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
        }
        .header h1 { font-size: 18px; color: #030213; margin-bottom: 2px; }
        .header .subtitle { font-size: 10px; color: #666; }
        .header .date-range { font-size: 11px; font-weight: bold; margin-top: 5px; }
        
        .summary-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px; 
        }
        .summary-table td { 
            padding: 8px 10px; 
            text-align: center; 
            border: 1px solid #ddd; 
            background: #fffbeb;
        }
        .summary-table .label { font-size: 8px; color: #666; text-transform: uppercase; }
        .summary-table .value { font-size: 14px; font-weight: bold; color: #030213; }
        
        .section-title { 
            font-size: 11px; 
            font-weight: bold; 
            margin: 15px 0 10px; 
            padding: 5px 10px; 
            background: #030213; 
            color: #FFCE1B; 
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            table-layout: fixed;
        }
        .data-table th {
            background: #030213;
            color: #FFCE1B;
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            border: 1px solid #030213;
        }
        .data-table td {
            padding: 8px 6px;
            border: 1px solid #ddd;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-size: 11px;
        }
        .data-table tr:nth-child(even) {
            background: #fafafa;
        }
        .data-table tr:hover {
            background: #fffbeb;
        }
        .order-col { width: 9%; font-weight: bold; }
        .name-col { width: 13%; }
        .items-col { width: 20%; font-size: 10px; color: #555; }
        .rating-col { width: 10%; text-align: center; }
        .sentiment-col { width: 10%; text-align: center; }
        .comment-col { width: 26%; font-style: italic; font-size: 11px; }
        .date-col { width: 12%; font-size: 10px; color: #666; }
        
        .stars { white-space: nowrap; }
        .no-comment { color: #999; font-style: italic; }
        
        .page-footer { 
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center; 
            padding: 8px 0; 
            font-size: 8px; 
            color: #999;
            background: white;
            border-top: 1px solid #eee;
        }
        
        @media print {
            @page { 
                size: 8.5in 13in portrait; 
                margin: 0.5in 0.4in 0.7in 0.4in;
            }
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
            }
            .data-table tr { 
                page-break-inside: avoid; 
            }
        }
        
        @media screen {
            body { 
                background: #f0f0f0; 
                padding: 20px; 
            }
            .page { 
                background: white; 
                max-width: 8.5in; 
                margin: 0 auto; 
                padding: 0.5in 0.4in;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>JAPZ GRILL - FEEDBACK REPORT</h1>
            <p class="subtitle">Customer Reviews & Ratings</p>
            <p class="date-range">${data.dateRange.startFormatted} — ${data.dateRange.endFormatted}</p>
        </div>
        
        <table class="summary-table">
            <tr>
                <td>
                    <div class="label">Total Reviews</div>
                    <div class="value">${data.summary.totalFeedbacks}</div>
                </td>
                <td>
                    <div class="label">Average Rating</div>
                    <div class="value">${data.summary.avgRating} ★</div>
                </td>
                <td>
                    <div class="label">Positive</div>
                    <div class="value" style="color: #16a34a;">${data.summary.positiveCount}</div>
                </td>
                <td>
                    <div class="label">Neutral/Mixed</div>
                    <div class="value" style="color: #6b7280;">${data.summary.neutralCount}</div>
                </td>
                <td>
                    <div class="label">Negative</div>
                    <div class="value" style="color: #dc2626;">${data.summary.negativeCount}</div>
                </td>
            </tr>
        </table>

        <div class="section-title">CUSTOMER REVIEWS (${data.feedbacks.length} total)</div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th class="order-col">Order #</th>
                    <th class="name-col">Customer</th>
                    <th class="items-col">Items Ordered</th>
                    <th class="rating-col">Rating</th>
                    <th class="sentiment-col">Sentiment</th>
                    <th class="comment-col">Comment</th>
                    <th class="date-col">Date</th>
                </tr>
            </thead>
            <tbody>
                ${data.feedbacks.map((fb: any) => `
                <tr>
                    <td class="order-col">${fb.orderNumber}</td>
                    <td class="name-col">${fb.customerName}</td>
                    <td class="items-col">${fb.items.length > 0 ? fb.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', ') : '-'}</td>
                    <td class="rating-col"><span class="stars">${renderStars(fb.rating)}</span></td>
                    <td class="sentiment-col">${getSentimentBadge(fb.sentiment)}</td>
                    <td class="comment-col">${fb.comment ? `"${fb.comment}"` : '<span class="no-comment">No comment</span>'}</td>
                    <td class="date-col">${new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="page-footer">
            Report generated on ${new Date().toLocaleString()} | JAPZ GRILL POS System | Total: ${data.feedbacks.length} reviews
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script>
        window.onload = function() {
            const element = document.querySelector('.page');
            const opt = {
                margin: [0.3, 0.3, 0.5, 0.3],
                filename: 'JAPZ_Feedback_Report_${exportStartDate}_to_${exportEndDate}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'in', format: [8.5, 13], orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };
            html2pdf().set(opt).from(element).save().then(function() {
                window.close();
            });
        };
    </script>
</body>
</html>`;

            // Open in new window and trigger PDF generation
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(html);
                newWindow.document.close();
            } else {
                // Fallback: download as HTML if popup blocked
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `JAPZ_Feedback_Report_${exportStartDate}_to_${exportEndDate}.html`;
                a.click();
                URL.revokeObjectURL(url);
            }
            setShowExportModal(false);
        } catch (e) {
            console.error('Error generating feedback report:', e);
            alert('Failed to generate report. Please try again.');
        } finally {
            setExportLoading(false);
        }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="p-2 md:p-4 h-full flex flex-col bg-gradient-to-b from-white to-slate-100">
            {/* Header with Export Button */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Feedback Hub</h1>
                    <p className="text-gray-500 text-sm">View and manage customer feedback and ratings</p>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto">
                    <div className="relative">
                        <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-7 text-sm font-medium cursor-pointer">
                            <option value="all">All Feedback</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    </div>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-dark rounded-lg font-semibold hover:shadow-md transition"
                    >
                        <Download size={18} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Export Feedback Report</h2>
                            <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">Select date range to export feedback as PDF</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generateFeedbackReport}
                                disabled={exportLoading}
                                className="flex-1 py-2.5 bg-brand text-brand-dark rounded-lg font-semibold hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {exportLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-600/30 border-t-gray-600 rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Download PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-3 rounded-lg mb-3">
                    <AlertCircle size={16} /><span className="text-sm">{error}</span>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-[11px] text-gray-500">Avg Rating</div>
                    <div className="text-lg font-bold">{avgRating}</div>
                    <div className="flex justify-center gap-0.5 mt-1">{[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill={i <= Math.round(Number(avgRating)) ? '#FFCE1B' : 'none'} color={i <= Math.round(Number(avgRating)) ? '#FFCE1B' : '#D1D5DB'} />)}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-[11px] text-gray-500">Total Feedback</div>
                    <div className="text-lg font-bold">{filteredFeedbacks.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-[11px] text-gray-500">Positive Sentiment</div>
                    <div className="text-lg font-bold text-emerald-500">{positiveCount} ({filteredFeedbacks.length > 0 ? Math.round(positiveCount / filteredFeedbacks.length * 100) : 0}%)</div>
                </div>
            </div>

            {/* Star Rating Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
                <button
                    onClick={() => setRatingFilter(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${ratingFilter === null ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >All</button>
                {[5, 4, 3, 2, 1].map(star => (
                    <button
                        key={star}
                        onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${ratingFilter === star ? 'bg-yellow-400 text-gray-900' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {star} <Star size={12} fill={ratingFilter === star ? '#1a1a1a' : '#FFCE1B'} color={ratingFilter === star ? '#1a1a1a' : '#FFCE1B'} />
                    </button>
                ))}
            </div>



            {/* Feedback Table */}
            <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-lg shadow-sm">
                {filteredFeedbacks.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No feedback found</p>
                ) : (
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-yellow-100">
                            <tr className="border-b border-gray-200 ">
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Order #</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Items Ordered</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-700">Rating</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Comment</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-700">Conclusion</th>
                                {/* Status column removed */}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.filter(fb => ratingFilter === null || fb.rating === ratingFilter).map((fb, idx) => {
                                const sc = sentimentColors[fb.sentiment || 'neutral'] || sentimentColors.neutral;
                                return (
                                    <tr key={fb.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{fb.order?.orderNumber || fb.orderNumber || '-'}</td>
                                        <td className="px-4 py-3 text-gray-700">{fb.order?.customerName || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{fb.order?.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex gap-0.5 justify-center">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star key={i} size={12} fill={i <= fb.rating ? '#FFCE1B' : 'none'} color={i <= fb.rating ? '#FFCE1B' : '#D1D5DB'} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{fb.comment || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                                                {fb.sentiment || 'neutral'}
                                            </span>
                                        </td>
                                        {/* Status column removed */}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
