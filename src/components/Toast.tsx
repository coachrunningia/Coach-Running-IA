
import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    subMessage?: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({
    message,
    subMessage,
    isVisible,
    onClose,
    duration = 4000
}) => {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsLeaving(false);
            const timer = setTimeout(() => {
                setIsLeaving(true);
                setTimeout(onClose, 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !isLeaving) return null;

    return (
        <div
            className={`fixed top-6 right-6 z-[200] transition-all duration-300 ${
                isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}
        >
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 p-5 flex items-start gap-4 min-w-[320px] max-w-[400px] animate-in slide-in-from-right-5">
                <div className="bg-emerald-100 p-3 rounded-full">
                    <CheckCircle className="text-emerald-600" size={28} />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-lg">{message}</h4>
                    {subMessage && (
                        <p className="text-sm text-slate-500 mt-1">{subMessage}</p>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsLeaving(true);
                        setTimeout(onClose, 300);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
