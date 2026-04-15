import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Download, DollarSign, ShoppingCart, Package, Calendar, Clock, BarChart3, ArrowUp, ArrowDown, X, FileText, User, ChefHat, Timer, Table, LineChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { salesAPI, ordersAPI } from '../../services/api';

interface DailySales {
    date: string;
    dayLabel: string;
    revenue: number;
    orders: number;
    items: number;
}

interface TopItem {
    name: string;
    quantity: number;
    revenue: number;
}

interface PeakHour {
    hour: number;
    label: string;
    revenue: number;
}

interface SalesData {
    period: string;
    dateRange: { start: string; end: string };
    summary: {
        totalRevenue: number;
        totalOrders: number;
        totalItems: number;
        avgDaily: number;
        avgOrderValue: number;
        bestDay: DailySales | null;
        worstDay: DailySales | null;
    };
    dailyData: DailySales[];
    topItems: TopItem[];
    peakHours: PeakHour[];
    hourlyDistribution: number[];
}

interface DetailedOrderItem {
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface DetailedOrder {
    orderNumber: string;
    customerName: string;
    orderType: string;
    tableNumber: string | null;
    deliveryAddress: string | null;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    cashierName: string;
    preparedByName: string;
    preparationTime: string;
    preparationTimeMinutes: number;
    createdAt: string;
    completedAt: string | null;
    notes: string | null;
    items: DetailedOrderItem[];
}

export default function SalesForecast() {
    const [salesData, setSalesData] = useState<SalesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
    const [viewMode, setViewMode] = useState<'analytics' | 'orders'>('analytics');
    
    // Orders table state
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersPage, setOrdersPage] = useState(1);
    const ordersPerPage = 10;
    
