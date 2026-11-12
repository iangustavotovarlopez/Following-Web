import { useState } from 'react';
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
import { PeopleSection } from './people-section';
import { CompanyProvider, GlobalCompanySelector, GlobalBranchSelector, InitialScopeModal } from './providers/company-context';

export function App() {
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const collaboratorId = Number(searchParams.get('collaboratorId'));
  if (Number.isInteger(collaboratorId) && collaboratorId > 0) {
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
            <h1>Panel de operación</h1>
            <p className="header-description">
              Consulta y registra información mediante la API de Following.
            </p>
          </div>
          <div className="app-header-actions">
            <span className="connection-status">API local</span>
          </div>
        </header>

        <div className="global-company-toolbar">
          <GlobalCompanySelector />
          <GlobalBranchSelector />
        </div>

        <InitialScopeModal open={!scopeConfirmed} onConfirm={() => setScopeConfirmed(true)} />
        {scopeConfirmed && <main className="dashboard">
          <CompaniesSection />
          <PeopleSection />
          <ProjectsSection />
          <StaffingSection />
          <RequirementsSection />
          <ServicesSection />
          <PlanningSection />
          <AdditionalCatalogsSection />
          <AdvancedRelationshipsManagement />
        </main>}
      </div>
    </CompanyProvider>
  );
}
