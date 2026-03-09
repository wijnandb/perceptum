---
title: "Contact"
---

Heb je een vraag of wil je weten wat Perceptum voor jou kan betekenen? Neem contact op via het formulier, of bel of mail ons direct.

**Telefoon:** [071 - 203 2103](tel:+31712032103)
**E-mail:** [wijnand@perceptum.nl](mailto:wijnand@perceptum.nl)

<form class="contact-form" id="contact-form" method="POST">
  <input type="hidden" name="_gotcha" value="">
  <input type="hidden" name="_ts" value="">
  <div class="form-group">
    <label for="naam">Naam *</label>
    <input type="text" id="naam" name="naam" required placeholder="Je naam">
  </div>
  <div class="form-group">
    <label for="email">E-mailadres *</label>
    <input type="email" id="email" name="email" required placeholder="je@email.nl">
  </div>
  <div class="form-group">
    <label for="telefoon">Telefoonnummer</label>
    <input type="tel" id="telefoon" name="telefoon" placeholder="06 - ...">
  </div>
  <div class="form-group">
    <label for="bedrijf">Bedrijfsnaam</label>
    <input type="text" id="bedrijf" name="bedrijf" placeholder="Je bedrijf">
  </div>
  <div class="form-group">
    <label for="bericht">Bericht *</label>
    <textarea id="bericht" name="bericht" required placeholder="Waar kunnen we je mee helpen?" rows="5"></textarea>
  </div>
  <button type="submit" class="btn-submit">Verstuur</button>
  <p class="form-success" id="form-success" style="display:none;">Bedankt! We nemen zo snel mogelijk contact met je op.</p>
  <p class="form-error" id="form-error" style="display:none;">Er ging iets mis. Probeer het opnieuw of mail ons direct.</p>
</form>

<script>
(function() {
  // FormBridge endpoint (hosted under BD domain, serves all Perceptum sites)
  var FORMBRIDGE_URL = 'https://forms.bollenstreekdigitaal.nl/api/v1/s/f_e6de503e1d49';
  var form = document.getElementById('contact-form');
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
        document.getElementById('form-success').style.display = 'block';
      } else {
        document.getElementById('form-error').style.display = 'block';
      }
    })
    .catch(function() {
      document.getElementById('form-error').style.display = 'block';
    });
  });
})();
</script>

## Locaties

**Noordwijk**
Gooweg 14
2203 AB Noordwijk

**Amsterdam**
Vijzelstraat 68
1017 HL Amsterdam

**Leiden**
Mendelweg 32
2333 CS Leiden
