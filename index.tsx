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
  const [fgtsManualBalance, setFgtsManualBalance] = useState<string>('');
  
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [includeSignatures, setIncludeSignatures] = useState(true);

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

    // Função Auxiliar para contar avos considerando 15 dias no mês
    const calcularAvosMesAMes = (inicio: Date, fim: Date) => {
        let avos = 0;
        let dataIteracao = new Date(inicio.getFullYear(), 0, 1);
        if (dataIteracao < inicio) dataIteracao = new Date(inicio);

        while (dataIteracao <= fim) {
            if (dataIteracao.getFullYear() === fim.getFullYear() || dataIteracao.getFullYear() === inicio.getFullYear()) {
                const anoAtual = dataIteracao.getFullYear();
                const mesAtual = dataIteracao.getMonth();

                let ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
                let diaInicioContagem = 1;
                let diaFimContagem = ultimoDiaDoMes;

                if (anoAtual === inicio.getFullYear() && mesAtual === inicio.getMonth()) {
                    diaInicioContagem = inicio.getDate();
                }

                if (anoAtual === fim.getFullYear() && mesAtual === fim.getMonth()) {
                    diaFimContagem = fim.getDate();
                }

                const diasTrabalhados = diaFimContagem - diaInicioContagem + 1;

                if (diasTrabalhados >= 15) {
                    avos++;
                }
            }
            dataIteracao = new Date(dataIteracao.getFullYear(), dataIteracao.getMonth() + 1, 1);
        }
        return Math.min(avos, 12);
    };

    // 3. 13º Salário
    const inicioAnoDemissao = new Date(dtDemissao.getFullYear(), 0, 1);
    const dataInicio13 = dtAdmissao > inicioAnoDemissao ? dtAdmissao : inicioAnoDemissao;

    let avos13 = calcularAvosMesAMes(dataInicio13, dtDemissao);
    let avos13Indenizado = 0;
    
    if (tipoAviso === 'indenizado') {
        const totalAvosComProjecao = calcularAvosMesAMes(dataInicio13, projecaoData);
        avos13Indenizado = Math.max(0, totalAvosComProjecao - avos13);
    }
    
    const val13Proporcional = (salarioTotal / 12) * avos13;
    const val13Indenizado = (salarioTotal / 12) * avos13Indenizado;

    // 4. Férias - Função Auxiliar para contar avos de férias
    const calcularAvosFeriasPeriodo = (fim: Date, inicioPeriodo: Date) => {
        let avos = 0;
        let dataIteracao = new Date(inicioPeriodo);
        
        while (dataIteracao < fim) {
            let fimMesAniversario = new Date(dataIteracao);
            fimMesAniversario.setMonth(fimMesAniversario.getMonth() + 1);
            
            // Verifica o mês incompleto ou fragmentado
            if (fimMesAniversario > fim) {
                const diasNoFragmento = diffDays(fim, dataIteracao) + 1;
                // A regra padrão para fração de férias é > 14 dias
                if (diasNoFragmento >= 15) {
                    avos++;
                }
            } else {
                avos++;
            }
            
            dataIteracao.setMonth(dataIteracao.getMonth() + 1);
        }
        return Math.min(avos, 12);
    };

    const valFeriasVencidas = feriasVencidas * salarioTotal;
    const valTercoFeriasVencidas = valFeriasVencidas / 3;

    // Encontrar início do período aquisitivo atual
    let inicioPeriodoAquisitivo = new Date(dtAdmissao);
    while (new Date(inicioPeriodoAquisitivo.getFullYear() + 1, inicioPeriodoAquisitivo.getMonth(), inicioPeriodoAquisitivo.getDate()) <= dtDemissao) {
      inicioPeriodoAquisitivo.setFullYear(inicioPeriodoAquisitivo.getFullYear() + 1);
    }

    let avosFerias = calcularAvosFeriasPeriodo(dtDemissao, inicioPeriodoAquisitivo);
    let avosFeriasIndenizadas = 0;

    if (tipoAviso === 'indenizado') {
        // Calcula avos totais considerando a data projetada
        const avosFeriasComProjecao = calcularAvosFeriasPeriodo(projecaoData, inicioPeriodoAquisitivo);
        avosFeriasIndenizadas = Math.max(0, avosFeriasComProjecao - avosFerias);
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

  const handleOpenPrintModal = () => {
      if (!resultado) {
          alert('Realize o cálculo antes de imprimir.');
          return;
      }
      setIsPrintModalOpen(true);
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
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in no-print">
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
          onClick={handleOpenPrintModal}
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
        </div>

        {/* COLUNA DIREITA - RESULTADOS */}
        <div className="lg:col-span-8 animate-slide-up delay-100 no-print" ref={resultsRef}>
          {!resultado ? (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 p-12 text-center min-h-[400px]">
              <span className="material-icons-round text-6xl mb-4 text-slate-300">analytics</span>
              <p className="text-lg font-medium">Preencha os dados e clique em calcular</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TOTAIS PRINCIPAIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100" delay="delay-200">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                        <div className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Rescisão Líquida</div>
                        <div className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(resultado.liquido)}</div>
                        <div className="text-sm text-slate-500">Valor a receber na conta</div>
                    </div>
                  </div>
                </Card>

                <Card 
                    className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-transparent" 
                    delay="delay-300"
                >
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <div className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-2">Total Geral a Receber</div>
                            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(resultado.liquido + resultado.fgts.total)}</div>
                            <div className="text-sm text-indigo-100">Rescisão + FGTS Total</div>
                        </div>
                    </div>
                </Card>
              </div>

               {/* CARTÕES DE DETALHES */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* COLUNA 1 - PROVENTOS */}
                    <div className="space-y-6">
                        <Card title="Proventos Principais" icon="payments" delay="delay-200">
                            <ResultRow 
                                label="Saldo de Salário" 
                                value={resultado.valSaldoSalario} 
                                subtext={`${resultado.diasTrabalhadosMes} dias trabalhados`}
                            />
                            <ResultRow 
                                label="Aviso Prévio" 
                                value={resultado.valAviso} 
                                subtext={`${resultado.diasAviso} dias (${formData.tipoAviso})`}
                            />
                        </Card>

                        <Card title="13º Salário" icon="calendar_today" delay="delay-300">
                            <ResultRow 
                                label="13º Proporcional" 
                                value={resultado.val13Proporcional} 
                                subtext={`${resultado.avos13}/12 avos`}
                            />
                            {resultado.val13Indenizado > 0 && (
                                <ResultRow 
                                    label="13º s/ Aviso Prévio Indenizado" 
                                    value={resultado.val13Indenizado}
                                />
                            )}
                        </Card>
                    </div>

                    {/* COLUNA 2 - FÉRIAS E FGTS */}
                    <div className="space-y-6">
                        <Card title="Férias" icon="beach_access" delay="delay-400">
                            {resultado.valFeriasVencidas > 0 && (
                                <>
                                    <ResultRow label="Férias Vencidas" value={resultado.valFeriasVencidas} />
                                    <ResultRow label="1/3 Férias Vencidas" value={resultado.valTercoFeriasVencidas} />
                                    <hr className="my-2 border-slate-100"/>
                                </>
                            )}
                            <ResultRow 
                                label="Férias Proporcionais" 
                                value={resultado.valFeriasProporcionais} 
                                subtext={`${resultado.avosFerias}/12 avos`}
                            />
                            <ResultRow label="1/3 Férias Proporcionais" value={resultado.valTercoFeriasProp} />
                            
                            {resultado.valFeriasIndenizadas > 0 && (
                                <>
                                    <hr className="my-2 border-slate-100"/>
                                    <ResultRow 
                                        label="Férias s/ Aviso Prévio Indenizado" 
                                        value={resultado.valFeriasIndenizadas} 
                                    />
                                    <ResultRow 
                                        label="1/3 s/ Aviso Prévio Indenizado" 
                                        value={resultado.valTercoFeriasIndenizadas} 
                                    />
                                </>
                            )}
                        </Card>

                        <Card 
                            title="FGTS + Multa 40%" 
                            icon="savings" 
                            delay="delay-500" 
                            className="bg-orange-50/50 border-orange-100"
                            onClick={handleFgtsCardClick}
                        >
                            <div className="relative group">
                                <span className="absolute right-0 top-0 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold flex items-center gap-1">
                                    <span className="material-icons-round text-sm">edit</span> Editar
                                </span>
                                <ResultRow label="Saldo Estimado FGTS" value={resultado.fgts.saldoEstimado} />
                                <ResultRow label="Multa 40%" value={resultado.fgts.multa} />
                                <ResultRow label="Total FGTS" value={resultado.fgts.total} isTotal />
                            </div>
                        </Card>
                    </div>
               </div>

                {/* DESCONTOS */}
                <Card title="Descontos" icon="remove_circle_outline" delay="delay-500" className="border-red-100 bg-red-50/30">
                    <div className="flex justify-between items-center py-2">
                        <div>
                            <div className="font-medium text-slate-700">INSS</div>
                            <div className="text-xs text-slate-400">Base: {formatCurrency(resultado.baseINSS)}</div>
                        </div>
                        <div className="font-mono font-bold text-red-500">- {formatCurrency(resultado.valINSS)}</div>
                    </div>
                </Card>
                
                 <button 
                    onClick={openEditModal}
                    className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-600 font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="material-icons-round">tune</span>
                    AJUSTAR VALORES MANUALMENTE
                </button>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE IMPRESSÃO (ESTILO RELATÓRIO) --- */}
      {isPrintModalOpen && resultado && (
        <div id="print-area-container" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
            
            {/* CONTROLES DO MODAL (NÃO IMPRIMEM) */}
            <div className="absolute top-4 right-4 flex gap-4 no-print">
               <div className="bg-white p-2 rounded-lg shadow-md flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={includeSignatures}
                      onChange={e => setIncludeSignatures(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Incluir Assinaturas</span>
                  </label>
               </div>

               <button 
                    onClick={handlePrint}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <span className="material-icons-round">print</span> Imprimir
                </button>
                <button 
                    onClick={() => setIsPrintModalOpen(false)}
                    className="bg-white text-slate-600 px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-slate-50 transition-colors"
                >
                    Fechar
                </button>
            </div>

            {/* ÁREA DE IMPRESSÃO - PAPEL A4 */}
            <div id="print-area" className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 md:p-12 shadow-2xl print:shadow-none print:w-full print:max-w-none print:p-0 mx-auto">
                
                {/* CABEÇALHO */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8 print:pb-4 print:mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight print:text-xl">Demonstrativo de Valores</h1>
                        <p className="text-slate-500 uppercase text-xs tracking-widest mt-1">Cálculo Rescisório Trabalhista</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase tracking-wider">Data do Cálculo</div>
                        <div className="text-lg font-bold text-slate-700 print:text-base">{new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>

                {/* DADOS DO CONTRATO */}
                <div className="bg-slate-50 rounded-lg p-6 mb-8 border border-slate-100 print:p-3 print:mb-4 print:bg-slate-50 print:border-slate-200">
                    <div className="grid grid-cols-4 gap-6 print:gap-2">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data de Admissão</div>
                            <div className="font-semibold text-slate-700 print:text-sm">{new Date(formData.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data de Demissão</div>
                            <div className="font-semibold text-slate-700 print:text-sm">{new Date(formData.dataDemissao + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Aviso</div>
                            <div className="font-semibold text-slate-700 uppercase print:text-sm">{formData.tipoAviso}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Projeção Aviso</div>
                            <div className="font-semibold text-slate-700 print:text-sm">{resultado.dataProjecao}</div>
                        </div>
                        <div className="mt-4 print:mt-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Maior Remuneração</div>
                            <div className="font-bold text-lg text-slate-800 print:text-base">{formatCurrency(formData.salarioBase + formData.adicionalInsalubridade)}</div>
                        </div>
                    </div>
                </div>

                {/* TABELA DE VALORES */}
                <div className="mb-8 print:mb-4">
                    <div className="grid grid-cols-12 gap-4 border-b border-slate-200 pb-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider print:mb-1 print:pb-1">
                        <div className="col-span-6">Rubrica</div>
                        <div className="col-span-2 text-center">Ref.</div>
                        <div className="col-span-2 text-right">Proventos</div>
                        <div className="col-span-2 text-right">Descontos</div>
                    </div>

                    <div className="space-y-1 print:space-y-0 text-sm print:text-xs">
                        {/* Linhas Condicionais: Só renderiza se valor > 0 */}
                        <PrintRow label="Saldo de Salário" refText={`${resultado.diasTrabalhadosMes}d`} value={resultado.valSaldoSalario} type="prov" />
                        <PrintRow label="Aviso Prévio" refText={`${resultado.diasAviso}d`} value={resultado.valAviso} type="prov" />
                        
                        <PrintRow label="13º Salário Proporcional" refText={`${resultado.avos13}/12`} value={resultado.val13Proporcional} type="prov" />
                        <PrintRow label="13º s/ Aviso Prévio Indenizado" refText="-" value={resultado.val13Indenizado} type="prov" />
                        
                        <PrintRow label="Férias Vencidas" refText="-" value={resultado.valFeriasVencidas} type="prov" />
                        <PrintRow label="1/3 s/ Férias Vencidas" refText="-" value={resultado.valTercoFeriasVencidas} type="prov" />
                        
                        <PrintRow label="Férias Proporcionais" refText={`${resultado.avosFerias}/12`} value={resultado.valFeriasProporcionais} type="prov" />
                        <PrintRow label="1/3 s/ Férias Proporcionais" refText="-" value={resultado.valTercoFeriasProp} type="prov" />
                        
                        <PrintRow label="Férias s/ Aviso Prévio Indenizado" refText="-" value={resultado.valFeriasIndenizadas} type="prov" />
                        <PrintRow label="1/3 s/ Aviso Prévio Indenizado" refText="-" value={resultado.valTercoFeriasIndenizadas} type="prov" />

                        {/* Descontos */}
                        <PrintRow label="INSS" refText="Desc." value={resultado.valINSS} type="desc" />

                        {/* Totais Intermediários */}
                        <div className="grid grid-cols-12 gap-4 pt-4 mt-4 border-t border-slate-200 font-bold text-slate-500 uppercase text-xs print:pt-2 print:mt-2">
                             <div className="col-span-8">Totais</div>
                             <div className="col-span-2 text-right">{formatCurrency(
                                 resultado.valSaldoSalario + resultado.valAviso + resultado.val13Proporcional + resultado.val13Indenizado + resultado.valFeriasVencidas + resultado.valTercoFeriasVencidas + resultado.valFeriasProporcionais + resultado.valTercoFeriasProp + resultado.valFeriasIndenizadas + resultado.valTercoFeriasIndenizadas
                             )}</div>
                             <div className="col-span-2 text-right text-red-500">{formatCurrency(resultado.valINSS)}</div>
                        </div>
                    </div>
                </div>

                {/* TOTALIZADORES FINAIS */}
                <div className="bg-slate-800 text-white rounded-lg p-6 print:p-4 print:bg-slate-800 print:text-white">
                    <div className="grid grid-cols-2 gap-8 border-b border-slate-700 pb-4 mb-4 print:gap-4 print:pb-2 print:mb-2">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rescisão Líquida a Receber</div>
                            <div className="text-xl font-bold print:text-lg">{formatCurrency(resultado.liquido)}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total FGTS + Multa</div>
                             <div className="text-xl font-bold text-slate-300 print:text-lg">{formatCurrency(resultado.fgts.total)}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                         <div className="text-sm font-bold uppercase tracking-widest text-slate-300">Total Geral a Receber</div>
                         <div className="text-3xl font-bold print:text-2xl">{formatCurrency(resultado.liquido + resultado.fgts.total)}</div>
                    </div>
                </div>
                
                {/* ASSINATURAS */}
                {includeSignatures && (
                    <div className="mt-16 grid grid-cols-2 gap-12 print:mt-10 print:gap-8">
                        <div className="border-t border-slate-400 pt-2 text-center">
                            <div className="text-xs font-bold uppercase text-slate-400">Assinatura do Funcionário</div>
                        </div>
                        <div className="border-t border-slate-400 pt-2 text-center">
                            <div className="text-xs font-bold uppercase text-slate-400">Assinatura do Empregador</div>
                        </div>
                    </div>
                )}

                {/* RODAPÉ DO CONTADOR */}
                <div className="mt-12 pt-6 border-t border-slate-200 flex items-center gap-4 print:mt-8 print:pt-4">
                     <div className="w-10 h-10 bg-slate-800 text-white flex items-center justify-center font-bold text-lg rounded">L</div>
                     <div>
                         <div className="font-bold text-slate-800 text-sm uppercase">Lucas Araujo dos Santos</div>
                         <div className="text-xs text-slate-500">Contador &bull; CRC-BA: 046968/O-6</div>
                     </div>
                </div>

            </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {isEditModalOpen && editValues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Ajuste Manual de Valores</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verbas Rescisórias</h4>
                    <FormInput label="Saldo de Salário" type="number" name="valSaldoSalario" value={editValues.valSaldoSalario} onChange={handleEditChange} currency />
                    <FormInput label="Aviso Prévio" type="number" name="valAviso" value={editValues.valAviso} onChange={handleEditChange} currency />
                    <FormInput label="13º Salário Prop." type="number" name="val13Proporcional" value={editValues.val13Proporcional} onChange={handleEditChange} currency />
                    <FormInput label="Férias Proporcionais" type="number" name="valFeriasProporcionais" value={editValues.valFeriasProporcionais} onChange={handleEditChange} currency />
                    <FormInput label="1/3 Férias Prop." type="number" name="valTercoFeriasProp" value={editValues.valTercoFeriasProp} onChange={handleEditChange} currency />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">FGTS</h4>
                    <FormInput label="Saldo FGTS Estimado" type="number" name="saldoEstimado" value={editValues.fgts.saldoEstimado} onChange={(e) => handleEditChange(e, 'fgts')} currency />
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Descontos</h4>
                    <FormInput label="INSS" type="number" name="valINSS" value={editValues.valINSS} onChange={handleEditChange} currency />
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button onClick={saveEdits} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FGTS DETALHADO */}
      {isFgtsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">Cálculo Detalhado do FGTS</h3>
                          <p className="text-xs text-slate-500">Informe os salários mês a mês para maior precisão</p>
                      </div>
                      <button onClick={() => setIsFgtsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <span className="material-icons-round">close</span>
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto grow bg-slate-50/50">
                      
                      {/* OPÇÃO 1: SALDO TOTAL MANUAL */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 mb-6">
                          <h4 className="font-bold text-orange-600 mb-2 flex items-center gap-2">
                              <span className="material-icons-round">account_balance_wallet</span>
                              Opção Rápida: Saldo Extrato
                          </h4>
                          <p className="text-xs text-slate-500 mb-3">Se você já tem o extrato do FGTS, informe apenas o saldo total para fins rescisórios.</p>
                          <FormInput 
                              label="Saldo para Fins Rescisórios" 
                              type="number" 
                              value={fgtsManualBalance} 
                              onChange={(e) => setFgtsManualBalance(e.target.value)} 
                              currency
                              placeholder="0,00"
                          />
                      </div>

                      {/* OPÇÃO 2: TABELA MÊS A MÊS */}
                      <div className={`transition-opacity duration-300 ${fgtsManualBalance ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-slate-700">Histórico de Remuneração</h4>
                              <button 
                                  onClick={fillWithMinimumWage}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                              >
                                  Preencher com Salário Mínimo
                              </button>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {fgtsMonths.map(month => (
                                  <div key={month} className="bg-white p-2 rounded-lg border border-slate-200">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{month.split('-').reverse().join('/')}</label>
                                      <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-sans">R$</span>
                                          <input 
                                              type="number" 
                                              className="w-full pl-6 pr-2 py-1 text-sm font-medium text-slate-700 outline-none rounded bg-transparent focus:bg-slate-50"
                                              value={fgtsSalaries[month] || ''}
                                              onChange={(e) => handleFgtsSalaryChange(month, e.target.value)}
                                              placeholder="0,00"
                                          />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3">
                      <button onClick={() => setIsFgtsModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={saveFgtsDetail} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200">Atualizar FGTS</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

// Componente auxiliar para linha de impressão
const PrintRow = ({ label, refText, value, type }: { label: string, refText: string, value: number, type: 'prov' | 'desc' }) => {
    // Só renderiza se o valor for significativo (> 0.01)
    if (value <= 0.01) return null;

    return (
        <div className={`grid grid-cols-12 gap-4 py-1 border-b border-slate-100 ${type === 'prov' ? 'bg-slate-50/50' : 'bg-red-50/10'}`}>
            <div className="col-span-6 pl-2">{label}</div>
            <div className="col-span-2 text-center text-slate-500">{refText}</div>
            <div className={`col-span-2 text-right ${type === 'prov' ? 'font-medium text-slate-700' : 'text-slate-300'}`}>
                {type === 'prov' ? formatCurrency(value) : '-'}
            </div>
            <div className={`col-span-2 text-right ${type === 'desc' ? 'font-medium text-red-500' : 'text-slate-300'}`}>
                {type === 'desc' ? formatCurrency(value) : '-'}
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}