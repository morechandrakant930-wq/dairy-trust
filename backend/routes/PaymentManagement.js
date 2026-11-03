const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const Farmer = require('../models/Farmer');
const FarmerPayment = require('../models/FarmerPayment');
const PendDeduction = require('../models/PendDeduction');
const youPiGateway = require('../services/YouPiGateway');

const router = express.Router();

// ==========================================
// 1. PUBLIC WEBHOOK (Called by YouPI-PG Observer / Daemon)
// ==========================================
router.post('/upi/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-youpi-signature'] || req.headers['x-signature'];
    
    // Optional HMAC signature check
    if (signature && !youPiGateway.verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { orderId, utr, amount, status, event } = req.body;
    console.log('[YouPI-PG Webhook Received]', { orderId, utr, amount, status, event });

    await youPiGateway.processWebhook(req.body);

    if (orderId && (status === 'OBSERVED_SUCCESS' || event === 'PAYMENT_RECEIVED')) {
      const payment = await FarmerPayment.findOne({
        $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { gatewaySessionId: orderId }],
      });

      if (payment && payment.paymentStatus !== 'paid') {
        payment.paymentStatus = 'paid';
        payment.paymentMode = 'upi';
        payment.paidAt = new Date();
        payment.utr = utr || payment.utr;
        payment.paymentReference = utr || `YOUPI-AUTO-${Date.now()}`;
        payment.gatewayStatus = 'OBSERVED_SUCCESS';
        await payment.save();

        if (payment.settlementId) {
          await PendDeduction.updateOne(
            { _id: payment.settlementId },
            { $set: { paymentStatus: 'paid', paymentMode: 'upi' } }
          );
        }
      }
    }

    return res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('YouPI Webhook Error:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// All following routes require authentication
router.use(authMiddleware);

// ==========================================
// 2. YOUPI-PG UPI GATEWAY ROUTES
// ==========================================

// Create a dynamic YouPI UPI payment session
router.post('/upi/create-session', async (req, res) => {
  try {
    const { paymentId, customVpa, customName, note } = req.body;
    const dairyId = String(req.user.dairyId);

    if (!paymentId || !mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({ success: false, message: 'Valid payment ID is required.' });
    }

    const payment = await FarmerPayment.findOne({ _id: paymentId, dairyId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Payment is already marked as paid.' });
    }

    // Lookup Farmer details for recipient UPI/name
    const farmer = await Farmer.findOne({ farmerId: payment.farmerId, dairyId });
    const payeeVpa = customVpa || farmer?.bankDetails?.upiId || process.env.DEFAULT_UPI_VPA || 'dairytrust@okaxis';
    const payeeName = customName || farmer?.name || farmer?.bankDetails?.accountHolderName || 'Farmer Settlement';

    const orderId = `DT-${payment.farmerId}-${payment._id.toString().slice(-6)}`;
    const session = await youPiGateway.createCheckoutSession({
      orderId,
      amount: payment.finalPayable,
      payeeVpa,
      payeeName,
      payerName: req.user.dairyName || req.user.name || 'Dairy Owner',
      payerPhone: req.user.phone || '',
      note: note || `Milk Payment ${payment.farmerId}`,
      metadata: {
        paymentId: payment._id.toString(),
        farmerId: payment.farmerId,
        dairyId,
      },
    });

    // Update payment record with gateway tracking info
    payment.gatewaySessionId = session.sessionId;
    payment.upiVpa = payeeVpa;
    payment.gatewayStatus = 'PENDING';
    await payment.save();

    return res.json({
      success: true,
      message: 'YouPI UPI Checkout session created successfully.',
      session,
    });
  } catch (error) {
    console.error('Create YouPI session error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initialize UPI session.' });
  }
});

// Get session status (for frontend polling)
router.get('/upi/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = youPiGateway.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'UPI session not found or expired.' });
    }

    return res.json({
      success: true,
      status: session.status,
      utr: session.utr,
      session,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error checking UPI session status.' });
  }
});

// Verify 12-digit UTR and complete payment
router.post('/upi/verify-utr', async (req, res) => {
  try {
    const { paymentId, sessionId, utr } = req.body;
    const dairyId = String(req.user.dairyId);

    if (!utr) {
      return res.status(400).json({ success: false, message: '12-digit UTR is required.' });
    }

    const utrValidation = youPiGateway.validateUtr(utr);
    if (!utrValidation.valid) {
      return res.status(400).json({ success: false, message: utrValidation.message });
    }

    const payment = await FarmerPayment.findOne({ _id: paymentId, dairyId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Payment has already been finalized.' });
    }

    // Verify session if sessionId provided
    if (sessionId) {
      await youPiGateway.verifyPaymentWithUtr(sessionId, utrValidation.utr, req.user.role);
    }

    payment.paymentStatus = 'paid';
    payment.paymentMode = 'upi';
    payment.paidAt = new Date();
    payment.utr = utrValidation.utr;
    payment.paymentReference = utrValidation.utr;
    payment.gatewayStatus = 'RECONCILED';
    await payment.save();

    if (payment.settlementId) {
      await PendDeduction.updateOne(
        { _id: payment.settlementId, dairyId },
        { $set: { paymentStatus: 'paid', paymentMode: 'upi' } }
      );
    }

    return res.json({
      success: true,
      message: 'Payment verified and marked as Paid via YouPI-PG.',
      payment,
    });
  } catch (error) {
    console.error('Verify UTR error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify UPI UTR.' });
  }
});

