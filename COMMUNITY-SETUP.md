# JONNYHYPE COMMUNITY — configurazione e attivazione

La pagina community.html è una prima interfaccia collegabile a Supabase. La chat NON è attiva finché i passaggi seguenti non sono completati e testati.

## 1. Crea il progetto backend
1. Crea un progetto su Supabase e conserva l'accesso come proprietario.
2. In Authentication abilita Phone/SMS e configura un provider SMS valido.
3. Nel SQL Editor esegui tutto il file community-setup.sql.
4. Dopo aver verificato l'identità del proprietario, aggiungi il suo UUID a community_admins con una query eseguita nel pannello Supabase:
   insert into public.community_admins(user_id) values ('UUID-UTENTE-AMMINISTRATORE');
   Sostituisci il segnaposto con l'UUID corretto dell'account amministratore autenticato.

## 2. Collega il sito
1. Inserisci Project URL e anon/publishable key in community-config.js.
2. Non inserire MAI la chiave service_role nel sito o nel repository.
3. Verifica registrazione SMS, username univoci, chat, filtro, segnalazioni, eliminazione e ban con account di prova prima di annunciare la community.

## 3. Numero telefonico e privacy
Il numero è gestito dall'autenticazione Supabase e non viene richiesto né restituito dalle query pubbliche del sito. Il proprietario può gestire gli utenti autenticati dal pannello protetto del progetto. Prima dell'apertura pubblica occorrono informativa privacy, tempi di conservazione, procedura per cancellazione account e verifica dei costi SMS.

## Limiti da risolvere prima della produzione
- Il filtro parole in SQL è solo una prima barriera e va testato e ampliato; non riconosce tutte le varianti o il contesto.
- La schermata amministrativa iniziale gestisce coda, rimozione messaggi e ban, ma le segnalazioni standard richiedono una vista admin dedicata prima del lancio.
- Le azioni di ban sono permanenti nello schema iniziale; la sospensione temporanea va aggiunta prima di offrire questa funzione nell'interfaccia.
- Attiva limiti di frequenza e protezioni anti-bot, controlla i log e verifica tutte le policy RLS con account non amministratore.
- Non pubblicare questa community finché i test di sicurezza e la conformità privacy non sono completati.
