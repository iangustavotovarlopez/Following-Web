import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { companiesApi, type Branch, type Company } from '../../features/companies/infrastructure/api';
import { API_MUTATION_EVENT, loadCatalogPages, type ApiMutationDetail } from '../../shared/api';
import { SelectField } from '../../shared/components/select-field';
import { ResourceModal } from '../../shared/components/resource-modal';

interface CompanyContextValue {
  companies: Company[];
  selectedCompanyId: number | undefined;
  setSelectedCompanyId: (companyId: number | undefined) => void;
  branches: Branch[];
  selectedBranchId: number | undefined;
  setSelectedBranchId: (branchId: number | undefined) => void;
  branchesLoading: boolean;
  branchesError: string | null;
  reloadCompanies: () => void;
  reloadBranches: () => void;
  loading: boolean;
  error: string | null;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selection, setSelection] = useState<{ companyId?: number; branchId?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyRevision, setCompanyRevision] = useState(0);
  const [branchRevision, setBranchRevision] = useState(0);
  const [branchState, setBranchState] = useState<{
    companyId?: number;
    items: Branch[];
    loading: boolean;
    error: string | null;
  }>({ items: [], loading: false, error: null });
  const selectedCompanyId = selection.companyId;
  const branches = branchState.companyId === selectedCompanyId ? branchState.items : [];
  const branchesLoading = selectedCompanyId !== undefined
    && (branchState.companyId !== selectedCompanyId || branchState.loading);
  const branchesError = branchState.companyId === selectedCompanyId ? branchState.error : null;
  const selectedBranchId = branches.some((branch) => branch.id === selection.branchId)
    ? selection.branchId
    : undefined;
  const reloadCompanies = () => setCompanyRevision((current) => current + 1);
  const reloadBranches = () => setBranchRevision((current) => current + 1);

  function setSelectedCompanyId(companyId: number | undefined) {
    setSelection((current) => current.companyId === companyId ? current : { companyId });
  }

  function setSelectedBranchId(branchId: number | undefined) {
    if (branchId !== undefined && !branches.some((branch) => branch.id === branchId)) {
      setBranchState((current) => ({ ...current, error: 'La branch no pertenece a la compañía seleccionada.' }));
      return;
    }
    setSelection((current) => ({ ...current, branchId }));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void loadCatalogPages((page) => companiesApi.listCompanies({ page, pageSize: 100 }))
      .then((items) => {
        if (!active) return;
        setCompanies(items);
        setSelection((current) => current.companyId && !items.some((company) => company.id === current.companyId)
          ? {} : current);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las compañías.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyRevision]);

  useEffect(() => {
    let active = true;
    setBranchState((current) => ({
      companyId: selectedCompanyId,
      items: current.companyId === selectedCompanyId ? current.items : [],
      loading: Boolean(selectedCompanyId),
      error: null,
    }));
    if (selectedCompanyId) {
      void loadCatalogPages((page) => companiesApi.listBranches(selectedCompanyId, { page, pageSize: 100 }))
        .then((items) => {
          if (!active) return;
          setBranchState({ companyId: selectedCompanyId, items, loading: false, error: null });
          setSelection((current) => current.companyId === selectedCompanyId
            && current.branchId && !items.some((branch) => branch.id === current.branchId)
            ? { companyId: current.companyId } : current);
        })
        .catch((cause) => {
          if (active) setBranchState({
            companyId: selectedCompanyId, items: [], loading: false,
            error: cause instanceof Error ? cause.message : 'No se pudieron cargar las branches.',
          });
        });
    }
    return () => { active = false; };
  }, [selectedCompanyId, branchRevision]);

  useEffect(() => {
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (/^\/companies\/v0\/companies(?:\/\d+)?$/.test(path)) {
        setCompanyRevision((current) => current + 1);
      }
      const match = /^\/companies\/v0\/companies\/(\d+)\/branches(?:\/\d+)?$/.exec(path);
      if (match && Number(match[1]) === selectedCompanyId) {
        setBranchRevision((current) => current + 1);
      }
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, [selectedCompanyId]);

  return (
    <CompanyContext.Provider
      value={{
        companies, selectedCompanyId, setSelectedCompanyId, loading, error,
        branches, selectedBranchId, setSelectedBranchId, branchesLoading, branchesError,
        reloadCompanies, reloadBranches,
      }}
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

export function GlobalCompanySelector({ inModal = false }: { inModal?: boolean }) {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading, error, reloadCompanies } = useGlobalCompany();

  return (
    <div className={inModal ? 'scope-modal-selector' : 'global-company-selector'}>
      <SelectField
        containerClassName={inModal ? undefined : 'global-company-field'}
        emptyLabel={loading ? 'Cargando compañías...' : 'Selecciona una compañía'}
        label="Compañía"
        value={selectedCompanyId ?? ''}
        options={companies.map((company) => ({ value: company.id, label: company.name }))}
        onChange={(event) => {
          setSelectedCompanyId(event.target.value ? Number(event.target.value) : undefined);
        }}
        disabled={loading || companies.length === 0}
      />
      {error && <span className={inModal ? 'form-error' : 'global-company-error'}>No se pudieron cargar las compañías: {error}</span>}
      {error && !inModal && <button className="button secondary" type="button" onClick={reloadCompanies}>Reintentar</button>}
    </div>
  );
}

export function GlobalBranchSelector({ inModal = false }: { inModal?: boolean }) {
  const { branches, selectedCompanyId, selectedBranchId, setSelectedBranchId, branchesLoading, branchesError, reloadBranches } = useGlobalCompany();
  return (
    <div className={inModal ? 'scope-modal-selector' : 'global-company-selector'}>
      <SelectField
        containerClassName={inModal ? undefined : 'global-company-field'}
        emptyLabel={branchesLoading ? 'Cargando branches...' : selectedCompanyId && !branchesError && branches.length === 0
          ? 'Sin branches registradas' : 'Selecciona una branch'}
        label="Branch"
        value={selectedBranchId ?? ''}
        options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
        onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : undefined)}
        disabled={!selectedCompanyId || branchesLoading || branches.length === 0}
      />
      {branchesError && <span className={inModal ? 'form-error' : 'global-company-error'}>No se pudieron cargar las branches: {branchesError}</span>}
      {branchesError && !inModal && <button className="button secondary" type="button" onClick={reloadBranches}>Reintentar</button>}
    </div>
  );
}

