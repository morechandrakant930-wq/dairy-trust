
function calculateSettlement({
  milkPayment,
  manualBonus = 0,
  qualityBonus = 0,
  loanBalance,
  pendBalance,
}) {
  const milk = Math.max(0, Number(milkPayment) || 0);
  const manual = Math.max(0, Number(manualBonus) || 0);
  const quality = Math.max(0, Number(qualityBonus) || 0);
  const loan = Math.max(0, Number(loanBalance) || 0);
  const pend = Math.max(0, Number(pendBalance) || 0);

  // Add both bonuses to milk payment
  const totalBonus = manual + quality;
  const totalIncome = milk + totalBonus;

  // First deduct Loan
  const loanDeduction = Math.min(totalIncome, loan);
  const remainingAfterLoan = totalIncome - loanDeduction;
  const remainingLoan = loan - loanDeduction;

  // Then deduct Pend
  const pendDeduction = Math.min(remainingAfterLoan, pend);
  const finalPayable = remainingAfterLoan - pendDeduction;
  const remainingPend = pend - pendDeduction;

  // Remaining amount farmer owes the owner
  const farmerDueToOwner = remainingLoan + remainingPend;

  return {
    milkPayment: milk,
    manualBonus: manual,
    qualityBonus: quality,
    totalBonus,
    totalIncome,
    loanDeduction,
    remainingLoan,
    pendDeduction,
    remainingPend,
    finalPayable,
    farmerDueToOwner,
  };
}

module.exports = calculateSettlement;
