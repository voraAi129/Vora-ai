import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  X,
  RefreshCw,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { sound } from '../services/audio';

interface RazorpayModalProps {
  orderId: string;
  amount: number;
  userName: string;
  userMobile: string;
  keyId: string;
  onSuccess: (paymentId: string, signature: string) => void;
  onFailure: (reason: string) => void;
  onClose: () => void;
}

// Extend window type for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  orderId,
  amount,
  userName,
  userMobile,
  keyId,
  onSuccess,
  onFailure,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const razorpayRef = useRef<any>(null);

  useEffect(() => {
    // Load Razorpay Checkout script dynamically
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      initRazorpay();
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => initRazorpay();
    script.onerror = () => {
      setLoading(false);
      setError('Payment gateway unavailable. Check your internet connection.');
    };
    document.head.appendChild(script);

    return () => {
      // Close Razorpay popup on unmount
      if (razorpayRef.current) {
        try { razorpayRef.current.close(); } catch {}
      }
    };
  }, []);

  const initRazorpay = () => {
    if (!window.Razorpay) {
      setLoading(false);
      setError('Razorpay SDK failed to load. Please try again.');
      return;
    }

    const options = {
      key: keyId,
      amount: amount * 100, // in paise
      currency: 'INR',
      name: 'VORA EARNING',
      description: 'Wallet Recharge',
      order_id: orderId,
      prefill: {
        name: userName,
        contact: `+91${userMobile}`
      },
      theme: {
        color: '#10b981' // emerald-500
      },
      modal: {
        ondismiss: () => {
          sound.playTap();
          onClose();
        },
        animation: true
      },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        sound.playSuccess();
        onSuccess(response.razorpay_payment_id, response.razorpay_signature);
      }
    };

    try {
      razorpayRef.current = new window.Razorpay(options);

      // Handle payment failure from Razorpay
      razorpayRef.current.on('payment.failed', (response: any) => {
        sound.playError();
        const reason = response?.error?.description || 'Payment failed at gateway';
        onFailure(reason);
      });

      razorpayRef.current.open();
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError('Failed to open payment gateway. Please try again.');
    }
  };

  // While Razorpay loads, show a loading overlay
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center select-none">
        <div className="w-72 bg-[#0c1322] border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl text-white p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="font-extrabold text-blue-400 text-xl font-mono">R</span>
          </div>
          <p className="text-sm font-semibold text-white mb-1">Opening Razorpay</p>
          <p className="text-xs text-slate-400 mb-4">Securing payment gateway...</p>
          <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mx-auto" />
        </div>
      </div>
    );
  }

  // If there's an error loading
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-[#0c1322] border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl text-white">
          <div className="bg-[#0b1933] p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="font-extrabold text-white text-xs font-mono">R</span>
              </div>
              <span className="text-xs font-bold text-white">Razorpay Secure Checkout</span>
            </div>
            <button
              onClick={() => { sound.playTap(); onClose(); }}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Payment Gateway Error</p>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
            <button
              onClick={() => { sound.playTap(); onClose(); }}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
            >
              Go Back
            </button>
          </div>

          <div className="p-3 bg-slate-950 text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1 border-t border-slate-800">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Secured by Razorpay Payments India Pvt Ltd</span>
          </div>
        </div>
      </div>
    );
  }

  // Razorpay's native modal is open — show minimal overlay so user can see it
  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center select-none">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#0c1322] border border-slate-700 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-xs text-slate-300">Complete payment in the Razorpay window</p>
      </div>
    </div>
  );
};
