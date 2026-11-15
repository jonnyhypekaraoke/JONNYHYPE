# JONNYHYPE CARDS — ambiente di sviluppo

Questo progetto è nel branch `cards-development`. Non è pubblicato sul sito principale.

## Pagine
- `index.html`: registrazione socio, verifica email e tessera digitale.
- `partner.html`: accesso partner e lettura QR con fotocamera.

## Backend Supabase
Project ref: `xceywzabnvybjeteletg`

Edge Functions attive:
- `cards-issue`: emissione automatica del numero tessera dopo verifica email.
- `cards-qr`: token QR casuale, conservato nel database solo come hash, scadenza 45 secondi.
- `cards-verify`: verifica lato server e consumo monouso del QR.

## Configurazione ancora necessaria
1. In Supabase Auth → Email Templates → Magic Link, sostituire il modello con un messaggio OTP che includa `{{ .Token }}`. Esempio:

   ```html
   <h2>Il tuo codice JONNYHYPE CARDS</h2>
   <p>Inserisci questo codice per verificare la tua email:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Se non hai richiesto tu il codice, ignora questa email.</p>
   ```

2. Verificare il mittente SMTP personalizzato già impostato nel progetto.
3. Creare l'account amministratore e i partner con associazione in `partner_users`.
4. Inserire i testi definitivi di regolamento, privacy e consensi, dopo revisione.
5. Definire il regolamento punti: nessun valore punti è stato inventato o attivato.
6. Collaudare OTP, emissione progressiva 001–100, QR, scansione e regole sconto prima della pubblicazione.

## Sicurezza
- Le chiavi privilegiate restano solo lato server; nel browser è presente esclusivamente la publishable key.
- Le tabelle con dati personali hanno RLS e policy di sola lettura per il proprietario/partner autorizzato.
- I client non possono scrivere direttamente su profili, carte, scansioni o punti.
- Le tabelle dei token QR e delle date di esclusione non sono leggibili dal browser.
- Le funzioni di emissione e verifica usano il ruolo server e controllano l'identità autenticata.

## Regole sconto implementate
- 5% ordinario e 10% durante un evento programmato di tipo `jonnyhype` presso il partner.
- Le date nazionali escluse sono registrate nel database per gli anni 2026–2028.
- Le date di chiusura specifiche del singolo partner si gestiscono in `partner_blackout_dates`.
- Il minimo di spesa previsto è 5 euro: deve essere verificato dal partner al momento dell'acquisto, perché il sistema non riceve lo scontrino/importo.
