import { getRazorpayKey } from '../utils/razorpayUtils';
import { auth } from '../lib/firebase';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const initializePayment = async (amountInRupees: number, userId: string, userInfo: any) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: amountInRupees * 100, // Convert to paise
        userId,
      }),
    });

    const orderData = await response.json();
    if (!response.ok) throw new Error(orderData.error || 'Failed to create order');

    if (orderData.is_mock) {
      // Simulate payment delay when no Razorpay keys are configured
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: `mock_pay_${Date.now()}`,
            razorpay_signature: `mock_sign_${Date.now()}`
          });
        }, 1500);
      }).then(async (response: any) => {
        const verifyRes = await fetch('/api/payments/verify-payment', {
          method: 'POST',
          headers,
          body: JSON.stringify(response)
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          return response;
        } else {
          throw new Error('Payment verification failed');
        }
      });
    }

    return new Promise((resolve, reject) => {
      const options: RazorpayOptions = {
        key: getRazorpayKey(),
        amount: orderData.amount,
        currency: orderData.currency,
        name: "JH Digital Seva Kendra",
        description: "Wallet Refill",
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              resolve(response);
            } else {
              reject(new Error(verifyData.message || 'Payment verification failed'));
            }
          } catch (error) {
            reject(error);
          }
        },
        prefill: {
          name: userInfo.name || '',
          email: userInfo.email || '',
          contact: userInfo.phone || '',
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        reject(new Error(response.error.description));
      });
      rzp.open();
    });
  } catch (error) {
    throw error;
  }
};
