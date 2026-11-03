const express = require('express')
const router = express.Router()

const PendPurchase = require('../models/PendPurchase')
const PendSale = require('../models/PendSale')
const Farmer = require('../models/Farmer')
const PendDeduction = require('../models/PendDeduction')
const MilkCollection = require('../models/MilkCollection')
const authMiddleware = require('../middleware/authMiddleware')
const Loan = require('../models/Loan')
const LoanRepayment = require('../models/LoanRepayment')

const Bonus = require('../models/Bonus')
const BonusRate = require('../models/BonusRate')
const FarmerPayment = require('../models/FarmerPayment')

router.use(authMiddleware)

// Only Dairy Owner can access Pend Management
router.use((req, res, next) => {
    if (req.user.role !== 'dairyOwner') {
        return res.status(403).json({
            success: false,
            message: 'Only Dairy Owner can manage pend.',
        })
    }
    next()
})

// Helper: validate bag quantity
const validBags = (value) =>
    Number.isInteger(Number(value)) && Number(value) > 0

// Helper: validate price
const validPrice = (value) =>
    value !== undefined &&
    value !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0

const calculateSettlementBonus = async ({
    dairyId,
    farmerId,
    start,
    end,
}) => {
    const collections = await MilkCollection.find({
        dairyId,
        farmerId,
        collectionTime: { $gte: start, $lt: end },
    }).lean()

    const rates = await BonusRate.find({
        dairyId,
        isActive: true,
    }).lean()

    let qualityBonus = 0

    const qualityDetails = collections.map((item) => {
        const matchingRates = rates
            .filter((rate) =>
                rate.animalType === item.animalType &&
                Number(rate.fat) <= Number(item.fat) &&
                Number(rate.snf) <= Number(item.snf)
            )
            .sort((a, b) =>
                (Number(b.fat) + Number(b.snf)) -
                (Number(a.fat) + Number(a.snf))
            )

        const selectedRate = matchingRates[0]
        const bonusPerLitre = selectedRate
            ? Number(selectedRate.bonusPerLitre) || 0
            : 0

        const amount =
            (Number(item.quantity) || 0) * bonusPerLitre

        qualityBonus += amount

        return {
            collectionId: item._id,
            animalType: item.animalType,
            quantity: Number(item.quantity) || 0,
            fat: Number(item.fat) || 0,
            snf: Number(item.snf) || 0,
            bonusPerLitre,
            bonusAmount: amount,
        }
    })

    const manualBonuses = await Bonus.find({
        dairyId,
        farmerId,
        bonusType: 'manual',
        status: 'approved',
        bonusDate: { $gte: start, $lt: end },
    }).lean()

    const manualBonus = manualBonuses.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
    )

    return {
        qualityBonus,
        manualBonus,
        qualityDetails,
        manualBonusDetails: manualBonuses,
    }
}

// 1. Purchase Pend
router.post('/purchase', async (req, res) => {
    try {
        const {
            pendName,
            quantityBags,
            purchasePricePerBag,
            purchaseDate,
        } = req.body

        if (
            !pendName ||
            !validBags(quantityBags) ||
            !validPrice(purchasePricePerBag) ||
            !purchaseDate ||
            Number.isNaN(new Date(purchaseDate).getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid purchase details.',
            })
        }

        const totalPurchaseAmount =
            Number(quantityBags) * Number(purchasePricePerBag)

        const purchase = await PendPurchase.create({
            dairyId: String(req.user.dairyId),
            pendName: pendName.trim(),
            quantityBags: Number(quantityBags),
            purchasePricePerBag: Number(purchasePricePerBag),
            totalPurchaseAmount,
            purchaseDate: new Date(purchaseDate),
        })

        return res.status(201).json({
            success: true,
            message: 'Pend purchase saved successfully.',
            data: purchase,
        })
    } catch (error) {
        console.error('Pend purchase error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to save pend purchase.',
        })
    }
})

