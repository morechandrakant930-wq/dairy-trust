/**
 * End-to-End Verification Test for YouPI-PG Gateway Integration
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const youPiGateway = require('../services/YouPiGateway');
const qrGenerator = require('../utils/qrGenerator');

async function runTests() {
  console.log('--- 🧪 STARTING YOUPI-PG GATEWAY END-TO-END VERIFICATION ---');

  // Test 1: QR Generator
  console.log('\n[Test 1] Testing QR Generator...');
  const testUpi = 'upi://pay?pa=farmer@okaxis&pn=RameshPatil&am=1450.00&cu=INR';
  const svg = qrGenerator.generateSvg(testUpi);
  const dataUri = qrGenerator.generateDataUri(testUpi);
  if (!svg.startsWith('<svg') || !dataUri.startsWith('data:image/svg+xml;base64,')) {
    throw new Error('QR generation failed format check.');
  }
  console.log('✅ QR Generator produced valid SVG and Base64 Data URI.');

  // Test 2: Checkout Session Creation
  console.log('\n[Test 2] Testing Checkout Session Creation...');
  const orderId = `TEST-ORDER-${Date.now()}`;
  const session = await youPiGateway.createCheckoutSession({
    orderId,
    amount: 1450.0,
    payeeVpa: 'farmer@okaxis',
    payeeName: 'Ramesh Patil',
    payerName: 'Dairy Trust Owner',
    note: 'Milk Collection Settlement',
  });

  if (!session.sessionId || session.status !== 'PENDING') {
    throw new Error('Session creation failed: status or ID invalid.');
  }
  if (!session.intents.phonepe || !session.intents.gpay || !session.intents.paytm) {
    throw new Error('Deep links missing required UPI app schemes.');
  }
  console.log('✅ Checkout session created successfully:', {
    sessionId: session.sessionId,
    orderId: session.orderId,
    amount: session.amount,
    payeeVpa: session.payeeVpa,
    intents: Object.keys(session.intents),
  });

  // Test 3: UTR Validation
  console.log('\n[Test 3] Testing 12-Digit UTR Validation...');
  const invalidCheck = youPiGateway.validateUtr('12345');
  const validCheck = youPiGateway.validateUtr('423589123456');
  if (invalidCheck.valid || !validCheck.valid) {
    throw new Error('UTR validation logic mismatch.');
  }
  console.log('✅ 12-digit UTR validation working accurately.');

  // Test 4: UTR Payment Verification & Reconciliation
  console.log('\n[Test 4] Testing Payment Reconciliation with UTR...');
  const verifyResult = await youPiGateway.verifyPaymentWithUtr(session.sessionId, '423589123456', 'dairyOwner');
  if (!verifyResult.success || session.status !== 'RECONCILED' || session.utr !== '423589123456') {
    throw new Error('Reconciliation failed.');
  }
  console.log('✅ Payment session reconciled with UTR: 423589123456, Status: RECONCILED.');

  // Test 5: Webhook Signature & Processing
  console.log('\n[Test 5] Testing Webhook HMAC Signature & Observer Processing...');
  const crypto = require('crypto');
  const webhookPayload = {
    event: 'PAYMENT_RECEIVED',
    orderId: session.orderId,
    utr: '423589123456',
    amount: 1450.0,
    status: 'OBSERVED_SUCCESS',
  };
  const signature = crypto
    .createHmac('sha256', youPiGateway.secretKey)
    .update(JSON.stringify(webhookPayload))
    .digest('hex');

  const sigValid = youPiGateway.verifyWebhookSignature(webhookPayload, signature);
  if (!sigValid) {
    throw new Error('Webhook signature verification failed.');
  }
  const webhookResult = await youPiGateway.processWebhook(webhookPayload);
  console.log('✅ Webhook HMAC valid and payload processed:', webhookResult);

  console.log('\n🎉 ALL YOUPI-PG GATEWAY TESTS PASSED SUCCESSFULLY! 100% End-to-End Functional.\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
