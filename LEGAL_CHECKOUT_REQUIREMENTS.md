# Cerințe juridice pentru checkout-ul ReelForge

Acest document este un document tehnic intern, nu o pagină publică. Descrie exact ce trebuie implementat, din punct de vedere juridic, atunci când checkout-ul ReelForge devine funcțional (plată reală, comandă reală). Nu este implementat acum — site-ul rămâne complet static.

Ultima actualizare: 12 iulie 2026.

## 1. Rezumat înainte de plată

Înainte ca utilizatorul să poată plăti, pagina de comandă trebuie să afișeze vizibil, în același ecran (nu ascuns în acordeon sau pe altă pagină):

- produsul comandat;
- caracteristicile principale (format, durată, rezoluție etc. — vezi TODO BUSINESS din `terms.html`);
- prețul final, cu TVA inclus;
- termenul estimat de livrare;
- metoda de livrare (electronică — link, cont, e-mail);
- numărul de revizii incluse;
- compatibilitatea și formatul fișierului livrat;
- datele comerciantului (NEBO SAFETY SRL, CUI, sediu, contact);
- un rezumat sau link explicit către politica de retragere;
- linkuri către toate documentele juridice relevante (Termeni, Confidențialitate, Retragere și rambursări).

## 2. Checkbox-uri separate

Nu combina aceste patru confirmări într-o singură bifă. Fiecare trebuie să fie un checkbox distinct, cu text propriu:

1. **Obligatoriu** — acceptarea Termenilor:
   > Am citit și accept Termenii și condițiile.

2. **Obligatoriu, dacă se dorește începerea imediată** — cererea de procesare imediată:
   > Solicit începerea procesării comenzii înainte de expirarea perioadei de 14 zile.

3. **Obligatoriu, dacă se dorește începerea imediată** — confirmarea consecinței:
   > Confirm că am fost informat cu privire la condițiile în care îmi pot pierde dreptul de retragere după executarea serviciului și furnizarea conținutului digital.

4. **Opțional, nebifat implicit** — portofoliu:
   > Sunt de acord ca BrandForge să utilizeze rezultatul final și elementele de brand indicate în portofoliu și materiale promoționale.

5. **Opțional, nebifat implicit** — marketing:
   > Doresc să primesc noutăți și oferte BrandForge.

Comanda nu trebuie condiționată de bifarea checkbox-urilor 4 sau 5.

## 3. Butonul de plată

Textul butonului trebuie să indice explicit obligația de plată, nu un text neutru de tip „Continuă”, „Trimite”, „Confirmă” sau „Următorul pas”.

Exemplu:

> Plătește 1 EUR și trimite comanda

## 4. Confirmarea comenzii

E-mailul de confirmare (sau documentul echivalent, păstrat pe un suport durabil, reproductibil neschimbat) trebuie să conțină sau să atașeze:

- identitatea comerciantului (NEBO SAFETY SRL, CUI, sediu, contact);
- produsul comandat;
- prețul plătit;
- data comenzii;
- numărul comenzii;
- versiunea Termenilor acceptată de client;
- politica de retragere aplicabilă;
- acordurile exprimate (checkbox-urile bifate, cu textul lor exact);
- termenul de livrare;
- datele de contact BrandForge;
- procesatorul de plată folosit;
- linkul către formularul de retragere (`withdraw.html`, sau succesorul său funcțional cu backend).

## 5. Dovada consimțămintelor

Nu este suficient un singur câmp boolean generic de tipul `accepted_terms=true`. Sistemul de comandă trebuie să salveze, pentru fiecare comandă:

- versiunea exactă a fiecărui document juridic acceptat (Termeni, politica de retragere etc.);
- data și ora (timestamp) acceptării;
- fiecare checkbox bifat, individual;
- textul exact afișat și acceptat pentru fiecare checkbox;
- numărul comenzii;
- un identificator al utilizatorului/comenzii;
- confirmarea că e-mailul de confirmare a fost efectiv trimis.

## 6. Ce nu este implementat momentan

- Nu există checkout funcțional, plăți reale sau procesator de plăți activ.
- Nu există backend pentru formularul de retragere (`withdraw.html` folosește un `mailto:` static — vezi comentariul `TODO WITHDRAWAL BACKEND` din acel fișier).
- Nu există stocare a comenzilor, a consimțămintelor sau a fișierelor încărcate de clienți.
- Nu există autentificare sau cont de utilizator.

## 7. Decizii comerciale rămase (blochează activarea checkout-ului)

Vezi și lista din raportul final al implementării curente:

- formatul, durata și rezoluția exactă a reelului livrat;
- termenul de livrare;
- numărul de revizii incluse;
- perioada de păstrare a fișierelor încărcate și a rezultatelor livrate;
- natura exactă a licenței acordate clientului (exclusivă/neexclusivă, teritoriu, durată);
- procesatorul final de plată (Skrill este avut în vedere, dar neconfirmat);
- furnizorii reali de hosting, storage, e-mail și instrumente AI;
- fluxul tehnic (backend) pentru retragere și pentru confirmarea contractului pe suport durabil.
