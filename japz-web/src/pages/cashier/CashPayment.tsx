import { createRequestId } from '../../utils/requestId';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Delete, Check, ChevronLeft, Receipt, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import Modal from '../../components/Modal';
import type { CheckoutDraft } from '../../types/checkout';
import PosGatewayPayment from '../../components/PosGatewayPayment';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/checkout.css';

const paymentError = (error: unknown, fallback: string) => isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || fallback : fallback;

export default function CashPayment() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const {
        total, subtotal, discount, discountId, voucherCode, voucherAmount, items, paymentMethod = 'cash',
        customerName, orderType, tableNumber, deliveryAddress, notes, gatewayMethod
    } = (location.state as CheckoutDraft | null) || {};

    const [amountReceived, setAmountReceived] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [clientRequestId] = useState(createRequestId);
    const [orderNumber] = useState(() => `ORD-${Date.now()}-${createRequestId().slice(0, 8)}`);

    const paying = useRef(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const totalNum = Number(total || 0);
    const received = Number(amountReceived || 0);
    const change = received - totalNum;
    const isCash = paymentMethod === 'cash';
    const isFree = totalNum === 0;
    const isValidPayment = isFree || (isCash ? Number.isFinite(received) && received >= totalNum : true);

    const quickAmounts = [50, 100, 200, 500, 1000];


    // Gateway payments have no cash to count: the order is created unpaid and
    // released only once PayMongo confirms.
    const isGateway = paymentMethod === 'gateway';
    const [gatewayOrder, setGatewayOrder] = useState<string | null>(null);
    const [gatewayError, setGatewayError] = useState<string | null>(null);
    const startedRef = useRef(false);

    const buildOrder = (orderNumber: string) => {
        const itemsArray = Array.isArray(items) ? items : [];
        return {
            orderNumber,
            clientRequestId,
            cashierId: user?.id,
            cashier: user?.name,
            customerName,
            total: totalNum,
            subtotal: Number(subtotal || totalNum),
            discount: Number(discount || 0),
            discountId: discountId || null,
            voucherCode: voucherCode || null,
            voucherAmount: voucherAmount ? Number(voucherAmount) : null,
            payment: {
                method: 'digital' as const,
                amount: totalNum,
                amountReceived: 0,
                change: 0,
                provider: 'PayMongo',
                status: 'pending',
            },
            items: itemsArray.map((i) => ({
                id: i.id.toString(),
                name: i.name,
                price: i.itemPrice || i.price,
                quantity: i.quantity,
                total: (i.itemPrice || i.price) * i.quantity,
                modifiers: { size: i.selectedSize || null, flavor: i.selectedFlavor || null, temperature: i.selectedTemperature || null },
            })),
            // Held out of the kitchen queue until the money is confirmed.
            status: 'awaiting-payment',
            orderType: orderType || null,
            tableNumber: tableNumber || null,
            deliveryAddress: deliveryAddress || null,
            notes: notes || null,
        };
    };

    // Creates the unpaid order once, then hands over to the QR screen.
    useEffect(() => {
        if (!isGateway || startedRef.current || !total) return;
        startedRef.current = true;
        (async () => {
            const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
            try {
                await ordersAPI.create(buildOrder(orderNumber));
                setGatewayOrder(orderNumber);
            } catch (e: unknown) {
                setGatewayError(paymentError(e, 'Could not start the order.'));
                startedRef.current = false;
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGateway, total]);

    const finishGateway = () => {
        localStorage.removeItem('cashierCart');
        navigate('/cashier/receipt', {
            state: {
                orderNumber: gatewayOrder,
                total: totalNum,
                subtotal: Number(subtotal || totalNum),
                discount: Number(discount || 0),
                discountId: discountId || null,
                voucherCode: voucherCode || null,
                voucherAmount: voucherAmount ? Number(voucherAmount) : null,
                amountReceived: totalNum,
                change: 0,
                items,
                method: 'digital',
                customerName, orderType, tableNumber, deliveryAddress,
                cashier: user?.name,
            },
            replace: true,
        });
    };

    if (total === undefined || total === null || !items?.length) return <div className="checkout-empty"><h1>No order to check out</h1><p>Add items from the menu to start an order.</p><button className="checkout-primary" onClick={() => navigate('/cashier/pos')}>Back to POS</button></div>;

    if (isGateway) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center justify-center h-full">
                {gatewayError ? (
                    <div className="max-w-sm text-center">
                        <p className="font-bold text-slate-900 mb-1">Could not start the payment</p>
                        <p className="text-sm text-slate-500 mb-4">{gatewayError}</p>
                        <button onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold">
                            Go back
                        </button>
                    </div>
                ) : !gatewayOrder ? (
                    <p className="text-slate-500 text-sm">Creating the order…</p>
                ) : (
                    <PosGatewayPayment
                        orderNumber={gatewayOrder}
                        total={totalNum}
                        onPaid={finishGateway}
                        onClose={() => navigate('/cashier/pos', { replace: true })}
                        initialMethod={gatewayMethod}
                    />
                )}
            </div>
        );
    }

    const handlePay = async () => {
        if (!isValidPayment || processing || paying.current) return;
        paying.current = true;
        setError('');

        setProcessing(true);
        try {
            const itemsArray = Array.isArray(items) ? items : [];
            const orderData = {
                orderNumber,
                clientRequestId,
                cashierId: user?.id,
                cashier: user?.name,
                customerName,
                total: totalNum,
                subtotal: Number(subtotal || totalNum),
                discount: Number(discount || 0),
                discountId: discountId || null,
                voucherCode: voucherCode || null,
                voucherAmount: voucherAmount ? Number(voucherAmount) : null,
                payment: {
                    method: paymentMethod as 'cash' | 'card' | 'digital',
                    amount: totalNum,
                    amountReceived: isCash ? received : totalNum,
                    change: isCash ? Math.round(change * 100) / 100 : 0
                },
                items: itemsArray.map((i) => ({
                    id: i.id.toString(),
                    name: i.name,
                    price: i.itemPrice || i.price,
                    quantity: i.quantity,
                    total: (i.itemPrice || i.price) * i.quantity,
                    modifiers: { size: i.selectedSize || null, flavor: i.selectedFlavor || null, temperature: i.selectedTemperature || null }
                })),
                status: 'pending',
                orderType: orderType || null,
                tableNumber: tableNumber || null,
                deliveryAddress: deliveryAddress || null,
                notes: notes || null,
            };
            await ordersAPI.create(orderData);
            localStorage.removeItem('cashierCart');
            navigate('/cashier/receipt', {
                state: {
                    orderNumber,
                    total: totalNum,
                    subtotal: Number(subtotal || totalNum),
                    discount: Number(discount || 0),
                    discountId: discountId || null,
                    voucherCode: voucherCode || null,
                    voucherAmount: voucherAmount ? Number(voucherAmount) : null,
                    amountReceived: isCash ? received : totalNum,
                    change: isCash ? Math.round(change * 100) / 100 : 0,
                    items,
                    method: paymentMethod,
                    customerName,
                    orderType,
                    tableNumber,
                    deliveryAddress,
                    cashier: user?.name
                },
                replace: true
            });
        } catch (e: unknown) {
            console.error('Payment error:', e);
            setError(paymentError(e, 'Payment could not be saved. Retry the payment or return to the cart.'));
        }
        finally { paying.current = false; setProcessing(false); }
    };

    const pressKey = (key: string) => setAmountReceived(previous => {
        if (key === 'clear') return '';
        if (key === 'backspace') return previous.slice(0, -1);
        if (key === '.') return previous.includes('.') ? previous : `${previous || '0'}.`;
        const next = previous === '0' ? key : previous + key;
        return /^\d{0,9}(\.\d{0,2})?$/.test(next) ? next : previous;
    });
    const overview = <><dl className="cash-order-facts"><div><dt>Customer</dt><dd>{customerName || 'Walk-in'}</dd></div><div><dt>Order type</dt><dd>{(orderType || '').replaceAll('-', ' ')}</dd></div>{tableNumber && <div><dt>Table</dt><dd>{tableNumber}</dd></div>}{deliveryAddress && <div><dt>Address</dt><dd>{deliveryAddress}</dd></div>}</dl><ul className="cash-order-items">{items.map((item, index) => <li key={`${item.id}-${index}`}><div><strong>{item.quantity}× {item.name}</strong><p>{[item.selectedSize, item.selectedFlavor, item.selectedTemperature].filter(Boolean).join(' · ')}</p></div><span>₱{((item.itemPrice || item.price) * item.quantity).toFixed(2)}</span></li>)}</ul><dl className="checkout-breakdown"><div><dt>Subtotal</dt><dd>₱{Number(subtotal || totalNum).toFixed(2)}</dd></div><div><dt>Discount</dt><dd>−₱{Number(discount || 0).toFixed(2)}</dd></div><div><dt>Voucher</dt><dd>−₱{Number(voucherAmount || 0).toFixed(2)}</dd></div></dl>{notes && <p className="checkout-note-text">Notes: {notes}</p>}</>;
    return <div className="checkout-page cash-page">
        <header className="checkout-header"><button type="button" className="checkout-back" disabled={processing} onClick={() => navigate(-1)}><ChevronLeft size={19} />Back</button><div><h1>{paymentMethod[0].toUpperCase() + paymentMethod.slice(1)} Payment</h1><p>{customerName || 'Walk-in'} · {(orderType || '').replaceAll('-', ' ')}</p></div><button type="button" className="cash-review-button" aria-label="Review order" onClick={() => setReviewOpen(true)}><Receipt size={18} /><span>Review order</span></button></header>
        {error && <div className="checkout-error" role="alert"><span>{error}</span><button type="button" disabled={processing} onClick={() => navigate('/cashier/pos')}>Return to cart</button></div>}
        <div className="cash-layout">
            <section className="cash-overview checkout-panel" aria-label="Order summary"><div className="checkout-panel-title"><Receipt size={19} /><h2>Order summary</h2></div><div className="cash-overview-scroll">{overview}</div><div className="checkout-total"><span>Amount due</span><strong>₱{totalNum.toFixed(2)}</strong></div></section>
            <section className="cash-collector checkout-panel" aria-label="Collect payment"><div className="cash-due"><span>Amount due</span><strong>₱{totalNum.toFixed(2)}</strong></div>
                {isCash && !isFree ? <><div className="cash-amount"><label htmlFor="cashpayment-field-1">Amount Received</label><div><input id="cashpayment-field-1" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amountReceived} disabled={processing} onChange={event => { if (/^\d{0,9}(\.\d{0,2})?$/.test(event.target.value)) setAmountReceived(event.target.value); }} onKeyDown={event => { if (event.key === 'Enter') void handlePay(); }} /><button type="button" disabled={processing} aria-label="Exact amount" onClick={() => setAmountReceived(totalNum.toFixed(2))}>Exact</button><button type="button" disabled={processing} aria-label="Clear amount" onClick={() => pressKey('clear')}>Clear</button></div></div>
                <div className="cash-keypad-area"><div className="cash-quick-grid" role="group" aria-label="Quick cash amounts">{quickAmounts.map(amount => <button type="button" disabled={processing} aria-pressed={Number(amountReceived) === amount} key={amount} onClick={() => setAmountReceived(String(amount))}>₱{amount}</button>)}</div><div className="cash-keypad" role="group" aria-label="Cash keypad">{['1','2','3','4','5','6','7','8','9','.','0','backspace'].map(key => <button type="button" key={key} disabled={processing} aria-label={key === 'backspace' ? 'Delete last digit' : key === '.' ? 'Decimal point' : key} onClick={() => pressKey(key)}>{key === 'backspace' ? <Delete size={23} /> : key}</button>)}</div></div></> : <div className="cash-payment-message"><Check size={32} /><h2>{isFree ? 'Order is Complimentary' : `Ready for ${paymentMethod} payment`}</h2><p>{isFree ? 'No charge due to applied discount or voucher.' : 'Confirm the payment has been collected before completing the transaction.'}</p></div>}
                <div className="cash-confirm"><div className="cash-change" aria-live="polite"><span>{isCash && !isFree && received < totalNum ? 'Still due' : 'Change'}</span><strong>{isCash && !isFree ? `₱${Math.abs(change).toFixed(2)}` : '₱0.00'}</strong></div><button type="button" className="checkout-primary" disabled={!isValidPayment || processing} onClick={() => void handlePay()}>{processing ? 'Processing…' : isFree ? 'Complete Order (Free)' : 'Complete Transaction'}<Check size={20} /></button></div>
            </section>
        </div>
        {reviewOpen && <Modal label="Review payment order" onClose={() => setReviewOpen(false)} className="checkout-promotions"><header><h2>Review order</h2><button type="button" aria-label="Close order review" onClick={() => setReviewOpen(false)}><X size={20} /></button></header>{overview}<div className="checkout-total"><span>Amount due</span><strong>₱{totalNum.toFixed(2)}</strong></div><button type="button" className="checkout-primary" onClick={() => setReviewOpen(false)}>Back to payment</button></Modal>}
    </div>;
}
