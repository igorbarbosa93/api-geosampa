// Base de conhecimento jurídico — São Paulo, legislação HIS/EHIS/EZEIS (2016-2025)
// Fontes verificadas: Lei 16.050/2014, Lei 16.402/2016, Lei 17.975/2023, Lei 18.081/2024,
//                     Lei 18.157/2024, Lei 18.177/2024, Lei 18.209/2024,
//                     Decreto 57.377/2016, Decreto 63.130/2024, Decreto 63.728/2024, Decreto 64.244/2025

module.exports = {

  definicoes_renda: {
    HIS_1: {
      descricao: 'Habitação de Interesse Social – faixa 1',
      renda_familiar_max_sm: 3,
      renda_familiar_max_2026: 'R$ 4.863,00/mês',
      renda_per_capita_max_2026: 'R$ 810,50/mês'
    },
    HIS_2: {
      descricao: 'Habitação de Interesse Social – faixa 2',
      renda_familiar_max_sm: 6,
      renda_familiar_max_2026: 'R$ 9.726,00/mês',
      renda_per_capita_max_2026: 'R$ 1.621,00/mês'
    },
    HMP: {
      descricao: 'Habitação de Mercado Popular',
      renda_familiar_max_sm: 10,
      renda_familiar_max_2026: 'R$ 16.210,00/mês'
    }
  },

  limite_unidades_ehis: {
    maximo_por_lote: 400,
    base_legal: 'Decreto 63.728/2024',
    observacao: 'Máximo de 400 unidades HIS por EHIS/EZEIS — lotes grandes podem requerer subdivisão ou EZEIS'
  },

  zeis: {
    'ZEIS-1': {
      descricao: 'Áreas com ocupação de baixa renda já consolidada (favelas, loteamentos irregulares)',
      lei_base: 'Lei 16.402/2016 + Decreto 63.728/2024',
      ca_basico: 1.0,
      ca_maximo: 2.5,
      to_maxima: 0.70,
      gabarito: 'até 10m salvo previsão específica de PIU',
      his_percentual_minimo: '60% HIS-1 em lotes >1.000m²; isento em lotes ≤1.000m²',
      mix_permitido: '60% HIS-1 mínimo; restante pode ser HIS-2 ou HMP',
      bonus_eixo: 'NÃO se aplica — bônus 50% da Lei 17.975/2023 é exclusivo para ZEIS-2, 3 e 5',
      outorga_onerosa: 'ISENTA — Fator de Interesse Social (Fs) = 0 (Decreto 63.728/2024)',
      vagas_garagem: '1 vaga/2 unidades HIS; 1 vaga/unidade HMP; dispensada em Eixo (Art. 76 LPUOS)',
      observacao_tombamento: 'Tombamento/ZEPEC no lote não bloqueia ZEIS-1 (CA já é reduzido)'
    },
    'ZEIS-2': {
      descricao: 'Lotes vagos ou subutilizados destinados à produção de HIS',
      lei_base: 'Lei 16.402/2016 + Lei 17.975/2023 (revisão intermediária PDE) + Lei 18.157/2024',
      ca_basico: 1.0,
      ca_maximo: 4.0,
      ca_maximo_em_eixo: 6.0,
      regra_bonus_eixo: 'Lei 17.975/2023: +50% sobre CA máximo quando lote está em área de influência de Eixo de Estruturação da Transformação Urbana (CA 4 → 6)',
      restricao_bonus: 'O bônus +50% NÃO se aplica se o lote tem sobreposição de tombamento, ZEPEC ou APP/manancial',
      to_maxima: 0.70,
      gabarito: 'livre quando em Eixo; verificar PIU para outros casos',
      his_percentual_minimo: '60% HIS-1 em lotes >1.000m²; isento em lotes ≤1.000m²',
      mix_permitido: '60% HIS-1 mínimo; demais: HIS-2, HMP ou nR (máx. 20%)',
      outorga_onerosa: 'ISENTA quando utiliza CA máximo — Fs=0 (Decreto 63.728/2024 + Lei 17.975/2023)',
      estoque: 'EHIS/EZEIS não consome estoque de potencial construtivo de PIU/OUC (Lei 18.209/2024 — válida até 31/12/2025)',
      vagas_garagem: 'Dispensada em Eixo de Estruturação (Art. 76 LPUOS); 1 vaga/unidade fora de Eixo'
    },
    'ZEIS-3': {
      descricao: 'Áreas com concentração de moradia precária em regiões urbanizadas e estratégicas da cidade',
      lei_base: 'Lei 16.402/2016 + Lei 17.975/2023',
      ca_basico: 1.0,
      ca_maximo: 4.0,
      ca_maximo_em_eixo: 6.0,
      regra_bonus_eixo: 'Mesma lógica ZEIS-2: +50% em Eixo (Lei 17.975/2023)',
      restricao_bonus: 'NÃO se aplica com tombamento/ZEPEC/APP',
      to_maxima: 0.70,
      his_percentual_minimo: '60% HIS-1 em lotes >500m²; isento em lotes ≤500m²',
      outorga_onerosa: 'ISENTA — Fs=0',
      estoque: 'Não consome estoque (Lei 18.209/2024)'
    },
    'ZEIS-4': {
      descricao: 'Empreendimentos em parceria com cooperativas habitacionais autogestionárias',
      lei_base: 'Lei 16.402/2016',
      ca_basico: 1.0,
      ca_maximo: 2.0,
      his_percentual_minimo: '100% HIS',
      bonus_eixo: 'Não se aplica',
      outorga_onerosa: 'ISENTA'
    },
    'ZEIS-5': {
      descricao: 'Lotes vagos em áreas com boa infraestrutura, destinados a HIS-2 e HMP',
      lei_base: 'Lei 17.975/2023 (criação/redefinição) + Lei 18.157/2024',
      ca_basico: 1.0,
      ca_maximo: 4.0,
      ca_maximo_em_eixo: 6.0,
      regra_bonus_eixo: '+50% em Eixo (Lei 17.975/2023)',
      restricao_bonus: 'NÃO se aplica com tombamento/ZEPEC/APP',
      his_percentual_minimo: '40% HIS-2 (renda até 6 SM / R$ 9.726 em 2026) em lotes >1.000m²',
      outorga_onerosa: 'ISENTA — Fs=0 para as unidades HIS-2'
    }
  },

  zonas_uso: {
    'ZEU': {
      descricao: 'Zona Eixo de Estruturação da Transformação Urbana (eixo principal)',
      ca_basico: 1.0, ca_maximo: 4.0, to_max: 0.70, gabarito: 'livre (sem limitação)',
      eixo: true, cota_parte_min_m2: 20
    },
    'ZEUP': {
      descricao: 'Zona Eixo de Estruturação da Transformação Urbana – Previsto',
      ca_basico: 1.0, ca_maximo: 2.5, to_max: 0.70, gabarito: 'livre',
      eixo: true, cota_parte_min_m2: 25
    },
    'ZC': {
      descricao: 'Zona Centralidade',
      ca_basico: 1.0, ca_maximo: 2.5, to_max: 0.70, gabarito: 'livre',
      eixo: false
    },
    'ZM': {
      descricao: 'Zona Mista (fora de eixo)',
      ca_basico: 1.0, ca_maximo: 2.0, to_max: 0.70, gabarito: '48m',
      eixo: false
    },
    'ZM-a': {
      descricao: 'Zona Mista próxima a Eixo',
      ca_basico: 1.0, ca_maximo: 4.0, to_max: 0.70, gabarito: 'livre',
      eixo: true
    },
    'ZR': {
      descricao: 'Zona Residencial',
      ca_basico: 1.0, ca_maximo: 1.0, to_max: 0.50, gabarito: '10m',
      eixo: false, observacao: 'Difícil viabilização de EHIS — CA muito restritivo'
    },
    'ZEIS-3': {
      descricao: 'Zona Especial de Interesse Social tipo 3',
      ca_basico: 1.0, ca_maximo: 4.0, to_max: 0.70, gabarito: 'livre em Eixo',
      eixo: 'quando sobreposto a ZEU'
    }
  },

  outorga_onerosa: {
    formula: '(CA_utilizado − CA_basico) × Área_terreno × Valor_Venal_m2 × Fp × Fs',
    fator_planejamento_Fp: 'varia de 0,3 a 1,0 conforme zona e localização; 0,3 para ZEIS e HIS em Eixo',
    fator_social_Fs: {
      HIS_1: 0,
      HIS_2: 0,
      HMP: 0.4,
      geral: 1.0
    },
    isencoes_confirmadas: [
      'HIS-1 e HIS-2 em QUALQUER zona: Fs=0 → outorga = R$ 0 (Decreto 63.728/2024 + Lei 17.844/2022)',
      'EHIS usando CA máximo em ZEIS-2/3/5: ISENTA (Fs=0 + Fp=0,3)',
      'EZEIS em ZEIS-2/3/5 em Eixo com CA 6,0: ISENTA mesmo com bônus 50% (Fs=0)',
      'EHIS em ZEIS: isento de taxa de licenciamento (Lei 16.642/2017 + Decreto 57.776/2017)'
    ],
    dentro_de_ouc: 'Outorga substituída por CEPACs. Lei 18.209/2024 isenta EHIS do consumo de estoque mas não elimina obrigação de CEPAC onde for exigido por lei específica da OUC',
    lei_base: 'Decreto 63.728/2024 + Lei 17.844/2022 (Arts. 12, 13, 15) + Lei 17.975/2023'
  },

  mecanismos_incremento_ca: [
    {
      id: 'ZEIS_EM_EIXO_LEI17975',
      prioridade: 'MÁXIMA',
      descricao: 'ZEIS-2, ZEIS-3 ou ZEIS-5 dentro da área de influência de Eixo de Estruturação: CA sobe de 4 para 6',
      lei: 'Lei 17.975/2023 + Lei 18.157/2024',
      ca_base: 4.0,
      ca_com_bonus: 6.0,
      incremento: '+50%',
      requisito: 'Lote em ZEIS-2/3/5 E dentro da área de influência de Eixo de Estruturação; mínimo 60% HIS; max. 400 unidades',
      restricao_critica: 'NÃO se aplica se há sobreposição de tombamento CONPRESP/CONDEPHAAT, ZEPEC ou APP/manancial — tombamento bloqueia o bônus',
      outorga: 'ISENTA — Fator de Interesse Social = 0',
      estoque: 'Não consome estoque de PIU/OUC (Lei 18.209/2024)',
      compatibilidade: ['ZEIS-2+ZEU', 'ZEIS-3+ZEU', 'ZEIS-5+ZEU', 'ZEIS-2+ZEUP', 'ZEIS-3+ZM-a'],
      viabilidade_default: 'alta'
    },
    {
      id: 'EHIS_CA_MAXIMO_ZONA',
      prioridade: 'ALTA',
      descricao: 'EHIS em qualquer zona: CA máximo da zona com outorga ISENTA (Fs=0)',
      lei: 'Decreto 63.728/2024 + Lei 17.975/2023',
      ca_com_bonus: 'CA máximo da zona (ex: 4,0 em ZEU; 2,5 em ZC; 2,0 em ZM)',
      requisito: 'Mínimo 80% da área computável HIS; máximo 400 unidades HIS/EHIS; lote fora de ZEIS',
      outorga: 'ISENTA (Fs=0 para HIS-1 e HIS-2)',
      estoque: 'Não consome estoque PIU/OUC (Lei 18.209/2024, válida até 31/12/2025)',
      compatibilidade: ['ZEU', 'ZM', 'ZC', 'ZM-a'],
      viabilidade_default: 'alta'
    },
    {
      id: 'SEM_CONSUMO_ESTOQUE_L18209',
      prioridade: 'ALTA — PRAZO 31/12/2025',
      descricao: 'EHIS/EZEIS protocolados até 31/12/2025 não consomem estoque de potencial construtivo de OUC ou PIU',
      lei: 'Lei 18.209/2024 (20/12/2024)',
      beneficio: 'Elimina fila e custo de estoque construtivo nas operações urbanas; acesso ao CA sem aguardar abertura de estoque',
      requisito: 'Protocolo de pedido de licença de edificação até 31/12/2025',
      compatibilidade: ['PIU Setor Central', 'PIU Tamanduateí', 'PIU Arco Tietê', 'OUC Água Espraiada', 'OUC Água Branca'],
      viabilidade_default: 'alta',
      alerta: 'PRAZO ESGOTA EM 31/12/2025 — fator decisivo para timing do projeto'
    },
    {
      id: 'FRUICAO_PUBLICA',
      descricao: 'Fruição Pública (Art. 67 LPUOS): destinação de faixa de passagem pública na testada',
      lei: 'Art. 67 Lei 16.402/2016',
      ca_adicional: '+10% sobre CA máximo da zona OU percentual definido em regulamento específico do PIU',
      beneficio_extra: 'Recuo frontal obrigatório dispensado; área de fruição não computa no CA',
      requisito: 'Faixa mínima 3m de largura; testada mínima 10m; acesso público irrestrito 24h; sem fechamento',
      compatibilidade: ['qualquer zona com testada ≥10m'],
      viabilidade_default: 'alta'
    },
    {
      id: 'FACHADA_ATIVA',
      descricao: 'Fachada Ativa (Art. 69 LPUOS): usos nR no térreo com testada ativa — área não computa no CA',
      lei: 'Art. 69 Lei 16.402/2016',
      beneficio: 'Área do térreo com uso não residencial (comércio, serviço, equipamento) não entra no CA; recuo frontal dispensado',
      requisito: 'Mínimo 50% da testada principal com uso ativo; sem garagem frontal; pé-direito mínimo 4,5m no térreo',
      compatibilidade: ['ZEU', 'ZEU+ZEIS-2', 'ZM', 'ZC', 'ZEIS-3'],
      viabilidade_default: 'alta'
    },
    {
      id: 'TPC_RECEPTOR',
      descricao: 'Transferência de Potencial Construtivo (TPC): lote receptor de imóvel tombado pode superar CA máximo da zona',
      lei: 'Art. 116-A a 116-F Lei 16.402/2016 + Art. 123-128 Lei 16.050/2014',
      ca_adicional: 'CA receptor pode superar máximo da zona em até 30%',
      requisito: 'Lote doador tombado por CONPRESP ou CONDEPHAAT; lote receptor em zona de adensamento compatível (ZEU, ZC, ZM-a)',
      nota_tombamento_proprio: 'Se o próprio lote em análise está tombado: BLOQUEIA bônus ZEIS/Eixo, MAS pode ser lote doador de TPC para outro terreno (estratégia alternativa)',
      compatibilidade: ['ZEU receptor', 'ZC receptor', 'ZM-a receptor'],
      viabilidade_default: 'media'
    },
    {
      id: 'AREAS_NAO_COMPUTAVEIS_D63728',
      descricao: 'Decreto 63.728/2024: varandas, circulação, lazer e áreas técnicas não computam no CA para EHIS',
      lei: 'Decreto 63.728/2024 (10/09/2024)',
      itens_nao_computaveis: [
        'Varandas: até 8m² por unidade OU até 12% da área privativa útil (o que for menor)',
        'Áreas técnicas (barrilete, casa de máquinas, reservatório, subestação): 100%',
        'Circulação vertical (escadas, elevadores, halls): 100%',
        'Circulação horizontal comum (corredores, halls de andar): 100%',
        'Lazer coletivo (salão de festas, academia, playground, piscina): 100%',
        'Área de serviço comunitário (lavanderia coletiva, depósito de lixo): 100%',
        'Subsolo (garagem): não computa se abaixo do nível do lote'
      ],
      requisito: 'Empreendimento classificado como EHIS ou EZEIS',
      compatibilidade: ['todas as zonas'],
      viabilidade_default: 'alta'
    },
    {
      id: 'PIU_CA_ESPECIFICO',
      descricao: 'PIUs definem CA próprio — pode superar LPUOS e zerar outorga para HIS',
      lei: 'Varia por PIU (ver seção pius)',
      ca_adicional: 'PIU Setor Central: até CA 6,0 com isenção total; demais: CA 4,0-5,0 com cotas HIS',
      requisito: 'Lote dentro do perímetro específico do PIU; cumprimento obrigatório das cotas HIS definidas',
      estoque: 'Lei 18.209/2024: EHIS não consome estoque até 31/12/2025',
      compatibilidade: ['PIU Setor Central', 'PIU Bairros do Tamanduateí', 'PIU Arco Tietê', 'PIU Arco Jurubatuba'],
      viabilidade_default: 'alta'
    }
  ],

  pius: {
    'PIU Setor Central': {
      lei: 'Lei 17.492/2021',
      status: 'Vigente',
      ca_maximo_geral: 4.0,
      ca_maximo_setor_a: 6.0,
      setores: 'Setor A (Sé/República): CA 6; Setor B: CA 4; Setor C: CA 3',
      his_cota_minima: '20% das unidades ou 20% da área construída total',
      outorga_his: 'Desconto de 100% (isenção total) para HIS nas áreas de ativação prioritária (Setor A)',
      estoque_his: 'Lei 18.209/2024: EHIS não consome estoque até 31/12/2025',
      vantagem_chave: 'Único PIU com CA 6 + isenção total de outorga para HIS — máximo potencial da cidade'
    },
    'PIU Bairros do Tamanduateí': {
      lei: 'Lei 17.577/2021',
      status: 'Vigente',
      ca_maximo: 4.0,
      his_cota_minima: '40% em ZEIS sobrepostas; 20% fora de ZEIS',
      outorga_his: 'Isenção para HIS dentro de ZEIS',
      vantagem_chave: 'Grande estoque de lotes industriais convertíveis; proximidade ao metrô'
    },
    'PIU Arco Tietê': {
      lei: 'Decreto 57.537/2016 + atualizações',
      status: 'Vigente (parcial)',
      ca_maximo: 4.0,
      his_cota_minima: '25% da área construída total',
      vantagem_chave: 'Proximidade a metrô e trem; CA 4 com incentivo HIS; grandes terrenos à beira do Tietê'
    },
    'PIU Vila Leopoldina / Eixo JK': {
      lei: 'Em aprovação 2024-2025',
      status: 'Ainda não aprovado — verificar status atual',
      ca_maximo: 4.0,
      his_cota_minima: '20% HIS mínimo',
      vantagem_chave: 'Grande área industrial em transformação; glebas de grande porte'
    },
    'PIU Arco Jurubatuba': {
      lei: 'Em aprovação 2024-2025',
      status: 'Ainda não aprovado — verificar status atual',
      ca_maximo: 4.0,
      his_cota_minima: '25%',
      vantagem_chave: 'Sul da cidade; terrenos mais acessíveis; boa cobertura de metrô na região'
    }
  },

  oucs: {
    'OUC Água Espraiada': {
      lei: 'Lei 13.260/2001',
      status: 'Ativa — estoque parcialmente disponível',
      cepac_valor_referencia: 'R$ 2.800–4.200/m² computável adicional (variação por leilão CVM)',
      ca_maximo_com_cepac: 4.0,
      his_obrigatorio: '25% das unidades em setores específicos',
      lei_estoque: 'Lei 18.209/2024: EHIS não consome estoque até 31/12/2025',
      observacao: 'CEPAC substitui outorga onerosa; HIS pode ter desconto proporcional ao Fs=0'
    },
    'OUC Faria Lima': {
      lei: 'Lei 11.732/1995',
      status: 'PRATICAMENTE EXAURIDA — estoque de CEPACs mínimo',
      observacao: 'Não considerar como oportunidade de incremento de CA para novos projetos'
    },
    'OUC Água Branca': {
      lei: 'Lei 11.774/1995',
      status: 'Ativa — estoque disponível',
      ca_maximo_com_cepac: 4.0,
      his_obrigatorio: '20% das unidades',
      lei_estoque: 'Lei 18.209/2024: EHIS não consome estoque até 31/12/2025',
      observacao: 'Menor valorização imobiliária; boa janela para HIS de médio porte'
    },
    'OUC Centro': {
      lei: 'Proposta em discussão (2024)',
      status: 'NÃO aprovada — aguardar legislação',
      observacao: 'Pode se sobrepor ao PIU Setor Central quando aprovada'
    }
  },

  tombamento_e_tpc: {
    conpresp: {
      orgao: 'CONPRESP — Conselho Municipal de Preservação do Patrimônio Histórico, Cultural e Ambiental',
      escopo: 'Municipal',
      impacto_ca: 'Limita CA; exige preservação de fachada, volumetria e/ou interior conforme resolução',
      impacto_bonus_eixo: 'BLOQUEIA bônus +50% em ZEIS (Lei 17.975/2023) quando há tombamento ou ZEPEC',
      tpc_doador: {
        disponivel: true,
        descricao: 'Lote tombado pode transferir seu potencial construtivo não utilizável para lote receptor',
        receptor_limite: 'CA do receptor pode superar máximo da zona em até 30%',
        lei: 'Art. 116-A a 116-F Lei 16.402/2016 + Art. 123-128 Lei 16.050/2014'
      },
      estrategia_his: 'Lote tombado como DOADOR + lote receptor em ZEU como EHIS: CA acima do máximo + Fs=0'
    },
    condephaat: {
      orgao: 'CONDEPHAAT — Conselho de Defesa do Patrimônio Histórico, Arqueológico, Artístico e Turístico (Estadual)',
      escopo: 'Estadual — mais restritivo que CONPRESP',
      impacto_ca: 'Pode impedir demolições totais; restrições mais severas de intervenção',
      observacao: 'Verificar se o tombamento é municipal (CONPRESP), estadual (CONDEPHAAT) ou duplo — impacto diverge'
    },
    zepec: {
      tipos: [
        'ZEPEC-APC (Área de Proteção Cultural): CA máximo reduzido; preservação volumétrica',
        'ZEPEC-BIR (Bens Imóveis Representativos): imóveis específicos; intervenções controladas'
      ],
      impacto_ca: 'ZEPEC-APC pode reduzir CA máximo a 1,0; preservação de conjunto arquitetônico exigida',
      impacto_bonus_eixo: 'BLOQUEIA bônus Lei 17.975/2023',
      oportunidade_tpc: 'Imóvel ZEPEC pode ser DOADOR de TPC → potencial transferido para lote receptor em zona de adensamento'
    }
  },

  fne_app: {
    corrego_canalizado: {
      faixa_cada_lado_m: 7.5,
      base_legal: 'Lei Municipal 9.413/1981 e Res. CONAMA 369/2006',
      nota: 'Recuo de 7,5m em cada margem (15m total). Verificar GeoSampa — camada Hidrografia'
    },
    corrego_aberto: {
      faixa_cada_lado_m: 30,
      base_legal: 'Lei 12.651/2012 (Código Florestal Federal) + LPUOS Art. 33',
      nota: 'APP de 30m em cursos d\'água com até 10m de largura'
    },
    linha_transmissao_alta_tensao: {
      faixa_cada_lado_m: '15 a 70 conforme tensão (kV)',
      base_legal: 'ABNT NBR 5422; servidão ANEEL',
      nota: 'Verificar tensão da linha no GeoSampa — camada Rede de Alta Tensão'
    },
    ferrovia_cptm_metro: {
      faixa_cada_lado_m: 15,
      base_legal: 'Lei 6.766/1979; Decreto Estadual de proteção ferroviária'
    },
    rodovia_estadual: {
      faixa_m: 30,
      base_legal: 'Art. 4.º Lei 6.766/1979'
    },
    rodovia_federal: {
      faixa_m: 40,
      base_legal: 'Art. 4.º Lei 6.766/1979'
    },
    nota_geral: 'FNE integra a Área Líquida do lote mas NÃO é área edificável. Pode ser destinada a fruição pública se averbada no registro — consultar SMUL'
  },

  fachada_ativa: {
    artigo: 'Art. 69 Lei 16.402/2016',
    requisitos: [
      'Mínimo 50% da extensão da testada principal com uso não residencial ativo (comércio, serviço, equipamento)',
      'Pé-direito mínimo de 4,5m no térreo',
      'Vedado uso de garagem, estacionamento ou guarita nas fachadas ativas',
      'Acesso direto do uso nR para a calçada (sem obstáculos físicos)'
    ],
    beneficios: [
      'Área do térreo com fachada ativa NÃO computa no CA',
      'Recuo frontal obrigatório dispensado (pode ser combinado com Fruição Pública)',
      'Potencial de renda adicional para o empreendimento (aluguel comercial)'
    ]
  },

  fruicao_publica: {
    artigo: 'Art. 67 Lei 16.402/2016',
    requisitos: [
      'Faixa de passagem de pedestres com mínimo 3m de largura',
      'Testada do lote mínima de 10m',
      'Acesso público irrestrito 24h (sem portão ou cancela)',
      'Cobertura (marquise ou galeria) é incentivada mas não obrigatória'
    ],
    beneficios: [
      'CA máximo da zona acrescido de 10% (ou conforme PIU específico)',
      'Recuo frontal obrigatório dispensado',
      'Área de fruição pública não computa no CA'
    ]
  },

  licenciamento_simplificado: {
    pif: {
      nome: 'Plano Integrado Faseado (PIF)',
      lei: 'Decreto 63.728/2024',
      descricao: 'Processo de licenciamento simplificado e faseado para EHIS — reduz burocracia e prazos',
      beneficio: 'Aprovação por etapas; documentação menor na fase inicial; agilidade para prospecção'
    },
    isencao_taxas: {
      lei: 'Lei 16.642/2017 (COE) + Decreto 57.776/2017',
      descricao: 'EHIS, EHMP e EZEIS são isentos de TEV (Taxa de Edificação e Vigilância) e de preços públicos de COE'
    }
  },

  camadas_geosamba_criticas: [
    { camada: 'Zoneamento (LPUOS 2016 atualizada)', motivo: 'Identificar zona exata e sobreposições de ZEIS' },
    { camada: 'Eixos de Estruturação da Transformação Urbana', motivo: 'Verificar se lote está em área de influência — gatilha bônus +50% CA' },
    { camada: 'ZEIS (tipos 1, 2, 3, 4, 5)', motivo: 'Sobreposição de ZEIS define CA e percentuais HIS obrigatórios' },
    { camada: 'Melhoramentos Viários', motivo: 'Traçados de alargamento e novas vias que recortam o lote' },
    { camada: 'Hidrografia', motivo: 'Córregos (canalizados e a céu aberto) — determina FNE de 7,5m ou 30m' },
    { camada: 'Rede de Alta Tensão', motivo: 'Faixas de servidão de linhas de transmissão' },
    { camada: 'PIUs e OUCs (perímetros)', motivo: 'Legislação específica de CA e HIS substitui/complementa LPUOS' },
    { camada: 'Tombamento e ZEPEC (CONPRESP/CONDEPHAAT)', motivo: 'Bloqueia bônus +50% da Lei 17.975/2023; pode habilitar TPC doador' },
    { camada: 'Mananciais (APRM)', motivo: 'Restrições estaduais severas — pode inviabilizar EHIS' },
    { camada: 'COMAER (cone de aproximação aeroportuária)', motivo: 'Limita gabarito de altura — crítico para torres HIS' },
    { camada: 'Solo Contaminado (CETESB)', motivo: 'Uso industrial anterior ou posto de combustível: remediação obrigatória antes de HIS' },
    { camada: 'Quota Ambiental (PA)', motivo: 'Exige pontuação mínima de permeabilidade + vegetação conforme Quadro 3A LPUOS' }
  ]
}
