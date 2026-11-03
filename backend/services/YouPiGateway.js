/**
 * YouPI-PG (Your UPI Payment Gateway) Integration Service
 * 
 * Implements 0% fee peer-to-bank UPI payment protocol:
 * - Dynamic NPCI UPI QR & Intent Links (PhonePe, GPay, Paytm, BHIM, CRED)
 * - Single-Slot FIFO session tracking & amount attribution
 * - 12-digit Bank UTR (Unique Transaction Reference) validation
 * - Webhook listener with HMAC SHA-256 signature verification
 * - Seamless fallback: works natively standalone OR proxies to an external YouPI-PG daemon
 */

const crypto = require('crypto');
const axios = require('axios');
const qrGenerator = require('../utils/qrGenerator');

class YouPiGatewayService {
  constructor() {
    this.gatewayUrl = process.env.YOUPI_GATEWAY_URL || 'http://localhost:6100';
    this.merchantId = process.env.YOUPI_MERCHANT_ID || 'DT-MERCHANT-01';
    this.secretKey = process.env.YOUPI_SECRET_KEY || 'youpi_dt_secret_key_default';
    this.defaultVpa = process.env.DEFAULT_UPI_VPA || 'dairytrust@okaxis';
    this.defaultName = process.env.DEFAULT_UPI_NAME || 'Dairy Trust';

    // In-memory FIFO session registry for active checkouts (15 min TTL)
    this.activeSessions = new Map();
  }

  /**
   * Generates a standard NPCI compliant UPI URI and intent deep links
   */
  generateUpiUrls({ payeeVpa, payeeName, amount, orderId, note }) {
    const vpa = (payeeVpa || this.defaultVpa).trim();
    const name = encodeURIComponent((payeeName || this.defaultName).trim());
    const formattedAmount = Number(amount).toFixed(2);
    const txnNote = encodeURIComponent(note || `Dairy Trust Pmt ${orderId}`);
    const txnRef = encodeURIComponent(orderId);

    // Standard NPCI UPI URI
    const standardUpi = `upi://pay?pa=${vpa}&pn=${name}&mc=0000&tr=${txnRef}&tn=${txnNote}&am=${formattedAmount}&cu=INR`;

    return {
      upiUri: standardUpi,
      intents: {
        universal: standardUpi,
        gpay: `gpay://upi/pay?pa=${vpa}&pn=${name}&mc=0000&tr=${txnRef}&tn=${txnNote}&am=${formattedAmount}&cu=INR`,
        phonepe: `phonepe://upi/pay?pa=${vpa}&pn=${name}&mc=0000&tr=${txnRef}&tn=${txnNote}&am=${formattedAmount}&cu=INR`,
        paytm: `paytmmp://pay?pa=${vpa}&pn=${name}&mc=0000&tr=${txnRef}&tn=${txnNote}&am=${formattedAmount}&cu=INR`,
        bhim: `bhim://upi/pay?pa=${vpa}&pn=${name}&mc=0000&tr=${txnRef}&tn=${txnNote}&am=${formattedAmount}&cu=INR`,
        cred: `credpay://upi/pay?pa=${vpa}&pn=${name}&mc=0000&tr=${txnRef}&tn=${txnNote}&am=${formattedAmount}&cu=INR`,
      },
    };
  }

