document.addEventListener('DOMContentLoaded', ()=>{
  function openPaywall(){
    const back = document.querySelector('.paywall-backdrop')
    if(back) back.style.display = 'flex'
  }
  function closePaywall(){
    const back = document.querySelector('.paywall-backdrop')
    if(back) back.style.display = 'none'
  }
  // Expose for buttons
  window.openPaywall = openPaywall

  document.body.addEventListener('click', (e)=>{
    if(e.target.matches('[data-open-paywall]')){ e.preventDefault(); openPaywall() }
    if(e.target.matches('[data-close-paywall]')){ e.preventDefault(); closePaywall() }
    if(e.target.matches('[data-pro-activate]')){
      // Simulate purchase: set local flag and close
      localStorage.setItem('calculatorPro_isPro','1')
      alert('Pro enabled for testing (local only).')
      closePaywall()
      window.location.reload()
    }
  })

  // Show banner if not pro
  const isPro = !!localStorage.getItem('calculatorPro_isPro')
  document.querySelectorAll('.pro-requirement').forEach(el=>{
    if(!isPro){ el.style.display = 'block' } else { el.style.display = 'none' }
  })
})
