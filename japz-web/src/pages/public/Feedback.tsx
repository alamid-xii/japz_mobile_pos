import { useState, useEffect } from 'react';
import { Star, Send, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { feedbackAPI, qrKeyAPI } from '../../services/api';
import { useSearchParams } from 'react-router-dom';

export default function Feedback() {
    const [searchParams] = useSearchParams();
    const qrKey = searchParams.get('key');

    const [validatingKey, setValidatingKey] = useState(true);
    const [keyValid, setKeyValid] = useState(false);

    const [orderNumber, setOrderNumber] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Generate date prefix as MM-DD
    const getDatePrefix = () => {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${mm}-${dd}`;
    };
    const datePrefix = getDatePrefix();
    const fullOrderNumber = `${datePrefix}-ORD-${orderNumber.trim()}`;

    // Validate the QR key on mount
    useEffect(() => {
        const validateKey = async () => {
            if (!qrKey) {
                setKeyValid(false);
                setValidatingKey(false);
                return;
            }
            try {
                const res = await qrKeyAPI.validate(qrKey);
                setKeyValid(res.data.valid);
            } catch {
                setKeyValid(false);
            } finally {
                setValidatingKey(false);
            }
        };
        validateKey();
    }, [qrKey]);

    useEffect(() => {
        // Check if feedback already submitted for this order (stored in localStorage)
        if (orderNumber) {
            const submittedOrders = JSON.parse(localStorage.getItem('feedbackSubmitted') || '[]');
            if (submittedOrders.includes(fullOrderNumber)) {
                setSubmitted(true);
            }
        }
    }, [orderNumber, fullOrderNumber]);

    const handleSubmit = async () => {
        if (!orderNumber.trim()) {
            setError('Please enter your order number');
            return;
        }
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            await feedbackAPI.submit({
                orderNumber: fullOrderNumber,
                rating,
                comment: comment.trim() || undefined
            });

            // Mark this order as already submitted
            const submittedOrders = JSON.parse(localStorage.getItem('feedbackSubmitted') || '[]');
            submittedOrders.push(fullOrderNumber);
            localStorage.setItem('feedbackSubmitted', JSON.stringify(submittedOrders));

            setSubmitted(true);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getRatingText = (r: number) => {
        switch (r) {
            case 1: return 'Very Poor 😞';
            case 2: return 'Poor 😕';
            case 3: return 'Okay 😐';
            case 4: return 'Good 😊';
            case 5: return 'Excellent! 🤩';
            default: return 'Tap a star to rate';
        }
    };

    const getRatingColor = (r: number) => {
        if (r <= 2) return 'text-red-500';
        if (r === 3) return 'text-yellow-500';
        return 'text-green-500';
    };

    // Loading state while validating key
    if (validatingKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Validating QR code...</p>
                </div>
            </div>
        );
    }

    // Invalid or expired QR code
    if (!keyValid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle size={48} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid QR Code</h1>
                    <p className="text-gray-600 mb-6">
                        This QR code is invalid or has expired. Please scan the latest QR code provided by the restaurant.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-sm text-yellow-800">
                            🍖 Ask the staff for the current QR code at <strong>JAPZ GRILL</strong>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
                    <p className="text-gray-600 mb-6">
                        Your feedback has been submitted successfully. We appreciate you taking the time to share your experience with us!
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-sm text-yellow-800">
                            Visit us again at <strong>JAPZ GRILL</strong>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    <img src="/logo.jpg" alt="JAPZ GRILL" className="w-16 h-16 mx-auto rounded-xl mb-3 shadow-md" />
                    <h1 className="text-2xl font-bold text-gray-800">Rate Your Experience</h1>
                    <p className="text-gray-500 text-sm mt-1">at JAPZ GRILL Burger & Bistro</p>
                </div>

                {/* Order Number Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-yellow-400 focus-within:border-yellow-400 transition">
                        <span className="px-3 py-3 bg-gray-100 text-gray-600 font-mono text-sm border-r border-gray-300 select-none whitespace-nowrap">
                            {datePrefix}-ORD-
                        </span>
                        <input
                            type="text"
                            value={orderNumber}
                            onChange={(e) => {
                                setOrderNumber(e.target.value);
                                setError('');
                            }}
                            placeholder="12345678"
                            className="flex-1 px-3 py-3 text-sm focus:outline-none"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                        Enter the order number from your receipt
                    </p>
                </div>

                {/* Star Rating */}
                <div className="mb-6">
                    <p className="text-center text-gray-600 text-sm mb-4">How would you rate your experience?</p>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 transition-transform hover:scale-110 active:scale-95"
                            >
                                <Star
                                    size={44}
                                    className={`transition-colors ${star <= (hoverRating || rating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-gray-200 text-gray-200'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    <p className={`text-center mt-3 font-medium transition-colors ${getRatingColor(hoverRating || rating)}`}>
                        {getRatingText(hoverRating || rating)}
                    </p>
                </div>

                {/* Comment Field */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Share your thoughts (optional)
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tell us about your experience... What did you enjoy? What can we improve?"
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-none transition"
                    />
                    <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/500</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0 || !orderNumber.trim()}
                    className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${rating === 0 || !orderNumber.trim()
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 hover:shadow-lg active:scale-[0.98]'
                        }`}
                >
                    {submitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-gray-600/30 border-t-gray-600 rounded-full animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Submit Feedback
                        </>
                    )}
                </button>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    Your feedback helps us serve you better 💛
                </p>
            </div>
        </div>
    );
}
