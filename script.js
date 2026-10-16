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
      var emailInput = document.getElementById('checkout-email');
      var email = emailInput ? emailInput.value.trim() : '';
      if (btn.dataset.requiresEmail === 'true' && (!email || !emailInput.checkValidity())) {
        buyButtons.forEach(function (b) { b.disabled = false; });
        btn.textContent = originalText;
        if (emailInput) emailInput.reportValidity();
        return;
      }
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: product, email: email || undefined }),
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

var contactForm = document.getElementById('contact-form');
if (contactForm) {
  var isEnForm = document.documentElement.lang === 'en';
  var statusEl = document.getElementById('contact-status');
  var tsField = contactForm.elements['ts'];
  var openedAt = Date.now();
  if (tsField) tsField.value = String(openedAt);
  var msgs = isEnForm
    ? { invalid: 'Please fill in every field correctly (message: 20 characters minimum).', consent: 'Please tick the consent box.', sending: 'Sending…', ok: 'Thanks, your message has been sent. We will reply shortly.', fail: 'Something went wrong. Your email app will open instead.', fast: 'Please take a moment to review your message, then try again.', subject: 'New contact from Cmsight' }
    : { invalid: 'Merci de remplir correctement tous les champs (message : 20 caractères minimum).', consent: 'Merci de cocher la case de consentement.', sending: 'Envoi en cours…', ok: 'Merci, votre message a bien été envoyé. Nous vous répondons rapidement.', fail: "Une erreur est survenue. Votre application mail va s'ouvrir.", fast: 'Prenez un instant pour relire votre message, puis réessayez.', subject: 'Nouveau contact depuis Cmsight' };
  var setStatus = function (text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (isError ? ' error' : '');
  };
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = contactForm.elements;
    if (f['company_url'].value) return; // honeypot: bots fill it, silently drop
    if (!contactForm.checkValidity()) {
      setStatus(f['consent'].checked ? msgs.invalid : msgs.consent, true);
      contactForm.reportValidity();
      return;
    }
    if (Date.now() - openedAt < 4000) { setStatus(msgs.fast, true); return; }
    var payload = {
      name: f['name'].value.trim(), email: f['email'].value.trim(),
      company: f['company'].value.trim(), website: f['website'].value.trim(),
      subject: f['subject'].value, message: f['message'].value.trim(),
      consent: f['consent'].checked, company_url: f['company_url'].value,
      ts: Number(f['ts'].value), lang: isEnForm ? 'en' : 'fr'
    };
    var btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    setStatus(msgs.sending, false);
    fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) {
        if (r.status === 400 || r.status === 429) return r.json().then(function (d) { throw { user: d.error || msgs.invalid }; });
        if (!r.ok) throw new Error('send failed');
        contactForm.reset();
        openedAt = Date.now(); f['ts'].value = String(openedAt);
        setStatus(msgs.ok, false);
        btn.disabled = false;
      })
      .catch(function (err) {
        btn.disabled = false;
        if (err && err.user) { setStatus(err.user, true); return; }
        setStatus(msgs.fail, true);
        var body = ['Name: ' + payload.name, 'Email: ' + payload.email, 'Company: ' + payload.company, 'Website: ' + payload.website, '', payload.message].join('\n');
        window.location.href = 'mailto:' + contactForm.getAttribute('data-mail') + '?subject=' + encodeURIComponent(msgs.subject + ' — ' + payload.subject) + '&body=' + encodeURIComponent(body);
      });
  });
}
