import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { companiesApi, type Company } from '../../features/companies/infrastructure/api';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../shared/api';
import { SelectField } from '../../shared/components/select-field';

interface CompanyContextValue {
  companies: Company[];
  selectedCompanyId: number | undefined;
  setSelectedCompanyId: (companyId: number | undefined) => void;
  loading: boolean;
  error: string | null;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    function loadCompanies() {
      setLoading(true);
      setError(null);
      void companiesApi.listCompanies({ page: 1, pageSize: 100 })
        .then((response) => {
          if (!active) return;
          const nextCompanies = response?.content ?? [];
          setCompanies(nextCompanies);
          setSelectedCompanyId((current) => current && nextCompanies.some((company) => company.id === current)
            ? current
            : undefined);
        })
        .catch((cause: Error) => {
          if (active) setError(cause.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (/^\/companies\/v0\/companies(?:\/\d+)?$/.test(path)) loadCompanies();
    }

    loadCompanies();
    window.addEventListener(API_MUTATION_EVENT, handleMutation);

    return () => {
      active = false;
      window.removeEventListener(API_MUTATION_EVENT, handleMutation);
    };
  }, []);

  return (
    <CompanyContext.Provider
      value={{ companies, selectedCompanyId, setSelectedCompanyId, loading, error }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useGlobalCompany() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useGlobalCompany debe usarse dentro de CompanyProvider.');
  return context;
}

export function GlobalCompanySelector() {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading, error } = useGlobalCompany();

  return (
    <div className="global-company-selector">
      <SelectField
        containerClassName="global-company-field"
        emptyLabel="Selecciona una compañía"
        label="Compañía"
        value={selectedCompanyId ?? ''}
        options={companies.map((company) => ({ value: company.id, label: company.name }))}
        onChange={(event) => {
          setSelectedCompanyId(event.target.value ? Number(event.target.value) : undefined);
        }}
        disabled={loading || companies.length === 0}
      />
      {error && <span className="global-company-error">No se pudieron cargar las compañías: {error}</span>}
    </div>
  );
}
