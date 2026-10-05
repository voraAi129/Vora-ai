import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Mail, Phone, MessageSquare, CheckCircle2, ChevronDown, Clock } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { SupportTicket } from '../types';

interface SupportModalProps {
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ onClose }) => {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    api.getUserTickets().then(res => setUserTickets(res.tickets)).catch(() => {});
  }, []);

  const faqs = [
    {
      q: 'How does the 24-hour reward session work?',
      a: 'When you start a session, an authoritative server-side timer is initiated. Complete 24 uninterrupted hours of verified account participation to become eligible for the promotional loyalty bonus.'
    },
    {
      q: 'What is the minimum recharge and withdrawal limit?',
      a: 'The minimum recharge is ₹100 and maximum is ₹10,000. Minimum withdrawal is ₹200 and maximum is ₹25,000 per transaction.'
    },
    {
      q: 'How long do withdrawals take to reflect?',
      a: 'Approved withdrawals typically settle to your bank account or UPI within 1 to 24 business hours following automated compliance verification.'
    },
    {
      q: 'Why are rewards not credited immediately when I click Watch Ad?',
      a: 'In compliance with Google AdMob policies and anti-fraud standards, rewards are only granted after the complete video has finished playing and is verified by our server challenge token.'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    try {
      setLoading(true);
      sound.playTap();
      const res = await api.createSupportTicket(ticketSubject, ticketMessage);
      sound.playSuccess();
      setSubmitted(true);
      setUserTickets([res.ticket, ...userTickets]);
      setTicketSubject('');
      setTicketMessage('');
    } catch (err: any) {
      sound.playError();
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-md h-[540px] bg-slate-900 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-white">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Help, Support & FAQ
            </span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Quick Contact Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Email Us</span>
                <span className="font-mono text-white text-[11px]">support@voraearning.com</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Toll-Free Helpline</span>
                <span className="font-mono text-white text-[11px]">+91 8000 123 456</span>
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div>
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider mb-2">
              Frequently Asked Questions
            </h4>
            <div className="space-y-1.5">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setExpandedFaq(expandedFaq === i ? null : i);
                    }}
                    className="w-full p-2.5 text-left flex items-center justify-between text-xs font-semibold text-slate-200"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedFaq === i ? 'rotate-180 text-emerald-400' : 'text-slate-500'}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className="px-2.5 pb-2.5 text-[11px] text-slate-400 leading-relaxed border-t border-slate-900 pt-1.5">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Support Ticket */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Raise Support Ticket</span>
            </h4>

            {submitted ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="font-semibold text-white">Ticket Submitted</p>
                <p className="text-[10px] text-slate-400">Our customer success team will reach out within 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="text"
                  placeholder="Subject / Issue Category"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  required
                />
                <textarea
                  rows={2}
                  placeholder="Describe your issue with transaction IDs if applicable..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  {loading ? 'Submitting...' : 'Send Inquiry'}
                </button>
              </form>
            )}
          </div>

          {/* Previous Tickets */}
          {userTickets.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                My Support Tickets
              </h4>
              {userTickets.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{t.subject}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      t.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{t.message}</p>
                  {t.adminReply && (
                    <div className="mt-1 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                      <span className="font-bold">Support Agent Reply:</span> {t.adminReply}
                    </div>
                  )}
                  <p className="text-[9px] text-slate-500 font-mono">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