export function InitialScopeModal({ open, onConfirm }: { open: boolean; onConfirm: () => void }) {
  const { companies, selectedCompanyId, selectedBranchId, branches, loading, error,
    branchesLoading, branchesError, reloadCompanies, reloadBranches } = useGlobalCompany();
  const [formError, setFormError] = useState<string | null>(null);
  const canContinue = !loading && !error && !branchesLoading && !branchesError
    && (companies.length === 0 || Boolean(selectedCompanyId && (branches.length === 0 || selectedBranchId)));

  function confirm() {
    if (!canContinue) {
      setFormError('Selecciona la compañía y su branch antes de continuar.');
      return;
    }
    setFormError(null);
    onConfirm();
  }

  return (
    <ResourceModal open={open} title="Selecciona compañía y branch" onClose={confirm} dismissible={false}>
      <form className="modal-form" onSubmit={(event) => { event.preventDefault(); confirm(); }}>
        <p className="muted">Selecciona el contexto de trabajo. Después podrás cambiarlo en la barra superior.</p>
        <GlobalCompanySelector inModal />
        <GlobalBranchSelector inModal />
        {(loading || branchesLoading) && <span className="muted">Cargando catálogos...</span>}
        {!loading && !error && companies.length === 0 && (
          <span className="muted">No hay compañías registradas. Continúa para crear la primera compañía.</span>
        )}
        {selectedCompanyId && !branchesLoading && !branchesError && branches.length === 0 && (
          <span className="muted">Esta compañía no tiene branches. Puedes continuar y crear una en Companies → Branches.</span>
        )}
        {error && <button className="button secondary" type="button" onClick={reloadCompanies}>Reintentar compañías</button>}
        {branchesError && <button className="button secondary" type="button" onClick={reloadBranches}>Reintentar branches</button>}
        {formError && <div className="alert error">{formError}</div>}
        <button className="button primary" type="submit" disabled={!canContinue}>Continuar</button>
      </form>
    </ResourceModal>
  );
}
