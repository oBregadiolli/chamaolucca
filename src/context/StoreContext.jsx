import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const StoreContext = createContext({});

export function StoreProvider({ children }) {
  const [openTime,          setOpenTime]          = useState('07:00');
  const [closeTime,         setCloseTime]         = useState('23:00');
  const [coverageCities,    setCoverageCities]    = useState(['Alagoinhas']);
  const [isOpen,            setIsOpen]            = useState(true);
  const [loading,           setLoading]           = useState(true);

  // Freight settings
  const [shippingFee,       setShippingFee]       = useState(4.0);
  const [freeShippingAbove, setFreeShippingAbove] = useState(0);
  const [freeShippingActive,setFreeShippingActive]= useState(false);

  function computeIsOpen(open, close, now = new Date()) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    return nowMin >= oh * 60 + om && nowMin < ch * 60 + cm;
  }

  useEffect(() => {
    let open  = '07:00';
    let close = '23:00';

    async function fetchSettings() {
      const { data } = await supabase.from('store_settings').select('key, value');
      if (data) {
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        open  = map.open_time  || '07:00';
        close = map.close_time || '23:00';
        setOpenTime(open);
        setCloseTime(close);
        if (map.coverage_cities) {
          setCoverageCities(map.coverage_cities.split(',').map((c) => c.trim()).filter(Boolean));
        }
        if (map.shipping_fee)         setShippingFee(parseFloat(map.shipping_fee) || 4.0);
        if (map.free_shipping_above)  setFreeShippingAbove(parseFloat(map.free_shipping_above) || 0);
        if (map.free_shipping_active) setFreeShippingActive(map.free_shipping_active === 'true');
      }
      setLoading(false);
    }

    fetchSettings();
  }, []);

  useEffect(() => {
    setIsOpen(computeIsOpen(openTime, closeTime));
    const intervalId = setInterval(() => {
      setIsOpen(computeIsOpen(openTime, closeTime));
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [openTime, closeTime]);

  /** Calculate shipping for a given subtotal */
  function calcShipping(subtotal) {
    if (freeShippingActive && freeShippingAbove > 0 && subtotal >= freeShippingAbove) {
      return 0;
    }
    return shippingFee;
  }

  return (
    <StoreContext.Provider value={{
      openTime, closeTime, coverageCities, isOpen, loading,
      shippingFee, freeShippingAbove, freeShippingActive,
      calcShipping,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
