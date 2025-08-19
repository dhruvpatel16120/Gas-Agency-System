'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { CreditCard, MessageSquare, Flame, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import UserNavbar from '@/components/UserNavbar';

type PaymentMethod = 'UPI' | 'COD';

export default function BookCylinderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    }
    // Prefill from profile
    const load = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          if (!receiverName) setReceiverName(data.name || '');
          if (!receiverPhone) setReceiverPhone(data.phone || '');
        }
      } catch {
        // no-op
      }
    };
    void load();
  }, [session, status, router]);

  const formatInputDate = (d: Date) => d.toISOString().slice(0, 10);
  const minDate = useMemo(() => formatInputDate(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatInputDate(d);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!['UPI', 'COD'].includes(paymentMethod)) {
      e.paymentMethod = 'Please select a valid payment method';
    }
    if (quantity < 1 || quantity > 3) {
      e.quantity = 'Quantity must be between 1 and 3';
    }
    if (!receiverName || receiverName.trim().length < 2) {
      e.receiverName = 'Receiver name must be at least 2 characters';
    }
    if (!/^([6-9]\d{9})$/.test(receiverPhone.replace(/\s/g, ''))) {
      e.receiverPhone = 'Enter a valid 10-digit phone number';
    }
    if (expectedDate) {
      const date = new Date(expectedDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      const max = new Date();
      max.setDate(max.getDate() + 7);
      max.setHours(23,59,59,999);
      if (!(date >= today && date <= max)) {
        e.expectedDate = 'Expected delivery must be within the next 7 days';
      }
    }
    if (notes.length > 500) {
      e.notes = 'Notes cannot exceed 500 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          quantity,
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.replace(/\s/g, ''),
          expectedDate: expectedDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to create booking');
        return;
      }
      toast.success('Booking created successfully');
      router.push('/user/bookings');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Create booking error:', err);
      toast.error('An error occurred. Please try again');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Book New Cylinder</CardTitle>
              <CardDescription>Choose your payment method, then provide delivery details below.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-8">
                {/* Payment Method - first section */}
                <section>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      aria-pressed={paymentMethod === 'COD'}
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        paymentMethod === 'COD' ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            Cash on Delivery
                            {paymentMethod === 'COD' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </p>
                          <p className="text-sm text-gray-600">Pay when you receive the cylinder</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-pressed={paymentMethod === 'UPI'}
                      onClick={() => setPaymentMethod('UPI')}
                      className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        paymentMethod === 'UPI' ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            UPI Payment
                            {paymentMethod === 'UPI' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                          </p>
                          <p className="text-sm text-gray-600">Use your preferred UPI app</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  {errors.paymentMethod && (
                    <p className="mt-2 text-sm text-red-600">{errors.paymentMethod}</p>
                  )}
                </section>

                {/* Details under payment method */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum 1, maximum 3 cylinders per booking.</p>
                    {errors.quantity && (
                      <p className="mt-2 text-sm text-red-600">{errors.quantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery (optional)</label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Must be within the next 7 days.</p>
                    {errors.expectedDate && (
                      <p className="mt-2 text-sm text-red-600">{errors.expectedDate}</p>
                    )}
                  </div>

                  <div>
                    <Input
                      label="Receiver Name"
                      type="text"
                      placeholder="Person who will receive the delivery"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      error={errors.receiverName}
                    />
                  </div>

                  <div>
                    <Input
                      label="Receiver Phone"
                      type="tel"
                      placeholder="10-digit phone number"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      error={errors.receiverPhone}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Notes (optional)"
                      placeholder="Any special instructions for delivery"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      icon={<MessageSquare className="w-4 h-4" />}
                    />
                    {errors.notes && <p className="mt-2 text-sm text-red-600">{errors.notes}</p>}
                  </div>
                </section>

                <section>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Profile on File</p>
                    <p className="text-sm text-gray-600">Email: {session?.user?.email || '-'}</p>
                    <p className="text-sm text-gray-600">Phone: {receiverPhone || '-'}</p>
                    <p className="text-xs text-gray-500 mt-1">Your saved profile details will be attached to this booking automatically.</p>
                  </div>
                </section>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" loading={loading}>
                  Create Booking
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}