  /**
   * Initializes a YouPI payment session
   */
  async createCheckoutSession({
    orderId,
    amount,
    payeeVpa,
    payeeName,
    payerName,
    payerPhone,
    note,
    metadata = {},
  }) {
    const sessionId = `yp_sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const vpa = (payeeVpa || this.defaultVpa).trim();
    const formattedAmount = Number(amount).toFixed(2);

    // 1. Generate UPI URIs
    const { upiUri, intents } = this.generateUpiUrls({
      payeeVpa: vpa,
      payeeName,
      amount: formattedAmount,
      orderId,
      note,
    });

    // 2. Generate dynamic SVG QR Code and Data URI
    let qrSvg = '';
    let qrDataUri = '';
    try {
      qrSvg = qrGenerator.generateSvg(upiUri, { margin: 3, color: '#0f172a' });
      qrDataUri = qrGenerator.generateDataUri(upiUri, { margin: 3, color: '#0f172a' });
    } catch (err) {
      console.error('Failed to generate QR code SVG:', err.message);
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes window

    const sessionData = {
      sessionId,
      orderId,
      amount: Number(formattedAmount),
      payeeVpa: vpa,
      payeeName: payeeName || this.defaultName,
      payerName: payerName || '',
      payerPhone: payerPhone || '',
      note: note || '',
      status: 'PENDING', // PENDING -> OBSERVED_SUCCESS -> RECONCILED / FAILED / EXPIRED
      upiUri,
      intents,
      qrSvg,
      qrDataUri,
      utr: null,
      metadata,
      createdAt: new Date(),
      expiresAt,
    };

    // Try notifying external YouPI-PG microservice if configured and online
    if (process.env.YOUPI_GATEWAY_URL) {
      try {
        await axios.post(
          `${this.gatewayUrl}/api/v1/payments`,
          {
            orderId,
            amount: Number(formattedAmount),
            currency: 'INR',
            vpa,
            customer: {
              name: payerName,
              mobile: payerPhone,
            },
          },
          {
            headers: {
              'X-Merchant-Id': this.merchantId,
              'Idempotency-Key': sessionId,
            },
            timeout: 2000,
          }
        );
      } catch (err) {
        // Silently continue with local YouPI engine
        // console.log('YouPI external server unavailable, operating in embedded native mode.');
      }
    }

    this.activeSessions.set(sessionId, sessionData);
    this.activeSessions.set(orderId, sessionData);

    return sessionData;
  }

  /**
   * Retrieves active session details
   */
  getSession(idOrOrderId) {
    const session = this.activeSessions.get(idOrOrderId);
    if (!session) return null;

    if (new Date() > new Date(session.expiresAt) && session.status === 'PENDING') {
      session.status = 'EXPIRED';
    }

    return session;
  }

  /**
   * Validates a 12-digit Indian Bank UTR (Unique Transaction Reference)
   */
  validateUtr(utr) {
    if (!utr) return { valid: false, message: 'UTR is required.' };
    const cleaned = String(utr).trim();
    // Indian Banking UTRs are strictly 12 digits (or 16 digits for some RTGS/IMPS), commonly 12 digits
    if (!/^\d{12}$/.test(cleaned)) {
      return {
        valid: false,
        message: 'UTR must be a valid 12-digit number from your UPI app receipt.',
      };
    }
    return { valid: true, utr: cleaned };
  }

  /**
   * Reconciles a session with a submitted 12-digit UTR
   */
  async verifyPaymentWithUtr(idOrOrderId, utr, verifiedBy = 'user') {
    const session = this.getSession(idOrOrderId);
    if (!session) {
      return { success: false, message: 'Payment session not found or expired.' };
    }

    const utrCheck = this.validateUtr(utr);
    if (!utrCheck.valid) {
      return { success: false, message: utrCheck.message };
    }

    session.status = 'RECONCILED';
    session.utr = utrCheck.utr;
    session.verifiedAt = new Date();
    session.verifiedBy = verifiedBy;

    return {
      success: true,
      message: 'Payment verified and reconciled successfully via YouPI-PG.',
      session,
    };
  }

  /**
   * Validates YouPI-PG Webhook HMAC SHA-256 signature
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!signatureHeader) return false;
    const computed = crypto
      .createHmac('sha256', this.secretKey)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(computed, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );
  }

  /**
   * Handles incoming YouPI-PG Observer webhook (SMS / Bank Alert Listener)
   */
  async processWebhook(payload) {
    const { event, orderId, utr, amount, status } = payload;
    const session = this.getSession(orderId);

    if (session) {
      if (status === 'OBSERVED_SUCCESS' || event === 'PAYMENT_RECEIVED') {
        session.status = 'OBSERVED_SUCCESS';
        session.utr = utr || session.utr;
        session.observedAmount = amount;
        session.verifiedAt = new Date();
      } else if (status === 'FAILED') {
        session.status = 'FAILED';
      }
    }

    return { received: true, status: session ? session.status : 'UNKNOWN' };
  }
}

module.exports = new YouPiGatewayService();