// ==========================================
// 3. EXISTING FARMER & OWNER PAYMENT MANAGEMENT
// ==========================================

// FARMER: Request payment mode change
router.post('/farmer/payment-mode-request', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can request payment mode.' });
    }

    const { mode, bankDetails } = req.body;

    if (!['cash', 'auto', 'upi'].includes(mode)) {
      return res.status(400).json({ message: 'Select Cash, Auto, or UPI Payment.' });
    }

    if (mode === 'auto') {
      if (
        !bankDetails?.accountHolderName?.trim() ||
        !bankDetails?.accountNumber?.trim() ||
        !bankDetails?.ifscCode?.trim()
      ) {
        return res.status(400).json({
          message: 'Account holder name, account number and IFSC are required.',
        });
      }

      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.trim().toUpperCase())) {
        return res.status(400).json({ message: 'Invalid IFSC code.' });
      }
    }

    if (mode === 'upi') {
      if (!bankDetails?.upiId?.trim() || !bankDetails.upiId.includes('@')) {
        return res.status(400).json({
          message: 'Please provide a valid UPI ID (e.g., yourname@okaxis or mobile@paytm).',
        });
      }
    }

    const farmer = await Farmer.findOne({
      _id: req.user.accountId,
      dairyId: req.user.dairyId,
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    if (farmer.paymentMode === mode && (!bankDetails?.upiId || bankDetails.upiId === farmer.bankDetails?.upiId)) {
      return res.status(400).json({ message: 'This payment mode is already active.' });
    }

    if (farmer.paymentModeRequest?.status === 'pending') {
      return res.status(409).json({ message: 'A payment mode request is already pending.' });
    }

    if (mode === 'auto') {
      farmer.bankDetails = {
        accountHolderName: bankDetails.accountHolderName.trim(),
        accountNumber: bankDetails.accountNumber.trim(),
        ifscCode: bankDetails.ifscCode.trim().toUpperCase(),
        bankName: String(bankDetails.bankName || '').trim(),
        upiId: String(bankDetails.upiId || farmer.bankDetails?.upiId || '').trim().toLowerCase(),
      };
    } else if (mode === 'upi') {
      farmer.bankDetails = {
        ...(farmer.bankDetails?.toObject?.() || farmer.bankDetails || {}),
        upiId: bankDetails.upiId.trim().toLowerCase(),
        accountHolderName: bankDetails.accountHolderName?.trim() || farmer.bankDetails?.accountHolderName || farmer.name,
      };
    }

    farmer.paymentModeRequest = {
      mode,
      status: 'pending',
      requestedAt: new Date(),
      reviewedAt: null,
    };

    await farmer.save();

    res.json({
      success: true,
      message: 'Payment mode request sent to Dairy Owner for approval.',
      requestedMode: mode,
      status: 'pending',
    });
  } catch (error) {
    console.error('Payment mode request:', error);
    res.status(500).json({ message: 'Unable to submit payment mode request.' });
  }
});

// FARMER: View own payment mode and request status
router.get('/farmer/payment-mode', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Farmer access only.' });
    }

    const farmer = await Farmer.findOne({
      _id: req.user.accountId,
      dairyId: req.user.dairyId,
    }).select('paymentMode paymentModeRequest bankDetails');

    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' });

    res.json({
      success: true,
      paymentMode: farmer.paymentMode,
      request: farmer.paymentModeRequest,
      bankDetails: farmer.bankDetails,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch payment mode.' });
  }
});

// OWNER: View pending payment mode requests
router.get('/owner/payment-mode-requests', async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({ message: 'Dairy Owner access only.' });
    }

    const farmers = await Farmer.find({
      dairyId: req.user.dairyId,
      'paymentModeRequest.status': 'pending',
    }).select('farmerId name mobileNumber paymentMode paymentModeRequest bankDetails');

    res.json({ success: true, requests: farmers });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch requests.' });
  }
});

// OWNER: Approve or reject request
router.patch('/owner/payment-mode-requests/:farmerMongoId', async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({ message: 'Dairy Owner access only.' });
    }

    const { action } = req.body;
    const { farmerMongoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmerMongoId)) {
      return res.status(400).json({ message: 'Invalid farmer ID.' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject.' });
    }

    const farmer = await Farmer.findOne({
      _id: farmerMongoId,
      dairyId: req.user.dairyId,
      'paymentModeRequest.status': 'pending',
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Pending request not found.' });
    }

    if (action === 'approve') {
      farmer.paymentMode = farmer.paymentModeRequest.mode;
      farmer.paymentModeRequest.status = 'approved';
    } else {
      farmer.paymentModeRequest.status = 'rejected';
    }

    farmer.paymentModeRequest.reviewedAt = new Date();
    await farmer.save();

    res.json({
      success: true,
      message: action === 'approve' ? 'Payment mode approved.' : 'Payment mode request rejected.',
      farmerId: farmer.farmerId,
      paymentMode: farmer.paymentMode,
      requestStatus: farmer.paymentModeRequest.status,
    });
  } catch (error) {
    console.error('Payment mode approval:', error);
    res.status(500).json({ message: 'Unable to process request.' });
  }
});

module.exports = router;
