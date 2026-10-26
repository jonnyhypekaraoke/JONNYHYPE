# JONNYHYPE COMMUNITY — configurazione e attivazione

La pagina `community.html` è una prima interfaccia collegabile a Supabase. La chat NON è attiva finché i passaggi seguenti non sono completati e testati.

## 1. Configura l'autenticazione
1. Nel progetto Supabase apri Authentication → Sign In / Providers → Email.
2. Lascia attivo Email. Non serve attivare Phone/SMS né configurare Twilio.
3. Per sicurezza, mantieni la conferma dell'email attiva se disponibile. In questo caso l'utente deve confermare l'email prima di accedere.
4. Nel SQL Editor esegui `community-setup.sql` solo dopo aver verificato che sia la versione aggiornata nel repository.

## 2. Configura il database e l'amministratore
1. Dopo aver verificato l'identità dell'account amministratore, recupera il suo UUID da Authentication → Users.
2. Aggiungi l'UUID alla tabella amministratori con una query eseguita nel pannello Supabase:
   `insert into public.community_admins(user_id) values ('UUID-UTENTE-AMMINISTRATORE');`
3. Sostituisci il segnaposto con l'UUID corretto dell'account amministratore autenticato. Non condividere password o chiavi segrete.

## 3. Collega il sito
1. Inserisci Project URL e publishable/anon key in `community-config.js`.
2. Non inserire MAI la chiave `service_role` nel sito o nel repository.
3. Verifica con account di prova: registrazione email/password, eventuale conferma email, login, username univoci, chat, filtro, segnalazioni, eliminazione, sospensione e ban prima di annunciare la community.

## 4. Privacy e gestione account
L'email viene usata per l'autenticazione e non viene mostrata nei profili o nei messaggi pubblici. Prima dell'apertura pubblica occorrono informativa privacy, tempi di conservazione e una procedura per cancellare account e dati associati.

## Limiti da risolvere prima della produzione
- Il filtro parole in SQL è solo una prima barriera e va testato e ampliato; non riconosce tutte le varianti o il contesto.
- La schermata amministrativa e tutte le funzioni devono essere testate con un account amministratore e un account normale.
- Verificare con attenzione le policy RLS e i permessi delle funzioni SQL prima di eseguire lo script o rendere pubblica la community.
- Attivare protezioni anti-bot e limiti di frequenza, controllare i log e completare la verifica privacy.
- Non pubblicare questa community finché i test di sicurezza e la conformità privacy non sono completati.
