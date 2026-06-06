document.addEventListener('DOMContentLoaded', function(){
  const $ = id => document.getElementById(id)
  const loanAmount = $('loanAmount')
  const interestRate = $('interestRate')
  const termYears = $('termYears')
  const calcBtn = $('calcBtn')
  const exportBtn = $('exportBtn')
  const printBtn = $('printBtn')

  function formatCurrency(v){
    return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(v)
  }

  function compute(){
    const P = parseFloat(loanAmount.value)||0
    const annual = parseFloat(interestRate.value)||0
    const years = parseInt(termYears.value)||0
    const n = years*12
    const r = annual/100/12
    let monthly = 0
    if(r===0) monthly = P/n
    else monthly = P * r / (1 - Math.pow(1+r, -n))

    const totalPayment = monthly * n
    const totalInterest = totalPayment - P

    $('monthlyPayment').textContent = formatCurrency(monthly)
    $('totalPayment').textContent = formatCurrency(totalPayment)
    $('totalInterest').textContent = formatCurrency(totalInterest)

    buildTable(P, r, n, monthly)
  }

  function buildTable(P, r, n, monthly){
    const tbody = document.querySelector('#amortTable tbody')
    tbody.innerHTML = ''
    let balance = P
    for(let m=1;m<=n;m++){
      const interest = balance * r
      const principal = Math.min(monthly - interest, balance)
      balance = Math.max(0, balance - principal)
      const tr = document.createElement('tr')
      tr.innerHTML = `<td>${m}</td><td style="text-align:right">${formatCurrency(monthly)}</td><td>${formatCurrency(principal)}</td><td>${formatCurrency(interest)}</td><td>${formatCurrency(balance)}</td>`
      tbody.appendChild(tr)
    }
  }

  function exportCSV(){
    const rows = [['Month','Payment','Principal','Interest','Balance']]
    document.querySelectorAll('#amortTable tbody tr').forEach(tr=>{
      const cols = Array.from(tr.children).map(td=>td.textContent.replace(/,/g,''))
      rows.push(cols)
    })
    const csv = rows.map(r=>r.join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'amortization.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  calcBtn.addEventListener('click', compute)
  exportBtn.addEventListener('click', exportCSV)
  printBtn.addEventListener('click', ()=>window.print())

  // compute initial
  compute()
})
