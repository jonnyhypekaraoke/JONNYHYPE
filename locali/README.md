# Archivio permanente dei locali

Questa cartella contiene i dati stabili dei locali. **Non cancellare queste schede quando si elimina una data dal calendario.**

## Dove si caricano le fotografie
Le fotografie NON vanno qui. Vanno in `/images/locali/<slug-del-locale>/`.

Esempio iGinGini:
- Dati del locale: `/locali/igingini.json`
- Fotografie: `/images/locali/igingini/`
- Nomi foto: `igi1.jpg`, `igi2.jpg`, `igi3.jpg`…

## Regole
- Un file JSON per locale, con slug stabile e tutto minuscolo.
- Le foto restano nella cartella immagini del locale e non nella cartella dell'evento.
- Quando si aggiunge una nuova data, si riutilizza la scheda JSON già esistente.
- Quando si elimina un evento, si elimina solo la data dal calendario: mai la scheda JSON o le fotografie.
- Dopo il caricamento delle foto, aggiornare `gallery` nella scheda JSON con il percorso e il testo alternativo di ogni immagine.

## Campi della scheda
`id`, `name`, `aliases`, `address`, `city`, `province`, `map`, `logo`, `description`, `phone`, `bookingUrl`, `gallery`, `notes`, `updatedAt`.
