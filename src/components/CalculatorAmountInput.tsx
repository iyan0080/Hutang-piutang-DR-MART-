import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, 
  X, 
  Check, 
  Delete, 
  CornerDownLeft, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { formatNumberInput, parseNumberInput, formatRupiah } from '../utils/formatters';
import { evaluateMathExpression } from '../utils/mathEvaluator';

interface CalculatorAmountInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const CalculatorAmountInput: React.FC<CalculatorAmountInputProps> = ({
  id = 'calculator-amount-input',
  value,
  onChange,
  label,
  placeholder = '0',
  error,
  required = false,
  className = '',
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState('');
  const [liveResult, setLiveResult] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current input contains arithmetic operators
  const isExpressionInInput = /[+\-*/×÷x%()]/.test(value);

  // When value changes, evaluate live if it contains an expression
  useEffect(() => {
    if (isExpressionInInput) {
      const res = evaluateMathExpression(value);
      setLiveResult(res);
    } else {
      const num = parseNumberInput(value);
      setLiveResult(num > 0 ? num : null);
    }
  }, [value, isExpressionInInput]);

  // Sync internal calculator expression with input value when opened
  useEffect(() => {
    if (isOpen) {
      if (value) {
        setExpression(value);
        const res = evaluateMathExpression(value);
        setLiveResult(res !== null ? res : parseNumberInput(value));
      } else {
        setExpression('');
        setLiveResult(null);
      }
    }
  }, [isOpen]);

  // Close calculator on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // Check if user is typing math operators
    if (/[+\-*/×÷x%()]/.test(raw)) {
      onChange(raw);
    } else {
      // Standard number formatting with thousand separator
      const formatted = formatNumberInput(raw);
      onChange(formatted);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyExpressionResult();
    }
  };

  const applyExpressionResult = () => {
    if (isExpressionInInput) {
      const calculated = evaluateMathExpression(value);
      if (calculated !== null && calculated >= 0) {
        onChange(formatNumberInput(calculated));
      }
    }
  };

  // Calculator Pad Actions
  const appendToExpr = (char: string) => {
    const next = expression + char;
    setExpression(next);
    const res = evaluateMathExpression(next);
    setLiveResult(res);
  };

  const clearExpr = () => {
    setExpression('');
    setLiveResult(null);
  };

  const backspaceExpr = () => {
    const next = expression.slice(0, -1);
    setExpression(next);
    if (next) {
      const res = evaluateMathExpression(next);
      setLiveResult(res);
    } else {
      setLiveResult(null);
    }
  };

  const addQuickAmount = (amount: number) => {
    let currentVal = 0;
    if (liveResult !== null && liveResult > 0) {
      currentVal = liveResult;
    } else if (expression) {
      const parsed = evaluateMathExpression(expression) || parseNumberInput(expression);
      currentVal = parsed;
    }
    const newVal = currentVal + amount;
    const formatted = formatNumberInput(newVal);
    setExpression(formatted);
    setLiveResult(newVal);
  };

  const applyCalculatorValue = () => {
    let finalAmount = 0;
    if (liveResult !== null && liveResult >= 0) {
      finalAmount = liveResult;
    } else if (expression) {
      const parsed = evaluateMathExpression(expression) || parseNumberInput(expression);
      finalAmount = parsed;
    }

    onChange(finalAmount > 0 ? formatNumberInput(finalAmount) : '');
    setIsOpen(false);
  };

  const numericValue = isExpressionInInput 
    ? (liveResult || 0) 
    : parseNumberInput(value);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            id={`${id}-calc-toggle-btn`}
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
              isOpen
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200/80'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{isOpen ? 'Tutup Kalkulator' : 'Kalkulator'}</span>
          </button>
        </div>
      )}

      {/* Main Input Field */}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 select-none">
          Rp
        </span>
        
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={applyExpressionResult}
          className={`w-full pl-10 pr-11 py-2.5 bg-slate-50 border rounded-xl text-sm sm:text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all ${
            error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
          }`}
        />

        {/* Embedded Calculator Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Buka Kalkulator Cepat"
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
            isOpen 
              ? 'bg-teal-600 text-white' 
              : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
          }`}
        >
          <Calculator className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Math Expression Live Result Pill */}
      {isExpressionInInput && (
        <div className="mt-1.5 flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-1.5 text-xs text-teal-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="font-semibold">Hasil Hitung:</span>
            <span className="font-bold text-teal-900">{formatRupiah(liveResult || 0)}</span>
          </div>
          <button
            type="button"
            onClick={applyExpressionResult}
            className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-bold text-[11px] transition-colors cursor-pointer shrink-0 ml-2"
          >
            Terapkan
          </button>
        </div>
      )}

      {/* Terbaca Format Rupiah */}
      {!isExpressionInInput && numericValue > 0 && (
        <p className="text-xs text-teal-700 font-semibold mt-1">
          Terbaca: {formatRupiah(numericValue)}
        </p>
      )}

      {error && (
        <p className="text-[11px] text-rose-500 font-medium mt-1">{error}</p>
      )}

      {/* Interactive Calculator Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Calculator className="w-4 h-4 text-teal-600" />
              <span>Kalkulator Transaksi</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Calculator Screen Display */}
          <div className="bg-slate-900 text-white rounded-xl p-3 mb-3 font-mono text-right space-y-1 shadow-inner">
            <div className="text-xs text-slate-400 min-h-[1.25rem] truncate">
              {expression || '0'}
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400 truncate">
              {liveResult !== null ? formatRupiah(liveResult) : formatRupiah(parseNumberInput(expression))}
            </div>
          </div>

          {/* Quick Indonesian Currency Shortcut Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => addQuickAmount(10000)}
              className="py-1 px-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              +10rb
            </button>
            <button
              type="button"
              onClick={() => addQuickAmount(50000)}
              className="py-1 px-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              +50rb
            </button>
            <button
              type="button"
              onClick={() => addQuickAmount(100000)}
              className="py-1 px-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              +100rb
            </button>
            <button
              type="button"
              onClick={() => addQuickAmount(1000000)}
              className="py-1 px-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
            >
              +1jt
            </button>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button
              type="button"
              onClick={clearExpr}
              className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs sm:text-sm border border-rose-200 transition-colors cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('(')}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              (
            </button>
            <button
              type="button"
              onClick={() => appendToExpr(')')}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              )
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('/')}
              className="py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs sm:text-sm border border-teal-200 transition-colors cursor-pointer"
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => appendToExpr('7')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('8')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('9')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('*')}
              className="py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs sm:text-sm border border-teal-200 transition-colors cursor-pointer"
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => appendToExpr('4')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('5')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('6')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('-')}
              className="py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs sm:text-sm border border-teal-200 transition-colors cursor-pointer"
            >
              -
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => appendToExpr('1')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('2')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('3')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('+')}
              className="py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl text-xs sm:text-sm border border-teal-200 transition-colors cursor-pointer"
            >
              +
            </button>

            {/* Row 5 */}
            <button
              type="button"
              onClick={() => appendToExpr('0')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => appendToExpr('000')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs sm:text-sm border border-slate-200/80 transition-colors cursor-pointer"
            >
              000
            </button>
            <button
              type="button"
              onClick={backspaceExpr}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (expression) {
                  const res = evaluateMathExpression(expression);
                  if (res !== null) {
                    setExpression(formatNumberInput(res));
                    setLiveResult(res);
                  }
                }
              }}
              className="py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              =
            </button>
          </div>

          {/* Submit / Apply Button */}
          <button
            type="button"
            onClick={applyCalculatorValue}
            className="w-full mt-3 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Gunakan Nominal Ini</span>
          </button>
        </div>
      )}
    </div>
  );
};
