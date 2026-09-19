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