    // Export modal state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        fetchSalesData();
    }, [selectedPeriod]);

    useEffect(() => {
        if (viewMode === 'orders' && allOrders.length === 0) fetchOrders();
    }, [viewMode]);

    const fetchSalesData = async () => {
        try {
            setLoading(true);
            const res = await salesAPI.getAnalytics(selectedPeriod);
            setSalesData(res.data);
        } catch (e) {
            console.error('Error fetching sales data:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            setOrdersLoading(true);
            const res = await ordersAPI.getAll();
            const all = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const completed = all
                .filter((o: any) => o.status === 'completed')
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setAllOrders(completed);
        } catch (e) { console.error(e); }
        finally { setOrdersLoading(false); }
    };

    const ordersTotalPages = useMemo(() => Math.max(1, Math.ceil(allOrders.length / ordersPerPage)), [allOrders.length]);
    const paginatedOrders = useMemo(() => {
        const start = (ordersPage - 1) * ordersPerPage;
        return allOrders.slice(start, start + ordersPerPage);
    }, [allOrders, ordersPage]);

    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `₱${(amount / 1000).toFixed(1)}k`;
        return `₱${Math.round(amount).toLocaleString()}`;
    };

    const formatTo12Hour = (hour: number) => {
        if (hour === 0) return '12 AM';
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return '12 PM';
        return `${hour - 12} PM`;
    };

    const handleDownload = () => {
        setShowExportModal(true);
    };

    const generateDetailedReport = async () => {
        try {
            setExportLoading(true);
            const res = await salesAPI.getDetailedReport(exportStartDate, exportEndDate);
            const data = res.data;

            const formatShortDate = (dateStr: string) => {
                return new Date(dateStr).toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true
                });
            };

            const html = `<!DOCTYPE html>
<html>
<head>
    <title>JAPZ Detailed Sales Report</title>
    <style>
        @page { 
            size: 8.5in 13in portrait; 
            margin: 0.5in 0.4in 0.7in 0.4in;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: Arial, Helvetica, sans-serif; 
            font-size: 8px; 
            color: #333; 
            line-height: 1.2; 
        }
        
        .page { 
            width: 100%; 
            min-height: 100%;
        }
        
        .header { 
            text-align: center; 
            border-bottom: 2px solid #FFCE1B; 
            padding-bottom: 8px; 
            margin-bottom: 10px; 
        }
        .header h1 { font-size: 16px; color: #030213; margin-bottom: 2px; }
        .header .subtitle { font-size: 9px; color: #666; }
        .header .date-range { font-size: 10px; font-weight: bold; margin-top: 4px; }
        
        .summary-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px; 
        }
        .summary-table td { 
            padding: 6px 8px; 
            text-align: center; 
            border: 1px solid #ddd; 
            background: #fffbeb;
        }
        .summary-table .label { font-size: 7px; color: #666; text-transform: uppercase; }
        .summary-table .value { font-size: 12px; font-weight: bold; color: #030213; }
        
        .section-title { 
            font-size: 10px; 
            font-weight: bold; 
            margin: 10px 0 6px; 
            padding: 4px 8px; 
            background: #030213; 
            color: #FFCE1B; 
        }
        
        .orders-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 11px; 
        }
        .orders-table thead { 
            display: table-header-group; 
        }
        .orders-table th { 
            background: #030213; 
            color: #FFCE1B; 
            padding: 6px 4px; 
            text-align: left; 
            font-size: 10px; 
            text-transform: uppercase; 
            white-space: nowrap;
            border: 1px solid #030213;
        }
        .orders-table td { 
            padding: 6px 4px; 
            border: 1px solid #e5e5e5; 
            vertical-align: top; 
            word-wrap: break-word;
            font-size: 11px;
        }
        .orders-table tbody tr:nth-child(even) { background: #f9f9f9; }
        .orders-table tbody tr { page-break-inside: avoid; }
        
        .order-num { font-weight: bold; color: #030213; font-size: 12px; }
        .type-badge { 
            display: inline-block; 
            padding: 2px 5px; 
            border-radius: 3px; 
            font-size: 9px; 
            font-weight: bold; 
            text-transform: uppercase; 
        }
        .type-dine-in { background: #dbeafe; color: #1d4ed8; }
        .type-take-out { background: #fef3c7; color: #d97706; }
        .type-delivery { background: #dcfce7; color: #16a34a; }
        
        .status-badge { 
            display: inline-block; 
            padding: 2px 5px; 
            border-radius: 3px; 
            font-size: 9px; 
            font-weight: bold; 
            text-transform: uppercase; 
        }
        .status-completed { background: #22c55e; color: white; }
        .status-ready { background: #3b82f6; color: white; }
        .status-paid { background: #8b5cf6; color: white; }
        
        .items-list { font-size: 10px; color: #555; }
        .items-list div { margin-bottom: 1px; line-height: 1.3; }
        .item-qty { color: #888; }
        
        .total { font-weight: bold; color: #030213; font-size: 12px; }
        .prep-time { color: #1d4ed8; font-weight: 500; font-size: 11px; }
        .notes { font-size: 10px; color: #92400e; font-style: italic; }
        .address { font-size: 10px; color: #16a34a; }
        
        .page-footer { 
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center; 
            padding: 8px 0; 
            font-size: 7px; 
            color: #999;
            background: white;
            border-top: 1px solid #eee;
        }
        
        .page-number {
            counter-increment: page;
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
            .orders-table thead { 
                display: table-header-group; 
            }
            .orders-table tbody tr { 
                page-break-inside: avoid; 
            }
            .page-footer {
                position: fixed;
                bottom: 0;
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
            <h1>JAPZ GRILL - SALES REPORT</h1>
            <p class="subtitle">Complete Order Details with Staff Information</p>
            <p class="date-range">${data.dateRange.startFormatted} — ${data.dateRange.endFormatted}</p>
        </div>
        
        <table class="summary-table">
            <tr>
                <td>
                    <div class="label">Total Revenue</div>
                    <div class="value">₱${data.summary.totalRevenue.toLocaleString()}</div>
                </td>
                <td>
                    <div class="label">Total Orders</div>
                    <div class="value">${data.summary.totalOrders}</div>
                </td>
                <td>
                    <div class="label">Items Sold</div>
                    <div class="value">${data.summary.totalItems}</div>
                </td>
                <td>
                    <div class="label">Avg Order Value</div>
                    <div class="value">₱${data.summary.avgOrderValue.toLocaleString()}</div>
                </td>
                <td>
                    <div class="label">Avg Prep Time</div>
                    <div class="value">${data.summary.avgPreparationTime}m</div>
                </td>
            </tr>
        </table>

        <div class="section-title">ORDER DETAILS (${data.orders.length} orders)</div>
        
        <table class="orders-table">
            <thead>
                <tr>
                    <th style="width: 8%;">Order #</th>
                    <th style="width: 7%;">Type</th>
                    <th style="width: 10%;">Customer</th>
                    <th style="width: 10%;">Cashier</th>
                    <th style="width: 10%;">Kitchen</th>
                    <th style="width: 22%;">Items Ordered</th>
                    <th style="width: 8%;">Total</th>
                    <th style="width: 6%;">Prep</th>
                    <th style="width: 10%;">Time</th>
                    <th style="width: 9%;">Notes</th>
                </tr>
            </thead>
            <tbody>
                ${(data.orders as DetailedOrder[]).map((order: DetailedOrder) => `
                <tr>
                    <td><span class="order-num">#${order.orderNumber}</span><br><span class="status-badge status-${order.status}">${order.status}</span></td>
                    <td>
                        <span class="type-badge type-${order.orderType?.replace('-', '-') || 'na'}">${order.orderType || 'N/A'}</span>
                        ${order.tableNumber ? `<br><span style="font-size:10px;color:#666;">T-${order.tableNumber}</span>` : ''}
                    </td>
                    <td>${order.customerName}</td>
                    <td>${order.cashierName}</td>
                    <td>${order.preparedByName}</td>
                    <td>
                        <div class="items-list">
                            ${order.items.slice(0, 3).map((item: DetailedOrderItem) => `<div><span class="item-qty">${item.quantity}x</span> ${item.name}</div>`).join('')}
                            ${order.items.length > 3 ? `<div style="color:#999;font-size:9px;">+${order.items.length - 3} more</div>` : ''}
                        </div>
                    </td>
                    <td class="total">₱${order.total.toLocaleString()}</td>
                    <td class="prep-time">${order.preparationTime}</td>
                    <td style="font-size:10px;">${formatShortDate(order.createdAt)}</td>
                    <td>
                        ${order.deliveryAddress ? `<div class="address">${order.deliveryAddress.substring(0, 30)}${order.deliveryAddress.length > 30 ? '...' : ''}</div>` : ''}
                        ${order.notes ? `<div class="notes">${order.notes.substring(0, 25)}${order.notes.length > 25 ? '...' : ''}</div>` : ''}
                        ${!order.deliveryAddress && !order.notes ? '<span style="color:#ccc;">-</span>' : ''}
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="page-footer">
            Report generated on ${new Date().toLocaleString()} | JAPZ GRILL POS System | Total: ${data.orders.length} orders
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script>
        window.onload = function() {
            const element = document.querySelector('.page');
            const opt = {
                margin: [0.3, 0.3, 0.5, 0.3],
                filename: 'JAPZ_Sales_Report_${exportStartDate}_to_${exportEndDate}.pdf',
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
                a.download = `JAPZ_Detailed_Report_${exportStartDate}_to_${exportEndDate}.html`;
                a.click();
                URL.revokeObjectURL(url);
            }
            setShowExportModal(false);
        } catch (e) {
            console.error('Error generating detailed report:', e);
            alert('Failed to generate report. Please try again.');
        } finally {
            setExportLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner" />
            </div>
        );
    }

    if (!salesData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <BarChart3 size={48} className="text-gray-300 mb-4" />
                <p>Unable to load sales data</p>
                <button onClick={fetchSalesData} className="mt-4 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium">
                    Retry
                </button>
            </div>
        );
    }

    const { summary, dailyData, topItems, peakHours } = salesData;
    const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

    return (
        <div className="p-2 md:p-4 h-full overflow-y-auto bg-gradient-to-b from-white to-slate-100">
            {/* Header */}
            <div className="mb-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-yellow-900">Sales Analytics</h1>
                        <p className="text-gray-500 text-sm">Track revenue and performance metrics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Period Selector */}
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            {(['week', 'month'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedPeriod(p)}
                                    className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                                        selectedPeriod === p
                                            ? 'bg-brand text-brand-dark'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        {/* Download Button */}
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition shadow-sm"
                        >
                            <Download size={18} />
                            <span className="hidden md:inline">Export</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="text-white" size={24} />
                                <h2 className="text-xl font-bold text-white">Export Detailed Report</h2>
                            </div>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                className="text-white/80 hover:text-white transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <p className="text-gray-600 text-sm">
                                Select a date range to generate a detailed report with complete order information including cashier, kitchen staff, and preparation times.
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={14} className="inline mr-2" />
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        max={exportEndDate}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={14} className="inline mr-2" />
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        min={exportStartDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-800 text-sm mb-2">Report Includes:</h4>
                                <ul className="text-xs text-amber-700 space-y-1">
                                    <li className="flex items-center gap-2"><User size={12} /> Customer name & order details</li>
                                    <li className="flex items-center gap-2"><ChefHat size={12} /> Kitchen staff who prepared each order</li>
                                    <li className="flex items-center gap-2"><DollarSign size={12} /> Cashier who processed the payment</li>
                                    <li className="flex items-center gap-2"><Timer size={12} /> Time taken to complete each order</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generateDetailedReport}
                                disabled={exportLoading || !exportStartDate || !exportEndDate}
                                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {exportLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">Total Revenue</span>
                        <div className="bg-green-100 p-2 rounded-lg">
                            <DollarSign size={18} className="text-green-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.totalRevenue)}</p>
                    
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">Total Orders</span>
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <ShoppingCart size={18} className="text-blue-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{summary.totalOrders}</p>
                   
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">Avg Daily Sales</span>
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <Calendar size={18} className="text-yellow-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.avgDaily)}</p>
                  
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">Avg Order Value</span>
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Package size={18} className="text-purple-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.avgOrderValue)}</p>
                    
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition border-none cursor-pointer ${
                            viewMode === 'analytics'
                                ? 'bg-brand text-brand-dark'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <LineChart size={16} />
                        Analytics
                    </button>
                    <button
                        onClick={() => setViewMode('orders')}
                        className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition border-none cursor-pointer ${
                            viewMode === 'orders'
                                ? 'bg-brand text-brand-dark'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Table size={16} />
                        Orders
                    </button>
                </div>
            </div>

            {viewMode === 'analytics' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                {/* Daily Sales Chart */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 shrink-0">
                        <BarChart3 size={20} className="text-brand" />
                        Daily Sales Breakdown
                    </h2>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                        {dailyData.map((day, idx) => {
                            const prevDay = dailyData[idx - 1];
                            const growth = prevDay && prevDay.revenue > 0 
                                ? ((day.revenue - prevDay.revenue) / prevDay.revenue) * 100 
                                : 0;
                            
                            return (
                                <div key={day.date} className="flex items-center gap-3 py-1">
                                    <div className="w-28 text-sm text-gray-600 shrink-0">{day.dayLabel}</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500 flex items-center px-3"
                                            style={{ width: `${Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 10 : 0)}%` }}
                                        >
                                            {day.revenue > 0 && (
                                                <span className="text-xs font-bold text-brand-dark whitespace-nowrap">
                                                    {formatCurrency(day.revenue)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-16 text-right">
                                        <span className="text-xs text-gray-500">{day.orders} orders</span>
                                    </div>
                                    <div className="w-16 text-right">
                                        {growth !== 0 && (
                                            <span className={`text-xs font-medium flex items-center justify-end gap-0.5 ${growth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {growth > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                                {Math.abs(Math.round(growth))}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Insights Panel */}
                <div className="flex flex-col gap-4 min-h-0">
                    {/* Best & Worst Day */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm shrink-0">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-green-500" />
                            Performance Highlights
                        </h3>
                        
                        {summary.bestDay && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                                    <TrendingUp size={14} />
                                    Best Day
                                </div>
                                <p className="text-lg font-bold text-green-800">{summary.bestDay.dayLabel}</p>
                                <p className="text-sm text-green-600">
                                    {formatCurrency(summary.bestDay.revenue)} • {summary.bestDay.orders} orders
                                </p>
                            </div>
                        )}
                        
                        {summary.worstDay && summary.worstDay.revenue > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                                    <TrendingDown size={14} />
                                    Slowest Day
                                </div>
                                <p className="text-lg font-bold text-red-800">{summary.worstDay.dayLabel}</p>
                                <p className="text-sm text-red-600">
                                    {formatCurrency(summary.worstDay.revenue)} • {summary.worstDay.orders} orders
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Peak Hours & Top Items Stack */}
                    <div className="flex flex-col gap-4 flex-1 min-h-0">
                        {/* Peak Hours */}
                        {peakHours.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 shrink-0">
                                    <Clock size={20} className="text-blue-500" />
                                    Peak Hours
                                </h3>
                                <div className="space-y-2 overflow-y-auto flex-1">
                                    {peakHours.map((hour, idx) => (
                                        <div key={hour.hour} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm font-medium">{formatTo12Hour(hour.hour)}</span>
                                            </div>
                                            <span className="text-sm text-gray-600">{formatCurrency(hour.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Items */}
                        {topItems.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 shrink-0">
                                    <Package size={20} className="text-purple-500" />
                                    Top Selling Items
                                </h3>
                                <div className="space-y-2 overflow-y-auto flex-1">
                                    {topItems.slice(0, 5).map((item, idx) => (
                                        <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm font-medium truncate max-w-[150px]">{item.name}</span>
                                            </div>
                                            <span className="text-sm text-gray-600">{item.quantity} sold</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            ) : (
            /* Orders Table View */
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {ordersLoading ? (
                    <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
                ) : paginatedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FileText size={48} className="mb-2" />
                        <p className="font-semibold text-gray-500">No completed orders found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-yellow-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Order #</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Customer</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Items</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700">Total</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedOrders.map((o: any) => (
                                        <tr key={o.id} className="hover:bg-yellow-50 transition">
                                            <td className="px-5 py-3 text-sm font-bold text-gray-900">#{o.orderNumber}</td>
                                            <td className="px-5 py-3 text-sm text-gray-700">{o.customerName || <span className="text-gray-300 italic">Walk-in</span>}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                                                {Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') : (o.items || '')}
                                            </td>
                                            <td className="px-5 py-3 text-sm">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                                                    {o.orderType?.replace('-', ' ') || 'Walk-in'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-emerald-600 text-right font-bold">₱{Number(o.total || 0).toFixed(2)}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500">
                                                {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                                                {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {ordersTotalPages > 1 && (
                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {(ordersPage - 1) * ordersPerPage + 1} to {Math.min(ordersPage * ordersPerPage, allOrders.length)} of {allOrders.length} orders
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                                        disabled={ordersPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        <ChevronLeft size={16} /> Prev
                                    </button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.min(5, ordersTotalPages) }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => setOrdersPage(p)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${ordersPage === p ? 'bg-brand text-brand-dark font-semibold' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                            >{p}</button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))}
                                        disabled={ordersPage === ordersTotalPages}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            )}
        </div>
    );
}