// 2. Sell Pend to Farmer
router.post('/sale', async (req, res) => {
    try {
        const {
            farmerId,
            pendName,
            quantityBags,
            salePricePerBag,
            saleDate,
        } = req.body

        if (
            !farmerId ||
            !pendName ||
            !validBags(quantityBags) ||
            !validPrice(salePricePerBag) ||
            !saleDate ||
            Number.isNaN(new Date(saleDate).getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid sale details.',
            })
        }

        const dairyId = String(req.user.dairyId)

        const farmer = await Farmer.findOne({
            farmerId: farmerId.trim(),
            dairyId,
        })

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found in your dairy.',
            })
        }

        const namePattern = new RegExp(
            '^' + pendName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
            'i'
        )

        const purchases = await PendPurchase.find({
            dairyId,
            pendName: namePattern,
        }).lean()

        const sales = await PendSale.find({
            dairyId,
            pendName: namePattern,
        }).lean()

        const purchasedBags = purchases.reduce(
            (sum, item) => sum + item.quantityBags,
            0
        )

        const soldBags = sales.reduce(
            (sum, item) => sum + item.quantityBags,
            0
        )

        const remainingBags = purchasedBags - soldBags

        if (Number(quantityBags) > remainingBags) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available stock: ${remainingBags} bags.`,
            })
        }

        const totalSaleAmount =
            Number(quantityBags) * Number(salePricePerBag)

        const sale = await PendSale.create({
            dairyId,
            farmerId: farmer.farmerId,
            pendName: pendName.trim(),
            quantityBags: Number(quantityBags),
            salePricePerBag: Number(salePricePerBag),
            totalSaleAmount,
            saleDate: new Date(saleDate),
        })

        return res.status(201).json({
            success: true,
            message: 'Pend sold to farmer successfully.',
            data: sale,
            remainingStock: remainingBags - Number(quantityBags),
        })
    } catch (error) {
        console.error('Pend sale error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to sell pend.',
        })
    }
})

// 3. Get remaining stock of all pend types
router.get('/stock', async (req, res) => {
    try {
        const dairyId = String(req.user.dairyId)

        const purchases = await PendPurchase.find({ dairyId }).lean()
        const sales = await PendSale.find({ dairyId }).lean()

        const stockMap = new Map()

        for (const item of purchases) {
            const key = item.pendName.trim().toLowerCase()

            if (!stockMap.has(key)) {
                stockMap.set(key, {
                    pendName: item.pendName,
                    purchasedBags: 0,
                    soldBags: 0,
                    remainingBags: 0,
                })
            }

            stockMap.get(key).purchasedBags += item.quantityBags
        }

        for (const item of sales) {
            const key = item.pendName.trim().toLowerCase()

            if (!stockMap.has(key)) {
                stockMap.set(key, {
                    pendName: item.pendName,
                    purchasedBags: 0,
                    soldBags: 0,
                    remainingBags: 0,
                })
            }

            stockMap.get(key).soldBags += item.quantityBags
        }

        const stock = [...stockMap.values()].map((item) => ({
            ...item,
            remainingBags: item.purchasedBags - item.soldBags,
        }))

        return res.json({
            success: true,
            data: stock,
        })
    } catch (error) {
        console.error('Pend stock error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pend stock.',
        })
    }
})

// 4. Get farmer-wise pend sale history
router.get('/farmer-history', async (req, res) => {
    try {
        const filter = {
            dairyId: String(req.user.dairyId),
        }

        if (req.query.farmerId) {
            filter.farmerId = req.query.farmerId
        }

        const sales = await PendSale.find(filter)
            .sort({ saleDate: -1 })
            .lean()

        return res.json({
            success: true,
            count: sales.length,
            data: sales,
        })
    } catch (error) {
        console.error('Pend farmer history error:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch farmer pend history.',
        })
    }
})

// GIVE LOAN TO FARMER
router.post('/loan', async (req, res) => {
    try {
        console.log('LOAN ROUTE HIT:', req.body)

        const { farmerId, loanAmount, loanDate, notes } = req.body

        const dairyId = String(req.user.dairyId)
        const amount = Number(loanAmount)

        if (
            !farmerId ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid farmer ID and loan amount.',
            })
        }

        const farmer = await Farmer.findOne({
            farmerId: farmerId.trim(),
            dairyId,
        })

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found in your dairy.',
            })
        }

        const date = loanDate ? new Date(loanDate) : new Date()

        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid loan date.',
            })
        }

        const loan = await Loan.create({
            dairyId,
            farmerId: farmer.farmerId,
            loanAmount: amount,
            remainingBalance: amount,
            loanDate: date,
            notes: notes || '',
        })

        console.log('LOAN SAVED SUCCESSFULLY:', loan._id)

        return res.status(201).json({
            success: true,
            message: 'Farmer loan saved successfully.',
            data: loan,
        })
    } catch (error) {
        console.error('Farmer loan error:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to save farmer loan.',
        })
    }
})

// GET LOAN HISTORY FOR DAIRY OWNER
router.get('/loan-history', async (req, res) => {
    try {
        const filter = {
            dairyId: String(req.user.dairyId),
        }

        if (req.query.farmerId) {
            filter.farmerId = req.query.farmerId
        }

        const loans = await Loan.find(filter)
            .sort({ loanDate: -1 })
            .lean()

        return res.json({
            success: true,
            count: loans.length,
            data: loans,
        })
    } catch (error) {
        console.error('Loan history error:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch loan history.',
        })
    }
})

// GET SETTLEMENT PREVIEW
router.get('/settlement-preview', async (req, res) => {
    try {
        const { farmerId, startDate, endDate } = req.query
        const dairyId = String(req.user.dairyId)

        const isValidDate = (value) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
            const [y, m, d] = value.split('-').map(Number)
            const date = new Date(y, m - 1, d)
            return date.getFullYear() === y &&
                date.getMonth() === m - 1 &&
                date.getDate() === d
        }

        if (!farmerId || !isValidDate(startDate) || !isValidDate(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Valid farmer ID, start date and end date are required',
            })
        }

        const [sy, sm, sd] = startDate.split('-').map(Number)
        const [ey, em, ed] = endDate.split('-').map(Number)

        const start = new Date(sy, sm - 1, sd)
        const end = new Date(ey, em - 1, ed + 1)
        const storedEndDate = new Date(ey, em - 1, ed)

        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date range',
            })
        }

        const farmer = await Farmer.findOne({ farmerId, dairyId })

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found',
            })
        }

        // Milk payment during selected period
        const collections = await MilkCollection.find({
            dairyId,
            farmerId,
            collectionTime: { $gte: start, $lt: end },
        }).lean()

        const milkPayment = collections.reduce(
            (sum, item) => sum + (Number(item.totalPayment) || 0),
            0
        )

        const bonusData = await calculateSettlementBonus({
            dairyId,
            farmerId,
            start,
            end,
        })

        const qualityBonus = bonusData.qualityBonus
        const manualBonus = bonusData.manualBonus

        const grossPayment =
            milkPayment + qualityBonus + manualBonus

        // Pend sales before period and during period
        const [previousPendSales, periodPendSales] = await Promise.all([
            PendSale.find({
                dairyId,
                farmerId,
                saleDate: { $lt: start },
            }).lean(),
            PendSale.find({
                dairyId,
                farmerId,
                saleDate: { $gte: start, $lt: end },
            }).lean(),
        ])

        const sumPend = (items) => items.reduce(
            (sum, item) => sum + (Number(item.totalSaleAmount) || 0),
            0
        )

        const previousPendTotal = sumPend(previousPendSales)
        const periodPendTotal = sumPend(periodPendSales)

        // Confirmed Pend deductions before selected period
        const previousPendDeductions = await PendDeduction.find({
            dairyId,
            farmerId,
            reportEndDate: { $lt: start },
            status: 'confirmed',
        }).lean()

        const openingPendDeduction = previousPendDeductions.reduce(
            (sum, item) => sum + (Number(item.deductionAmount) || 0),
            0
        )

        const openingPendBalance = Math.max(
            0,
            previousPendTotal - openingPendDeduction
        )

        // Loan principal before and during selected period
        const [previousLoans, periodLoans] = await Promise.all([
            Loan.find({
                dairyId,
                farmerId,
                loanDate: { $lt: start },
            }).lean(),
            Loan.find({
                dairyId,
                farmerId,
                loanDate: { $gte: start, $lt: end },
            }).lean(),
        ])

        const sumLoans = (items) => items.reduce(
            (sum, item) => sum + (Number(item.loanAmount) || 0),
            0
        )

        const previousLoanTotal = sumLoans(previousLoans)
        const periodLoanTotal = sumLoans(periodLoans)

        // Repayments made before selected period
        const previousLoanRepayments = await LoanRepayment.find({
            dairyId,
            farmerId,
            reportEndDate: { $lt: start },
        }).lean()

        const openingLoanRepayment = previousLoanRepayments.reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0
        )

        const openingLoanBalance = Math.max(
            0,
            previousLoanTotal - openingLoanRepayment
        )

        // Settlements/repayments recorded during selected period
        const [periodSettlements, periodLoanRepayments] = await Promise.all([
            PendDeduction.find({
                dairyId,
                farmerId,
                reportStartDate: { $lt: end },
                reportEndDate: { $gte: start },
                status: 'confirmed',
            }).lean(),
            LoanRepayment.find({
                dairyId,
                farmerId,
                reportStartDate: { $lt: end },
                reportEndDate: { $gte: start },
            }).lean(),
        ])

        const periodPendDeduction = periodSettlements.reduce(
            (sum, item) => sum + (Number(item.deductionAmount) || 0),
            0
        )

        const periodLoanDeduction = periodLoanRepayments.reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0
        )

        const totalPendBalance = Math.max(
            0,
            openingPendBalance + periodPendTotal
        )

        const totalLoanBalance = Math.max(
            0,
            openingLoanBalance + periodLoanTotal
        )

        const remainingPendBalance = Math.max(
            0,
            totalPendBalance - periodPendDeduction
        )

        const remainingLoanBalance = Math.max(
            0,
            totalLoanBalance - periodLoanDeduction
        )

        const finalPayable = grossPayment

        // Existing settlement check
        const existingSettlement = await PendDeduction.findOne({
            dairyId,
            farmerId,
            reportStartDate: { $lt: end },
            reportEndDate: { $gte: start },
        }).sort({ reportStartDate: 1 }).lean()

        const data = {
            farmerId,
            farmerName: farmer.name,
            startDate,
            endDate,

            milkPayment,
            qualityBonus,
            manualBonus,
            grossPayment,
            qualityBonusDetails: bonusData.qualityDetails,
            manualBonusDetails: bonusData.manualBonusDetails,

            openingPendBalance,
            periodPendTotal,
            totalPendBalance,
            periodPendDeduction,
            remainingPendBalance,
            periodPendSales,

            openingLoanBalance,
            periodLoanTotal,
            totalLoanBalance,
            periodLoanDeduction,
            remainingLoanBalance,
            periodLoans,

            finalPayable,
        }

        if (existingSettlement) {
            const exactMatch =
                new Date(existingSettlement.reportStartDate).getTime() === start.getTime() &&
                new Date(existingSettlement.reportEndDate).getTime() === storedEndDate.getTime()

            return res.status(409).json({
                success: false,
                alreadySettled: exactMatch,
                message: exactMatch
                    ? 'This period is already settled'
                    : 'This period overlaps an already settled period',
                data,
                settlement: existingSettlement,
            })
        }

        return res.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Settlement preview error:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to generate settlement preview',
        })
    }
})

// CONFIRM PEND & LOAN SETTLEMENT
router.post('/settlement-confirm', async (req, res) => {
    try {
        const {
            farmerId,
            startDate,
            endDate,
            deductionAmount,
            loanDeductionAmount = 0,
        } = req.body

        const dairyId = String(req.user.dairyId)

        if (!farmerId || !startDate || !endDate || deductionAmount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All settlement details are required',
            })
        }

        const isValidDate = (value) => {
            if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return false
            }

            const [y, m, d] = value.split('-').map(Number)
            const date = new Date(y, m - 1, d)

            return date.getFullYear() === y &&
                date.getMonth() === m - 1 &&
                date.getDate() === d
        }

        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format',
            })
        }

        const [sy, sm, sd] = startDate.split('-').map(Number)
        const [ey, em, ed] = endDate.split('-').map(Number)

        const start = new Date(sy, sm - 1, sd)
        const end = new Date(ey, em - 1, ed + 1)
        const storedEndDate = new Date(ey, em - 1, ed)

        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date range',
            })
        }

        const pendAmount = Number(deductionAmount)
        const loanAmount = Number(loanDeductionAmount)

        if (
            !Number.isFinite(pendAmount) ||
            pendAmount < 0 ||
            !Number.isFinite(loanAmount) ||
            loanAmount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid deduction amounts',
            })
        }

        const farmer = await Farmer.findOne({ farmerId, dairyId })

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found',
            })
        }

        const existingSettlement = await PendDeduction.findOne({
            dairyId,
            farmerId,
            reportStartDate: { $lt: end },
            reportEndDate: { $gte: start },
        })

        if (existingSettlement) {
            return res.status(409).json({
                success: false,
                message: 'This period is already settled or overlaps another settlement',
                settlement: existingSettlement,
            })
        }

        const collections = await MilkCollection.find({
            dairyId,
            farmerId,
            collectionTime: { $gte: start, $lt: end },
        }).lean()

        const milkPayment = collections.reduce(
            (total, item) => total + (Number(item.totalPayment) || 0),
            0
        )

        const bonusData = await calculateSettlementBonus({
            dairyId,
            farmerId,
            start,
            end,
        })

        const qualityBonus = bonusData.qualityBonus
        const manualBonus = bonusData.manualBonus

        const grossPayment =
            milkPayment + qualityBonus + manualBonus

        const pendSales = await PendSale.find({
            dairyId,
            farmerId,
            saleDate: { $lt: end },
        }).lean()

        const totalPendSales = pendSales.reduce(
            (total, sale) => total + (Number(sale.totalSaleAmount) || 0),
            0
        )

        const previousDeductions = await PendDeduction.find({
            dairyId,
            farmerId,
            reportEndDate: { $lt: start },
            status: 'confirmed',
        }).lean()

        const totalPreviousDeductions = previousDeductions.reduce(
            (total, item) => total + (Number(item.deductionAmount) || 0),
            0
        )

        const totalPendBalance = Math.max(
            0,
            totalPendSales - totalPreviousDeductions
        )

        const loans = await Loan.find({
            dairyId,
            farmerId,
            remainingBalance: { $gt: 0 },
        }).sort({ loanDate: 1, createdAt: 1 })

        const totalLoanBalance = loans.reduce(
            (total, loan) => total + (Number(loan.remainingBalance) || 0),
            0
        )

        if (pendAmount > grossPayment) {
            return res.status(400).json({
                success: false,
                message: 'Pend deduction cannot exceed gross payment',
            })
        }

        if (pendAmount > totalPendBalance) {
            return res.status(400).json({
                success: false,
                message: 'Pend deduction cannot exceed available Pend balance',
            })
        }

        if (loanAmount > totalLoanBalance) {
            return res.status(400).json({
                success: false,
                message: 'Loan deduction cannot exceed outstanding loan balance',
            })
        }

        // Pend is deducted first, then Loan.
        const amountAfterPend = grossPayment - pendAmount

        if (loanAmount > amountAfterPend) {
            return res.status(400).json({
                success: false,
                message: 'Loan deduction exceeds payment remaining after Pend deduction',
            })
        }

        const remainingPendBalance = totalPendBalance - pendAmount
        const remainingLoanBalance = totalLoanBalance - loanAmount

        const finalPayable =
            grossPayment - pendAmount - loanAmount

        const paymentMode =
            farmer.paymentMode === 'auto' ? 'auto' : (farmer.paymentMode === 'upi' ? 'upi' : 'cash')

        const settlement = await PendDeduction.create({
            dairyId,
            farmerId,

            milkPayment,
            qualityBonus,
            manualBonus,
            grossPayment,

            previousPendBalance: totalPendBalance,
            deductionAmount: pendAmount,
            remainingPendBalance,

            loanDeductionAmount: loanAmount,
            remainingLoanBalance,

            finalPayable,
            paymentMode,
            paymentStatus: 'pending',

            reportStartDate: start,
            reportEndDate: storedEndDate,
            status: 'confirmed',
        })

        await FarmerPayment.create({
            dairyId,
            farmerId,
            settlementId: settlement._id,

            grossPayment,
            pendDeduction: pendAmount,
            loanDeduction: loanAmount,
            finalPayable,

            paymentMode,
            paymentStatus: 'pending',
        })

        let amountLeft = loanAmount

        for (const loan of loans) {
            if (amountLeft <= 0) break

            const available = Number(loan.remainingBalance) || 0
            const deduction = Math.min(available, amountLeft)

            loan.remainingBalance = available - deduction
            await loan.save()

            amountLeft -= deduction
        }

        if (loanAmount > 0) {
            await LoanRepayment.create({
                dairyId,
                farmerId,
                amount: loanAmount,
                reportStartDate: start,
                reportEndDate: storedEndDate,
            })
        }

        return res.json({
            success: true,
            message: 'Pend and loan settlement confirmed successfully',
            settlement,
        })
    } catch (error) {
        console.error('Settlement confirmation error:', error)

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'This settlement has already been confirmed',
            })
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to confirm settlement',
        })
    }
})

// MARK PAYMENT PAID
router.patch('/payment/:paymentId/mark-paid', async (req, res) => {
    try {
        const { paymentId } = req.params
        const dairyId = String(req.user.dairyId)

        if (!/^[0-9a-fA-F]{24}$/.test(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID',
            })
        }

        const payment = await FarmerPayment.findOne({
            _id: paymentId,
            dairyId,
        })

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found',
            })
        }

        if (payment.paymentMode !== 'cash') {
            return res.status(400).json({
                success: false,
                message: 'Only cash payments can be marked paid manually',
            })
        }

        if (payment.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment is already marked as paid',
            })
        }

        payment.paymentStatus = 'paid'
        payment.paidAt = new Date()
        await payment.save()

        await PendDeduction.updateOne(
            {
                _id: payment.settlementId,
                dairyId,
            },
            {
                $set: { paymentStatus: 'paid' },
            }
        )

        return res.json({
            success: true,
            message: 'Cash payment marked as paid',
            data: payment,
        })
    } catch (error) {
        console.error('Mark payment paid error:', error)

        return res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
        })
    }
})

// PAYMENT HISTORY API
router.get('/payments', async (req, res) => {
    try {
        const filter = {
            dairyId: String(req.user.dairyId),
        }

        if (req.query.farmerId) {
            filter.farmerId = req.query.farmerId
        }

        if (req.query.paymentStatus) {
            filter.paymentStatus = req.query.paymentStatus
        }

        const payments = await FarmerPayment.find(filter)
            .sort({ createdAt: -1 })
            .lean()

        return res.json({
            success: true,
            count: payments.length,
            data: payments,
        })
    } catch (error) {
        console.error('Payment history error:', error)

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment history',
        })
    }
})

module.exports = router