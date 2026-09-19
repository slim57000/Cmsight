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
