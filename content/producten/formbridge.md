---
title: "FormBridge"
---

## Formulieren voor statische websites

Statische sites zijn snel, veilig, en goedkoop te hosten. Maar ze missen iets essentieels: een manier om van je bezoekers te horen. Geen contactformulier, geen aanmeldingen, geen feedback.

FormBridge lost dat op. Eén API-call maakt een formulier aan. Een simpel HTML-formulier op je site stuurt inzendingen naar FormBridge. Jij krijgt een e-mail. De data wordt opgeslagen. Spam wordt automatisch gefilterd.

### Hoe het werkt

1. **Maak een formulier** via de API — definieer je velden, labels, en validatie
2. **Plak de HTML** op je website — een standaard `<form>` tag, geen JavaScript framework nodig
3. **Ontvang inzendingen** in je mailbox — netjes geformateerd, met spamfilter

### Waarom FormBridge?

- **Geen vendor lock-in** — je formulier is gewoon HTML. Werkt met Hugo, Jekyll, Astro, of plain HTML
- **Privacy-first** — jouw data, jouw database. Geen tracking, geen profiling
- **Spam-bescherming** — honeypot en timing-detectie, geen irritante captchas
- **Simpele API** — één endpoint voor inzendingen, RESTful API voor beheer

### Binnenkort beschikbaar

FormBridge is momenteel in gebruik voor eigen projecten van Perceptum. We werken aan zelfservice-toegang voor externe gebruikers.

**Wil je weten wanneer FormBridge beschikbaar is?** Laat je e-mailadres achter — uiteraard via een FormBridge-formulier.

<form class="contact-form" id="formbridge-signup" method="POST">
  <input type="hidden" name="_gotcha" value="">
  <input type="hidden" name="_ts" value="">
  <div class="form-group">
    <label for="naam">Naam</label>
    <input type="text" id="naam" name="naam" required placeholder="Je naam">
  </div>
  <div class="form-group">
    <label for="email">E-mailadres</label>
    <input type="email" id="email" name="email" required placeholder="je@email.nl">
  </div>
  <div class="form-group">
    <label for="usecase">Waar wil je FormBridge voor gebruiken?</label>
    <textarea id="usecase" name="usecase" placeholder="Bijv. contactformulier voor mijn portfolio site" rows="3"></textarea>
  </div>
  <button type="submit" class="btn-submit">Houd me op de hoogte</button>
  <p class="form-success" id="signup-success" style="display:none;">Bedankt! We laten je weten zodra FormBridge beschikbaar is.</p>
  <p class="form-error" id="signup-error" style="display:none;">Er ging iets mis. Stuur een mail naar wijnand@perceptum.nl.</p>
</form>

<script>
(function() {
  var FORMBRIDGE_URL = 'https://forms.bollenstreekdigitaal.nl/api/v1/s/f_6f7cf77bd01d';
  var form = document.getElementById('formbridge-signup');
  var ts = form.querySelector('[name="_ts"]');
  if (ts) ts.value = Date.now().toString();

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var data = new FormData(form);
    fetch(FORMBRIDGE_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify(Object.fromEntries(data))
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        form.style.display = 'none';
        document.getElementById('signup-success').style.display = 'block';
      } else {
        document.getElementById('signup-error').style.display = 'block';
      }
    })
    .catch(function() {
      document.getElementById('signup-error').style.display = 'block';
    });
  });
})();
</script>
