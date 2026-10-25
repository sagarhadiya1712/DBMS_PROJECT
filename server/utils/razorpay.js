const Razorpay = require('razorpay');
const crypto = require('crypto');

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

let instance = null;
if (key_id && key_secret) {
  try {
    instance = new Razorpay({ key_id, key_secret });
  } catch (err) {
    console.warn('⚠️ Razorpay initialization warning:', err.message);
  }
}

async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  // Amount in paise
  const amountInPaise = Math.round(amount * 100);

  if (instance) {
    try {
      const order = await instance.orders.create({
        amount: amountInPaise,
        currency,
        receipt: String(receipt),
        notes
      });
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id,
        isSimulated: false
      };
    } catch (err) {
      console.warn('⚠️ Real Razorpay order failed, falling back to simulator:', err.message);
    }
  }

  // Realistic test simulator order
  const mockOrderId = 'order_' + crypto.randomBytes(8).toString('hex');
  return {
    id: mockOrderId,
    amount: amountInPaise,
    currency,
    key_id: key_id || '',
    isSimulated: true
  };
}

function verifyRazorpaySignature({ order_id, payment_id, signature }) {
  if (!signature) return false;
  // If simulated mode (no live Razorpay keys configured)
  if (order_id.startsWith('order_') && (!instance || !key_secret)) {
    return true;
  }

  const generatedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  return generatedSignature === signature;
}

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId: () => key_id
};
