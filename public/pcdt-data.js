// ProtocoloBrasil — pcdt-data.js v2.0
// Medicamentos EXATOS por grupo terapêutico — 9 especialidades validadas
// Atualizado: Mar/2026

const PCDT_DB = {

"insuficiencia cardiaca":{area:"Cardiologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 6, de 22 de fevereiro de 2024",
  criterios:["FEVE documentada por ecocardiograma obrigatório","ICFEr (FEVE ≤40%): elegível para todos os medicamentos","Sacubitril/Valsartana: FEVE ≤35% + NYHA II-IV + PA sistólica >100mmHg + já em IECA/BRA","Ivabradina: ritmo sinusal + FC ≥70bpm + FEVE ≤35% + betabloqueador dose máxima tolerada","iSGLT2: FEVE ≤40% + TFGe ≥25","EXCLUSÃO: gravidez, estenose aórtica grave, choque cardiogênico"],
  meds_exatos:{
    "Pilares obrigatórios ICFEr":["Carvedilol 6,25mg / 12,5mg / 25mg (comprimido) — titular até dose máxima tolerada","Enalapril 5mg / 10mg / 20mg (comprimido) — 1ª escolha IECA","Losartana 25mg / 50mg / 100mg (comprimido) — BRA se intolerância ao IECA","Espironolactona 25mg / 50mg (comprimido) — obrigatória se FEVE ≤35%"],
    "FEVE ≤35% — adicionar ao tratamento otimizado":["Sacubitril 24mg + Valsartana 26mg (comprimido) — 2x/dia (substituir IECA/BRA)","Sacubitril 49mg + Valsartana 51mg (comprimido) — dose intermediária 2x/dia","Sacubitril 97mg + Valsartana 103mg (comprimido) — dose alvo 2x/dia","Dapagliflozina 10mg (comprimido) — 1x/dia","Empagliflozina 10mg (comprimido) — 1x/dia","⛔ Ivabradina 5mg / 7,5mg (comprimido) — EXCEÇÃO: SOMENTE se ritmo sinusal E FC ≥70bpm E betabloqueador já na dose máxima tolerada. NÃO usar em FA ou como substituto do betabloqueador."]},
  meds:["Carvedilol","Enalapril","Losartana","Espironolactona","Sacubitril+Valsartana","Dapagliflozina 10mg","Empagliflozina 10mg","Ivabradina"]},

"dislipidemia":{area:"Cardiologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 4, de 22 de fevereiro de 2024",
  criterios:["Estratificação de risco obrigatória","Evolocumabe: APENAS muito alto risco + LDL ≥70 após estatina máxima + ezetimiba por ≥3 meses","NUNCA iniciar Evolocumabe sem esgotar estatina de alta intensidade + ezetimiba"],
  meds_exatos:{
    "1ª LINHA — básico":["Sinvastatina 10mg / 20mg / 40mg / 80mg (comprimido) — 1x/dia à noite","Atorvastatina 10mg / 20mg / 40mg / 80mg (comprimido) — 1x/dia","Rosuvastatina 5mg / 10mg / 20mg / 40mg (comprimido) — 1x/dia"],
    "2ª LINHA — associar à estatina":["Ezetimiba 10mg (comprimido) — 1x/dia","Fenofibrato 160mg / 200mg (cápsula) — hipertrigliceridemia 1x/dia"],
    "3ª LINHA — muito alto risco refratário (LDL ≥70 com estatina máx + ezetimiba)":["⛔ Evolocumabe 140mg/mL (seringa SC) — EXCEÇÃO 3ª linha: SOMENTE muito alto risco E LDL ≥70 E estatina dose máxima E ezetimiba por ≥3 meses. NÃO indicar sem esgotar as opções anteriores."],
    "NÃO DISPONÍVEIS — NÃO PRESCREVER":["Inclisirana — não incorporado","Alirococumabe — não incorporado no SUS"]},
  meds:["Sinvastatina","Atorvastatina","Rosuvastatina","Ezetimiba 10mg","Fenofibrato","Evolocumabe 140mg SC"]},

"amiloidoses transtirretina":{area:"Cardiologia/Neurologia",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 12, de 2025",
  criterios:["Biópsia com IHQ ATTR+ OU cintilografia pirofosfato grau 2-3","Genotipagem TTR obrigatória","Tafamidis: ATTR-CA NYHA I-III","Patisirana/Vutrisirana: ATTRv polineuropatia NIS 10-130"],
  meds_exatos:{
    "ATTR Cardiomiopatia":["Tafamidis meglumina 80mg (cápsula) — 1 cápsula 1x/dia"],
    "ATTRv Polineuropatia":["Patisirana 2mg/mL (concentrado IV) — 0,3mg/kg IV a cada 3 semanas","Vutrisirana 25mg (solução SC) — 25mg SC a cada 3 meses","Inotersen 284mg (seringa SC) — 284mg SC 1x/semana"]},
  meds:["Tafamidis meglumina 80mg","Patisirana IV","Vutrisirana SC","Inotersen SC"]},

"artrite reumatoide":{area:"Reumatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 34, de 23 de janeiro de 2026",
  criterios:["ACR/EULAR 2010 ≥6 pontos","Falha a ≥2 DMARDs convencionais incluindo MTX ≥3 meses cada","DAS28 >3,2 em 2 avaliações","PPD/IGRA negativo ou ILTB tratada","Rituximabe: apenas após falha a ≥1 anti-TNF","EXCLUSÃO: infecção ativa, neoplasia ativa <5 anos, ICC NYHA III-IV (anti-TNF)"],
  meds_exatos:{
    "DMARDs convencionais — 1ª linha":["Metotrexato 2,5mg (comprimido) — 15-25mg/semana VO ou SC","Leflunomida 20mg (comprimido) — 20mg/dia","Sulfassalazina 500mg (comprimido) — 1-3g/dia","Hidroxicloroquina 400mg (comprimido) — 400mg/dia"],
    "Anti-TNF — 1ª linha biológica":["Adalimumabe 40mg/0,8mL (seringa SC) — 40mg SC a cada 2 semanas","Etanercepte 25mg / 50mg (seringa SC) — 50mg SC 1x/semana","Infliximabe 100mg (pó IV) — 3mg/kg IV semanas 0,2,6 e a cada 8 semanas","Certolizumabe pegol 200mg/mL (seringa SC) — 400mg semanas 0,2,4; depois 200mg a cada 2 semanas","Golimumabe 50mg (seringa SC) — 50mg SC 1x/mês"],
    "Não anti-TNF — 1ª ou 2ª linha":["Abatacepte 125mg/mL (seringa SC) — 125mg SC 1x/semana","Tocilizumabe 162mg/0,9mL (seringa SC) — 162mg SC 1x/semana","Tocilizumabe 200mg/10mL (frasco IV) — 8mg/kg IV a cada 4 semanas"],
    "JAK inibidores":["Baricitinibe 2mg / 4mg (comprimido) — 4mg 1x/dia","Tofacitinibe 5mg (comprimido) — 5mg 2x/dia","Upadacitinibe 15mg (comprimido) — 15mg 1x/dia"],
    "⛔ EXCEÇÃO 3ª linha — após falha a ≥1 anti-TNF":["⛔ Rituximabe 500mg/1000mg (frasco IV) — SOMENTE após falha documentada a ≥1 anti-TNF. NÃO usar como 1ª ou 2ª linha biológica na AR."]},
  meds:["Metotrexato","Leflunomida","Sulfassalazina","Hidroxicloroquina","Adalimumabe SC","Etanercepte SC","Infliximabe IV","Certolizumabe SC","Golimumabe SC","Abatacepte SC/IV","Tocilizumabe SC/IV","Baricitinibe","Tofacitinibe","Upadacitinibe","Rituximabe IV"]},

"artrite psoriasica":{area:"Reumatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 37, de 23 de janeiro de 2026",
  criterios:["CASPAR ≥3","Biológico: falha a ≥1 DMARD convencional ≥3 meses","DAPSA >14","IL-17: preferível doença axial/ungueal","EXCLUSÃO: DII ativa (evitar IL-17)"],
  meds_exatos:{
    "DMARDs convencionais":["Metotrexato 2,5mg (comprimido) — 15-25mg/semana","Leflunomida 20mg (comprimido) — 20mg/dia","Sulfassalazina 500mg (comprimido) — 1-3g/dia"],
    "Anti-TNF — 1ª linha biológica":["Adalimumabe 40mg SC — 40mg a cada 2 semanas","Etanercepte 50mg SC — 50mg 1x/semana","Infliximabe 100mg IV — 5mg/kg semanas 0,2,6; a cada 8 semanas","Certolizumabe pegol 200mg SC — 400mg semanas 0,2,4; depois 200mg a cada 2 semanas","Golimumabe 50mg SC — 50mg 1x/mês"],
    "IL-17 — preferível axial/ungueal":["Secuquinumabe 150mg/mL (seringa SC) — 150mg SC semanas 0,1,2,3,4; depois mensal","Ixequizumabe 80mg/mL (seringa SC) — 160mg semana 0; 80mg a cada 2 semanas ×6; depois mensal"],
    "IL-12/23 e IL-23":["Ustecinumabe 45mg SC — 45mg semanas 0,4; depois a cada 12 semanas","Guselcumabe 100mg SC — 100mg semanas 0,4; depois a cada 8 semanas"],
    "Pequenas moléculas":["Tofacitinibe 5mg (comprimido) — 5mg 2x/dia","Apremilaste 30mg (comprimido) — 30mg 2x/dia"]},
  meds:["Metotrexato","Leflunomida","Sulfassalazina","Adalimumabe SC","Etanercepte SC","Infliximabe IV","Certolizumabe SC","Golimumabe SC","Secuquinumabe SC","Ixequizumabe SC","Ustecinumabe SC","Guselcumabe SC","Tofacitinibe","Apremilaste"]},

"espondilite anquilosante":{area:"Reumatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 35, de 23 de janeiro de 2026",
  criterios:["Critérios Nova York modificados OU ASAS axSpA","BASDAI ≥4 em 2 avaliações ≥12 semanas","Falha a ≥2 AINEs dose plena ≥3 meses","IL-17 preferível doença axial pura"],
  meds_exatos:{
    "IL-17 — 1ª linha preferencial":["Secuquinumabe 150mg/mL (seringa SC) — 150mg SC semanas 0,1,2,3,4; depois 150mg mensal","Ixequizumabe 80mg/mL (seringa SC) — 160mg semana 0; 80mg a cada 2 semanas ×6; depois mensal"],
    "Anti-TNF — alternativa":["Adalimumabe 40mg SC — 40mg a cada 2 semanas","Etanercepte 50mg SC — 50mg 1x/semana","Infliximabe 100mg IV — 5mg/kg semanas 0,2,6; a cada 6-8 semanas","Certolizumabe pegol 200mg SC — 400mg semanas 0,2,4; depois 200mg a cada 2 semanas","Golimumabe 50mg SC — 50mg 1x/mês"]},
  meds:["Secuquinumabe SC","Ixequizumabe SC","Adalimumabe SC","Etanercepte SC","Infliximabe IV","Certolizumabe SC","Golimumabe SC"]},

"lupus eritematoso sistemico":{area:"Reumatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 16, de 2022",
  criterios:["SLICC 2012 ≥4 OU ACR/EULAR 2019 ≥10 pontos","Belimumabe: SLEDAI ≥8 + anti-dsDNA+ OU C↓ + falha convencional","Anifrolumabe: LES moderado-grave tipo 1 interferona + SLEDAI ≥6","Belimumabe NÃO indicado: nefrite lúpica ativa grave isolada"],
  meds_exatos:{
    "Convencional — obrigatório antes de biológico":["Hidroxicloroquina 400mg (comprimido) — 400mg/dia","Prednisona (comprimido) — dose variável","Azatioprina 50mg (comprimido) — 1-3mg/kg/dia","Micofenolato mofetila 500mg (comprimido) — 2-3g/dia"],
    "Biológicos":["Belimumabe 200mg/mL (seringa SC) — 200mg SC 1x/semana","Belimumabe 120mg/mL (frasco IV) — 10mg/kg IV semanas 0,2,4; depois a cada 4 semanas","Anifrolumabe 300mg/2mL (frasco IV) — 300mg IV a cada 4 semanas"]},
  meds:["Hidroxicloroquina","Prednisona","Azatioprina","Micofenolato mofetila","Belimumabe SC/IV","Anifrolumabe IV"]},

"psoriase":{area:"Dermatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 18, de 2021",
  criterios:["PASI >10 OU BSA >10% OU DLQI >10","Biológico: falha a ≥2 sistêmicos convencionais (MTX + acitretina ou ciclosporina)"],
  meds_exatos:{
    "Sistêmicos convencionais — 1ª linha":["Metotrexato 2,5mg (comprimido) — 10-25mg/semana","Acitretina 10mg / 25mg (cápsula) — 25-50mg/dia","Ciclosporina 25mg / 100mg (cápsula) — 2,5-5mg/kg/dia"],
    "Anti-TNF — 1ª linha biológica":["Adalimumabe 40mg SC — 80mg semana 0; 40mg semana 1; 40mg a cada 2 semanas","Etanercepte 50mg SC — 50mg 2x/semana ×12; depois 50mg 1x/semana","Infliximabe 100mg IV — 5mg/kg semanas 0,2,6; a cada 8 semanas"],
    "IL-12/23":["Ustecinumabe 45mg SC / 90mg SC — semanas 0,4; depois a cada 12 semanas"],
    "IL-17 — alta eficácia":["Secuquinumabe 300mg SC — 300mg semanas 0,1,2,3,4; depois 300mg mensal","Ixequizumabe 80mg SC — 160mg semana 0; 80mg a cada 2 semanas ×6; depois mensal"],
    "IL-23 — alta eficácia, menos frequente":["Guselcumabe 100mg SC — 100mg semanas 0,4; depois a cada 8 semanas","Rissanquizumabe 150mg SC — 150mg semanas 0,4; depois a cada 12 semanas"]},
  meds:["Metotrexato","Acitretina","Ciclosporina","Adalimumabe SC","Etanercepte SC","Infliximabe IV","Ustecinumabe SC","Secuquinumabe SC","Ixequizumabe SC","Guselcumabe SC","Rissanquizumabe SC"]},

"carcinoma de mama":{area:"Oncologia",comp:"DDT",portaria:"CONITEC DDTs Mama vigentes 2024-2025",
  criterios:["HER2+: IHQ 3+ OU FISH amplificado — obrigatório antes de trastuzumabe","HR+/HER2-: RE e/ou RP positivo","BRCA1/2 germinal: obrigatório para olaparibe","Trastuzumabe contraindicado: FEVE <50%"],
  meds_exatos:{
    "HER2+ — terapia alvo":["Trastuzumabe 150mg / 440mg (frasco IV) — 8mg/kg semana 0; 6mg/kg a cada 3 semanas","Pertuzumabe 420mg/14mL (frasco IV) — 840mg semana 0; 420mg a cada 3 semanas (com trastuzumabe)","⛔ Trastuzumabe deruxtecano 100mg IV — EXCEÇÃO 2ª linha: SOMENTE HER2+ metastático após progressão com trastuzumabe. NÃO usar na 1ª linha."],
    "HR+/HER2- — CDK4/6i + hormonioterapia":["Palbociclibe 75mg / 100mg / 125mg (cápsula) — 125mg/dia ×21 dias + 7 pausa + letrozol/fulvestrant","Ribociclibe 200mg (comprimido) — 600mg/dia ×21 + 7 pausa + letrozol","Abemaciclibe 150mg (comprimido) — 150mg 2x/dia contínuo + hormonioterapia"],
    "BRCA+ — PARP inibidores":["Olaparibe 100mg / 150mg (comprimido) — 300mg 2x/dia"],
    "Hormonioterapia básico":["Tamoxifeno 20mg (comprimido)","Anastrozol 1mg (comprimido)","Letrozol 2,5mg (comprimido)","Exemestano 25mg (comprimido)"]},
  meds:["Trastuzumabe IV","Pertuzumabe IV","T-DXd IV","Palbociclibe","Ribociclibe","Abemaciclibe","Olaparibe","Tamoxifeno","Anastrozol","Letrozol","Exemestano"]},

"adenocarcinoma de prostata":{area:"Oncologia",comp:"DDT",portaria:"CONITEC DDTs Próstata vigentes 2024-2025",
  criterios:["Biópsia confirmada + PSA + Gleason/ISUP","mCRPC: PSA progressivo + testosterona <50ng/dL","mCSPC: metástases + sensível à castração","Olaparibe: mCRPC + BRCA1/2 OU HRR + falha a NHA","NUNCA usar NHAs em câncer localizado sem indicação"],
  meds_exatos:{
    "mCSPC — sensível à castração":["Docetaxel 20mg/mL (frasco IV) — 75mg/m² a cada 3 semanas × 6 ciclos","Abiraterona 250mg / 500mg (comprimido) — 1000mg 1x/dia jejum + prednisona 5mg 2x/dia","Darolutamida 300mg (comprimido) — 600mg 2x/dia (com docetaxel + castração, alto volume)"],
    "mCRPC — castração-resistente":["Enzalutamida 40mg (cápsula) — 160mg 1x/dia","Abiraterona 250mg (comprimido) — 1000mg 1x/dia jejum + prednisona 5mg 2x/dia","Docetaxel IV — 75mg/m² a cada 3 semanas","⛔ Cabazitaxel 25mg/m² IV — EXCEÇÃO: SOMENTE mCRPC após progressão com docetaxel. NÃO usar antes do docetaxel."],
    "mCRPC com BRCA/HRR":["Olaparibe 100mg / 150mg (comprimido) — 300mg 2x/dia"]},
  meds:["Docetaxel IV","Abiraterona","Darolutamida","Enzalutamida","Cabazitaxel IV","Olaparibe"]},

"carcinoma colorretal":{area:"Oncologia",comp:"DDT",portaria:"CONITEC DDTs CCR vigentes 2024-2025",
  criterios:["RAS (KRAS/NRAS) e BRAF obrigatórios antes de anti-EGFR","Cetuximabe: APENAS RAS/BRAF wild-type — NUNCA em RAS mutado","Bevacizumabe: independente de RAS"],
  meds_exatos:{
    "Quimioterapia base":["FOLFOX: Oxaliplatina 85mg/m² IV + Leucovorin + 5-FU bolus + 5-FU 2400mg/m² infusão 46h — a cada 2 semanas","FOLFIRI: Irinotecano 180mg/m² IV + Leucovorin + 5-FU — a cada 2 semanas","Capecitabina 500mg (comprimido) — 1250mg/m² 2x/dia dias 1-14 a cada 3 semanas"],
    "Anti-VEGF — qualquer RAS":["Bevacizumabe 25mg/mL (frasco IV) — 5mg/kg a cada 2 semanas"],
    "Anti-EGFR — APENAS RAS/BRAF wild-type":["⛔ Cetuximabe IV — CONTRAINDICADO em RAS mutado. Resultado RAS/BRAF OBRIGATÓRIO antes de prescrever. SOMENTE wild-type confirmado."]},
  meds:["FOLFOX","FOLFIRI","Capecitabina","Bevacizumabe IV","Cetuximabe IV (APENAS RAS WT)"]},

"dpoc":{area:"Pneumologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 29, de 16 de janeiro de 2025",
  criterios:["VEF1/CVF <0,7 pós-broncodilatador (espirometria obrigatória)","CLASSIFICAÇÃO (NÃO usa mais GOLD A/B/C/D):","  Grupo A: mMRC 0-1 ou CAT <10 + 0-1 exacerbação leve/ano","  Grupo B: mMRC ≥2 ou CAT ≥10 + 0-1 exacerbação leve/ano","  Grupo E: ≥2 exacerbações moderadas OU ≥1 grave/ano","TERAPIA TRIPLA: Grupo E + eos ≥100/μL (obrigatória se eos ≥300/μL)","⛔ Roflumilaste: EXCEÇÃO — NÃO citar como terapia padrão. Usar SOMENTE se VEF1 <50% E bronquite crônica E ≥2 exacerbações E já em terapia ótima (todos os critérios obrigatórios)"],
  meds_exatos:{
    "GRUPO A — resgate":["Salbutamol 100mcg/dose (aerossol) — 2 jatos até 4x/dia se necessário"],
    "GRUPO B e GRUPO E com eos <100/μL — dupla LAMA+LABA":["Umeclidínio 62,5mcg + Vilanterol 25mcg (pó inalante, Ellipta) — 1 inalação 1x/dia pela manhã"],
    "GRUPO E com eos ≥100/μL — TERAPIA TRIPLA FECHADA (ICS+LAMA+LABA)":["OPÇÃO 1: Furoato de Fluticasona 100mcg + Umeclidínio 62,5mcg + Vilanterol 25mcg (pó inalante, Trelegy Ellipta) — 1 inalação 1x/dia","OPÇÃO 2: Dipropionato de Beclometasona 100mcg + Fumarato de Formoterol Di-hidratado 6mcg + Brometo de Glicopirrônio 12,5mcg (inalador pressurizado, Trimbow) — 2 inalações 2x/dia"],
    "EXCEÇÃO RESTRITA — NÃO usar rotineiramente":["Roflumilaste 500mcg (comprimido) — SOMENTE se VEF1 <50% E bronquite crônica E ≥2 exacerbações/ano E já em terapia ótima. NÃO é 1ª/2ª linha. NÃO substituir broncodilatador."],
    "NÃO DISPONÍVEIS no PCDT 2025 — NÃO PRESCREVER":["Tiotrópio isolado — NÃO consta na Portaria 29/2025","Budesonida+Formoterol sem LAMA — NÃO é terapia tripla","Indacaterol isolado — NÃO consta na Portaria 29/2025","GOLD C/D — classificação OBSOLETA substituída por Grupos A, B e E"]},
  meds:["Salbutamol 100mcg (resgate — grupo A)","Umeclidínio 62,5mcg + Vilanterol 25mcg (grupos B e E sem ICS)","Furoato Fluticasona 100mcg + Umeclidínio 62,5mcg + Vilanterol 25mcg — TERAPIA TRIPLA","Beclometasona 100mcg + Formoterol 6mcg + Glicopirrônio 12,5mcg — TERAPIA TRIPLA","⛔ Roflumilaste 500mcg (EXCEÇÃO restrita — não citar como padrão)"]},

"asma":{area:"Pneumologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 5, de 2023",
  criterios:["VEF1/CVF <0,7 com reversibilidade ≥12%+200mL OU teste provocação","Asma grave: falha a CIE alta + LABA ≥4 meses + ≥2 exacerbações/ano","Omalizumabe: asma ALÉRGICA — IgE 30-700 UI/mL + alérgeno perene + peso 20-150kg","Mepolizumabe/Benralizumabe: asma EOSINOFÍLICA — eos ≥300/μL","Dupilumabe: asma TIPO 2 — eos ≥300 OU FeNO ≥25ppb","NUNCA misturar indicações entre biológicos"],
  meds_exatos:{
    "Tratamento convencional escalonado":["Beclometasona 50mcg/100mcg/250mcg (aerossol)","Budesonida 200mcg/400mcg (inalador)","Fluticasona 50mcg/125mcg/250mcg (aerossol)","Formoterol 12mcg (cápsula inalatória)","Salmeterol 25mcg/50mcg (aerossol)","Montelucaste 5mg/10mg (comprimido)"],
    "Biológico asma ALÉRGICA (IgE 30-700 + alérgeno perene)":["Omalizumabe 75mg / 150mg (seringa SC) — dose/frequência por tabela IgE × peso"],
    "Biológico asma EOSINOFÍLICA (eos ≥300/μL)":["Mepolizumabe 100mg/mL (seringa SC) — 100mg SC a cada 4 semanas","Benralizumabe 30mg/mL (seringa SC) — 30mg SC a cada 4 semanas ×3; depois a cada 8 semanas"],
    "Biológico asma TIPO 2 / FeNO elevado":["Dupilumabe 200mg/1,14mL (seringa SC) — 400mg semana 0 (2 injeções de 200mg); depois 200mg a cada 2 semanas"]},
  meds:["Beclometasona","Budesonida","Fluticasona","Formoterol","Salmeterol","Montelucaste","Omalizumabe SC","Mepolizumabe 100mg SC","Benralizumabe 30mg SC","Dupilumabe SC"]},

"diabetes mellitus tipo 2":{area:"Endocrinologia",comp:"Básico/CEAF",portaria:"Portaria SAES/SCTIE/MS nº 6, de 2024",
  criterios:["Metformina: 1ª linha universal","iSGLT2 SUS: DM2 + DCV ATEROSCLERÓTICA ESTABELECIDA OU IC OU DRC TFGe 25-75 — NÃO para todo DM2","GLP-1: DM2 + DCV aterosclerótica estabelecida + HbA1c acima da meta","NUNCA indicar iSGLT2 ou GLP-1 apenas por HbA1c elevada sem DCV/IC/DRC documentada"],
  meds_exatos:{
    "1ª LINHA — básico":["Metformina 500mg / 850mg / 1000mg (comprimido) — 500-2550mg/dia em 2-3 tomadas","Glibenclamida 5mg (comprimido) — 2,5-20mg/dia","Glicazida 30mg MR (comprimido) — 30-120mg/dia"],
    "2ª LINHA — iSGLT2 (APENAS DCV estabelecida OU IC OU DRC TFGe 25-75)":["Empagliflozina 10mg (comprimido) — 10mg 1x/dia","Dapagliflozina 10mg (comprimido) — 10mg 1x/dia"],
    "2ª LINHA — GLP-1 RA (APENAS DCV aterosclerótica estabelecida)":["Liraglutida 6mg/mL (caneta SC) — iniciar 0,6mg/dia; titular 1,2mg ou 1,8mg/dia","Semaglutida 0,25mg/0,5mg/1mg (caneta SC semanal) — iniciar 0,25mg/semana; titular"],
    "Insulinas":["Insulina NPH humana 100UI/mL (frasco/caneta) — SC 1-2x/dia","Insulina Regular humana 100UI/mL — pré-refeições SC","Insulina Glargina 100UI/mL (caneta) — 1x/dia SC","Insulina Asparte 100UI/mL (caneta) — pré-refeições SC"]},
  meds:["Metformina","Glibenclamida","Glicazida MR","Empagliflozina 10mg","Dapagliflozina 10mg","Liraglutida SC","Semaglutida SC","Insulina NPH","Insulina Regular","Insulina Glargina","Insulina Asparte"]},

"acromegalia":{area:"Endocrinologia",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 23, de 2025",
  criterios:["GH >1ng/mL no TTG + IGF-1 elevado + RM hipófise","Farmacológico: pós-cirurgia sem remissão OU irressecável","Análogos SST: 1ª linha farmacológica","Pasireotida: falha a octreotida/lanreotida","Pegvisomanto: falha a análogos SST"],
  meds_exatos:{
    "Análogos SST — 1ª linha":["Octreotida LAR 10mg / 20mg / 30mg (pó IM) — 20-30mg IM a cada 4 semanas","Lanreotida 60mg / 90mg / 120mg (seringa SC profundo) — 90-120mg SC a cada 4 semanas"],
    "2ª linha":["⛔ Pasireotida LAR IM — EXCEÇÃO 2ª linha: SOMENTE após falha ou resposta parcial a octreotida/lanreotida. Alto risco de hiperglicemia — monitorar glicemia rigorosamente.","⛔ Pegvisomanto SC — EXCEÇÃO 2ª/3ª linha: SOMENTE acromegalia com falha ou intolerância a análogos SST (octreotida/lanreotida). NÃO monitorar por IGF-1 como único parâmetro (falsamente elevado)."],
    "Adjuvante":["Cabergolina 0,5mg (comprimido) — 0,5-3,5mg 2x/semana"]},
  meds:["Octreotida LAR IM","Lanreotida SC","Pasireotida LAR IM","Pegvisomanto SC","Cabergolina"]},

"osteoporose":{area:"Reumatologia/Endocrinologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 9, de 2022",
  criterios:["T-score ≤-2,5 OU fratura por fragilidade ≥50 anos","Denosumabe: falha/intolerância a bisfosfonatos","Teriparatida: T-score ≤-3,5 + ≥1 fratura vertebral + falha a bisfosfonato"],
  meds_exatos:{
    "1ª LINHA — bisfosfonatos":["Alendronato 70mg (comprimido) — 70mg 1x/semana em jejum","Risedronato 35mg (comprimido) — 35mg 1x/semana em jejum","Ácido zoledrônico 5mg/100mL (frasco IV) — 5mg IV 1x/ano"],
    "2ª LINHA":["Denosumabe 60mg/mL (seringa SC) — 60mg SC a cada 6 meses"],
    "Osteoporose grave — anabólico":["⛔ Teriparatida SC — EXCEÇÃO: SOMENTE osteoporose grave (T-score ≤-3,5 + ≥1 fratura vertebral) após falha a bisfosfonato. Limitada a 24 meses totais na vida. NÃO usar sem fratura prévia documentada.","⛔ Romosozumabe SC — EXCEÇÃO: SOMENTE osteoporose muito grave + alto risco de fratura após falha a bisfosfonato. Contraindicado se IAM ou AVC recente (<12 meses). Limitado a 12 meses."]},
  meds:["Alendronato 70mg","Risedronato 35mg","Ácido zoledrônico IV","Denosumabe 60mg SC","Teriparatida SC","Romosozumabe SC"]},

"esclerose multipla":{area:"Neurologia",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 8, de 2024",
  criterios:["McDonald 2017","EDSS obrigatório","1ª linha: EMRR atividade moderada","2ª linha: EMRR muito ativa (≥2 surtos/ano) ou falha à 1ª linha","Natalizumabe: JC obrigatório — JC+ >2 anos índice >1,5: risco LMP alto","Ocrelizumabe: EMPP (única DMT para EMPP no SUS)"],
  meds_exatos:{
    "1ª LINHA — baixa-moderada eficácia":["Interferon beta-1a 44mcg (seringa SC) — 44mcg SC 3x/semana","Interferon beta-1a 30mcg (seringa IM) — 30mcg IM 1x/semana","Interferon beta-1b 250mcg (frasco SC) — 250mcg SC a cada 2 dias","Acetato de glatirâmer 20mg (seringa SC) — 20mg SC/dia","Teriflunomida 14mg (comprimido) — 14mg 1x/dia","Dimetilfumarato 240mg (cápsula) — 240mg 2x/dia"],
    "2ª LINHA — alta eficácia":["Fingolimode 0,5mg (cápsula) — 0,5mg 1x/dia (monitorar FC 1ª dose)","Natalizumabe 300mg/15mL (frasco IV) — 300mg IV a cada 4 semanas (JC- obrigatório)","Ocrelizumabe 300mg/10mL (frasco IV) — 300mg IV semanas 0,2; depois 600mg a cada 6 meses","Ofatumumabe 20mg/0,4mL (seringa SC) — 20mg SC semanas 0,1,2; depois mensal"],
    "3ª LINHA — EMRR altamente ativa refratária":["⛔ Alentuzumabe 12mg/1,2mL (frasco IV) — EXCEÇÃO 3ª linha: SOMENTE EMRR altamente ativa refratária a ≥2 DMTs de alta eficácia. Risco de autoimunidade secundária grave.","⛔ Cladribina 10mg (comprimido) — EXCEÇÃO 3ª linha: SOMENTE EMRR altamente ativa refratária. Contraindicada em hepatite B ativa e gravidez."],
    "EMPP — única opção SUS":["Ocrelizumabe 300mg/10mL (frasco IV) — mesmo esquema acima"]},
  meds:["Interferon beta-1a SC/IM","Interferon beta-1b SC","Glatirâmer SC","Teriflunomida","Dimetilfumarato","Fingolimode","Natalizumabe IV","Ocrelizumabe IV","Ofatumumabe SC","Alentuzumabe IV","Cladribina"]},

"atrofia muscular espinhal":{area:"Neurologia/Pediatria",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 13, de 2023",
  criterios:["Confirmação molecular SMN1 obrigatória","Cópias SMN2 obrigatórias","Onasemnogene: ≤2 anos + ≤3 cópias SMN2 (janela INFLEXÍVEL)","Nusinersena: tipos 1-3, sem limite de idade","Risdiplam: ≥2 meses, tipos 1-3"],
  meds_exatos:{
    "≤2 anos + ≤3 cópias SMN2 — terapia gênica (dose ÚNICA)":["⛔ Onasemnogene abeparvovec IV — dose ÚNICA. SOMENTE ≤2 anos E ≤3 cópias SMN2. Janela INFLEXÍVEL — após 2 anos NÃO elegível."],
    "Tipos 1-3 — modificação RNA":["Nusinersena 12mg/5mL (solução intratecal) — 12mg IT dias 0,14,28,63; depois a cada 4 meses","Risdiplam 0,75mg/mL (solução oral) — dose por peso/idade 1x/dia (tabela PCDT)"]},
  meds:["Onasemnogene IV (dose única ≤2 anos)","Nusinersena 12mg IT","Risdiplam solução oral"]},

"epilepsia":{area:"Neurologia",comp:"CEAF",portaria:"Portaria SAS/SCTIE/MS nº 17, de 2018 + atualizações",
  criterios:["≥2 crises não provocadas separadas >24h","Canabidiol SUS: APENAS síndrome de Dravet OU Lennox-Gastaut refratária a ≥2 DAEs","Canabidiol NÃO indicado para epilepsia focal ou generalizada sem síndrome específica"],
  meds_exatos:{
    "1ª LINHA":["Carbamazepina 200mg / 400mg (comprimido) — 400-1200mg/dia em 2-3 doses","Valproato de sódio 250mg / 500mg (comprimido) — 500-2000mg/dia","Lamotrigina 25mg / 50mg / 100mg (comprimido) — titular lentamente","Levetiracetam 250mg / 500mg / 1000mg (comprimido) — 500-3000mg/dia","Oxcarbazepina 300mg / 600mg (comprimido) — 600-2400mg/dia","Topiramato 25mg / 50mg / 100mg (comprimido) — 100-400mg/dia","Clobazam 10mg (comprimido) — adjuvante"],
    "2ª LINHA — refratários":["Lacosamida 50mg / 100mg / 200mg (comprimido) — 200-400mg/dia em 2 doses","Perampanel 2mg / 4mg / 8mg (comprimido) — 4-12mg 1x/noite"],
    "APENAS Dravet OU Lennox-Gastaut refratários":["⛔ Canabidiol 100mg/mL (solução oral) — EXCEÇÃO: SOMENTE Dravet OU Lennox-Gastaut refratária a ≥2 DAEs. NÃO indicar para outras epilepsias."]},
  meds:["Carbamazepina","Valproato","Lamotrigina","Levetiracetam","Oxcarbazepina","Topiramato","Clobazam","Lacosamida","Perampanel","Canabidiol (Dravet/LGS apenas)"]},

"doenca de crohn":{area:"Gastroenterologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 9, de 2022",
  criterios:["Endoscopia + histologia + imagem","CDAI >220 OU HBI ≥8","Biológico: falha a corticoide + imunomodulador ≥3 meses","Anti-TNF: 1ª linha","Ustecinumabe: falha/contraindicação a anti-TNF ou doença perianal","Vedolizumabe: preferível doença luminal sem EEI graves"],
  meds_exatos:{
    "Imunomoduladores — obrigatórios antes de biológico":["Azatioprina 50mg (comprimido) — 2-2,5mg/kg/dia","Metotrexato 2,5mg (comprimido) — 15-25mg/semana"],
    "Anti-TNF — 1ª linha biológica":["Adalimumabe 40mg SC — 160mg semana 0; 80mg semana 2; 40mg a cada 2 semanas","Infliximabe 100mg IV — 5mg/kg semanas 0,2,6; depois a cada 8 semanas","Certolizumabe pegol 400mg SC — 400mg semanas 0,2,4; depois 400mg a cada 4 semanas"],
    "Não anti-TNF — 2ª linha":["Ustecinumabe 130mg IV (indução por peso); depois 90mg SC a cada 12 semanas","Vedolizumabe 300mg IV — 300mg semanas 0,2,6; depois a cada 8 semanas","⛔ Risanquizumabe IV/SC — EXCEÇÃO: SOMENTE após falha a ≥1 anti-TNF. Verificar portaria vigente para elegibilidade atual."]},
  meds:["Azatioprina","Metotrexato","Adalimumabe SC","Infliximabe IV","Certolizumabe SC","Ustecinumabe IV/SC","Vedolizumabe IV","Risanquizumabe"]},

"retocolite ulcerativa":{area:"Gastroenterologia",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 9, de 2024",
  criterios:["Mayo ≥6 para biológico","Biológico: falha a aminossalicilato + corticoide + imunomodulador","Vedolizumabe: preferível na RCU","Tofacitinibe: após falha a ≥1 biológico"],
  meds_exatos:{
    "Convencional":["Mesalazina 400mg / 800mg (comprimido/supositório/enema) — 2,4-4,8g/dia","Sulfassalazina 500mg (comprimido)","Azatioprina 50mg (comprimido) — 2-2,5mg/kg/dia"],
    "Biológicos — 1ª linha":["Vedolizumabe 300mg IV — 300mg semanas 0,2,6; depois a cada 8 semanas","Infliximabe 100mg IV — 5mg/kg semanas 0,2,6; depois a cada 8 semanas","Adalimumabe 40mg SC — 160mg semana 0; 80mg semana 2; 40mg a cada 2 semanas"],
    "2ª linha":["Ustecinumabe IV/SC — indução IV; manutenção 90mg SC a cada 12 semanas"],
    "JAK — após falha a biológico":["⛔ Tofacitinibe 5mg/10mg (comprimido) — EXCEÇÃO: SOMENTE após falha a ≥1 biológico. NÃO usar como 1ª linha biológica na RCU."]},
  meds:["Mesalazina","Sulfassalazina","Azatioprina","Vedolizumabe IV","Infliximabe IV","Adalimumabe SC","Ustecinumabe IV/SC","Tofacitinibe"]},

"hepatite c":{area:"Infectologia",comp:"Estratégico",portaria:"Portaria SAES/SCTIE/MS nº 7, de 2023",
  criterios:["Anti-HCV+ + HCV-RNA quantitativo","Genotipagem obrigatória","Sofosbuvir+Velpatasvir: pangenotípico genótipos 1-6","Glecaprevir+Pibrentasvir: 8 sem sem cirrose; 12 sem com cirrose Child A","Contraindicado: glecaprevir+pibrentasvir em Child B/C"],
  meds_exatos:{
    "PANGENOTÍPICO — 1ª escolha":["Sofosbuvir 400mg + Velpatasvir 100mg (comprimido) — 1 comprimido 1x/dia por 12 semanas","Glecaprevir 100mg + Pibrentasvir 40mg (comprimido) — 3 comprimidos 1x/dia por 8 semanas (sem cirrose) OU 12 semanas (cirrose Child A)"],
    "ALTERNATIVA — genótipos 1 e 3":["Sofosbuvir 400mg + Daclatasvir 60mg (comprimidos separados) — 1 de cada 1x/dia por 12 semanas"]},
  meds:["Sofosbuvir 400mg + Velpatasvir 100mg","Glecaprevir 100mg + Pibrentasvir 40mg","Sofosbuvir 400mg + Daclatasvir 60mg"]},

"hiv aids":{area:"Infectologia",comp:"Estratégico",portaria:"Portaria SAES/SCTIE/MS nº 1, de 2023",
  criterios:["INÍCIO IMEDIATO — para todos independente de CD4","Exames basais: CD4, CV, HLA-B*5701, genotipagem, HBsAg, anti-HCV","Esquema preferencial: TDF+3TC+DTG","Cabotegravir+Rilpivirina IM: CV indetectável + sem resistência INNTR/INSTI","TDF contraindicado se TFGe <60 — substituir por ABC (HLA-B*5701 negativo)"],
  meds_exatos:{
    "PREFERENCIAL — 1ª linha":["Tenofovir 300mg + Lamivudina 300mg + Dolutegravir 50mg (comprimido combinado) — 1 comprimido 1x/dia"],
    "Alternativas 1ª linha":["Abacavir 300mg + Lamivudina 150mg + Dolutegravir 50mg — apenas HLA-B*5701 negativo","Tenofovir 300mg + Lamivudina 300mg + Efavirenz 600mg (comprimido combinado) — alternativa mais antiga"],
    "Injetável de longa duração":["⛔ Cabotegravir IM + Rilpivirina IM — EXCEÇÃO: SOMENTE se CV indetectável (<50 cópias) E sem resistência documentada a INNTR/INSTI. NÃO usar em pacientes virêmicos ou com histórico de resistência."],
    "PrEP":["Tenofovir 300mg + Emtricitabina 200mg (comprimido) — 1x/dia"],
    "Resgate — falha com resistência":["Darunavir 800mg + Ritonavir 100mg — 1x/dia","Raltegravir 400mg — 400mg 2x/dia"]},
  meds:["TDF+3TC+DTG (comprimido combinado)","ABC+3TC+DTG (HLA-B*5701 negativo)","TDF+3TC+EFV","Cabotegravir IM + Rilpivirina IM","TDF+FTC (PrEP)","Darunavir+Ritonavir (resgate)","Raltegravir (resgate)"]},

"tuberculose":{area:"Infectologia",comp:"Estratégico",portaria:"Manual TB MS 2024",
  criterios:["GeneXpert OU baciloscopia OU cultura + clínico-radiológico","TB sensível: esquema RIPE 6 meses","TB-MDR: resistente a R+H — esquema BPaL","ILTB: PPD ≥5mm (imunossuprimidos) OU ≥10mm outros","Coinfecção HIV: TARV em até 2 semanas (CD4 <50) ou 8 semanas"],
  meds_exatos:{
    "TB SENSÍVEL — RIPE (6 meses)":["FASE INTENSIVA 2 meses: Rifampicina 150mg + Isoniazida 75mg + Pirazinamida 400mg + Etambutol 275mg (comprimido combinado 4em1) — dose por peso","FASE MANUTENÇÃO 4 meses: Rifampicina 300mg + Isoniazida 150mg (comprimido combinado 2em1) — dose por peso"],
    "ILTB — profilaxia":["Isoniazida 100mg / 300mg (comprimido) — 5-10mg/kg/dia por 6 meses","Rifampicina 300mg (cápsula) — 10mg/kg/dia por 4 meses (alternativa)"],
    "TB-MDR":["⛔ Bedaquilina 100mg — EXCEÇÃO TB-MDR: SOMENTE resistência confirmada a rifampicina+isoniazida. NÃO usar em TB sensível. Monitorar QTc obrigatoriamente.","Linezolida 600mg (comprimido) — 600mg/dia","Clofazimina 100mg (cápsula) — 100mg/dia"]},
  meds:["RIPE 4em1 (fase intensiva)","RI 2em1 (fase manutenção)","Isoniazida (ILTB)","Rifampicina (ILTB alternativa)","Bedaquilina (TB-MDR)","Linezolida (TB-MDR)","Clofazimina (TB-MDR)"]},

"anemia falciforme":{area:"Hematologia",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 16, de 2024",
  criterios:["Eletroforese Hb confirmando HbSS/HbSC/HbSβ","Hidroxiureia: 1ª linha — ≥3 VOC/ano OU STA recorrente OU anemia grave","Voxelotor: Hb <9 + hemólise grave + refratário à HU","Crizanlizumabe: ≥2 VOC/ano — com ou sem HU"],
  meds_exatos:{
    "1ª LINHA":["Hidroxiureia 500mg (cápsula) — 15-35mg/kg/dia (titular por hemograma)","Penicilina V 250mg (comprimido) — profilaxia pneumocócica até 5 anos"],
    "2ª LINHA — após falha ou associado":["Voxelotor 300mg / 500mg (comprimido) — 1500mg 1x/dia","Crizanlizumabe 10mg/mL (frasco IV) — 5mg/kg IV semanas 0,2; depois a cada 4 semanas"],
    "Quelante de ferro":["Deferasirox 90mg / 180mg / 360mg (comprimido dispersível) — 20-40mg/kg/dia"]},
  meds:["Hidroxiureia 500mg","Penicilina V (profilaxia)","Voxelotor","Crizanlizumabe IV","Deferasirox"]},

"hemofilia":{area:"Hematologia",comp:"Estratégico",portaria:"Portaria SAES/SCTIE/MS nº 3, de 2022",
  criterios:["Dosagem fator VIII (hemofilia A) ou IX (hemofilia B)","Inibidor: Bethesda ≥0,6 UB — usar bypass ou emicizumabe","Emicizumabe: hemofilia A COM inibidor (principal indicação)","Emicizumabe NÃO disponível para hemofilia B"],
  meds_exatos:{
    "HEMOFILIA A sem inibidor":["Fator VIII recombinante 250UI / 500UI / 1000UI / 2000UI (frasco IV) — profilaxia 25-40UI/kg 3x/semana","Emicizumabe SC — 3mg/kg/semana ×4; depois 1,5mg/kg/semana"],
    "HEMOFILIA A com inibidor":["Emicizumabe 30mg/mL / 60mg/mL / 105mg/mL / 150mg/mL (seringa SC) — profilaxia 3mg/kg/semana ×4; depois 1,5mg/kg/semana","⛔ Fator VIIa recombinante 1mg (frasco IV) — EXCEÇÃO: SOMENTE sangramento episódico. NÃO usar como profilaxia.","⛔ FEIBA 500UI/1000UI (frasco IV) — EXCEÇÃO: SOMENTE sangramento episódico. NÃO usar como profilaxia de rotina."],
    "HEMOFILIA B":["Fator IX recombinante 250UI / 500UI / 1000UI (frasco IV) — 40-60UI/kg 2x/semana"]},
  meds:["Fator VIII recombinante IV","Emicizumabe SC (hemofilia A)","rFVIIa IV (inibidor)","FEIBA IV (inibidor)","Fator IX recombinante IV"]},

"mieloma multiplo":{area:"Hematologia",comp:"CEAF/DDT",portaria:"CONITEC DDTs Mieloma vigentes 2024-2025",
  criterios:["IMWG 2014: plasmócitos ≥10% + CRAB","ISS/R-ISS obrigatório","Elegível TCTH: <70 anos + ECOG ≤2","1ª linha elegível: VRd (Bortezomibe+Lenalidomida+Dex) ± Daratumumabe","Recidivado: Pomalidomida ± Daratumumabe"],
  meds_exatos:{
    "1ª LINHA elegível TCTH":["Bortezomibe 3,5mg (frasco SC) — 1,3mg/m² SC dias 1,4,8,11 a cada 3 semanas","Lenalidomida 25mg (cápsula) — 25mg/dia dias 1-21 a cada 4 semanas","Dexametasona 40mg (comprimido) — 40mg/semana","Daratumumabe 20mg/mL (frasco IV) — esquema semanal → quinzenal → mensal"],
    "1ª LINHA não elegível TCTH":["Bortezomibe SC + Melfalan 2mg + Prednisona — ciclos de 42 dias"],
    "Recidivado/Refratário":["⛔ Pomalidomida 4mg (cápsula) — EXCEÇÃO: SOMENTE mieloma recidivado/refratário após ≥2 linhas anteriores incluindo lenalidomida e bortezomibe. NÃO usar na 1ª linha.","⛔ Carfilzomibe IV — EXCEÇÃO: SOMENTE mieloma recidivado. NÃO usar na 1ª linha.","Ixazomibe 4mg (cápsula) — a cada 2 semanas oral"]},
  meds:["Bortezomibe SC","Lenalidomida","Dexametasona","Daratumumabe IV","Melfalan","Pomalidomida","Carfilzomibe IV","Ixazomibe"]},

"artrite idiopatica juvenil":{area:"Reumatologia/Pediatria",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 34, de 23 de janeiro de 2026",criterios:["Critérios ILAR","Início <16 anos","Falha ao MTX ≥3 meses","Canacinumabe: exclusivo AIJ sistêmica com febre recorrente"],meds:["Metotrexato 2,5mg","Leflunomida 20mg","Adalimumabe 40mg SC","Etanercepte 50mg SC","Abatacepte SC","Tocilizumabe IV/SC","⛔ Canacinumabe 150mg SC — EXCEÇÃO: SOMENTE AIJ sistêmica com febre recorrente. NÃO usar em outras categorias de AIJ.","Baricitinibe 4mg"]},
"fibrose cistica":{area:"Pneumologia/Pediatria",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 3, de 2024",criterios:["Cl ≥60 mEq/L ou 2 mutações CFTR confirmadas","Elexacaftor/Tezacaftor/Ivacaftor: ≥1 cópia F508del ≥6 anos","Lumacaftor/Ivacaftor: homozigoto F508del"],meds:["Tobramicina inalatória 300mg/5mL","Dornase alfa 2,5mg/2,5mL (inalação)","Azitromicina 250mg","Lumacaftor 200mg + Ivacaftor 125mg (F508del homozigoto ≥6 anos)","Elexacaftor 100mg + Tezacaftor 50mg + Ivacaftor 75mg (≥1 F508del ≥6 anos)"]},
"hipertensao pulmonar":{area:"Pneumologia/Cardiologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 2, de 2024",criterios:["Cateterismo direito: PAPm ≥20mmHg + RVP >2 UW","Grupo 1 OMS (HAP)","Combinação inicial recomendada"],meds:["Sildenafila 20mg (comprimido)","Tadalafila 20mg/40mg (comprimido)","Ambrisentana 5mg/10mg (comprimido)","Bosentana 62,5mg/125mg (comprimido)","Macitentana 10mg (comprimido)","Riociguate 0,5/1/1,5/2/2,5mg (comprimido)","Selexipague 200-1600mcg (comprimido)","⛔ Epoprostenol IV — EXCEÇÃO: SOMENTE HAP grave (classe funcional IV) refratária a terapia oral combinada. Requer cateter venoso central permanente. Apenas em centros especializados."]},
"diabetes mellitus tipo 1":{area:"Endocrinologia",comp:"Básico",portaria:"PCDT DM1 MS",criterios:["DM1 confirmado com anticorpos anti-ilhota OU C-peptídeo baixo"],meds:["Insulina NPH humana 100UI/mL","Insulina Regular humana 100UI/mL","Insulina Glargina 100UI/mL","Insulina Asparte 100UI/mL","Insulina Lispro 100UI/mL"]},
"hipotireoidismo":{area:"Endocrinologia",comp:"Básico",portaria:"PCDT Hipotireoidismo MS",criterios:["TSH >10 mUI/L + T4L baixo"],meds:["Levotiroxina 25mcg/50mcg/75mcg/100mcg/125mcg/150mcg (comprimido) — 1x/dia em jejum"]},
"fibrilacao atrial":{area:"Cardiologia",comp:"Básico",portaria:"Diretriz SBC FA 2020",criterios:["ECG confirmado","CHA₂DS₂-VASc ≥2♂ ou ≥3♀"],meds:["Amiodarona 100mg/200mg","Varfarina 1mg/5mg (INR 2-3)","Apixabana 2,5mg/5mg","Rivaroxabana 15mg/20mg","Dabigatrana 75mg/110mg/150mg"]},
"doenca renal cronica":{area:"Nefrologia",comp:"Básico/CEAF",portaria:"Diretriz SBN + PCDT MS",criterios:["TFGe <60 por >3 meses","Eritropoetina: Hb <10 + ferritina >100","Dapagliflozina: DRC 2-4 + proteinúria ≥200mg/g"],meds:["Enalapril/Losartana (renoproteção)","Eritropoetina alfa/beta 2000-10000UI SC","Ferro sacarato IV","Dapagliflozina 10mg","Calcitriol 0,25mcg"]},
"sindrome nefrotica":{area:"Nefrologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 8, de 2020",criterios:["Proteinúria >3,5g/24h + hipoalbuminemia","Biópsia obrigatória","Rituximabe: refratária/dependente + falha a ciclosporina/tacrolimus"],meds:["Prednisona 5mg/20mg","Ciclosporina 25mg/100mg","Micofenolato mofetila 500mg","⛔ Rituximabe IV — EXCEÇÃO 3ª linha: SOMENTE síndrome nefrótica corticorresistente OU corticodependente após falha documentada a ciclosporina E tacrolimus. Biópsia obrigatória.","Tacrolimus 0,5mg/1mg"]},
"hepatite b":{area:"Infectologia",comp:"Estratégico",portaria:"Portaria SAES/SCTIE/MS nº 2, de 2023",criterios:["HBsAg+ >6 meses","DNA >20.000 + ALT↑ (HBeAg+) OU DNA >2.000 + ALT↑ ou F≥2 (HBeAg-)"],meds:["Tenofovir disoproxila 300mg 1x/dia (1ª linha)","Tenofovir alafenamida 25mg 1x/dia (TFGe <30)","Entecavir 0,5mg/1mg 1x/dia"]},
"esclerose sistemica":{area:"Reumatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 16, de 2022",criterios:["ACR/EULAR 2013 ≥9 pontos","Nintedanibe: DPI-SSc com CVF em declínio"],meds:["Metotrexato 2,5mg","Micofenolato mofetila 500mg","Nintedanibe 150mg (DPI-SSc)","Bosentana (HAP-SSc)","Sildenafila (HAP-SSc)"]},
"lupus eritematoso cutaneo":{area:"Dermatologia",comp:"Básico",portaria:"Diretriz SBD",criterios:["Diagnóstico clínico + histológico"],meds:["Hidroxicloroquina 400mg","Cloroquina 250mg","Prednisona (fase aguda)"]},
"transtorno bipolar":{area:"Psiquiatria",comp:"Básico",portaria:"Diretriz ABP",criterios:["DSM-5","Monitorar litiemia + creatinina + TSH"],meds:["Lítio 300mg","Valproato 250mg/500mg","Carbamazepina 200mg","Lamotrigina 25mg/50mg/100mg","Quetiapina 25mg/50mg/100mg/200mg/300mg"]},
"esquizofrenia":{area:"Psiquiatria",comp:"Básico/CEAF",portaria:"Diretriz ABRATA",criterios:["DSM-5","Clozapina: refratária a ≥2 antipsicóticos","Palmitato paliperidona IM: não adesão ao oral"],meds:["Risperidona 1mg/2mg/3mg/4mg","Olanzapina 5mg/10mg","Quetiapina 25mg/200mg/300mg","Aripiprazol 10mg/15mg/20mg/30mg","Clozapina 25mg/100mg","Palmitato paliperidona 75mg/100mg/150mg IM mensal","Palmitato paliperidona 273mg/410mg/546mg/819mg IM trimestral"]},
"dor cronica":{area:"Clínica Médica",comp:"Básico/CEAF",portaria:"Portaria SAES/SAPS/SECTICS nº 1, de 2024",criterios:["Dor persistente >3 meses","Avaliação multidimensional","Escalonamento analgésico"],meds:["Paracetamol 500mg/750mg","Dipirona 500mg","Amitriptilina 25mg","Duloxetina 30mg/60mg","Pregabalina 75mg/150mg/300mg","Gabapentina 300mg","Tramadol 50mg","Morfina 10mg/30mg"]},
"endometriose":{area:"Ginecologia",comp:"CEAF",portaria:"Portaria SAS/MS nº 879, de 2016",criterios:["Diagnóstico histológico ou laparoscópico","Falha ao hormonal 1ª linha"],meds:["Dienogeste 2mg (comprimido) — 2mg 1x/dia contínuo","Leuprorrelina 3,75mg (frasco IM) — mensal","Goserrelina 3,6mg (implante SC) — mensal"]},
"degeneracao macular":{area:"Oftalmologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 1, de 2022",criterios:["DMRI neovascular por AFG/OCT","AV ≥0,1"],meds:["Ranibizumabe 0,5mg/0,05mL (intravítreo)","Bevacizumabe 1,25mg (intravítreo off-label SUS)","Aflibercept 2mg/0,05mL (intravítreo)"]},
"glaucoma":{area:"Oftalmologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 1, de 2023",criterios:["PIO elevada + dano glaucomatoso","Falha ao hipotensor tópico 1ª linha"],meds:["Timolol 0,25%/0,5% (colírio)","Dorzolamida 2% (colírio)","Brimonidina 0,2% (colírio)","Latanoprosta 0,005% (colírio)","Bimatoprosta 0,03% (colírio)"]},
"puberdade precoce central":{area:"Endocrinologia/Pediatria",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 13, de 2022",criterios:["Telarca <8a ou gonadarca <9a","LH estimulado >5 UI/L","IO avançada >1 ano"],meds:["Leuprorrelina 3,75mg (frasco IM) — 3,75mg IM mensal","Triptorelina 3,75mg (frasco IM) — 3,75mg IM mensal"]},
"raquitismo osteomalacia":{area:"Endocrinologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 2, de 2022",criterios:["XLH com mutação PHEX para burosumabe"],meds:["Vitamina D3 1000UI (cápsula)","Calcitriol 0,25mcg (cápsula)","Fosfato (solução oral)","Burosumabe 10mg/20mg (seringa SC quinzenal — XLH)"]},
"sindrome de turner":{area:"Endocrinologia/Pediatria",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 15, de 2025",criterios:["Cariótipo 45X","Altura prevista <-2DP"],meds:["Somatropina 4UI/12UI (frasco SC diário)","Estrogênio conjugado (indução puberal)"]},
"osteoporose glucocorticoide":{area:"Reumatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 9, de 2022",criterios:["GC ≥5mg/dia prednisona ≥3 meses + T-score ≤-1,5"],meds:["Alendronato 70mg 1x/semana","Risedronato 35mg 1x/semana","Ácido zoledrônico 5mg IV anual","Denosumabe 60mg SC semestral"]},
"doenca de gaucher":{area:"Doenças Raras",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 4, de 2022",criterios:["β-glicocerebrosidase <15%","Hb <10 ou plaquetas <60.000 ou hepatoesplenomegalia"],meds:["Imiglicerase 200UI/400UI (frasco IV) — 60UI/kg IV a cada 2 semanas","Velaglicerase alfa 200UI/400UI (frasco IV) — 60UI/kg IV a cada 2 semanas","Miglustate 100mg (cápsula) — quando TRE não viável"]},
"doenca de fabry":{area:"Doenças Raras",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 2, de 2025",criterios:["Enzimático (homens) ou molecular (mulheres)","Comprometimento órgão-alvo","Migalastate: apenas mutações amenáveis (lista oficial)"],meds:["Agalsidase alfa 3,5mg (frasco IV) — 0,2mg/kg IV a cada 2 semanas","Agalsidase beta 35mg (frasco IV) — 1mg/kg IV a cada 2 semanas","Migalastate 123mg (cápsula) — 1 cápsula a cada 2 dias (mutações amenáveis)"]},
"doenca de pompe":{area:"Doenças Raras",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 5, de 2022",criterios:["Enzimático + molecular","Infantil: início imediato","Tardio: CVF >30%"],meds:["Alglicosidase alfa 50mg (frasco IV) — 20mg/kg IV a cada 2 semanas","Avalglicosidase alfa 100mg (frasco IV) — 20mg/kg IV a cada 2 semanas (2ª geração, preferível)"]},
"mucopolissacaridoses":{area:"Doenças Raras",comp:"CEAF",portaria:"PCDTs MPS MS",criterios:["Enzimático + molecular confirmados"],meds:["Laronidase 2,9mg IV semanal (MPS I)","Idursulfase 6mg IV semanal (MPS II)","Galsulfase 5mg IV semanal (MPS VI)","Elosulfase alfa 2mg/kg IV semanal (MPS IVA)"]},
"angioedema hereditario":{area:"Imunologia",comp:"CEAF",portaria:"Portaria SAS/MS nº 880, de 2016",criterios:["C4 baixo + C1-INH baixo","Lanadelumabe: ≥2 crises/mês"],meds:["Icatibanto 30mg (seringa SC) — 30mg SC na crise","Concentrado C1-esterase humana IV — na crise","Lanadelumabe 300mg/2mL (seringa SC) — 300mg SC a cada 2 semanas (profilaxia)"]},
"hidradenite supurativa":{area:"Dermatologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 19, de 2022",criterios:["Hurley II/III","Falha a tópico/oral ≥3 meses"],meds:["Clindamicina tópica 1%","Rifampicina 300mg + Clindamicina 300mg oral","Doxiciclina 100mg","Adalimumabe 40mg SC (Hurley II/III)","Secuquinumabe 300mg SC"]},
"leucemia linfoide aguda":{area:"Hematologia",comp:"DDT",portaria:"CONITEC DDT LLA 2023",criterios:["Imunofenotipagem + citogenética","iTK: LLA Ph+","Blinatumomabe: R/R"],meds:["QT (HyperCVAD/BFM)","Imatinibe 400mg (Ph+)","Dasatinibe 100mg (Ph+)","Blinatumomabe 28mcg/dia (R/R)"]},
"sindrome mielodisplasica":{area:"Hematologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 22, de 2022",criterios:["Mielograma + citogenética","IPSS ≥INT-2 para azacitidina"],meds:["Azacitidina 100mg SC — 75mg/m² dias 1-7 a cada 4 semanas","Lenalidomida 5mg/10mg (apenas del5q)","Eritropoetina alfa SC"]},
"purpura trombocitopenica imune":{area:"Hematologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 9, de 2019",criterios:["Plaquetas <30.000 + hemorragia ou <20.000 assintomático","PTI crônica refratária"],meds:["Prednisona 5mg/20mg","IVIG 0,4-1g/kg IV","Romiplostim 250mcg SC semanal (dose por peso)","Eltrombopague 25mg/50mg (comprimido)","Rituximabe 500mg IV"]},
"leishmaniose visceral":{area:"Infectologia",comp:"Estratégico",portaria:"Nota Técnica MS",criterios:["Diagnóstico parasitológico ou sorológico","Febre + esplenomegalia + pancitopenia"],meds:["Anfotericina B lipossomal 50mg (frasco IV) — 3mg/kg/dia por 7 dias","Antimoniato de meglumina 300mg/mL (ampola IM) — 20mg/kg/dia por 30 dias"]},
"hepatite autoimune":{area:"Hepatologia",comp:"CEAF",portaria:"Diretriz HAI",criterios:["IAIHG ≥6","ALT/AST↑ + hipergamaglobulinemia","Biópsia compatível"],meds:["Prednisona 5mg/20mg","Azatioprina 50mg","Budesonida 3mg","Micofenolato mofetila 500mg"]},
"doenca de wilson":{area:"Gastroenterologia/Raras",comp:"CEAF",portaria:"Portaria SAES/SECTICS/MS nº 15, de 2024",criterios:["Leipzig ≥4","Ceruloplasminemia <20 + cuprúria >40"],meds:["D-penicilamina 250mg (comprimido)","Trientina 250mg (cápsula)","Acetato de zinco 25mg/50mg (comprimido)"]},
"sindrome de sjogren":{area:"Reumatologia",comp:"Básico/CEAF",portaria:"Diretriz SBR",criterios:["ACR/EULAR 2016","Anti-SSA/Ro positivo"],meds:["Hidroxicloroquina 400mg","Pilocarpina 5mg (sialogogo)","⛔ Rituximabe IV — EXCEÇÃO: SOMENTE LES com manifestações sistêmicas graves refratárias (nefrite, neuropsiquiátrico) após falha a tratamento convencional otimizado."]},
"dermatomiosite polimiosite":{area:"Reumatologia",comp:"CEAF",portaria:"PCDT DM/PM MS",criterios:["ACR/EULAR 2017","CPK elevada + fraqueza proximal"],meds:["Prednisona 5mg/20mg","Azatioprina 50mg","Metotrexato 2,5mg","IVIG 0,4g/kg IV","Rituximabe IV (refratária)"]},
"sindrome de ovarios policisticos":{area:"Ginecologia",comp:"Básico",portaria:"Portaria SAES/SCTIE/MS nº 6, de 2019",criterios:["Rotterdam ≥2/3","Excluir outras causas"],meds:["ACO (etinilestradiol+progestágeno)","Metformina 500mg/850mg","Espironolactona 25mg/50mg","Clomifeno 50mg (indução ovulação)"]},
"acidente vascular cerebral isquemico":{area:"Neurologia",comp:"Hospitalar/Básico",portaria:"Portaria SAES/SCTIE/MS nº 2, de 2025",criterios:["TC/RM confirmado","Alteplase: até 4,5h do início","Trombectomia: oclusão grande vaso até 24h"],meds:["Alteplase 50mg / 100mg (frasco IV) — 0,9mg/kg IV (máx 90mg; 10% bolus; 90% em 60min)","AAS 100mg/500mg (comprimido)","Clopidogrel 75mg (comprimido)"]},
"espasticidade":{area:"Neurologia/Reabilitação",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 3, de 2022",criterios:["Espasticidade central","Ashworth ≥2","Falha ao oral"],meds:["Baclofeno 10mg (comprimido)","Tizanidina 2mg/4mg (comprimido)","Toxina botulínica tipo A 100UI/200UI/500UI (frasco IM)","Baclofeno intratecal (casos selecionados)"]},
"miastenia gravis":{area:"Neurologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 4, de 2022",criterios:["Diagnóstico confirmado + AChR/MuSK","Eculizumabe: AChR+ refratária a ≥2 imunoterapias"],meds:["Piridostigmina 60mg","Prednisona 5mg/20mg","Azatioprina 50mg","IVIG IV","Rituximabe IV","Eculizumabe 300mg IV (refratária)"]},
"doenca de parkinson":{area:"Neurologia",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 5, de 2022",criterios:["UK Brain Bank","Hoehn & Yahr documentado"],meds:["Levodopa 100mg + Carbidopa 25mg (comprimido)","Pramipexol 0,125mg/0,25mg/0,5mg/1mg","Rotigotina 2mg/4mg/6mg/8mg (adesivo)","Rasagilina 1mg","Amantadina 100mg","Entacapona 200mg"]},
"lipofuscinose ceroide neuronal":{area:"Neurologia/Pediatria",comp:"CEAF",portaria:"Portaria SAES/SCTIE/MS nº 6, de 2023",criterios:["Mutação TPP1 confirmada","CLN2 clássico tardio","Antes da perda de marcha"],meds:["Cerliponase alfa 150mg/5mL (frasco intracerebroventricular) — 300mg ICV a cada 2 semanas"]},
"hipoparatireoidismo":{area:"Endocrinologia",comp:"CEAF",portaria:"Diretriz SBEM",criterios:["PTH baixo + hipocalcemia + hiperfosfatemia","PTH <15 pg/mL com sintomas"],meds:["Calcitriol 0,25mcg (cápsula)","Carbonato de cálcio 500mg/1250mg","Paratormônio recombinante (casos refratários — verificar DDT)"]},
};
