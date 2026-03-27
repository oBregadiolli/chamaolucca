import { createContext, useContext, useState, useCallback } from 'react';

/**
 * CheckoutContext
 *
 * Gerencia o fluxo de checkout: endereço → data/hora → pagamento → confirmação.
 * Estruturado para suportar múltiplos endereços no futuro.
 */

const CheckoutContext = createContext({});

// Passos do checkout (índice controlado aqui)
export const CHECKOUT_STEPS = {
  ADDRESS: 'address',
  SCHEDULE: 'schedule',
  PAYMENT: 'payment',
  CONFIRMATION: 'confirmation',
};

const STEP_ORDER = [
  CHECKOUT_STEPS.ADDRESS,
  CHECKOUT_STEPS.SCHEDULE,
  CHECKOUT_STEPS.PAYMENT,
  CHECKOUT_STEPS.CONFIRMATION,
];

const EMPTY_ADDRESS = {
  street: '',       // Endereço (rua + número)
  neighborhood: '', // Bairro
  phone: '',
  zipCode: '',
  reference: '',    // Ponto de referência (opcional)
};

export function CheckoutProvider({ children }) {
  const [step, setStep] = useState(CHECKOUT_STEPS.ADDRESS);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState(null); // endereço confirmado
  const [schedule, setSchedule] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState('scheduled'); // 'scheduled' | 'express'

  // Avança para o próximo passo
  const nextStep = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    }
  }, [step]);

  // Volta para o passo anterior
  const prevStep = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) {
      setStep(STEP_ORDER[idx - 1]);
    }
  }, [step]);

  // "Escolher" — confirma endereço digitado como endereço salvo
  const chooseAddress = useCallback(() => {
    setSavedAddress({ ...address });
  }, [address]);

  // Reseta o checkout por completo (ex: após confirmação)
  const resetCheckout = useCallback(() => {
    setStep(CHECKOUT_STEPS.ADDRESS);
    setAddress(EMPTY_ADDRESS);
    setSavedAddress(null);
    setSchedule(null);
    setDeliveryMode('scheduled');
  }, []);

  const value = {
    step,
    setStep,
    nextStep,
    prevStep,
    address,
    setAddress,
    savedAddress,
    chooseAddress,
    schedule,
    setSchedule,
    deliveryMode,
    setDeliveryMode,
    resetCheckout,
    CHECKOUT_STEPS,
    STEP_ORDER,
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}
