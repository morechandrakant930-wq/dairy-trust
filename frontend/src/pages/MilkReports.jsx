import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useLanguage } from '../language/LanguageContext'
import './MilkReports.css'

function MilkReports() {
    const { t } = useLanguage()
    const today = new Date()
    const localDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-')

    const tenDaysAgo = new Date(today)
    tenDaysAgo.setDate(today.getDate() - 9)

    const localStartDate = [
        tenDaysAgo.getFullYear(),
        String(tenDaysAgo.getMonth() + 1).padStart(2, '0'),
        String(tenDaysAgo.getDate()).padStart(2, '0'),
    ].join('-')

    const [startDate, setStartDate] = useState(localStartDate)
    const [endDate, setEndDate] = useState(localDate)
    const [reportType, setReportType] = useState('10days')
    const [report, setReport] = useState(null)
    const [farmers, setFarmers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [settlementPreviews, setSettlementPreviews] = useState({})
    const [deductionInputs, setDeductionInputs] = useState({})
    const [loanDeductionInputs, setLoanDeductionInputs] = useState({})
    const [settlementMessages, setSettlementMessages] = useState({})

    const generateReport = async () => {
        try {
            setLoading(true)
            setError('')
            setReport(null)

            if (!startDate || !endDate) {
                setError('Krupaya donhi tarakha nivada.')
                return
            }

            if (startDate > endDate) {
                setError('Suruvatiche dinank shevatachya dinankanantar asu shakat nahi.')
                return
            }

            const token = localStorage.getItem('dairyToken')
            if (!token) {
                setError('Krupaya Dairy Owner mhanun login kara.')
                return
            }

            const response = await fetch(
                `http://localhost:5000/api/milk-collections/report?startDate=${startDate}&endDate=${endDate}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            const responseText = await response.text();

            let result;

            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(
                    `Server returned HTML instead of JSON. Check API route. Status: ${response.status}`
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Report milu shakla nahi.');
            }

            const farmersResponse = await fetch('http://localhost:5000/api/farmers', {
                headers: { Authorization: `Bearer ${token}` },
            })
            const farmersResult = await farmersResponse.json()
            if (!farmersResponse.ok || !farmersResult.success) {
                throw new Error(farmersResult.message || 'Shetkari load hou shakle nahit.')
            }

            setFarmers(farmersResult.data || [])

            const farmerList = farmersResult.data || []
            const previewResults = {}

            await Promise.all(
                farmerList.map(async (farmer) => {
                    try {
                        const previewResponse = await fetch(
                            `http://localhost:5000/api/pend-management/settlement-preview?farmerId=${encodeURIComponent(farmer.farmerId)}&startDate=${startDate}&endDate=${endDate}`,
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            }
                        )
                        const previewData = await previewResponse.json()
                        previewResults[farmer.farmerId] = {
                            ...(previewData.data || {}),
                            error: previewResponse.ok
                                ? ''
                                : (previewData.message || 'Settlement preview unavailable'),
                            alreadySettled: previewData.alreadySettled || false,
                            settlement: previewData.settlement || null,
                        }
                    } catch {
                        previewResults[farmer.farmerId] = { error: 'Preview load hou shakla nahi.' }
                    }
                })
            )

            setSettlementPreviews(previewResults)

            const defaultPendInputs = {}
            const defaultLoanInputs = {}
            Object.entries(previewResults).forEach(([farmerId, previewData]) => {
                const milkPay = Number(previewData?.milkPayment || 0)
                const pendBal = Number(previewData?.totalPendBalance || 0)
                const loanBal = Number(previewData?.totalLoanBalance || 0)

                const autoPend = Math.min(milkPay, pendBal)
                const autoLoan = Math.min(Math.max(0, milkPay - autoPend), loanBal)

                defaultPendInputs[farmerId] = String(autoPend)
                defaultLoanInputs[farmerId] = String(autoLoan)
            })

            setDeductionInputs(defaultPendInputs)
            setLoanDeductionInputs(defaultLoanInputs)
            setSettlementMessages({})
            setReport(result.data)
        } catch (err) {
            setError(err.message || 'Kahi tari chukle.')
        } finally {
            setLoading(false)
        }
    }

    const confirmSettlement = async (farmerId) => {
        try {
            setSettlementMessages((prev) => ({ ...prev, [farmerId]: 'Settlement hot ahe...' }))
            const token = localStorage.getItem('dairyToken')
            const deductionAmount = Number(deductionInputs[farmerId] || 0)
            const loanDeductionAmount = Number(loanDeductionInputs[farmerId] || 0)

            const response = await fetch('http://localhost:5000/api/pend-management/settlement-confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    farmerId,
                    startDate,
                    endDate,
                    deductionAmount,
                    loanDeductionAmount,
                }),
            })

            const result = await response.json()
            if (!response.ok || !result.success) throw new Error(result.message || 'Settlement fail zali.')

            setSettlementPreviews((prev) => ({
                ...prev,
                [farmerId]: {
                    ...prev[farmerId],
                    alreadySettled: true,
                    settlement: result.settlement,
                },
            }))
            setSettlementMessages((prev) => ({ ...prev, [farmerId]: 'Settlement safal zali!' }))
        } catch (err) {
            setSettlementMessages((prev) => ({ ...prev, [farmerId]: err.message }))
        }
    }

    const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-IN') : '')
    const formatTime = (date) => (date ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '')
    const money = (amount) => `₹${Number(amount || 0).toFixed(2)}`

    const formatLocalDate = (date) => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')

    const changeReportType = (type) => {
        setReportType(type)
        const end = new Date()
        let start = new Date(end)
        if (type === '10days') {
            start.setDate(end.getDate() - 9)
        } else {
            start = new Date(end.getFullYear(), end.getMonth(), 1)
        }
        setStartDate(formatLocalDate(start))
        setEndDate(formatLocalDate(end))
    }

    const getFarmerReports = () => {
        if (!report || !report.collections || !farmers.length) return []
        const formatDateKey = (d) => {
            const date = new Date(d)
            return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
        }

        const allDates = []
        const cur = new Date(`${startDate}T12:00:00`)
        const end = new Date(`${endDate}T12:00:00`)
        while (cur <= end) {
            allDates.push(formatDateKey(cur))
            cur.setDate(cur.getDate() + 1)
        }

        return farmers.map((farmer) => {
            const fColls = report.collections.filter((item) => item.farmerId === farmer.farmerId)
            const dailyRecords = allDates.map((date) => {
                const dayColls = fColls.filter((item) => formatDateKey(item.collectionTime) === date)
                const totalLitres = dayColls.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
                const totalPayment = dayColls.reduce((sum, item) => sum + Number(item.totalPayment || 0), 0)
                const pendingEntries = dayColls.filter((item) => item.totalPayment == null).length
                return { date, collections: dayColls, totalLitres, totalPayment, pendingEntries }
            })
            return {
                farmerId: farmer.farmerId,
                farmerName: farmer.name,
                dailyRecords,
                totalLitres: dailyRecords.reduce((s, d) => s + d.totalLitres, 0),
                totalPayment: dailyRecords.reduce((s, d) => s + d.totalPayment, 0),
                pendingEntries: dailyRecords.reduce((s, d) => s + d.pendingEntries, 0),
            }
        })
    }

    const farmerReports = getFarmerReports()

    const getFarmerAccountSummary = (farmer) => {
        const preview = settlementPreviews[farmer.farmerId] || {}
        const settlement = preview.settlement

        const milkPayment = Number(
            settlement?.milkPayment ?? preview.milkPayment ?? farmer.totalPayment ?? 0
        )

        const openingPend = Number(preview.openingPendBalance ?? 0)
        const newPend = Number(preview.periodPendTotal ?? 0)
        const totalPend = Number(
            preview.totalPendBalance ?? openingPend + newPend
        )

        const openingLoan = Number(preview.openingLoanBalance ?? 0)
        const newLoan = Number(preview.periodLoanTotal ?? 0)
        const totalLoan = Number(
            preview.totalLoanBalance ?? openingLoan + newLoan
        )

        const pendCut = Number(
            settlement?.deductionAmount ??
            deductionInputs[farmer.farmerId] ??
            0
        )

        const loanCut = Number(
            settlement?.loanDeductionAmount ??
            loanDeductionInputs[farmer.farmerId] ??
            0
        )

        const remainingPend = Number(
            settlement?.remainingPendBalance ??
            preview.remainingPendBalance ??
            Math.max(0, totalPend - pendCut)
        )

        const remainingLoan = Number(
            settlement?.remainingLoanBalance ??
            preview.remainingLoanBalance ??
            Math.max(0, totalLoan - loanCut)
        )

        const netPayable = Number(
            settlement?.finalPayable ??
            Math.max(0, milkPayment - pendCut - loanCut)
        )

        return {
            milkPayment,
            openingPend,
            newPend,
            totalPend,
            pendCut,
            remainingPend,
            openingLoan,
            newLoan,
            totalLoan,
            loanCut,
            remainingLoan,
            netPayable,
        }
    }

    const downloadFarmerPDF = (farmer) => {
        const doc = new jsPDF()

        doc.setFillColor(16, 185, 129)
        doc.rect(14, 10, 182, 8, 'F')
        doc.setFontSize(13)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('Dairy Trust - Farmer Milk & Settlement Bill', 16, 16)

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Farmer Name: ${farmer.farmerName}`, 14, 25)
        doc.text(`Farmer ID: ${farmer.farmerId}`, 14, 30)
        doc.text(`Period: ${startDate} to ${endDate}`, 130, 25)
        doc.text(`Bill Date: ${new Date().toLocaleDateString('en-IN')}`, 130, 30)

        const tableRows = []
        farmer.dailyRecords.forEach((day) => {
            if (day.collections.length === 0) {
                tableRows.push([day.date, '-', 'No Collection', '0', '-', '-', '-', '-'])
            } else {
                day.collections.forEach((item) => {
                    tableRows.push([
                        day.date,
                        formatTime(item.collectionTime),
                        item.session || '-',
                        item.quantity,
                        item.fat,
                        item.snf,
                        item.ratePerLitre == null ? 'N/A' : Number(item.ratePerLitre).toFixed(2),
                        item.totalPayment == null ? 'Pending' : Number(item.totalPayment).toFixed(2),
                    ])
                })
            }
        })

        autoTable(doc, {
            startY: 35,
            head: [['Date', 'Time', 'Session', 'Milk (L)', 'FAT', 'SNF', 'Rate/L', 'Payment (Rs.)']],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        })

        const finalY = doc.lastAutoTable.finalY + 6
        const account = getFarmerAccountSummary(farmer)

        const summaryRows = [
            ['Total Milk Collected', `${farmer.totalLitres.toFixed(2)} Litres`],
            ['Total Milk Payment', `Rs. ${account.milkPayment.toFixed(2)}`],

            ['Opening Pend Balance', `Rs. ${account.openingPend.toFixed(2)}`],
            ['New Pend During Period', `Rs. ${account.newPend.toFixed(2)}`],
            ['Total Pend', `Rs. ${account.totalPend.toFixed(2)}`],
            ['Pend Deduction', `- Rs. ${account.pendCut.toFixed(2)}`],
            ['Remaining Pend', `Rs. ${account.remainingPend.toFixed(2)}`],

            ['Opening Loan Balance', `Rs. ${account.openingLoan.toFixed(2)}`],
            ['New Loan During Period', `Rs. ${account.newLoan.toFixed(2)}`],
            ['Total Loan', `Rs. ${account.totalLoan.toFixed(2)}`],
            ['Loan Deduction', `- Rs. ${account.loanCut.toFixed(2)}`],
            ['Remaining Loan', `Rs. ${account.remainingLoan.toFixed(2)}`],

            ['FINAL NET PAYABLE', `Rs. ${account.netPayable.toFixed(2)}`],
        ]

        autoTable(doc, {
            startY: finalY,
            head: [['Account Summary & Settlement Details', 'Amount']],
            body: summaryRows,
            theme: 'grid',
            styles: { fontSize: 8.5, cellPadding: 2 },
            headStyles: {
                fillColor: [241, 245, 249],
                textColor: [16, 185, 129],
                fontStyle: 'bold',
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 105 },
                1: { halign: 'right', cellWidth: 77, fontStyle: 'bold' },
            },
        })

        const signY = doc.lastAutoTable.finalY + 12
        if (signY < 280) {
            doc.setFontSize(8)
            doc.text('Farmer Signature: __________________', 14, signY)
            doc.text('Dairy Owner Signature: __________________', 115, signY)
        }
        doc.save(`${farmer.farmerId}_Milk_Report.pdf`)
    }

    const printReport = () => {
        if (!report || !farmers.length) return
        const doc = new jsPDF()

        doc.setFillColor(16, 185, 129)
        doc.rect(14, 10, 182, 10, 'F')
        doc.setFontSize(14)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('Dairy Trust - Comprehensive Master Milk Report', 16, 17)

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${startDate} to ${endDate}`, 14, 26)
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 130, 26)

        const summaryTableRows = [
            ['Morning Session', `${report.summary?.morning?.entries || 0}`, `${Number(report.summary?.morning?.litres || 0).toFixed(2)} L`, `Rs. ${Number(report.summary?.morning?.payment || 0).toFixed(2)}`],
            ['Evening Session', `${report.summary?.evening?.entries || 0}`, `${Number(report.summary?.evening?.litres || 0).toFixed(2)} L`, `Rs. ${Number(report.summary?.evening?.payment || 0).toFixed(2)}`],
            ['Outside Session', `${report.summary?.outsideSession?.entries || 0}`, `${Number(report.summary?.outsideSession?.litres || 0).toFixed(2)} L`, `Rs. ${Number(report.summary?.outsideSession?.payment || 0).toFixed(2)}`],
            ['Total Whole Period', `${report.summary?.totalEntries || 0}`, `${Number(report.summary?.totalLitres || 0).toFixed(2)} L`, `Rs. ${Number(report.summary?.totalPayment || 0).toFixed(2)}`],
        ]

        autoTable(doc, {
            startY: 34,
            head: [['Session', 'Entries', 'Milk (L)', 'Payment']],
            body: summaryTableRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        })

        const allFarmersRows = farmerReports.map((farmer) => {
            const account = getFarmerAccountSummary(farmer)

            return [
                farmer.farmerId,
                farmer.farmerName,
                `${farmer.totalLitres.toFixed(1)} L`,
                account.milkPayment.toFixed(2),
                account.pendCut.toFixed(2),
                account.loanCut.toFixed(2),
                account.netPayable.toFixed(2),
            ]
        })

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [['ID', 'Farmer Name', 'Milk (L)', 'Milk Amt', 'Pend Cut', 'Loan Cut', 'Net Payable']],
            body: allFarmersRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        })

        farmerReports.forEach((farmer) => {
            doc.addPage()

            doc.setFillColor(16, 185, 129)
            doc.rect(14, 10, 182, 8, 'F')
            doc.setFontSize(12)
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.text('Dairy Trust - Farmer Milk & Settlement Bill', 16, 16)

            doc.setTextColor(30, 41, 59)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text(`Farmer: ${farmer.farmerName} (${farmer.farmerId})`, 14, 25)
            doc.text(`Period: ${startDate} to ${endDate}`, 130, 25)

            const indTableRows = []
            farmer.dailyRecords.forEach((day) => {
                if (day.collections.length === 0) {
                    indTableRows.push([day.date, '-', 'No Collection', '0', '-', '-', '-', '-'])
                } else {
                    day.collections.forEach((item) => {
                        indTableRows.push([
                            day.date,
                            formatTime(item.collectionTime),
                            item.session || '-',
                            item.quantity,
                            item.fat,
                            item.snf,
                            item.ratePerLitre == null ? 'N/A' : Number(item.ratePerLitre).toFixed(2),
                            item.totalPayment == null ? 'Pending' : Number(item.totalPayment).toFixed(2),
                        ])
                    })
                }
            })

            autoTable(doc, {
                startY: 32,
                head: [['Date', 'Time', 'Session', 'Milk (L)', 'FAT', 'SNF', 'Rate/L', 'Payment (Rs.)']],
                body: indTableRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
                headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            })

            const account = getFarmerAccountSummary(farmer)

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 6,
                head: [['Account Summary & Settlement Details', 'Amount']],
                body: [
                    ['Total Milk Collected', `${farmer.totalLitres.toFixed(2)} Litres`],
                    ['Total Milk Payment', `Rs. ${account.milkPayment.toFixed(2)}`],

                    ['Opening Pend Balance', `Rs. ${account.openingPend.toFixed(2)}`],
                    ['New Pend During Period', `Rs. ${account.newPend.toFixed(2)}`],
                    ['Total Pend', `Rs. ${account.totalPend.toFixed(2)}`],
                    ['Pend Deduction', `- Rs. ${account.pendCut.toFixed(2)}`],
                    ['Remaining Pend', `Rs. ${account.remainingPend.toFixed(2)}`],

                    ['Opening Loan Balance', `Rs. ${account.openingLoan.toFixed(2)}`],
                    ['New Loan During Period', `Rs. ${account.newLoan.toFixed(2)}`],
                    ['Total Loan', `Rs. ${account.totalLoan.toFixed(2)}`],
                    ['Loan Deduction', `- Rs. ${account.loanCut.toFixed(2)}`],
                    ['Remaining Loan', `Rs. ${account.remainingLoan.toFixed(2)}`],

                    ['FINAL NET PAYABLE', `Rs. ${account.netPayable.toFixed(2)}`],
                ],
                theme: 'grid',
                styles: { fontSize: 8.5, cellPadding: 2 },
                headStyles: {
                    fillColor: [241, 245, 249],
                    textColor: [16, 185, 129],
                    fontStyle: 'bold',
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 105 },
                    1: { halign: 'right', cellWidth: 77, fontStyle: 'bold' },
                },
            })
        })

        doc.save(`Dairy_Trust_Master_Report_${startDate}_to_${endDate}.pdf`)
    }

    return (
        <div className="container-fluid milk-reports-page">            {/* Header */}
            <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <h2 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                        <span className="text-success">📊</span> {t('reportsAndBills')}
                    </h2>
                    <small className="text-secondary">Transparent periodic accounts & settlement bills</small>
                </div>
                <Link to="/dairy-dashboard" className="btn btn-outline-secondary btn-sm px-3 rounded-pill fw-semibold">
                    {t('dashboardOverview')}
                </Link>
            </header>

            {/* Filter Section */}
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
                <div className="d-flex gap-2 mb-3">
                    <button
                        type="button"
                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${reportType === '10days' ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => changeReportType('10days')}
                    >
                        {t('reportsTitle')}
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${reportType === 'month' ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => changeReportType('month')}
                    >
                        1 Month Report
                    </button>
                </div>

                <div className="row g-3 align-items-end">
                    <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-secondary">{t('fromDate')}</label>
                        <input type="date" className="form-control rounded-3" value={startDate} max={localDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-secondary">{t('toDate')}</label>
                        <input type="date" className="form-control rounded-3" value={endDate} min={startDate} max={localDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="col-12 col-md-4">
                        <button className="btn btn-success w-100 rounded-3 py-2 fw-semibold" onClick={generateReport} disabled={loading}>
                            {loading ? t('saving') : t('generateBill')}
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-danger rounded-3 py-2 px-3 small mb-4">{error}</div>}

            {report && report.summary && (
                <div>
                    {/* Action Bar */}
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                        <div>
                            <h5 className="fw-bold mb-0">Periodic Overview</h5>
                            <small className="text-secondary">{formatDate(report.startDate)} to {formatDate(report.endDate)}</small>
                        </div>
                        <button className="btn btn-dark btn-sm px-3 py-2 rounded-3 fw-semibold shadow-sm" onClick={printReport}>
                            📄 {t('printBill')} (All Pages)
                        </button>
                    </div>

                    {/* KPI Cards */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-success border-4">
                                <small className="text-secondary fw-semibold">{t('totalMilk')}</small>
                                <h3 className="fw-bold text-success mb-0">{report.summary.totalLitres} L</h3>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-primary border-4">
                                <small className="text-secondary fw-semibold">{t('totalPayment')}</small>
                                <h3 className="fw-bold text-primary mb-0">{money(report.summary.totalPayment)}</h3>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-dark border-4">
                                <small className="text-secondary fw-semibold">{t('totalEntries')}</small>
                                <h3 className="fw-bold text-dark mb-0">{report.summary.totalEntries}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Individual Farmers */}
                    <h5 className="fw-bold mb-3">Farmer Statements & Deductions</h5>
                    {farmerReports.map((farmer) => {
                        const preview = settlementPreviews[farmer.farmerId]
                        const pendDeduction = Number(deductionInputs[farmer.farmerId] || 0)
                        const loanDeduction = Number(loanDeductionInputs[farmer.farmerId] || 0)
                        const milkPayment = Number(preview?.milkPayment || 0)
                        const pendBalance = Number(preview?.totalPendBalance || 0)
                        const loanBalance = Number(preview?.totalLoanBalance || 0)

                        const currentFinalPayable = Math.max(0, milkPayment - pendDeduction - loanDeduction)
                        const currentRemainingPend = Math.max(0, pendBalance - pendDeduction)
                        const currentRemainingLoan = Math.max(0, loanBalance - loanDeduction)

                        return (
                            <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden" key={farmer.farmerId}>
                                <div className="card-header bg-light py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom">
                                    <div>
                                        <h6 className="fw-bold text-dark mb-0">{farmer.farmerName}</h6>
                                        <small className="text-muted">{t('farmerId')}: {farmer.farmerId}</small>
                                    </div>
                                    <button className="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold" onClick={() => downloadFarmerPDF(farmer)}>
                                        📥 Download 1-Page PDF
                                    </button>
                                </div>

                                <div className="card-body p-4">
                                    {/* Deduction Settings Card */}
                                    <div className="p-3 bg-light rounded-4 mb-3 border">
                                        <div className="row g-3">
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">{t('totalPayment')}</small>
                                                <span className="fw-bold text-success fs-5">{money(milkPayment)}</span>
                                            </div>
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Pend Balance</small>
                                                <span className="fw-bold text-danger fs-5">{money(pendBalance)}</span>
                                            </div>
                                            <div className="col-md-4">
                                                <small className="text-muted d-block">Outstanding Loan</small>
                                                <span className="fw-bold text-danger fs-5">{money(loanBalance)}</span>
                                            </div>
                                        </div>

                                        {!preview?.settlement && (
                                            <div className="row g-3 mt-2 pt-2 border-top">
                                                <div className="col-md-4">
                                                    <label className="form-label small fw-semibold text-secondary">Pend Cut (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm rounded-3"
                                                        value={deductionInputs[farmer.farmerId] ?? '0'}
                                                        onChange={(e) => setDeductionInputs((prev) => ({ ...prev, [farmer.farmerId]: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label small fw-semibold text-secondary">Loan Cut (₹)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm rounded-3"
                                                        value={loanDeductionInputs[farmer.farmerId] ?? '0'}
                                                        onChange={(e) => setLoanDeductionInputs((prev) => ({ ...prev, [farmer.farmerId]: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-md-4 d-flex align-items-end">
                                                    <button
                                                        className="btn btn-success btn-sm w-100 rounded-3 py-2 fw-semibold"
                                                        onClick={() => confirmSettlement(farmer.farmerId)}
                                                    >
                                                        Confirm Settlement
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="d-flex justify-content-between mt-3 pt-2 border-top small fw-semibold text-secondary">
                                            <span>Net Payable: <strong className="text-success">{money(currentFinalPayable)}</strong></span>
                                            <span>Rem. Pend: <strong className="text-danger">{money(currentRemainingPend)}</strong></span>
                                            <span>Rem. Loan: <strong className="text-danger">{money(currentRemainingLoan)}</strong></span>
                                        </div>
                                    </div>

                                    {settlementMessages[farmer.farmerId] && (
                                        <div className="alert alert-info py-2 small mb-3">{settlementMessages[farmer.farmerId]}</div>
                                    )}

                                    {/* Daily Table */}
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover align-middle mb-0">
                                            <thead className="table-light small text-muted">
                                                <tr>
                                                    <th>{t('date')}</th>
                                                    <th>Time</th>
                                                    <th>{t('session')}</th>
                                                    <th>{t('quantity')}</th>
                                                    <th>{t('fat')}</th>
                                                    <th>{t('snf')}</th>
                                                    <th>{t('ratePerL')}</th>
                                                    <th className="text-end">{t('payment')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="small">
                                                {farmer.dailyRecords.map((day) =>
                                                    day.collections.length > 0 ? (
                                                        day.collections.map((item) => (
                                                            <tr key={item._id}>
                                                                <td>{formatDate(day.date)}</td>
                                                                <td>{formatTime(item.collectionTime)}</td>
                                                                <td><span className="badge bg-light text-dark border">{item.session}</span></td>
                                                                <td>{item.quantity} L</td>
                                                                <td>{item.fat}%</td>
                                                                <td>{item.snf}%</td>
                                                                <td>{money(item.ratePerLitre)}</td>
                                                                <td className="text-end fw-semibold text-success">{money(item.totalPayment)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr key={day.date}>
                                                            <td>{formatDate(day.date)}</td>
                                                            <td colSpan="7" className="text-center text-muted">Nond Nahi</td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default MilkReports