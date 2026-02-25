
import React, { createContext, useContext, useState, useEffect } from 'react';

export type PaceUnit = 'min/km' | 'km/h';

interface SettingsContextType {
    paceUnit: PaceUnit;
    togglePaceUnit: () => void;
    setPaceUnit: (unit: PaceUnit) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [paceUnit, setPaceUnitState] = useState<PaceUnit>('min/km');

    useEffect(() => {
        const saved = localStorage.getItem('paceUnit');
        if (saved === 'min/km' || saved === 'km/h') {
            setPaceUnitState(saved);
        }
    }, []);

    const togglePaceUnit = () => {
        setPaceUnitState(prev => {
            const next = prev === 'min/km' ? 'km/h' : 'min/km';
            localStorage.setItem('paceUnit', next);
            return next;
        });
    };

    const setPaceUnit = (unit: PaceUnit) => {
        setPaceUnitState(unit);
        localStorage.setItem('paceUnit', unit);
    };

    return (
        <SettingsContext.Provider value={{ paceUnit, togglePaceUnit, setPaceUnit }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
