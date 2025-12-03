import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// --- UTILITÁRIOS E LÓGICA DE NEGÓCIO ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const diffDays = (d1: Date, d2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
};

// Histórico de Salário Mínimo
const HISTORICO_SALARIO_MINIMO = [
  { date: '2025-01-01', value: 1518.00 },
  { date: '2024-01-01', value: 1412.00 },
  { date: '2023-05-01', value: 1320.00 },
  { date: '2023-01-01', value: 1302.00 },
  { date: '2022-01-01', value: 1212.00 },
  { date: '2021-01-01', value: 1100.00 },
  { date: '2020-02-01', value: 1045.00 },
  { date: '2020-01-01', value: 1039.00 },
  { date: '2019-01-01', value: 998.00 },
  { date: '2018-01-01', value: 954.00 },
  { date: '2017-01-01', value: 937.00 },
  { date: '2016-01-01', value: 880.00 },
  { date: '2015-01-01', value: 788.00 },
  { date: '2014-01-01', value: 724.00 },
  { date: '2013-01-01', value: 678.00 },
  { date: '2012-01-01', value: 622.00 },
  { date: '2011-03-01', value: 545.00 },
  { date: '2011-01-01', value: 540.00 },
  { date: '2010-01-01', value: 510.00 },
  { date: '2009-02-01', value: 465.00 },
  { date: '2008-03-01', value: 415.00 },
  { date: '2007-04-01', value: 380.00 },
  { date: '2006-04-01', value: 350.00 },
  { date: '2005-05-01', value: 300.00 },
  { date: '2004-05-01', value: 260.00 },
  { date: '2003-06-01', value: 240.00 },
  { date: '2002-06-01', value: 200.00 },
  { date: '2001-06-01', value: 180.00 },
  { date: '2000-06-01', value: 151.00 },
];

const getSalarioMinimo = (date: Date): number => {
  for (const record of HISTORICO_SALARIO_MINIMO) {
    if (date >= new Date(record.date)) {
      return record.value;
    }
  }
  return 151.00;
};

// Tabela INSS Simplificada
const calcularINSS = (baseCalculo: number) => {
  if (baseCalculo <= 0) return 0;
  
  const base = Math.min(baseCalculo, 8157.41); 
  let desconto = 0;

  const faixa1 = 1518.00; // 7.5%
  const faixa2 = 2793.88; // 9%
  const faixa3 = 4190.83; // 12%
  
  if (base <= faixa1) {
    desconto = base * 0.075;
  } else if (base <= faixa2) {
    desconto = (faixa1 * 0.075) + ((base - faixa1) * 0.09);
  } else if (base <= faixa3) {
    desconto = (faixa1 * 0.075) + ((faixa2 - faixa1) * 0.09) + ((base - faixa2) * 0.12);
  } else {
    desconto = (faixa1 * 0.075) + ((faixa2 - faixa1) * 0.09) + ((faixa3 - faixa2) * 0.12) + ((base - faixa3) * 0.14);
  }

  return Math.round(desconto * 100) / 100;
};

// --- COMPONENTES DA INTERFACE ---

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  icon?: string;
  delay?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

