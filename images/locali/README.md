# Fotografie permanenti dei locali

**Qui si caricano le foto dei locali.** Una cartella per ogni locale, usando lo stesso slug del relativo file JSON presente in `/locali/`.

| Locale | Cartella fotografie | File dati |
|---|---|---|
| iGinGini | `/images/locali/igingini/` | `/locali/igingini.json` |

## Regole per i caricamenti
- Caricare le immagini nella cartella del locale corretto.
- Per iGinGini mantenere i nomi originali progressivi: `igi1.jpg`, `igi2.jpg`, `igi3.jpg`…
- Non creare cartelle per singole date o serate.
- Non cancellare le foto quando si elimina un evento.
- Per un nuovo locale si crea una nuova cartella con slug stabile e la relativa scheda JSON in `/locali/`.

Le foto caricate qui non vengono mostrate automaticamente: vanno anche registrate nell'array `gallery` del relativo file JSON.
