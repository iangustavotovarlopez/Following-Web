import { CompaniesSection } from '../features/companies/presentation/pages/companies-section';
import { CollaboratorsSection } from '../features/collaborators/presentation/pages/collaborators-section';
import { CollaboratorDetailsPage } from '../features/collaborators/presentation/pages/collaborator-details-page';
import { CollaboratorRolesSection } from '../features/collaborators/presentation/pages/collaborator-roles-section';
import { CollaboratorRoleAssignmentsSection } from '../features/collaborators/presentation/pages/collaborator-role-assignments-section';
import { ProjectsSection } from '../features/projects/presentation/pages/projects-section';
import { ProjectDetailsPage } from '../features/projects/presentation/pages/project-details-page';
import { ServicesSection } from '../features/services/presentation/pages/services-section';
import { NestedResourceManagementSection } from '../features/companies/presentation/pages/nested-resource-management';
import { AdvancedRelationshipsManagement } from '../features/relations/presentation/pages/advanced-relationships-management';

export function App() {
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
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Following Web</p>
          <h1>Panel de operación</h1>
          <p className="header-description">
            Consulta y registra información mediante la API de Following.
          </p>
        </div>
        <span className="connection-status">API local</span>
      </header>

      <main className="dashboard">
        <CompaniesSection />
        <CollaboratorsSection />
        <CollaboratorRolesSection />
        <CollaboratorRoleAssignmentsSection />
        <ProjectsSection />
        <ServicesSection />
        <NestedResourceManagementSection />
        <AdvancedRelationshipsManagement />
      </main>
    </div>
  );
}