const Card = ({ children, className = "", title = "", icon = "", delay = "", action, onClick }: CardProps) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 overflow-hidden ${className} ${delay ? 'animate-slide-up ' + delay : ''} ${onClick ? 'cursor-pointer ring-2 ring-transparent hover:ring-indigo-200' : ''}`}
  >
    {(title || icon) && (
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
            {icon && (
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <span className="material-icons-round text-xl block">{icon}</span>
            </div>
            )}
            <h3 className="font-semibold text-slate-700">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

interface ResultRowProps {
  label: string;
  value: number;
  subtext?: string;
  isNegative?: boolean;
  isTotal?: boolean;
}

const ResultRow = ({ label, value, subtext = "", isNegative = false, isTotal = false }: ResultRowProps) => (
  <div className={`group flex justify-between items-start py-3 px-2 rounded-lg transition-colors hover:bg-slate-50 ${isTotal ? 'border-t-2 border-dashed border-slate-200 mt-2 pt-4' : 'border-b border-slate-50 last:border-0'}`}>
    <div>
      <div className={`text-sm ${isTotal ? 'font-bold text-slate-800 text-lg' : 'font-medium text-slate-600 group-hover:text-slate-800'}`}>{label}</div>
      {subtext && <div className="text-xs text-slate-400 mt-0.5">{subtext}</div>}
    </div>
    <div className={`font-mono ${isTotal ? 'text-xl font-bold' : 'font-medium'} ${isNegative ? 'text-red-500' : isTotal ? 'text-indigo-600' : 'text-slate-700'}`}>
      {isNegative ? '-' : ''} {formatCurrency(value)}
    </div>
  </div>
);

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  icon?: string;
  currency?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
}

const FormInput = ({ label, icon, currency, className = "", ...props }: FormInputProps) => (
  <div className="group">
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 transition-colors group-focus-within:text-indigo-600">
      {label}
    </label>
    <div className="relative transition-transform duration-200 focus-within:scale-[1.01]">
      {(icon || currency) && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-icons-round text-lg">
          {currency ? <span className="font-sans font-bold text-sm">R$</span> : icon}
        </span>
      )}
      
      {props.type === 'select' ? (
        <select 
          {...(props as any)}
          className={`w-full ${icon || currency ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium appearance-none cursor-pointer ${className}`}
        >
          {props.children}
        </select>
      ) : (
        <input 
          {...(props as any)}
          className={`w-full ${icon || currency ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-700 font-medium placeholder-slate-400 ${className}`}
        />
      )}
      
      {props.type === 'select' && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none material-icons-round">expand_more</span>
      )}
    </div>
  </div>
);

interface ResultadoCalculo {
  diasTrabalhadosMes: number;
  diasAviso: number;
  dataProjecao: string;
  valSaldoSalario: number;
  valAviso: number;
  avos13: number;
  val13Proporcional: number;
  val13Indenizado: number;
  avosFerias: number;
  valFeriasVencidas: number;
  valTercoFeriasVencidas: number;
  valFeriasProporcionais: number;
  valTercoFeriasProp: number;
  valFeriasIndenizadas: number;
  valTercoFeriasIndenizadas: number;
  baseINSS: number;
  valINSS: number;
  fgts: {
    saldoEstimado: number;
    multa: number;
    total: number;
  };
  liquido: number;
}

const App = () => {
  const [formData, setFormData] = useState({
    salarioBase: 2500,
    adicionalInsalubridade: 0,
    dataAdmissao: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().split('T')[0],
    dataDemissao: new Date().toISOString().split('T')[0],
    tipoAviso: 'trabalhado',
    feriasVencidas: 0,
  });

  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  
  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editValues, setEditValues] = useState<ResultadoCalculo | null>(null);

  const [isFgtsModalOpen, setIsFgtsModalOpen] = useState(false);
  const [fgtsSalaries, setFgtsSalaries] = useState<Record<string, number>>({});
  const [fgtsMonths, setFgtsMonths] = useState<string[]>([]);
  const [fgtsManualBalance, setFgtsManualBalance] = useState<string>(''); // Novo estado para saldo manual

  const resultsRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('data') || name === 'tipoAviso' ? value : Number(value)
    }));
  };

  const handleCalculateClick = () => {
    calcularRescisao();
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const calcularRescisao = () => {
    const { salarioBase, adicionalInsalubridade, dataAdmissao, dataDemissao, tipoAviso, feriasVencidas } = formData;
    
    if (!dataAdmissao || !dataDemissao) return;

    const dtAdmissao = parseDate(dataAdmissao);
    const dtDemissao = parseDate(dataDemissao);
    
    if (dtDemissao < dtAdmissao) {
      alert("A data de demissão não pode ser anterior à admissão.");
      setResultado(null);
      return;
    }

    const salarioTotal = salarioBase + adicionalInsalubridade;

    // 1. Saldo de Salário
    const diasTrabalhadosMes = dtDemissao.getDate(); 
    const valSaldoSalario = (salarioTotal / 30) * Math.min(diasTrabalhadosMes, 30);

    // 2. Aviso Prévio
    const diffAnos = diffDays(dtDemissao, dtAdmissao) / 365.25;
    const anosTrabalhados = Math.floor(diffAnos);
    const diasAvisoLei = Math.min(30 + (anosTrabalhados * 3), 90);
    
    let valAviso = 0;
    let projecaoData = new Date(dtDemissao);
    
    if (tipoAviso === 'indenizado') {
      valAviso = (salarioTotal / 30) * diasAvisoLei;
      projecaoData.setDate(projecaoData.getDate() + diasAvisoLei);
    } else {
        const diasIndenizadosNoTrabalhado = Math.max(0, diasAvisoLei - 30);
        if (diasIndenizadosNoTrabalhado > 0) {
            valAviso = (salarioTotal / 30) * diasIndenizadosNoTrabalhado;
        }
        projecaoData.setDate(projecaoData.getDate() + diasIndenizadosNoTrabalhado);
    }

    // 3. 13º Salário - Lógica Rigorosa de 15 Dias
    const calcularAvos13 = (inicio: Date, fim: Date) => {
        let avos = 0;
        // Ajusta o início para o primeiro dia do ano da admissão ou data de admissão
        let dataIteracao = new Date(inicio.getFullYear(), 0, 1);
        if (dataIteracao < inicio) dataIteracao = new Date(inicio);

        // Percorre mês a mês até a data fim
        while (dataIteracao <= fim) {
            // Verifica se está no mesmo ano
            if (dataIteracao.getFullYear() === fim.getFullYear() || dataIteracao.getFullYear() === inicio.getFullYear()) {
                const anoAtual = dataIteracao.getFullYear();
                const mesAtual = dataIteracao.getMonth();

                // Define o último dia a ser considerado neste mês
                let ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
                let diaInicioContagem = 1;
                let diaFimContagem = ultimoDiaDoMes;

                // Se for o mês de início (admissão), começa do dia da admissão
                if (anoAtual === inicio.getFullYear() && mesAtual === inicio.getMonth()) {
                    diaInicioContagem = inicio.getDate();
                }

                // Se for o mês final (demissão/projeção), termina no dia da demissão
                if (anoAtual === fim.getFullYear() && mesAtual === fim.getMonth()) {
                    diaFimContagem = fim.getDate();
                }

                // Calcula dias trabalhados no mês
                const diasTrabalhados = diaFimContagem - diaInicioContagem + 1;

                // Só conta o avo se trabalhou 15 dias ou mais
                if (diasTrabalhados >= 15) {
                    avos++;
                }
            }
            // Avança para o dia 1 do próximo mês
            dataIteracao = new Date(dataIteracao.getFullYear(), dataIteracao.getMonth() + 1, 1);
        }
        return Math.min(avos, 12);
    };

    // Para 13º, usamos sempre 1º de Janeiro do ano da demissão como base, a não ser que admissão seja neste ano
    const inicioAnoDemissao = new Date(dtDemissao.getFullYear(), 0, 1);
    const dataInicio13 = dtAdmissao > inicioAnoDemissao ? dtAdmissao : inicioAnoDemissao;

    let avos13 = calcularAvos13(dataInicio13, dtDemissao);
    let avos13Indenizado = 0;
    
    if (tipoAviso === 'indenizado') {
        const totalAvosComProjecao = calcularAvos13(dataInicio13, projecaoData);
        avos13Indenizado = Math.max(0, totalAvosComProjecao - avos13);
    }
    
    const val13Proporcional = (salarioTotal / 12) * avos13;
    const val13Indenizado = (salarioTotal / 12) * avos13Indenizado;

    // 4. Férias - Lógica de Período Aquisitivo + 15 Dias
    const valFeriasVencidas = feriasVencidas * salarioTotal;
    const valTercoFeriasVencidas = valFeriasVencidas / 3;

    // Encontrar início do período aquisitivo atual
    let inicioPeriodoAquisitivo = new Date(dtAdmissao);
    while (new Date(inicioPeriodoAquisitivo.getFullYear() + 1, inicioPeriodoAquisitivo.getMonth(), inicioPeriodoAquisitivo.getDate()) <= dtDemissao) {
      inicioPeriodoAquisitivo.setFullYear(inicioPeriodoAquisitivo.getFullYear() + 1);
    }

    // Calcular avos proporcionais baseados no período aquisitivo
    let avosFerias = 0;
    let dataIteracaoFerias = new Date(inicioPeriodoAquisitivo);
    
    // Itera mês a mês do período aquisitivo até a demissão
    while (dataIteracaoFerias < dtDemissao) {
        // Define o fim deste mês de "aniversário"
        let fimMesAniversario = new Date(dataIteracaoFerias);
        fimMesAniversario.setMonth(fimMesAniversario.getMonth() + 1);
        
        // Se o mês completo termina depois da demissão, é o mês incompleto
        if (fimMesAniversario > dtDemissao) {
            // Verifica dias trabalhados nesse fragmento
            const diasNoFragmento = diffDays(dtDemissao, dataIteracaoFerias) + 1; // +1 inclusive
            if (diasNoFragmento >= 15) {
                avosFerias++;
            }
        } else {
            // Mês completo trabalhado
            avosFerias++;
        }
        
        dataIteracaoFerias.setMonth(dataIteracaoFerias.getMonth() + 1);
    }
    avosFerias = Math.min(avosFerias, 12);

    let avosFeriasIndenizadas = 0;
    if (tipoAviso === 'indenizado') {
        // Projeção do aviso nas férias
        const fimComAviso = new Date(dtDemissao);
        fimComAviso.setDate(fimComAviso.getDate() + diasAvisoLei);
        
        // Recalcula avos totais com a projeção
        let avosTotais = 0;
        let dataIteracaoProj = new Date(inicioPeriodoAquisitivo);
        while (dataIteracaoProj < fimComAviso) {
            let fimMesAniversario = new Date(dataIteracaoProj);
            fimMesAniversario.setMonth(fimMesAniversario.getMonth() + 1);
            if (fimMesAniversario > fimComAviso) {
                const diasNoFragmento = diffDays(fimComAviso, dataIteracaoProj); // Ajuste fino sem +1 as vezes para projeção segura
                 // Para projeção, a regra de 15 dias se aplica ao saldo de dias gerado pelo aviso
                 // Simplificação segura: (diasAviso / 30)
                 // Vamos usar a lógica padrão:
                 if ((diasAvisoLei % 30) + (dtDemissao.getDate() - inicioPeriodoAquisitivo.getDate()) >= 15) {
                     // Lógica complexa de datas quebradas. 
                     // Simplificando pela lei: a cada 30 dias de aviso = 1 avo. 
                     // Se sobrar > 14 dias = 1 avo.
                 }
            } else {
                avosTotais++;
            }
            dataIteracaoProj.setMonth(dataIteracaoProj.getMonth() + 1);
        }
        
        // Simplificação robusta para Férias sobre Aviso Indenizado:
        // A projeção conta como tempo de serviço. Calculamos a diferença de avos.
        // A implementação anterior estava correta para a maioria dos casos, vamos manter a lógica de dias do aviso
        avosFeriasIndenizadas = Math.floor(diasAvisoLei / 30);
        if ((diasAvisoLei % 30) >= 15) avosFeriasIndenizadas++;
    }

    const valFeriasProporcionais = (salarioTotal / 12) * avosFerias;
    const valTercoFeriasProp = valFeriasProporcionais / 3;
    
    const valFeriasIndenizadas = (salarioTotal / 12) * avosFeriasIndenizadas;
    const valTercoFeriasIndenizadas = valFeriasIndenizadas / 3;

    // 5. FGTS
    const baseFGTSRescisao = valSaldoSalario + val13Proporcional + valAviso + val13Indenizado;
    const valFGTSMes = baseFGTSRescisao * 0.08;
    
    const mesesTotaisCasa = (dtDemissao.getFullYear() - dtAdmissao.getFullYear()) * 12 + (dtDemissao.getMonth() - dtAdmissao.getMonth());
    // Estimativa inicial se não houver manual
    const valFGTSEstimadoAcumulado = (salarioTotal * 0.08) * mesesTotaisCasa;
    const multaFGTS = (valFGTSEstimadoAcumulado + valFGTSMes) * 0.40;

    // 6. INSS
    const baseINSS = valSaldoSalario + val13Proporcional;
    const valINSS = calcularINSS(baseINSS);

    const totalProventos = valSaldoSalario + valAviso + val13Proporcional + val13Indenizado + valFeriasVencidas + valTercoFeriasVencidas + valFeriasProporcionais + valTercoFeriasProp + valFeriasIndenizadas + valTercoFeriasIndenizadas;
    const totalDescontos = valINSS;
    const liquidoRescisao = totalProventos - totalDescontos;

    setResultado({
      diasTrabalhadosMes,
      diasAviso: diasAvisoLei,
      dataProjecao: projecaoData.toLocaleDateString('pt-BR'),
      valSaldoSalario,
      valAviso,
      avos13,
      val13Proporcional,
      val13Indenizado,
      avosFerias,
      valFeriasVencidas,
      valTercoFeriasVencidas,
      valFeriasProporcionais,
      valTercoFeriasProp,
      valFeriasIndenizadas,
      valTercoFeriasIndenizadas,
      baseINSS,
      valINSS,
      fgts: {
        saldoEstimado: valFGTSEstimadoAcumulado + valFGTSMes,
        multa: multaFGTS,
        total: (valFGTSEstimadoAcumulado + valFGTSMes) + multaFGTS
      },
      liquido: liquidoRescisao
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // --- MODAL DE EDIÇÃO GERAL ---
  const openEditModal = () => {
    if (resultado) {
      setEditValues(JSON.parse(JSON.stringify(resultado))); // Deep copy
      setIsEditModalOpen(true);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, section?: string) => {
    if (!editValues) return;
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;

    if (section === 'fgts') {
        const newFgts = { ...editValues.fgts, [name]: numValue };
        
        // Se mudar o saldo estimado, recalcula a multa automaticamente
        if (name === 'saldoEstimado') {
            newFgts.multa = numValue * 0.4;
        }
        newFgts.total = newFgts.saldoEstimado + newFgts.multa;
        setEditValues({ ...editValues, fgts: newFgts });
    } else {
        setEditValues({ ...editValues, [name]: numValue });
    }
  };

  const saveEdits = () => {
    if (!editValues) return;

    const totalProventos = 
        editValues.valSaldoSalario + 
        editValues.valAviso + 
        editValues.val13Proporcional + 
        editValues.val13Indenizado + 
        editValues.valFeriasVencidas + 
        editValues.valTercoFeriasVencidas + 
        editValues.valFeriasProporcionais + 
        editValues.valTercoFeriasProp + 
        editValues.valFeriasIndenizadas + 
        editValues.valTercoFeriasIndenizadas;

    const totalDescontos = editValues.valINSS;
    const liquidoRescisao = totalProventos - totalDescontos;

    setResultado({
        ...editValues,
        liquido: liquidoRescisao
    });
    setIsEditModalOpen(false);
  };

  // --- MODAL DE CÁLCULO DETALHADO DE FGTS ---

  const handleFgtsCardClick = () => {
      if (!resultado) return;
      openFgtsModal();
  };

  const openFgtsModal = () => {
      const start = parseDate(formData.dataAdmissao);
      const end = parseDate(formData.dataDemissao);
      end.setDate(1); 
      end.setMonth(end.getMonth() - 1); 

      const monthsList: string[] = [];
      const current = new Date(start);
      current.setDate(1); 

      while (current.getTime() <= end.getTime()) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          monthsList.push(`${year}-${month}`);
          current.setMonth(current.getMonth() + 1);
      }

      if (monthsList.length !== fgtsMonths.length) {
          const newSalaries: Record<string, number> = {};
          monthsList.forEach(m => {
              newSalaries[m] = fgtsSalaries[m] || 0;
          });
          setFgtsSalaries(newSalaries);
      }
      
      setFgtsMonths(monthsList);
      setFgtsManualBalance(''); // Reseta o campo manual ao abrir
      setIsFgtsModalOpen(true);
  };

  const handleFgtsSalaryChange = (monthKey: string, value: string) => {
      setFgtsSalaries(prev => ({
          ...prev,
          [monthKey]: parseFloat(value) || 0
      }));
  };

  const fillWithMinimumWage = () => {
      const newSalaries: Record<string, number> = {};
      fgtsMonths.forEach(monthKey => {
          const [year, month] = monthKey.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          newSalaries[monthKey] = getSalarioMinimo(date);
      });
      setFgtsSalaries(newSalaries);
  };

  const saveFgtsDetail = () => {
      if (!resultado) return;

      // Cálculo base para o FGTS das verbas rescisórias (mês atual + 13º + aviso)
      const baseFGTSRescisao = resultado.valSaldoSalario + resultado.val13Proporcional + resultado.valAviso + resultado.val13Indenizado;
      const valFGTSVerbasRescisorias = baseFGTSRescisao * 0.08;

      let novoSaldoBaseParaMulta = 0;

      // Se o usuário preencheu o saldo manual, usamos ele
      const saldoManual = parseFloat(fgtsManualBalance);
      
      if (!isNaN(saldoManual) && saldoManual > 0) {
          // Saldo Manual + FGTS da Rescisão atual
          novoSaldoBaseParaMulta = saldoManual + valFGTSVerbasRescisorias;
      } else {
          // Calcula baseado no histórico preenchido
          let totalDepositoHistorico = 0;
          Object.values(fgtsSalaries).forEach(salario => {
              totalDepositoHistorico += salario * 0.08;
          });
          novoSaldoBaseParaMulta = totalDepositoHistorico + valFGTSVerbasRescisorias;
      }

      const novaMulta = novoSaldoBaseParaMulta * 0.40;

      setResultado({
          ...resultado,
          fgts: {
              saldoEstimado: novoSaldoBaseParaMulta,
              multa: novaMulta,
              total: novoSaldoBaseParaMulta + novaMulta
          }
      });
      setIsFgtsModalOpen(false);
  };


  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto w-full font-sans text-slate-600">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
            <span className="material-icons-round text-white text-3xl">calculate</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cálculo de Rescisão</h1>
            <p className="text-slate-500 font-medium">Simulador trabalhista completo</p>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm font-semibold active:scale-95"
        >
          <span className="material-icons-round text-xl group-hover:scale-110 transition-transform">print</span>
          <span className="hidden sm:inline">Imprimir Relatório</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA - FORMULÁRIO */}
        <div className="lg:col-span-4 space-y-6 no-print animate-slide-up">
          <Card title="Dados do Contrato" icon="description">
            <div className="space-y-5">
              <FormInput 
                label="Salário Base" 
                currency
                type="number"
                name="salarioBase"
                value={formData.salarioBase}
                onChange={handleChange}
              />

              <FormInput 
                label="Adicional Insalubridade" 
                currency
                type="number"
                name="adicionalInsalubridade"
                value={formData.adicionalInsalubridade}
                onChange={handleChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput 
                  label="Admissão" 
                  type="date"
                  name="dataAdmissao"
                  value={formData.dataAdmissao}
                  onChange={handleChange}
                />
                <FormInput 
                  label="Demissão" 
                  type="date"
                  name="dataDemissao"
                  value={formData.dataDemissao}
                  onChange={handleChange}
                />
              </div>

              <FormInput 
                label="Tipo de Aviso Prévio" 
                type="select"
                name="tipoAviso"
                value={formData.tipoAviso}
                onChange={handleChange}
              >
                <option value="trabalhado">Trabalhado</option>
                <option value="indenizado">Indenizado</option>
              </FormInput>

              <FormInput 
                label="Férias Vencidas (anos)" 
                type="number"
                min="0"
                max="5"
                name="feriasVencidas"
                value={formData.feriasVencidas}
                onChange={handleChange}
              />

                <button 
                    onClick={handleCalculateClick}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform transition hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                >
                    <span className="material-icons-round">calculate</span>
                    CALCULAR RESCISÃO
                </button>
            </div>
          </Card>

          <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-2xl p-5 flex gap-3 text-sm text-blue-800 shadow-sm animate-fade-in delay-200">
            <span className="material-icons-round text-blue-500 text-xl">info</span>
            <p className="leading-relaxed">Os cálculos são estimativas. Clique no cartão de <strong>FGTS</strong> para informar o saldo real ou calcular mês a mês.</p>
          </div>
        </div>

        {/* COLUNA DIREITA - RESULTADOS */}
        <div className="lg:col-span-8 space-y-6" ref={resultsRef}>
          {!resultado ? (
            <div className="h-full bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 flex-col gap-4 min-h-[400px] animate-pulse">
               <div className="p-6 bg-slate-50 rounded-full">
                  <span className="material-icons-round text-6xl opacity-20 text-slate-500">pending_actions</span>
               </div>
               <p className="font-medium text-center max-w-xs">Preencha o formulário e clique em "Calcular Rescisão" para ver os resultados</p>
            </div>
          ) : (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. Rescisão Líquida (Antigo Destaque, agora simples) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-fade-in">
                  <div className="text-slate-500 text-sm font-bold mb-2 uppercase tracking-wide">Rescisão Líquida</div>
                  <div className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mb-1">{formatCurrency(resultado.liquido)}</div>
                  <div className="text-xs text-slate-400 font-medium">Verbas Rescisórias - Descontos</div>
                </div>
                
                {/* 2. FGTS */}
                <div 
                    onClick={handleFgtsCardClick}
                    className="cursor-pointer group bg-white border border-orange-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 hover:border-orange-200 animate-fade-in delay-100 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <div className="absolute right-4 top-4 text-orange-200 group-hover:text-orange-300 transition-colors">
                      <span className="material-icons-round">edit</span>
                  </div>
                  <div className="text-orange-600 text-sm font-bold mb-2 flex items-center gap-2 uppercase tracking-wide relative z-10">
                    <div className="p-1 bg-orange-100 rounded-md"><span className="material-icons-round text-sm block">savings</span></div>
                    FGTS + Multa 40%
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-slate-800 relative z-10">{formatCurrency(resultado.fgts.total)}</div>
                  <div className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                      <span>Clique para ajustar</span>
                  </div>
                </div>

                {/* 3. Total Geral (Antigo Custo, agora com destaque) */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 transform transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-in delay-200">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <span className="material-icons-round text-8xl">account_balance_wallet</span>
                  </div>
                  <div className="relative z-10">
                    <div className="text-indigo-100 text-sm font-semibold mb-2 uppercase tracking-wide opacity-80">Total Geral</div>
                    <div className="text-3xl lg:text-4xl font-bold tracking-tight mb-1">{formatCurrency(resultado.liquido + resultado.fgts.total)}</div>
                    <div className="text-xs text-indigo-200 font-medium">Rescisão Líquida + Total FGTS</div>
                  </div>
                </div>
              </div>

              {/* Detalhamento */}
              <Card 
                title="Detalhamento das Verbas" 
                icon="receipt_long" 
                delay="delay-300"
                action={
                    <button 
                        onClick={openEditModal}
                        className="no-print flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                        <span className="material-icons-round text-sm">edit</span>
                        Ajustar Valores
                    </button>
                }
              >
                <div className="space-y-8">
                  {/* Grupo Saldo e Aviso */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Salário e Aviso Prévio
                    </h4>
                    <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                        <ResultRow 
                          label="Saldo de Salário" 
                          subtext={`${resultado.diasTrabalhadosMes} dias trabalhados no mês`}
                          value={resultado.valSaldoSalario} 
                        />
                        <ResultRow 
                          label="Aviso Prévio" 
                          subtext={`${resultado.diasAviso} dias (${formData.tipoAviso}) - Projeção até ${resultado.dataProjecao}`}
                          value={resultado.valAviso} 
                        />
                    </div>
                  </div>

                  {/* Grupo 13º */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        13º Salário
                    </h4>
                    <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                      <ResultRow 
                        label="13º Salário Proporcional" 
                        subtext={`${resultado.avos13}/12 avos`}
                        value={resultado.val13Proporcional} 
                      />
                      {resultado.val13Indenizado > 0 && (
                        <ResultRow 
                          label="13º Salário Indenizado" 
                          subtext="Sobre Aviso Prévio"
                          value={resultado.val13Indenizado} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Grupo Férias */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Férias
                    </h4>
                    <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                      {resultado.valFeriasVencidas > 0 && (
                        <>
                          <ResultRow 
                            label="Férias Vencidas" 
                            subtext={`${formData.feriasVencidas} período(s)`}
                            value={resultado.valFeriasVencidas} 
                          />
                          <ResultRow 
                            label="1/3 s/ Férias Vencidas" 
                            value={resultado.valTercoFeriasVencidas} 
                          />
                        </>
                      )}
                      
                      <ResultRow 
                        label="Férias Proporcionais" 
                        subtext={`${resultado.avosFerias}/12 avos`}
                        value={resultado.valFeriasProporcionais} 
                      />
                      <ResultRow 
                        label="1/3 s/ Férias Proporcionais" 
                        value={resultado.valTercoFeriasProp} 
                      />

                      {(resultado.valFeriasIndenizadas > 0) && (
                        <>
                          <ResultRow 
                            label="Férias Indenizadas" 
                            subtext="Sobre Aviso Prévio"
                            value={resultado.valFeriasIndenizadas} 
                          />
                          <ResultRow 
                            label="1/3 s/ Férias Indenizadas" 
                            value={resultado.valTercoFeriasIndenizadas} 
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Grupo Descontos */}
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Descontos
                    </h4>
                    <div className="bg-red-50/30 border border-red-100 rounded-xl p-2">
                      <ResultRow 
                        label="INSS" 
                        subtext={`Base de cálculo: ${formatCurrency(resultado.baseINSS)}`}
                        value={resultado.valINSS} 
                        isNegative
                      />
                    </div>
                  </div>

                   <div className="print-only mt-12 pt-8 border-t-2 border-slate-300">
                      <div className="flex justify-between items-end gap-10">
                          <div className="text-center flex-1 border-t border-slate-800 pt-2 font-medium">
                              Assinatura do Funcionário
                          </div>
                          <div className="text-center flex-1 border-t border-slate-800 pt-2 font-medium">
                              Assinatura do Empregador
                          </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-6 text-center">Documento gerado automaticamente em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE PROVENTOS E TOTAIS */}
      {isEditModalOpen && editValues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-icons-round text-indigo-600">edit_note</span>
                        Ajustar Valores Manualmente
                    </h2>
                    <button 
                        onClick={() => setIsEditModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <span className="material-icons-round text-2xl">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-8">
                    {/* Seção FGTS */}
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                        <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                            <span className="material-icons-round">savings</span>
                            FGTS (Saldo Total)
                        </h3>
                        <p className="text-xs text-orange-700 mb-3">
                           Para um cálculo mais preciso, use o cartão principal na tela inicial.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput 
                                label="Saldo FGTS (Base para Multa)" 
                                currency
                                type="number" 
                                name="saldoEstimado"
                                value={editValues.fgts.saldoEstimado}
                                onChange={(e) => handleEditChange(e, 'fgts')}
                            />
                            <FormInput 
                                label="Multa 40%" 
                                currency
                                type="number" 
                                name="multa"
                                value={editValues.fgts.multa}
                                onChange={(e) => handleEditChange(e, 'fgts')}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                         <h3 className="font-bold text-slate-700 border-b pb-2">Proventos</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="Saldo de Salário" currency type="number" name="valSaldoSalario" value={editValues.valSaldoSalario} onChange={handleEditChange} />
                            <FormInput label="Aviso Prévio" currency type="number" name="valAviso" value={editValues.valAviso} onChange={handleEditChange} />
                            <FormInput label="13º Proporcional" currency type="number" name="val13Proporcional" value={editValues.val13Proporcional} onChange={handleEditChange} />
                            <FormInput label="13º Indenizado" currency type="number" name="val13Indenizado" value={editValues.val13Indenizado} onChange={handleEditChange} />
                            <FormInput label="Férias Vencidas" currency type="number" name="valFeriasVencidas" value={editValues.valFeriasVencidas} onChange={handleEditChange} />
                            <FormInput label="1/3 Férias Vencidas" currency type="number" name="valTercoFeriasVencidas" value={editValues.valTercoFeriasVencidas} onChange={handleEditChange} />
                            <FormInput label="Férias Proporcionais" currency type="number" name="valFeriasProporcionais" value={editValues.valFeriasProporcionais} onChange={handleEditChange} />
                            <FormInput label="1/3 Férias Prop." currency type="number" name="valTercoFeriasProp" value={editValues.valTercoFeriasProp} onChange={handleEditChange} />
                         </div>
                    </div>
                    
                    <div className="space-y-4">
                         <h3 className="font-bold text-red-700 border-b border-red-100 pb-2">Descontos</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="INSS" currency type="number" name="valINSS" value={editValues.valINSS} onChange={handleEditChange} />
                         </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 flex justify-end gap-3 z-10">
                    <button 
                        onClick={() => setIsEditModalOpen(false)}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={saveEdits}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DETALHADO DE FGTS */}
      {isFgtsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-slide-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              <span className="material-icons-round text-orange-500">history_edu</span>
                              Configuração do FGTS
                          </h2>
                          <p className="text-sm text-slate-500 mt-1">Informe o saldo manualmente OU calcule mês a mês.</p>
                      </div>
                      <button onClick={() => setIsFgtsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-icons-round">close</span></button>
                  </div>

                  <div className="overflow-y-auto flex-1 p-6 space-y-6">
                      {/* OPÇÃO 1: SALDO MANUAL */}
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                          <h3 className="font-bold text-orange-800 mb-2 text-sm uppercase tracking-wide">Opção 1: Saldo Consolidado</h3>
                          <p className="text-xs text-orange-600 mb-3">Se você já sabe o saldo para fins rescisórios do extrato, informe aqui. O sistema ignorará a tabela abaixo.</p>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none material-icons-round text-lg">account_balance_wallet</span>
                              <input 
                                  type="number" 
                                  placeholder="Informe o saldo total para fins rescisórios"
                                  value={fgtsManualBalance}
                                  onChange={(e) => setFgtsManualBalance(e.target.value)}
                                  className="w-full pl-10 pr-4 py-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none text-orange-800 font-bold placeholder-orange-300"
                              />
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <div className="h-px bg-slate-200 flex-1"></div>
                          <span className="text-xs font-bold text-slate-400 uppercase">OU Calcule por Histórico</span>
                          <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      {/* OPÇÃO 2: TABELA DE MESES */}
                      <div className="space-y-4">
                          <button 
                              onClick={fillWithMinimumWage}
                              disabled={!!fgtsManualBalance}
                              className={`w-full py-3 px-4 font-semibold rounded-xl border transition-colors flex items-center justify-center gap-2 ${!!fgtsManualBalance ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}
                          >
                              <span className="material-icons-round">auto_fix_high</span>
                              Preencher com Salário Mínimo da Época
                          </button>

                          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!!fgtsManualBalance ? 'opacity-40 pointer-events-none' : ''}`}>
                              {fgtsMonths.length === 0 ? (
                                  <div className="col-span-2 text-center text-slate-400 py-6 text-sm">
                                      Nenhum mês encontrado no período informado.
                                  </div>
                              ) : (
                                  fgtsMonths.map((monthKey) => {
                                      const [year, month] = monthKey.split('-');
                                      return (
                                          <div key={monthKey} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                                  {month}/{year}
                                              </label>
                                              <div className="relative">
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                                                  <input
                                                      type="number"
                                                      value={fgtsSalaries[monthKey] || ''}
                                                      onChange={(e) => handleFgtsSalaryChange(monthKey, e.target.value)}
                                                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                                                      placeholder="0,00"
                                                  />
                                              </div>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                      <button 
                          onClick={() => setIsFgtsModalOpen(false)}
                          className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={saveFgtsDetail}
                          className="px-5 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 flex items-center gap-2"
                      >
                          <span className="material-icons-round text-sm">save</span>
                          Salvar e Recalcular
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);