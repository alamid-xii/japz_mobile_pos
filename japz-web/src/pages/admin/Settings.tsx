import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Eye, EyeOff, Download, QrCode, RefreshCw } from 'lucide-react';
import { authAPI, logsAPI, qrKeyAPI } from '../../services/api';

export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const qrPreviewRef = useRef<HTMLDivElement>(null);
    const [activeQrKey, setActiveQrKey] = useState<string | null>(null);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        profile: false,
        logs: false,
        qrcode: false,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [downloadingLogs, setDownloadingLogs] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Fetch active QR key when QR section is expanded
    useEffect(() => {
        if (expandedSections.qrcode) {
            qrKeyAPI.getActive().then(res => {
                if (res.data.key) setActiveQrKey(res.data.key);
            }).catch(() => { });
        }
    }, [expandedSections.qrcode]);

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            try {
                await logout();
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                navigate('/login', { replace: true });
            }
        }
    };

    const handleUpdateProfile = async () => {
        if (!formData.name || !formData.email) {
            alert('Name and email are required');
            return;
        }

        // Validate password requirements if updating password
        if (formData.newPassword) {
            if (!formData.currentPassword) {
                alert('Current password is required to change password');
                return;
            }
            if (formData.newPassword.length < 6) {
                alert('New password must be at least 6 characters');
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                alert('Passwords do not match');
                return;
            }
        }

        try {
            setLoading(true);
            const updatePayload: any = {
                name: formData.name,
                email: formData.email
            };

            if (formData.newPassword) {
                updatePayload.currentPassword = formData.currentPassword;
                updatePayload.newPassword = formData.newPassword;
            }

            await authAPI.updateProfile(updatePayload);

            alert('Profile updated successfully');
            setIsEditing(false);
            setFormData({
                ...formData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const handleDownloadLogs = async () => {
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date must be before end date');
            return;
        }

        try {
            setDownloadingLogs(true);

            // Fetch logs for the date range
            const logsResponse = await logsAPI.getAll({ limit: 10000, offset: 0 });
            let allLogs = [];

            if (logsResponse.data?.logs && Array.isArray(logsResponse.data.logs)) {
                allLogs = logsResponse.data.logs;
            } else if (Array.isArray(logsResponse.data)) {
                allLogs = logsResponse.data;
            }

            // Filter logs by date range
            const filteredLogs = allLogs.filter((log: any) => {
                const logDate = new Date(log.createdAt).toISOString().split('T')[0];
                return logDate >= startDate && logDate <= endDate;
            });

            if (filteredLogs.length === 0) {
                alert('No activity logs found for the selected date range');
                return;
            }

            // Generate CSV content
            const csvContent = [
                ['Date & Time', 'User', 'Action', 'Description', 'Status'].join(','),
                ...filteredLogs.map((log: any) => [
                    new Date(log.createdAt).toLocaleString(),
                    log.userName || 'System',
                    log.action.replace(/_/g, ' '),
                    log.description || '-',
                    log.status || 'N/A'
                ].map(field => `"${field}"`).join(','))
            ].join('\n');

            // Trigger download with UTF-8 BOM for proper encoding
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Activity_Logs_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('Logs downloaded successfully');
        } catch (error) {
            console.error('Error downloading logs:', error);
            alert('Failed to download logs');
        } finally {
            setDownloadingLogs(false);
        }
    };

    return (
        <div className="p-2 md:p-4 h-full overflow-y-auto bg-gradient-to-b from-white to-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Settings</h1>
                    <p className="text-gray-500 text-sm">Manage your account and download activity logs</p>
                </div>
                <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                    <LogOut size={18} /> Logout
                </button>
            </div>

            {/* Admin Profile Section */}
            <button
                onClick={() => toggleSection('profile')}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 mb-4 flex justify-between items-center hover:bg-gray-50 transition"
            >
                <div className="text-left">
                    <h2 className="text-base font-semibold">Admin Profile</h2>
                    <p className="text-sm text-gray-500">View and edit your account information</p>
                </div>
                <ChevronDown size={20} className={`text-brand-dark transition-transform ${expandedSections.profile ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections.profile && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                    {/* Name Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={!isEditing}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${isEditing
                                ? 'border-gray-300 bg-white'
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                }`}
                        />
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={!isEditing}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${isEditing
                                ? 'border-gray-300 bg-white'
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                }`}
                        />
                    </div>

                    {/* Role field removed to prevent role changes from Settings */}

                    {/* Current Password Field (Only when editing) */}
                    {isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    placeholder="Enter current password"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* New Password Field (Only when editing) */}
                    {isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password (Optional)</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    placeholder="Enter new password"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Confirm Password Field (Only when editing and new password entered) */}
                    {isEditing && formData.newPassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="Confirm new password"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${formData.newPassword === formData.confirmPassword && formData.confirmPassword
                                    ? 'border-emerald-500'
                                    : 'border-gray-300'
                                    }`}
                            />
                            {formData.newPassword !== formData.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full py-2 bg-brand text-brand-dark rounded-lg font-semibold hover:shadow-md transition"
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={loading}
                                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 transition"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Download Logs Section */}
            <button
                onClick={() => toggleSection('logs')}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 mb-4 flex justify-between items-center hover:bg-gray-50 transition"
            >
                <div className="text-left">
                    <h2 className="text-base font-semibold">Download Logs</h2>
                    <p className="text-sm text-gray-500">Export activity logs for a date range</p>
                </div>
                <ChevronDown size={20} className={`text-brand-dark transition-transform ${expandedSections.logs ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections.logs && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                        />
                    </div>

                    <button
                        onClick={handleDownloadLogs}
                        disabled={downloadingLogs}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-brand text-brand-dark rounded-lg font-semibold hover:shadow-md disabled:opacity-50 transition"
                    >
                        <Download size={18} />
                        {downloadingLogs ? 'Generating...' : 'Download Logs as CSV'}
                    </button>
                </div>
            )}

            {/* Feedback QR Code Section */}
            <button
                onClick={() => toggleSection('qrcode')}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 mb-4 flex justify-between items-center hover:bg-gray-50 transition"
            >
                <div className="text-left">
                    <h2 className="text-base font-semibold">Feedback QR Code</h2>
                    <p className="text-sm text-gray-500">Generate and download QR code for customer feedback</p>
                </div>
                <ChevronDown size={20} className={`text-brand-dark transition-transform ${expandedSections.qrcode ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections.qrcode && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
                            <QrCode size={24} className="text-yellow-700" />
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Generate a unique QR code for customers to access the feedback form. Only the latest generated QR code will be active.
                        </p>
                    </div>

                    {/* Generate New QR Button */}
                    <button
                        onClick={async () => {
                            setGeneratingKey(true);
                            try {
                                const res = await qrKeyAPI.generate();
                                setActiveQrKey(res.data.key);
                            } catch (err) {
                                console.error('Error generating QR key:', err);
                            } finally {
                                setGeneratingKey(false);
                            }
                        }}
                        disabled={generatingKey}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 hover:shadow-md transition disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={generatingKey ? 'animate-spin' : ''} />
                        {generatingKey ? 'Generating...' : activeQrKey ? 'Generate New QR Code' : 'Generate QR Code'}
                    </button>

                    {activeQrKey && (
                        <>
                            {/* Branded QR Code Preview */}
                            <div className="flex justify-center">
                                <div ref={qrPreviewRef} className="bg-gradient-to-b from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6 w-72 text-center shadow-sm">
                                    <img src="/logo.jpg" alt="JAPZ GRILL" className="w-24 h-24 mx-auto rounded-xl mb-3" />

                                    <p className="text-yellow-700 font-bold text-2xl mb-4" style={{ fontFamily: "'Dancing Script', cursive" }}>Leave us a Review</p>
                                    <div className="bg-white rounded-xl p-3 inline-block shadow-sm mb-4">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`http://10.164.132.96:5173/feedback?key=${activeQrKey}`)}`}
                                            alt="Feedback QR Code"
                                            className="w-40 h-40"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">Scan to share your experience</p>
                                    <p className="text-yellow-700 font-semibold text-sm">Thank you!</p>
                                </div>
                            </div>

                            <p className="text-xs text-center text-gray-400">
                                Links to: {window.location.origin}/feedback?key={activeQrKey}
                            </p>

                            {/* Download Button */}
                            <button
                                onClick={async () => {
                                    try {
                                        // Helper: fetch image as data URL to bypass CORS
                                        const fetchAsDataUrl = async (url: string): Promise<string> => {
                                            const res = await fetch(url);
                                            const blob = await res.blob();
                                            return new Promise((resolve) => {
                                                const reader = new FileReader();
                                                reader.onloadend = () => resolve(reader.result as string);
                                                reader.readAsDataURL(blob);
                                            });
                                        };
                                        const loadImg = (src: string): Promise<HTMLImageElement> =>
                                            new Promise((resolve, reject) => {
                                                const img = new Image();
                                                img.onload = () => resolve(img);
                                                img.onerror = reject;
                                                img.src = src;
                                            });

                                        // Fetch both images as data URLs
                                        const [logoDataUrl, qrDataUrl] = await Promise.all([
                                            fetchAsDataUrl('/logo.jpg'),
                                            fetchAsDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`http://10.164.132.96:5173/feedback?key=${activeQrKey}`)}`),
                                        ]);
                                        const [logoImg, qrImg] = await Promise.all([loadImg(logoDataUrl), loadImg(qrDataUrl)]);

                                        // Ensure Dancing Script font is loaded
                                        try { await document.fonts.load('bold 48px "Dancing Script"'); } catch { }

                                        // 2x scale of the preview (w-72 = 288px)
                                        const S = 2;
                                        const W = 288 * S;
                                        const pad = 24 * S;
                                        const logoSz = 96 * S;
                                        const logoMb = 12 * S;
                                        const titleFontSz = 24 * S;
                                        const titleMb = 16 * S;
                                        const qrPad = 12 * S;
                                        const qrImgSz = 160 * S;
                                        const qrBoxH = qrPad + qrImgSz + qrPad;
                                        const qrMb = 16 * S;
                                        const scanFontSz = 12 * S;
                                        const scanMb = 4 * S;
                                        const thankFontSz = 14 * S;
                                        const H = pad + logoSz + logoMb + titleFontSz + 8 * S + titleMb + qrBoxH + qrMb + scanFontSz + scanMb + thankFontSz + pad;

                                        const canvas = document.createElement('canvas');
                                        canvas.width = W;
                                        canvas.height = H;
                                        const ctx = canvas.getContext('2d')!;

                                        // Background gradient (from-yellow-50 to-orange-50)
                                        const grad = ctx.createLinearGradient(0, 0, 0, H);
                                        grad.addColorStop(0, '#FEFCE8');
                                        grad.addColorStop(1, '#FFF7ED');
                                        ctx.fillStyle = grad;
                                        ctx.beginPath();
                                        ctx.roundRect(0, 0, W, H, 16 * S);
                                        ctx.fill();

                                        // Border (border-2 border-yellow-300)
                                        ctx.strokeStyle = '#FCD34D';
                                        ctx.lineWidth = 2 * S;
                                        ctx.beginPath();
                                        ctx.roundRect(S, S, W - 2 * S, H - 2 * S, 16 * S);
                                        ctx.stroke();

                                        let y = pad;

                                        // Logo (w-24 h-24, rounded-xl)
                                        const logoX = (W - logoSz) / 2;
                                        ctx.save();
                                        ctx.beginPath();
                                        ctx.roundRect(logoX, y, logoSz, logoSz, 12 * S);
                                        ctx.clip();
                                        ctx.drawImage(logoImg, logoX, y, logoSz, logoSz);
                                        ctx.restore();
                                        y += logoSz + logoMb;

                                        // "Leave us a Review" (Dancing Script, bold, text-2xl, text-yellow-700)
                                        ctx.fillStyle = '#B45309';
                                        ctx.font = `bold ${titleFontSz}px "Dancing Script", cursive`;
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText('Leave us a Review', W / 2, y);
                                        y += titleFontSz + 8 * S + titleMb;

                                        // QR white box (bg-white, rounded-xl, p-3, shadow-sm)
                                        const qrBoxW = qrPad + qrImgSz + qrPad;
                                        const qrBoxX = (W - qrBoxW) / 2;
                                        ctx.shadowColor = 'rgba(0,0,0,0.05)';
                                        ctx.shadowBlur = 4 * S;
                                        ctx.shadowOffsetY = 1 * S;
                                        ctx.fillStyle = '#FFFFFF';
                                        ctx.beginPath();
                                        ctx.roundRect(qrBoxX, y, qrBoxW, qrBoxH, 12 * S);
                                        ctx.fill();
                                        ctx.shadowColor = 'transparent';
                                        ctx.shadowBlur = 0;
                                        ctx.shadowOffsetY = 0;
                                        ctx.drawImage(qrImg, qrBoxX + qrPad, y + qrPad, qrImgSz, qrImgSz);
                                        y += qrBoxH + qrMb;

                                        // "Scan to share your experience" (text-xs, text-gray-500)
                                        ctx.fillStyle = '#6B7280';
                                        ctx.font = `${scanFontSz}px Arial, sans-serif`;
                                        ctx.textBaseline = 'top';
                                        ctx.fillText('Scan to share your experience', W / 2, y);
                                        y += scanFontSz + scanMb;

                                        // "Thank you!" (text-sm, font-semibold, text-yellow-700)
                                        ctx.fillStyle = '#B45309';
                                        ctx.font = `600 ${thankFontSz}px Arial, sans-serif`;
                                        ctx.fillText('Thank you!', W / 2, y);

                                        // Download
                                        canvas.toBlob((blob) => {
                                            if (!blob) return;
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'JAPZ_Feedback_QR_Code.png';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }, 'image/png');
                                    } catch (err) {
                                        console.error('Error generating QR poster:', err);
                                        window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`http://10.164.132.96:5173/feedback?key=${activeQrKey}`)}`, '_blank');
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-brand text-brand-dark rounded-lg font-semibold hover:shadow-md transition"
                            >
                                <Download size={18} />
                                Download QR Code as Image
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
