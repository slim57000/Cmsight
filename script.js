var revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(function (el) { observer.observe(el); });
} else {
  revealEls.forEach(function (el) { el.classList.add('visible'); });
}

var scrollProgress = document.getElementById('scroll-progress');
var backToTop = document.getElementById('back-to-top');

function updateScrollUI() {
  var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  if (scrollProgress) scrollProgress.style.width = pct + '%';
  if (backToTop) {
    if (scrollTop > 400) backToTop.classList.add('visible');
    else backToTop.classList.remove('visible');
  }
}

if (scrollProgress || backToTop) {
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  window.addEventListener('resize', updateScrollUI);
  updateScrollUI();
}

if (backToTop) {
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

var buyButtons = document.querySelectorAll('.buy-license-btn');
if (buyButtons.length) {
  buyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buyButtons.forEach(function (b) { b.disabled = true; });
      var originalText = btn.textContent;
      btn.textContent = 'Redirection...';
      fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.url) {
            window.location.href = data.url;
          } else {
            throw new Error('missing checkout url');
          }
        })
        .catch(function () {
          buyButtons.forEach(function (b) { b.disabled = false; });
          btn.textContent = originalText;
          alert("Une erreur est survenue. Merci de réessayer ou de nous contacter.");
        });
    });
  });
}

var checkoutBanner = document.getElementById('checkout-banner');
if (checkoutBanner) {
  var checkoutStatus = new URLSearchParams(window.location.search).get('checkout');
  if (checkoutStatus === 'success') {
    checkoutBanner.textContent = 'Paiement réussi ! Votre clé de licence vient de vous être envoyée par email.';
    checkoutBanner.classList.add('shown', 'success');
  } else if (checkoutStatus === 'cancelled') {
    checkoutBanner.textContent = 'Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.';
    checkoutBanner.classList.add('shown', 'cancelled');
  }
}

var contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var to = contactForm.getAttribute('data-mail');
    var name = contactForm.elements['name'].value;
    var email = contactForm.elements['email'].value;
    var message = contactForm.elements['message'].value;
    var isEn = document.documentElement.lang === 'en';
    var subject = isEn ? 'New contact from Cmsight' : 'Nouveau contact depuis Cmsight';
    var bodyLines = isEn
      ? ['Name: ' + name, 'Email: ' + email, '', message]
      : ['Nom : ' + name, 'Email : ' + email, '', message];
    var body = bodyLines.join('\n');
    window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
}
