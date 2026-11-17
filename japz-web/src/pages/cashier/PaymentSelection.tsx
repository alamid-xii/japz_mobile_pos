import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, Check, ChevronLeft, CreditCard, Gift, Receipt, ShoppingBag, Smartphone, Truck, UtensilsCrossed, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import Modal from '../../components/Modal';
import api, { discountsVouchersAPI, paymentAPI } from '../../services/api';
import type { CheckoutDiscount, CheckoutDraft, CheckoutVoucher, OrderType, PaymentMethod } from '../../types/checkout';
import '../../styles/checkout.css';

export default function PaymentSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { total, items = [], itemCount } = (location.state as CheckoutDraft | null) || {};
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discounts, setDiscounts] = useState<CheckoutDiscount[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<CheckoutDiscount | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<CheckoutVoucher | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<OrderType | ''>('');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gatewayLive, setGatewayLive] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [promotionsOpen, setPromotionsOpen] = useState(false);
  const proceeding = useRef(false);

  useEffect(() => {
    void discountsVouchersAPI.getDiscounts().then(response => setDiscounts((response.data as CheckoutDiscount[]).filter(discount => discount.enabled))).catch(() => setDiscounts([]));
    void paymentAPI.config().then(response => setGatewayLive(Boolean(response.data.enabled))).catch(() => setGatewayLive(false));
  }, []);
  const subtotal = Number(total || 0);
  const discountAmount = selectedDiscount ? subtotal * Number(selectedDiscount.percentage) / 100 : 0;
  const voucherAmount = appliedVoucher ? Number(appliedVoucher.amount) || 0 : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount - voucherAmount);
  const count = itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0);

  const validateVoucher = async () => {
    if (voucherBusy) return;
    if (!voucherCode.trim()) { setVoucherError(''); setAppliedVoucher(null); return; }
    setVoucherBusy(true);
    try {
      const vouchers = (await discountsVouchersAPI.getVouchers()).data as CheckoutVoucher[];
      const voucher = vouchers.find(value => value.code === voucherCode.trim().toUpperCase());
      const now = Date.now();
      const message = !voucher ? 'Voucher code not found' : voucher.used ? 'This voucher has already been used' : !voucher.enabled ? 'This voucher is disabled' : now < Date.parse(voucher.startDate) || now > Date.parse(voucher.endDate) ? 'This voucher is not valid for today' : '';
      if (message || !voucher) { setVoucherError(message); setAppliedVoucher(null); }
      else { setAppliedVoucher(voucher); setVoucherError(''); }
    } catch { setVoucherError('Error validating voucher'); setAppliedVoucher(null); }
    finally { setVoucherBusy(false); }
  };
  const validate = () => {
    const invalid: Record<string, string> = {};
    if (!customerName.trim()) invalid.customerName = 'Customer name is required';
    if (!orderType) invalid.orderType = 'Please select an order type';
    if (orderType === 'dine-in' && !tableNumber.trim()) invalid.tableNumber = 'Table number is required for dine-in';
    if (orderType === 'delivery' && !deliveryAddress.trim()) invalid.deliveryAddress = 'Delivery address is required';
    setErrors(invalid);
    const first = Object.keys(invalid)[0];
    if (first) requestAnimationFrame(() => document.getElementById(`checkout-${first}`)?.focus());
    return !first;
  };
  const handleProceed = async () => {
    if (proceeding.current || !validate()) return;
    proceeding.current = true;
    setCheckingStock(true);
    try {
      await api.post('/api/inventory/cart-check', { orderType, items: items.map(item => ({ id: item.id, quantity: item.quantity, modifiers: { size: item.selectedSize || null, flavor: item.selectedFlavor || null, temperature: item.selectedTemperature || null } })) });
      const useGateway = finalTotal > 0 && gatewayLive && (paymentMethod === 'card' || paymentMethod === 'digital');
      navigate('/cashier/cash-payment', { state: {
        total: finalTotal.toFixed(2), subtotal: subtotal.toFixed(2), discount: discountAmount.toFixed(2), discountPercent: selectedDiscount ? selectedDiscount.percentage : 0,
        discountId: selectedDiscount?.id, voucherCode: appliedVoucher?.code, voucherAmount: appliedVoucher?.amount,
        items, itemCount: count, paymentMethod: useGateway ? 'gateway' : paymentMethod, gatewayMethod: useGateway ? paymentMethod === 'card' ? 'card' : 'gcash' : undefined,
        customerName: customerName.trim(), orderType, tableNumber: orderType === 'dine-in' ? tableNumber.trim() : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined, notes: notes.trim() || undefined,
      } });
    } catch (failure) {
      const message = isAxiosError<{ error?: string }>(failure) ? failure.response?.data?.error : undefined;
      setErrors(previous => ({ ...previous, stock: message || 'Could not check stock. Try again.' }));
    } finally { proceeding.current = false; setCheckingStock(false); }
  };
  if (total === undefined || total === null || !items.length) return <div className="checkout-empty"><h1>No order to check out</h1><p>Add items from the menu to start an order.</p><button className="checkout-primary" onClick={() => navigate('/cashier/pos')}>Back to POS</button></div>;

  const methods = [{ key: 'cash', label: 'Cash Payment', short: 'Cash', icon: Banknote }, { key: 'card', label: 'Card Payment', short: 'Card', icon: CreditCard }, { key: 'digital', label: 'Digital Payment', short: 'Digital', icon: Smartphone }] as const;
  const orderTypes = [{ key: 'dine-in', label: 'Dine In', icon: UtensilsCrossed }, { key: 'take-out', label: 'Takeout', icon: ShoppingBag }, { key: 'delivery', label: 'Delivery', icon: Truck }] as const;
  const breakdown = <dl className="checkout-breakdown"><div><dt>Subtotal ({count} items)</dt><dd>₱{subtotal.toFixed(2)}</dd></div><div><dt>Discount{selectedDiscount ? ` (${selectedDiscount.percentage}%)` : ''}</dt><dd>−₱{discountAmount.toFixed(2)}</dd></div><div><dt>Voucher{appliedVoucher ? ` (${appliedVoucher.code})` : ''}</dt><dd>−₱{voucherAmount.toFixed(2)}</dd></div></dl>;

  return <div className="checkout-page">
    <header className="checkout-header"><button type="button" className="checkout-back" onClick={() => navigate(-1)}><ChevronLeft size={19} />Back</button><div><h1>Complete Order</h1><p>Order details → Collect payment</p></div><span className="checkout-item-count">{count} items</span></header>
    {errors.stock && <div role="alert" className="checkout-error"><span>{errors.stock}</span><button type="button" onClick={() => navigate('/cashier/pos')}>Return to cart</button></div>}
    <div className="checkout-layout">
      <section className="checkout-details checkout-panel" aria-label="Order details"><div className="checkout-panel-title"><Receipt size={19} /><h2>Order details</h2></div><div className="checkout-details-scroll">
        <label className="checkout-field" htmlFor="checkout-customerName"><span>Customer Name <em>*</em></span><input id="checkout-customerName" type="text" placeholder="Enter customer name" value={customerName} aria-invalid={Boolean(errors.customerName)} aria-describedby={errors.customerName ? 'checkout-customer-error' : undefined} onChange={event => { setCustomerName(event.target.value); setErrors(previous => ({ ...previous, customerName: '' })); }} />{errors.customerName && <small id="checkout-customer-error">{errors.customerName}</small>}</label>
        <div className="checkout-field"><span>Order Type <em>*</em></span><div id="checkout-orderType" tabIndex={-1} role="group" aria-label="Order type" aria-invalid={Boolean(errors.orderType)} className="checkout-order-types">{orderTypes.map(({ key, label, icon: Icon }) => <button type="button" aria-pressed={orderType === key} key={key} onClick={() => { setOrderType(key); setErrors(previous => ({ ...previous, orderType: '', tableNumber: '', deliveryAddress: '' })); }}><Icon size={20} /><span>{label}</span></button>)}</div>{errors.orderType && <small>{errors.orderType}</small>}</div>
        {orderType === 'dine-in' && <label className="checkout-field" htmlFor="checkout-tableNumber"><span>Table Number <em>*</em></span><input id="checkout-tableNumber" type="text" placeholder="Enter table number" value={tableNumber} aria-invalid={Boolean(errors.tableNumber)} onChange={event => { setTableNumber(event.target.value); setErrors(previous => ({ ...previous, tableNumber: '' })); }} />{errors.tableNumber && <small>{errors.tableNumber}</small>}</label>}
        {orderType === 'delivery' && <label className="checkout-field" htmlFor="checkout-deliveryAddress"><span>Delivery Address <em>*</em></span><textarea id="checkout-deliveryAddress" rows={2} placeholder="Enter delivery address" value={deliveryAddress} aria-invalid={Boolean(errors.deliveryAddress)} onChange={event => { setDeliveryAddress(event.target.value); setErrors(previous => ({ ...previous, deliveryAddress: '' })); }} />{errors.deliveryAddress && <small>{errors.deliveryAddress}</small>}</label>}
        <details className="checkout-notes"><summary>Notes / special instructions <span>Optional</span></summary><label className="checkout-field" htmlFor="checkout-notes"><span className="sr-only">Notes</span><textarea id="checkout-notes" aria-label="Notes" placeholder="Any special instructions…" rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label></details>
      </div></section>
      <section className="checkout-payment-pane checkout-panel" aria-label="Payment controls"><div className="checkout-panel-title"><Banknote size={19} /><h2>Payment</h2></div>
        <div className="checkout-payment-methods" role="group" aria-label="Payment method">{methods.map(({ key, label, short, icon: Icon }) => <button type="button" key={key} aria-label={label} aria-pressed={paymentMethod === key} onClick={() => setPaymentMethod(key)}><Icon size={22} /><span>{short}</span>{paymentMethod === key && <Check size={15} className="checkout-method-check" />}</button>)}</div>
        <button type="button" className="checkout-promotion-trigger" onClick={() => setPromotionsOpen(true)}><Gift size={18} /><span>Discount, voucher & breakdown</span><span>{selectedDiscount || appliedVoucher ? 'Applied' : 'Optional'}</span></button>
        <div className="checkout-pay-controls"><div className="checkout-desktop-breakdown">{breakdown}</div><div className="checkout-total"><span>Total due</span><strong>₱{finalTotal.toFixed(2)}</strong></div><button type="button" className="checkout-primary" disabled={checkingStock} onClick={() => void handleProceed()}>{checkingStock ? 'Checking stock…' : 'Proceed to Payment'}<ArrowRight size={19} /></button></div>
      </section>
    </div>
    {promotionsOpen && <Modal label="Discounts and voucher" onClose={() => setPromotionsOpen(false)} className="checkout-promotions"><header><h2>Discounts & voucher</h2><button type="button" aria-label="Close discounts" onClick={() => setPromotionsOpen(false)}><X size={20} /></button></header><h3>Discount</h3>{discounts.length ? <div className="checkout-discounts">{discounts.map(discount => <button type="button" key={discount.id} aria-pressed={selectedDiscount?.id === discount.id} onClick={() => setSelectedDiscount(previous => previous?.id === discount.id ? null : discount)}><strong>{discount.name}</strong><span>{discount.percentage}% off</span></button>)}</div> : <p>No discounts available.</p>}{selectedDiscount && <button type="button" className="checkout-clear" onClick={() => setSelectedDiscount(null)}>Clear discount</button>}<h3>Voucher</h3><div className="checkout-voucher"><input aria-label="Voucher code" value={voucherCode} onChange={event => setVoucherCode(event.target.value.toUpperCase())} placeholder="Enter code" /><button type="button" disabled={voucherBusy} onClick={() => void validateVoucher()}>{voucherBusy ? 'Checking…' : 'Apply'}</button></div>{voucherError && <p className="checkout-voucher-error" role="alert">{voucherError}</p>}{appliedVoucher && <div className="checkout-applied"><span>{appliedVoucher.code} · −₱{Number(appliedVoucher.amount).toFixed(2)}</span><button type="button" onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }}>Remove voucher</button></div>}<h3>Order breakdown</h3>{breakdown}<div className="checkout-total"><span>Total due</span><strong>₱{finalTotal.toFixed(2)}</strong></div><button type="button" className="checkout-primary" onClick={() => setPromotionsOpen(false)}>Done</button></Modal>}
  </div>;
}
