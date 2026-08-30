import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '../CustomerAuthContext';

interface Props {
    notifications: Notification[];
    onClose: () => void;
    onOpenOrder: (orderNumber: string) => void;
    onMarkRead: () => void;
}

export default function NotificationPanel({ notifications, onClose, onOpenOrder, onMarkRead }: Props) {
    return (
        <div className="fixed inset-0 z-50" onClick={onClose}>
            <div className="absolute inset-0 bg-black/20" />
            <div
                className="absolute top-14 right-2 left-2 sm:left-auto sm:w-96 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-[slideDown_200ms_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="font-extrabold text-gray-900 text-sm">Notifications</p>
                    {notifications.some(n => n.unread) && (
                        <button
                            onClick={onMarkRead}
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-900"
                        >
                            <CheckCheck size={13} /> Mark all read
                        </button>
                    )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <Bell size={26} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No updates yet.</p>
                            <p className="text-xs text-gray-400 mt-1">You'll hear from us when your order moves.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {notifications.map(n => (
                                <li key={n.orderNumber + n.status}>
                                    <button
                                        onClick={() => { onOpenOrder(n.orderNumber); onClose(); }}
                                        className={`w-full text-left px-4 py-3 flex gap-3 active:bg-gray-50 transition duration-150 ${
                                            n.unread ? 'bg-brand/5' : ''
                                        }`}
                                    >
                                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.unread ? 'bg-brand' : 'bg-transparent'}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-gray-900">{n.title}</span>
                                            <span className="block text-xs text-gray-500">{n.body}</span>
                                            <span className="block text-[11px] text-gray-400 mt-0.5">
                                                {n.orderNumber} · {new Date(n.at).toLocaleString()}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
