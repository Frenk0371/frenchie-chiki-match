# Music House

PWA privata/familiare ispirata al flusso semplice di Demus, con identità grafica originale.

## Funzioni incluse
- Ricerca di singole canzoni tramite YouTube Data API v3.
- Riproduzione tramite YouTube IFrame Player ufficiale.
- Ricerca artisti e discografie tramite MusicBrainz.
- Ricerca album e copertine tramite MusicBrainz + Cover Art Archive.
- Brani preferiti, album preferiti, cronologia recente.
- Creazione playlist e aggiunta brani.
- Player persistente con coda, precedente/successivo e Media Session API dove supportata.
- PWA installabile con icone PNG 192/512.

## Configurazione ricerca YouTube
Aprire Impostazioni nell'app e incollare una YouTube Data API key. La chiave è salvata solo nel localStorage del dispositivo.

Per una release familiare multi-dispositivo è consigliato spostare playlist/preferiti su Supabase e proteggere le chiamate API con una funzione server-side.
