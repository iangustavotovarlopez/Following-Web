import { CompaniesSection } from '../features/companies/presentation/pages/companies-section';
import { CollaboratorsSection } from '../features/collaborators/presentation/pages/collaborators-section';
import { ProjectsSection } from '../features/projects/presentation/pages/projects-section';
import { ServicesSection } from '../features/services/presentation/pages/services-section';
import { NestedResourcesSection } from '../features/companies/presentation/pages/nested-resources-section';
import { AdvancedRelationsSection } from '../features/relations/presentation/pages/advanced-relations-section';

export function App() {
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
        <ProjectsSection />
        <ServicesSection />
        <NestedResourcesSection />
        <AdvancedRelationsSection />
      </main>
    </div>
  );
}
