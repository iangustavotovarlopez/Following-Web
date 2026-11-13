import { useEffect, useState, type MouseEvent } from 'react';
import { CompaniesSection } from '../features/companies/presentation/pages/companies-section';
import { CollaboratorDetailsPage } from '../features/collaborators/presentation/pages/collaborator-details-page';
import { ProjectsSection } from '../features/projects/presentation/pages/projects-section';
import { ProjectDetailsPage } from '../features/projects/presentation/pages/project-details-page';
import { ServicesSection } from '../features/services/presentation/pages/services-section';
import {
  AdditionalCatalogsSection,
  PlanningSection,
} from '../features/companies/presentation/pages/nested-resource-management';
import { AdvancedRelationshipsManagement } from '../features/relations/presentation/pages/advanced-relationships-management';
import { StaffingSection } from '../features/staffing/presentation/pages/staffing-section';
import { RequirementsSection } from '../features/requirements/presentation/pages/requirements-section';
import { RequirementsBoardPage } from '../features/requirements/presentation/pages/requirements-board-page';
import { PeopleSection } from './people-section';
import { CompanyProvider, GlobalCompanySelector, GlobalBranchSelector, InitialScopeModal } from './providers/company-context';

export function App() {
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [boardView, setBoardView] = useState(() => new URLSearchParams(window.location.search).get('view') === 'requirements-board');
  useEffect(() => {
    const onNavigation = () => setBoardView(new URLSearchParams(window.location.search).get('view') === 'requirements-board');
    window.addEventListener('popstate', onNavigation);
    return () => window.removeEventListener('popstate', onNavigation);
  }, []);
  const searchParams = new URLSearchParams(window.location.search);
  const collaboratorId = Number(searchParams.get('collaboratorId'));
  if (Number.isInteger(collaboratorId) && collaboratorId > 0) {
    function navigate(event: MouseEvent<HTMLAnchorElement>, board: boolean) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const url = new URL(window.location.href);
      if (board) url.searchParams.set('view', 'requirements-board'); else url.searchParams.delete('view');
      window.history.pushState(null, '', url);
      setBoardView(board);
    }
    return (
      <CollaboratorDetailsPage
        collaboratorId={collaboratorId}
        collaboratorCode={searchParams.get('collaboratorCode') ?? ''}
      />
    );
  }
  const projectId = Number(searchParams.get('projectId'));
  if (Number.isInteger(projectId) && projectId > 0) {
    return (
      <ProjectDetailsPage
        projectId={projectId}
        projectCode={searchParams.get('projectCode') ?? ''}
        projectName={searchParams.get('projectName') ?? undefined}
      />
    );
  }

  return (
    <CompanyProvider>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Following Web</p>
            <h1>{boardView ? 'Tablero de requerimientos' : 'Panel de operación'}</h1>
            <p className="header-description">
              Consulta y registra información mediante la API de Following.
            </p>
          </div>
          <div className="app-header-actions">
            <span className="connection-status">API local</span>
          </div>
        </header>
        <nav className="main-navigation" aria-label="Paginas principales">
          <a href={window.location.pathname} aria-current={!boardView ? 'page' : undefined}
            onClick={(event) => navigate(event, false)}>Panel de operación</a>
          <a href="?view=requirements-board" aria-current={boardView ? 'page' : undefined}
            onClick={(event) => navigate(event, true)}>Tablero de requerimientos</a>
        </nav>

        <div className="global-company-toolbar">
          <GlobalCompanySelector />
          <GlobalBranchSelector />
        </div>

        <InitialScopeModal open={!scopeConfirmed} onConfirm={() => setScopeConfirmed(true)} />
        {scopeConfirmed && (boardView ? <RequirementsBoardPage /> : <main className="dashboard">
          <CompaniesSection />
          <PeopleSection />
          <ProjectsSection />
          <StaffingSection />
          <RequirementsSection />
          <ServicesSection />
          <PlanningSection />
          <AdditionalCatalogsSection />
          <AdvancedRelationshipsManagement />
        </main>)}
      </div>
    </CompanyProvider>
  );
}
