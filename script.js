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
      var product = btn.dataset.product || 'eu-compliance-suite';
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: product }),
      })
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

var launchOfferNote = document.getElementById('launch-offer-note');
var launchOfferBadge = document.getElementById('launch-offer-badge');
if (launchOfferNote || launchOfferBadge) {
  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (config) {
      if (!config.launchOfferEndsAt) return;
      var isEn = document.documentElement.lang === 'en';
      if (!config.launchOfferActive) {
        if (launchOfferBadge) launchOfferBadge.textContent = isEn ? 'Standard price' : 'Prix standard';
        return;
      }
      var end = new Date(config.launchOfferEndsAt);
      var daysLeft = Math.max(1, Math.ceil((end - Date.now()) / 86400000));
      if (launchOfferNote) {
        var dateLabel = end.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long' });
        launchOfferNote.textContent = isEn
          ? 'Offer ends in ' + daysLeft + ' day' + (daysLeft > 1 ? 's' : '') + ' (' + dateLabel + ')'
          : "Offre valable encore " + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '') + " (jusqu'au " + dateLabel + ')';
      }
    })
    .catch(function () {});
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
